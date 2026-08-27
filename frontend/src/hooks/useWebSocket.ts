/** Reconnecting, versioned WebSocket hook for authenticated poker players. */

import { useCallback, useEffect, useRef } from 'react';
import { classifySocketClose } from '../protocol/connection.ts';
import { enqueueClientCommand } from '../protocol/socketSend.ts';
import { parseServerFrame } from '../protocol/wsValidation.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { useTableStore } from '../stores/tableStore.ts';
import { toast } from '../stores/toastStore.ts';
import {
  PROTOCOL_SCHEMA_VERSION,
  type AuthMessage,
  type ClientMessage,
} from '../types/ws.ts';

const INITIAL_RECONNECT_DELAY = 1_000;
const MAX_RECONNECT_DELAY = 15_000;
const MAX_INVALID_FRAMES = 3;

function commandId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function withJitter(delay: number): number {
  return Math.round(delay * (0.8 + Math.random() * 0.4));
}

export function useWebSocket(tableId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(INITIAL_RECONNECT_DELAY);
  const closedByUs = useRef(false);
  const protocolTerminal = useRef(false);

  const send = useCallback((message: ClientMessage) => {
    const store = useTableStore.getState();
    const result = enqueueClientCommand({
      socket: wsRef.current,
      message,
      prompt: store.activePrompt,
      commandId: commandId(),
    });
    if (!result.ok) {
      store.recordProtocolError({ code: result.code, message: result.message });
      toast.error(result.message);
      return null;
    }

    store.recordCommand({
      commandId: result.commandId,
      commandType: result.message.type,
      sentAt: Date.now(),
    });
    return result.commandId;
  }, []);

  useEffect(() => {
    const token = useAuthStore.getState().token;
    const userId = useAuthStore.getState().userId;
    if (!token || !tableId) return;

    if (userId) useTableStore.getState().setMyUserId(userId);
    useTableStore.getState().setSend(send);
    useTableStore.getState().setConnectionState(tableId, 'connecting', {
      message: 'Connecting to table...',
    });
    closedByUs.current = false;
    protocolTerminal.current = false;

    const socketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${socketProtocol}//${window.location.host}/ws/table/${tableId}`;

    function connect() {
      if (closedByUs.current || protocolTerminal.current) return;

      useTableStore.getState().setConnectionState(tableId, 'connecting', {
        message: 'Connecting to table...',
      });
      const socket = new WebSocket(url);
      wsRef.current = socket;
      let invalidFrames = 0;

      const rejectInvalidFrame = (error: { code: string; message: string }) => {
        invalidFrames += 1;
        useTableStore.getState().recordProtocolError(error);
        if (invalidFrames === 1) toast.error('Received an invalid message from the table server');
        if (invalidFrames >= MAX_INVALID_FRAMES) {
          protocolTerminal.current = true;
          useTableStore.getState().setConnectionState(tableId, 'terminal', {
            terminalReason: 'protocol_error',
            message: 'The server repeatedly sent invalid protocol messages.',
          });
          socket.close(4400, 'Invalid server protocol');
        }
      };

      socket.onopen = () => {
        if (wsRef.current !== socket || closedByUs.current) return;
        const freshToken = useAuthStore.getState().token;
        if (!freshToken) {
          socket.close(4001, 'Authentication token unavailable');
          return;
        }

        useTableStore.getState().setConnectionState(tableId, 'authenticating', {
          message: 'Authenticating...',
        });
        const auth: AuthMessage = {
          type: 'auth',
          token: freshToken,
          schema_version: PROTOCOL_SCHEMA_VERSION,
        };
        try {
          socket.send(JSON.stringify(auth));
        } catch {
          useTableStore.getState().recordProtocolError({
            code: 'AUTH_SEND_FAILED',
            message: 'Authentication could not be sent to the table server.',
          });
          socket.close();
          return;
        }
        useTableStore.getState().setConnectionState(tableId, 'syncing', {
          message: 'Synchronizing table state...',
        });
        reconnectDelay.current = INITIAL_RECONNECT_DELAY;
      };

      socket.onmessage = (event) => {
        if (wsRef.current !== socket) return;
        if (typeof event.data !== 'string') {
          rejectInvalidFrame({
            code: 'INVALID_SERVER_FRAME',
            message: 'Server sent an unsupported binary frame.',
          });
          return;
        }

        const parsed = parseServerFrame(event.data);
        if (!parsed.ok) {
          rejectInvalidFrame(parsed.error);
          return;
        }

        invalidFrames = 0;
        const result = useTableStore.getState().handleMessage(parsed.message);
        if (result === 'awaiting_snapshot') {
          useTableStore.getState().setConnectionState(tableId, 'syncing', {
            message: 'Waiting for an authoritative table snapshot...',
          });
          socket.close(4000, 'Authoritative snapshot required');
          return;
        }
        if (parsed.message.type === 'error') {
          toast.error(parsed.message.message);
        }
      };

      socket.onclose = (event) => {
        if (wsRef.current !== socket) return;
        wsRef.current = null;
        if (closedByUs.current || protocolTerminal.current) return;

        const disposition = classifySocketClose(event.code);
        if (disposition.terminalReason) {
          useTableStore.getState().setConnectionState(tableId, 'terminal', {
            terminalReason: disposition.terminalReason,
            message: disposition.message,
          });
          if (disposition.terminalReason === 'table_not_found') {
            useTableStore.getState().recordProtocolError({
              code: 'TABLE_NOT_FOUND',
              message: 'Table not found',
            });
          }
          toast.error(disposition.message);
          if (disposition.terminalReason === 'auth_failed') {
            useAuthStore.getState().logout();
          }
          return;
        }

        useTableStore.getState().setConnectionState(tableId, 'reconnecting', {
          message: disposition.message,
        });
        const baseDelay = event.code === 4029
          ? Math.max(5_000, reconnectDelay.current)
          : reconnectDelay.current;
        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(baseDelay * 2, MAX_RECONNECT_DELAY);
          connect();
        }, withJitter(baseDelay));
      };

      socket.onerror = () => {
        // Browsers provide no actionable detail here; onclose owns retry policy.
      };
    }

    connect();

    return () => {
      closedByUs.current = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      const socket = wsRef.current;
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
        wsRef.current = null;
      }
      useTableStore.getState().setSend(null);
      useTableStore.getState().reset();
    };
  }, [send, tableId]);

  return { send };
}

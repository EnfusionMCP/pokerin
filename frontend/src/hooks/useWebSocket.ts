/** Reconnecting WebSocket hook for poker tables.
 *
 * Auth is sent as the first message after connection (not in the URL)
 * to avoid tokens appearing in server/proxy access logs.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useTableStore } from '../stores/tableStore';
import { toast } from '../stores/toastStore';
import type { ClientMessage, ServerMessage } from '../types/ws';

const MAX_RECONNECT_DELAY = 15_000;

export function useWebSocket(tableId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(1000);
  const closedByUs = useRef(false);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    const token = useAuthStore.getState().token;
    const userId = useAuthStore.getState().userId;
    if (!token || !tableId) return;

    if (userId) useTableStore.getState().setMyUserId(userId);
    closedByUs.current = false;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // No token in URL — sent as first message after connection
    const url = `${protocol}//${host}/ws/table/${tableId}`;

    function connect() {
      if (closedByUs.current) return;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        // Read fresh token on each connect (may have refreshed since first mount)
        const freshToken = useAuthStore.getState().token;
        if (!freshToken) { ws.close(); return; }
        ws.send(JSON.stringify({ type: 'auth', token: freshToken }));
        reconnectDelay.current = 1000;
        useTableStore.getState().setConnection(tableId, true);
        useTableStore.getState().setSend(send);
      };

      ws.onmessage = (e) => {
        try {
          const msg: ServerMessage = JSON.parse(e.data);
          useTableStore.getState().handleMessage(msg);
        } catch { /* ignore */ }
      };

      ws.onclose = (e) => {
        if (closedByUs.current) return;
        useTableStore.getState().setConnection(tableId, false);

        if (e.code === 4001) {
          toast.error('Authentication failed — please log in again');
          return;
        }
        if (e.code === 4004) {
          toast.error('Table not found');
          return;
        }
        // 4002 = replaced by new tab, just stop silently
        if (e.code === 4002) return;

        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, MAX_RECONNECT_DELAY);
          connect();
        }, reconnectDelay.current);
      };

      ws.onerror = () => {
        // onerror is always followed by onclose, so just let onclose handle reconnect
      };
    }

    connect();

    return () => {
      closedByUs.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      const ws = wsRef.current;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
        wsRef.current = null;
      }
      useTableStore.getState().reset();
    };
  }, [tableId, send]);

  return { send };
}

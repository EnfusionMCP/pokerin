/** Pure WebSocket enqueue boundary used by the React hook and unit tests. */

import { prepareClientCommand, type VersionedClientMessage } from './clientCommands.ts';
import { parseClientMessage } from './wsValidation.ts';
import type { ActionPromptMsg, ClientMessage } from '../types/ws.ts';

interface SendSocket {
  readyState: number;
  send(data: string): void;
}

export type EnqueueFailureCode =
  | 'SOCKET_NOT_READY'
  | 'INVALID_CLIENT_COMMAND'
  | 'COMMAND_SEND_FAILED';

export type EnqueueResult =
  | { ok: true; commandId: string; message: VersionedClientMessage }
  | { ok: false; code: EnqueueFailureCode; message: string };

interface EnqueueOptions {
  socket: SendSocket | null;
  message: ClientMessage;
  prompt: ActionPromptMsg | null;
  commandId: string;
  openReadyState?: number;
}

export function enqueueClientCommand({
  socket,
  message,
  prompt,
  commandId,
  openReadyState = 1,
}: EnqueueOptions): EnqueueResult {
  if (!socket || socket.readyState !== openReadyState) {
    return {
      ok: false,
      code: 'SOCKET_NOT_READY',
      message: 'The table connection is not ready. Your command was not sent.',
    };
  }

  const outgoing = prepareClientCommand(message, commandId, prompt);
  const validated = parseClientMessage(outgoing);
  if (!validated.ok) {
    return {
      ok: false,
      code: 'INVALID_CLIENT_COMMAND',
      message: validated.error.message,
    };
  }

  try {
    socket.send(JSON.stringify(validated.message));
    return { ok: true, commandId: outgoing.command_id, message: outgoing };
  } catch {
    return {
      ok: false,
      code: 'COMMAND_SEND_FAILED',
      message: 'The command could not be enqueued. Check your connection and try again.',
    };
  }
}

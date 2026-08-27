/** Pure WebSocket lifecycle and revision policy helpers. */

import type { ServerMessage } from '../types/ws.ts';

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'authenticating'
  | 'syncing'
  | 'connected'
  | 'reconnecting'
  | 'terminal';

export type TerminalConnectionReason =
  | 'auth_failed'
  | 'replaced'
  | 'table_not_found'
  | 'protocol_error';

export interface CloseDisposition {
  terminalReason: TerminalConnectionReason | null;
  reconnect: boolean;
  message: string;
}

export function classifySocketClose(code: number): CloseDisposition {
  switch (code) {
    case 4001:
      return {
        terminalReason: 'auth_failed',
        reconnect: false,
        message: 'Authentication failed. Please log in again.',
      };
    case 4002:
      return {
        terminalReason: 'replaced',
        reconnect: false,
        message: 'This table connection was replaced by another tab.',
      };
    case 4004:
      return {
        terminalReason: 'table_not_found',
        reconnect: false,
        message: 'Table not found.',
      };
    default:
      return {
        terminalReason: null,
        reconnect: true,
        message: code === 4029
          ? 'Connection rate limited. Retrying shortly.'
          : 'Connection lost. Reconnecting...',
      };
  }
}

export interface RevisionCursor {
  streamId: string | null;
  revision: number;
  snapshotRevision: number | null;
}

export type RevisionDecision =
  | {
      apply: true;
      streamId: string | null;
      revision: number;
      snapshotRevision: number | null;
      streamChanged: boolean;
    }
  | { apply: false; reason: 'stale' | 'awaiting_snapshot' };

/**
 * Snapshots are authoritative but must never move the client backwards within
 * one server stream. A process restart creates a new opaque stream identifier;
 * only its first authoritative snapshot may reset the revision cursor. Events
 * for a new stream are ignored until that snapshot arrives.
 * Multiple private/broadcast events can legitimately share a table revision,
 * so equal-revision events are accepted. ACKs and command errors are responses,
 * not state mutations, and may be older than the latest state revision.
 */
export function decideRevision(cursor: RevisionCursor, message: ServerMessage): RevisionDecision {
  const incomingStreamId = typeof message.stream_id === 'string' ? message.stream_id : null;

  // Process-level failures can arrive before the first table snapshot and use
  // the process stream rather than the table stream. Deliver command outcomes
  // regardless of epoch, but never let a foreign response replace or advance
  // an established authoritative table cursor.
  if (message.type === 'ack' || message.type === 'error') {
    const belongsToCurrentStream = cursor.streamId !== null
      && incomingStreamId === cursor.streamId;
    return {
      apply: true,
      streamId: cursor.streamId,
      revision: belongsToCurrentStream
        ? Math.max(cursor.revision, message.revision)
        : cursor.revision,
      snapshotRevision: cursor.snapshotRevision,
      streamChanged: false,
    };
  }

  if (!incomingStreamId) {
    return { apply: false, reason: 'awaiting_snapshot' };
  }

  if (cursor.streamId === null || incomingStreamId !== cursor.streamId) {
    if (message.type !== 'table_state') {
      return { apply: false, reason: 'awaiting_snapshot' };
    }
    const incomingRevision = message.revision ?? 0;
    return {
      apply: true,
      streamId: incomingStreamId,
      revision: incomingRevision,
      snapshotRevision: incomingRevision,
      streamChanged: cursor.streamId !== incomingStreamId,
    };
  }

  const incoming = message.revision;
  if (incoming === undefined) {
    return {
      apply: true,
      streamId: cursor.streamId,
      revision: cursor.revision,
      snapshotRevision: cursor.snapshotRevision,
      streamChanged: false,
    };
  }
  if (incoming < cursor.revision) {
    return { apply: false, reason: 'stale' };
  }
  return {
    apply: true,
    streamId: cursor.streamId,
    revision: Math.max(cursor.revision, incoming),
    snapshotRevision: message.type === 'table_state' ? incoming : cursor.snapshotRevision,
    streamChanged: false,
  };
}

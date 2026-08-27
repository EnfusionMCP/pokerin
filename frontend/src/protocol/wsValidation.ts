/** Schema-derived runtime boundary plus domain normalization. */

import type {
  BackendClientMessage,
} from './generated/clientProtocol.generated.ts';
import type {
  ActionPromptMessage as WireActionPromptMessage,
  BackendServerMessage,
  HandStartMessage as WireHandStartMessage,
  SeatData as WireSeatData,
  TableStateMessage as WireTableStateMessage,
} from './generated/serverProtocol.generated.ts';
import {
  validateClientMessage,
  validateServerMessage,
  type GeneratedValidationError,
} from './generated/protocolValidator.generated.js';
import type { ActionType, HandPhase, SeatStatus, Street } from '../types/game.ts';
import {
  PROTOCOL_SCHEMA_VERSION,
  type AckMsg,
  type ActionPromptMsg,
  type ClientMessage,
  type SeatData,
  type ServerMessage,
  type TableStateMsg,
} from '../types/ws.ts';

export interface ProtocolValidationError {
  code:
    | 'INVALID_JSON'
    | 'INVALID_SERVER_MESSAGE'
    | 'INVALID_CLIENT_MESSAGE'
    | 'UNSUPPORTED_SCHEMA_VERSION';
  message: string;
  path?: string;
  schemaPath?: string;
}

export type ServerMessageParseResult =
  | { ok: true; message: ServerMessage }
  | { ok: false; error: ProtocolValidationError };

export type ClientMessageParseResult =
  | { ok: true; message: BackendClientMessage }
  | { ok: false; error: ProtocolValidationError };

function jsonPointerPath(pointer: string): string {
  if (!pointer) return '$';
  return `$${pointer.split('/').slice(1).map((segment) => {
    const decoded = segment.replace(/~1/g, '/').replace(/~0/g, '~');
    return /^\d+$/.test(decoded) ? `[${decoded}]` : `.${decoded}`;
  }).join('')}`;
}

function bestValidationError(errors: GeneratedValidationError[] | null): GeneratedValidationError | null {
  if (!errors || errors.length === 0) return null;
  return errors.find((error) => error.instancePath.length > 0 && error.keyword !== 'const')
    ?? errors.find((error) => error.keyword !== 'oneOf')
    ?? errors[0];
}

function validationFailure(
  value: unknown,
  errors: GeneratedValidationError[] | null,
  code: 'INVALID_SERVER_MESSAGE' | 'INVALID_CLIENT_MESSAGE',
): ProtocolValidationError {
  if (value && typeof value === 'object' && 'schema_version' in value) {
    const version = (value as { schema_version?: unknown }).schema_version;
    if (version !== undefined && version !== null && version !== PROTOCOL_SCHEMA_VERSION) {
      return {
        code: 'UNSUPPORTED_SCHEMA_VERSION',
        message: `Unsupported WebSocket schema version: ${String(version)}`,
        path: '$.schema_version',
      };
    }
  }

  const error = bestValidationError(errors);
  if (!error) return { code, message: 'Message failed generated schema validation' };
  const path = jsonPointerPath(error.instancePath);
  return {
    code,
    message: `Invalid protocol message at ${path}: ${error.message ?? error.keyword}`,
    path,
    schemaPath: error.schemaPath,
  };
}

function normalizeSeat(seat: WireSeatData): SeatData {
  return {
    ...seat,
    status: seat.status as SeatStatus | 'empty',
    user_id: seat.user_id ?? null,
  };
}

function normalizeTableState(message: WireTableStateMessage): TableStateMsg {
  return {
    ...message,
    type: 'table_state',
    blinds: message.blinds as { small: number; big: number },
    community: message.community,
    phase: message.phase as HandPhase,
    pots: message.pots,
    seats: message.seats.map(normalizeSeat),
    shown_cards: message.shown_cards,
    street: message.street as Street,
    winners: message.winners,
    your_cards: message.your_cards ?? null,
  };
}

function normalizeHandStart(message: WireHandStartMessage): ServerMessage {
  return {
    ...message,
    type: 'hand_start',
    seats: message.seats?.map(normalizeSeat) ?? null,
  };
}

function normalizeActionPrompt(message: WireActionPromptMessage): ActionPromptMsg {
  return {
    ...message,
    type: 'action_prompt',
    valid: message.valid as ActionType[],
  };
}

function normalizeServerMessage(message: BackendServerMessage): ServerMessage | null {
  switch (message.type) {
    case 'table_state':
      return normalizeTableState(message);
    case 'hand_start':
      return normalizeHandStart(message);
    case 'deal':
      return { ...message, type: 'deal' };
    case 'community':
      return { ...message, type: 'community', street: message.street as Street };
    case 'player_action':
      return {
        ...message,
        type: 'player_action',
        action: message.action as ActionType,
        status: message.status as Exclude<SeatStatus, 'empty'> | null | undefined,
      };
    case 'action_on':
      return { ...message, type: 'action_on' };
    case 'action_prompt':
      return normalizeActionPrompt(message);
    case 'hand_result':
      return { ...message, type: 'hand_result' };
    case 'seat_update':
      return {
        ...message,
        type: 'seat_update',
        status: message.status as SeatStatus | 'empty',
        user_id: message.user_id ?? null,
      };
    case 'bank_time_start':
      return { ...message, type: 'bank_time_start' };
    case 'chat':
      return { ...message, type: 'chat' };
    case 'ack':
      return {
        ...message,
        type: 'ack',
        command_type: message.command_type as AckMsg['command_type'],
      };
    case 'error':
      return { ...message, type: 'error' };
    default:
      return null;
  }
}

/** Validate untrusted parsed JSON with the generated backend JSON-Schema code. */
export function parseServerMessage(value: unknown): ServerMessageParseResult {
  if (!validateServerMessage(value)) {
    return {
      ok: false,
      error: validationFailure(value, validateServerMessage.errors, 'INVALID_SERVER_MESSAGE'),
    };
  }
  const normalized = normalizeServerMessage(value);
  if (!normalized) {
    return {
      ok: false,
      error: {
        code: 'INVALID_SERVER_MESSAGE',
        message: 'Validated message has no routable type discriminator',
        path: '$.type',
      },
    };
  }
  return { ok: true, message: normalized };
}

/** Validate a prepared outbound command before it reaches WebSocket.send. */
export function parseClientMessage(value: ClientMessage): ClientMessageParseResult {
  if (!validateClientMessage(value)) {
    return {
      ok: false,
      error: validationFailure(value, validateClientMessage.errors, 'INVALID_CLIENT_MESSAGE'),
    };
  }
  return { ok: true, message: value };
}

export function parseServerFrame(frame: string): ServerMessageParseResult {
  try {
    return parseServerMessage(JSON.parse(frame) as unknown);
  } catch {
    return {
      ok: false,
      error: { code: 'INVALID_JSON', message: 'Server sent malformed JSON' },
    };
  }
}

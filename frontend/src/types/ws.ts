/**
 * Domain-facing aliases over schema-generated WebSocket wire types.
 * Structural truth lives in protocol/generated/*Protocol.generated.ts.
 */

import {
  BACKEND_PROTOCOL_SCHEMA_VERSION,
} from '../protocol/generated/protocolMetadata.generated.ts';
import type {
  AckMessage as WireAckMessage,
  ActionOnMessage as WireActionOnMessage,
  ActionPromptMessage as WireActionPromptMessage,
  BankTimeStartMessage as WireBankTimeStartMessage,
  ChatMessage as WireChatMessage,
  CommunityMessage as WireCommunityMessage,
  DealMessage as WireDealMessage,
  ErrorMessage as WireErrorMessage,
  HandResultMessage as WireHandResultMessage,
  HandStartMessage as WireHandStartMessage,
  PlayerActionMessage as WirePlayerActionMessage,
  PotData as WirePotData,
  SeatData as WireSeatData,
  SeatUpdateMessage as WireSeatUpdateMessage,
  TableStateMessage as WireTableStateMessage,
  WinnerData as WireWinnerData,
} from '../protocol/generated/serverProtocol.generated.ts';
import type {
  ActionCommand as WireActionCommand,
  AddChipsCommand as WireAddChipsCommand,
  AuthMessage as WireAuthMessage,
  ChatCommand as WireChatCommand,
  SitCommand as WireSitCommand,
  StandCommand as WireStandCommand,
} from '../protocol/generated/clientProtocol.generated.ts';
import type { ActionType, CardStr, HandPhase, SeatStatus, Street } from './game.ts';

export const PROTOCOL_SCHEMA_VERSION = BACKEND_PROTOCOL_SCHEMA_VERSION;

type WithType<T, Type extends string> = T & { type: Type };
type OccupiedSeatStatus = Exclude<SeatStatus, 'empty'>;

export interface ProtocolEnvelope {
  schema_version?: typeof PROTOCOL_SCHEMA_VERSION;
  revision?: number;
  server_time?: string;
}

export type SeatData = WireSeatData & {
  status: SeatStatus | 'empty';
  user_id: number | null;
};

export type PotData = WirePotData;
export type WinnerInfo = WireWinnerData;

export type TableStateMsg = WithType<WireTableStateMessage, 'table_state'> & {
  blinds: { small: number; big: number };
  community: CardStr[];
  phase: HandPhase;
  pots: PotData[];
  seats: SeatData[];
  shown_cards?: Record<string, CardStr[]>;
  street: Street;
  winners?: WinnerInfo[];
  your_cards?: CardStr[] | null;
};

export type HandStartMsg = WithType<WireHandStartMessage, 'hand_start'> & {
  seats?: SeatData[] | null;
};

export type DealMsg = WithType<WireDealMessage, 'deal'> & { cards: CardStr[] };

export type CommunityMsg = WithType<WireCommunityMessage, 'community'> & {
  board: CardStr[];
  cards: CardStr[];
  street: Street;
};

export type PlayerActionMsg = WithType<WirePlayerActionMessage, 'player_action'> & {
  action: ActionType;
  status?: OccupiedSeatStatus | null;
};

export type ActionPromptMsg = WithType<WireActionPromptMessage, 'action_prompt'> & {
  valid: ActionType[];
};

export type ActionOnMsg = WithType<WireActionOnMessage, 'action_on'>;
export type BankTimeStartMsg = WithType<WireBankTimeStartMessage, 'bank_time_start'>;

export type HandResultMsg = WithType<WireHandResultMessage, 'hand_result'> & {
  community: CardStr[];
  pots: PotData[];
  shown_cards: Record<string, CardStr[]>;
  winners: WinnerInfo[];
};

export type SeatUpdateMsg = WithType<WireSeatUpdateMessage, 'seat_update'> & {
  status: SeatStatus | 'empty';
  user_id: number | null;
};

export type ChatMsg = WithType<WireChatMessage, 'chat'>;

export type AckMsg = WithType<WireAckMessage, 'ack'> & {
  command_type: ClientMessage['type'];
};

export type ErrorMsg = WithType<WireErrorMessage, 'error'>;

export type ServerMessage =
  | TableStateMsg
  | HandStartMsg
  | DealMsg
  | CommunityMsg
  | PlayerActionMsg
  | ActionPromptMsg
  | ActionOnMsg
  | BankTimeStartMsg
  | HandResultMsg
  | SeatUpdateMsg
  | ChatMsg
  | AckMsg
  | ErrorMsg;

export interface CommandMetadata {
  schema_version?: typeof PROTOCOL_SCHEMA_VERSION | null;
  command_id?: string | null;
}

export type SitCmd = WithType<WireSitCommand, 'sit'>;
export type StandCmd = WithType<WireStandCommand, 'stand'>;
export type ActionCmd = WithType<WireActionCommand, 'action'>;
export type AddChipsCmd = WithType<WireAddChipsCommand, 'add_chips'>;
export type ChatCmd = WithType<WireChatCommand, 'chat'>;

export type ClientMessage = SitCmd | StandCmd | ActionCmd | AddChipsCmd | ChatCmd;

export type AuthMessage = WithType<WireAuthMessage, 'auth'> & {
  schema_version: typeof PROTOCOL_SCHEMA_VERSION;
};

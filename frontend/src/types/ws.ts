/** WebSocket message types — matches backend ws/protocol.py and poker/table.py */

import type { ActionType, CardStr, HandPhase, SeatStatus, Street } from './game';

// --- Shared data shapes ---

export interface SeatData {
  seat: number;
  user_id: number | null;
  name?: string;
  stack?: number;
  status: SeatStatus | 'empty';
  current_bet?: number;
  portrait?: string;
}

export interface PotData {
  amount: number;
  eligible: number[];
}

// --- Server → Client messages ---

export interface TableStateMsg {
  type: 'table_state';
  table_id: string;
  table_name: string;
  seats: SeatData[];
  community: CardStr[];
  pots: PotData[];
  dealer: number;
  action_on: number;
  street: Street;
  phase: HandPhase;
  your_cards: CardStr[] | null;
  hand_num: number;
  seed_hash: string | null;
  winners?: WinnerInfo[];
  shown_cards?: Record<string, CardStr[]>;
  blinds: { small: number; big: number };
}

export interface HandStartMsg {
  type: 'hand_start';
  hand_num: number;
  seed_hash: string;
  dealer: number;
  pot?: number;
  seats?: SeatData[];
}

export interface DealMsg {
  type: 'deal';
  cards: CardStr[];
}

export interface CommunityMsg {
  type: 'community';
  street: Street;
  cards: CardStr[];
  board: CardStr[];
}

export interface PlayerActionMsg {
  type: 'player_action';
  seat: number;
  user_id: number;
  action: ActionType;
  amount: number;
  stack: number;
  current_bet?: number;
  status?: SeatStatus;
  pot: number;
  action_on?: number;
}

export interface ActionPromptMsg {
  type: 'action_prompt';
  valid: ActionType[];
  call_amount: number;
  min_raise: number;
  max_raise: number;
  timeout: number;
}

export interface WinnerInfo {
  seat: number;
  user_id: number;
  amount: number;
  hand: string | null;
}

export interface HandResultMsg {
  type: 'hand_result';
  community: CardStr[];
  winners: WinnerInfo[];
  shown_cards: Record<string, CardStr[]>;
  rake: number;
  pots: PotData[];
  server_seed: string;
}

export interface SeatUpdateMsg {
  type: 'seat_update';
  seat: number;
  user_id: number | null;
  name?: string;
  stack?: number;
  status: SeatStatus | 'empty';
  current_bet?: number;
  portrait?: string;
}

export interface ChatMsg {
  type: 'chat';
  user_id: number;
  name: string;
  text: string;
}

export interface ActionOnMsg {
  type: 'action_on';
  seat: number;
  timeout: number;
}

export interface BankTimeStartMsg {
  type: 'bank_time_start';
  seat: number;
  user_id: number;
  duration: number;
}

export interface ErrorMsg {
  type: 'error';
  message: string;
}

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
  | ErrorMsg;

// --- Client → Server messages ---

export interface SitCmd { type: 'sit'; seat: number; buyin: number }
export interface StandCmd { type: 'stand' }
export interface ActionCmd { type: 'action'; action: ActionType; amount?: number }
export interface AddChipsCmd { type: 'add_chips'; amount: number }
export interface ChatCmd { type: 'chat'; text: string }

export type ClientMessage = SitCmd | StandCmd | ActionCmd | AddChipsCmd | ChatCmd;

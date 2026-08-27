/** Generated from backend/ws/protocol.schema.json; do not edit by hand. */
export type BackendServerMessage =
  | TableStateMessage
  | HandStartMessage
  | DealMessage
  | CommunityMessage
  | PlayerActionMessage
  | ActionOnMessage
  | ActionPromptMessage
  | HandResultMessage
  | SeatUpdateMessage
  | BankTimeStartMessage
  | ChatMessage
  | AckMessage
  | ErrorMessage;
export type ActionOn = number;
export type Big = number;
export type Small = number;
export type Community = string[];
export type Dealer = number;
export type HandNum = number;
export type Phase = 'idle' | 'posting' | 'dealing' | 'betting' | 'showdown' | 'complete';
export type Amount = number;
export type Eligible = number[];
export type Pots = PotData[];
export type Revision = number;
export type SchemaVersion = 1;
export type CurrentBet = number | null;
export type Name = string | null;
export type Portrait = string | null;
export type Seat = number;
export type Stack = number | null;
export type Status = 'empty' | 'waiting' | 'active' | 'folded' | 'allin' | 'sitting_out';
export type UserId = number | null;
export type Seats = SeatData[];
export type SeedHash = string | null;
export type ServerTime = string;
export type StreamId = string;
export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type TableId = string;
export type TableName = string;
export type Type = 'table_state';
export type Amount1 = number;
export type Hand = string | null;
export type Seat1 = number;
export type UserId1 = number;
export type Winners = WinnerData[];
export type YourCards = string[] | null;
export type Dealer1 = number;
export type HandNum1 = number;
export type Pot = number | null;
export type Revision1 = number;
export type SchemaVersion1 = 1;
export type Seats1 = SeatData[] | null;
export type SeedHash1 = string;
export type ServerTime1 = string;
export type StreamId1 = string;
export type Type1 = 'hand_start';
export type Cards = string[];
export type Revision2 = number;
export type SchemaVersion2 = 1;
export type ServerTime2 = string;
export type StreamId2 = string;
export type Type2 = 'deal';
export type Board = string[];
export type Cards1 = string[];
export type Revision3 = number;
export type SchemaVersion3 = 1;
export type ServerTime3 = string;
export type StreamId3 = string;
export type Street1 = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type Type3 = 'community';
export type Action = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';
export type ActionOn1 = number | null;
export type Amount2 = number;
export type CurrentBet1 = number | null;
export type Pot1 = number;
export type Revision4 = number;
export type SchemaVersion4 = 1;
export type Seat2 = number;
export type ServerTime4 = string;
export type Stack1 = number;
export type Status1 = ('waiting' | 'active' | 'folded' | 'allin' | 'sitting_out') | null;
export type StreamId4 = string;
export type Type4 = 'player_action';
export type UserId2 = number;
export type PromptId = string;
export type Revision5 = number;
export type SchemaVersion5 = 1;
export type Seat3 = number;
export type ServerTime5 = string;
export type StreamId5 = string;
export type Timeout = number;
export type TurnToken = string;
export type Type5 = 'action_on';
export type CallAmount = number;
export type MaxRaise = number;
export type MinRaise = number;
export type PromptId1 = string;
export type Revision6 = number;
export type SchemaVersion6 = 1;
export type ServerTime6 = string;
export type StreamId6 = string;
export type Timeout1 = number;
export type TurnToken1 = string;
export type Type6 = 'action_prompt';
export type Valid = ('fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin')[];
export type Community1 = string[];
export type Pots1 = PotData[];
export type Rake = number | null;
export type Revision7 = number;
export type SchemaVersion7 = 1;
export type ServerSeed = string;
export type ServerTime7 = string;
export type StreamId7 = string;
export type Type7 = 'hand_result';
export type Winners1 = WinnerData[];
export type CurrentBet2 = number | null;
export type Name1 = string | null;
export type Portrait1 = string | null;
export type Revision8 = number;
export type SchemaVersion8 = 1;
export type Seat4 = number;
export type ServerTime8 = string;
export type Stack2 = number | null;
export type Status2 = 'empty' | 'waiting' | 'active' | 'folded' | 'allin' | 'sitting_out';
export type StreamId8 = string;
export type Type8 = 'seat_update';
export type UserId3 = number | null;
export type Duration = number;
export type Revision9 = number;
export type SchemaVersion9 = 1;
export type Seat5 = number;
export type ServerTime9 = string;
export type StreamId9 = string;
export type Type9 = 'bank_time_start';
export type UserId4 = number;
export type Name2 = string;
export type Revision10 = number;
export type SchemaVersion10 = 1;
export type ServerTime10 = string;
export type StreamId10 = string;
export type Text = string;
export type Type10 = 'chat';
export type UserId5 = number;
export type CommandId = string;
export type CommandType = 'sit' | 'stand' | 'action' | 'add_chips' | 'chat';
export type Revision11 = number;
export type SchemaVersion11 = 1;
export type ServerTime11 = string;
export type Status3 = 'received';
export type StreamId11 = string;
export type Type11 = 'ack';
export type Code = string;
export type CommandId1 = string | null;
export type Details = {
  [k: string]: unknown;
} | null;
export type Message = string;
export type Revision12 = number;
export type SchemaVersion12 = 1;
export type ServerTime12 = string;
export type StreamId12 = string;
export type Type12 = 'error';

export interface TableStateMessage {
  action_on: ActionOn;
  blinds: BlindsData;
  community: Community;
  dealer: Dealer;
  hand_num: HandNum;
  phase: Phase;
  pots: Pots;
  revision: Revision;
  schema_version: SchemaVersion;
  seats: Seats;
  seed_hash?: SeedHash;
  server_time: ServerTime;
  shown_cards?: ShownCards;
  stream_id: StreamId;
  street: Street;
  table_id: TableId;
  table_name: TableName;
  type: Type;
  winners?: Winners;
  your_cards?: YourCards;
  [k: string]: unknown;
}
export interface BlindsData {
  big: Big;
  small: Small;
}
export interface PotData {
  amount: Amount;
  eligible: Eligible;
  [k: string]: unknown;
}
export interface SeatData {
  current_bet?: CurrentBet;
  name?: Name;
  portrait?: Portrait;
  seat: Seat;
  stack?: Stack;
  status: Status;
  user_id?: UserId;
  [k: string]: unknown;
}
export interface ShownCards {
  [k: string]: string[];
}
export interface WinnerData {
  amount: Amount1;
  hand?: Hand;
  seat: Seat1;
  user_id: UserId1;
  [k: string]: unknown;
}
export interface HandStartMessage {
  dealer: Dealer1;
  hand_num: HandNum1;
  pot?: Pot;
  revision: Revision1;
  schema_version: SchemaVersion1;
  seats?: Seats1;
  seed_hash: SeedHash1;
  server_time: ServerTime1;
  stream_id: StreamId1;
  type: Type1;
  [k: string]: unknown;
}
export interface DealMessage {
  cards: Cards;
  revision: Revision2;
  schema_version: SchemaVersion2;
  server_time: ServerTime2;
  stream_id: StreamId2;
  type: Type2;
  [k: string]: unknown;
}
export interface CommunityMessage {
  board: Board;
  cards: Cards1;
  revision: Revision3;
  schema_version: SchemaVersion3;
  server_time: ServerTime3;
  stream_id: StreamId3;
  street: Street1;
  type: Type3;
  [k: string]: unknown;
}
export interface PlayerActionMessage {
  action: Action;
  action_on?: ActionOn1;
  amount: Amount2;
  current_bet?: CurrentBet1;
  pot: Pot1;
  revision: Revision4;
  schema_version: SchemaVersion4;
  seat: Seat2;
  server_time: ServerTime4;
  stack: Stack1;
  status?: Status1;
  stream_id: StreamId4;
  type: Type4;
  user_id: UserId2;
  [k: string]: unknown;
}
export interface ActionOnMessage {
  prompt_id: PromptId;
  revision: Revision5;
  schema_version: SchemaVersion5;
  seat: Seat3;
  server_time: ServerTime5;
  stream_id: StreamId5;
  timeout: Timeout;
  turn_token: TurnToken;
  type: Type5;
  [k: string]: unknown;
}
export interface ActionPromptMessage {
  call_amount: CallAmount;
  max_raise: MaxRaise;
  min_raise: MinRaise;
  prompt_id: PromptId1;
  revision: Revision6;
  schema_version: SchemaVersion6;
  server_time: ServerTime6;
  stream_id: StreamId6;
  timeout: Timeout1;
  turn_token: TurnToken1;
  type: Type6;
  valid: Valid;
  [k: string]: unknown;
}
export interface HandResultMessage {
  community: Community1;
  pots: Pots1;
  rake?: Rake;
  revision: Revision7;
  schema_version: SchemaVersion7;
  server_seed: ServerSeed;
  server_time: ServerTime7;
  shown_cards: ShownCards1;
  stream_id: StreamId7;
  type: Type7;
  winners: Winners1;
  [k: string]: unknown;
}
export interface ShownCards1 {
  [k: string]: string[];
}
export interface SeatUpdateMessage {
  current_bet?: CurrentBet2;
  name?: Name1;
  portrait?: Portrait1;
  revision: Revision8;
  schema_version: SchemaVersion8;
  seat: Seat4;
  server_time: ServerTime8;
  stack?: Stack2;
  status: Status2;
  stream_id: StreamId8;
  type: Type8;
  user_id?: UserId3;
  [k: string]: unknown;
}
export interface BankTimeStartMessage {
  duration: Duration;
  revision: Revision9;
  schema_version: SchemaVersion9;
  seat: Seat5;
  server_time: ServerTime9;
  stream_id: StreamId9;
  type: Type9;
  user_id: UserId4;
  [k: string]: unknown;
}
export interface ChatMessage {
  name: Name2;
  revision: Revision10;
  schema_version: SchemaVersion10;
  server_time: ServerTime10;
  stream_id: StreamId10;
  text: Text;
  type: Type10;
  user_id: UserId5;
  [k: string]: unknown;
}
export interface AckMessage {
  command_id: CommandId;
  command_type: CommandType;
  revision: Revision11;
  schema_version: SchemaVersion11;
  server_time: ServerTime11;
  status: Status3;
  stream_id: StreamId11;
  type: Type11;
  [k: string]: unknown;
}
export interface ErrorMessage {
  code: Code;
  command_id?: CommandId1;
  details?: Details;
  message: Message;
  revision: Revision12;
  schema_version: SchemaVersion12;
  server_time: ServerTime12;
  stream_id: StreamId12;
  type: Type12;
  [k: string]: unknown;
}

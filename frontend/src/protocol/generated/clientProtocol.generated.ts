/** Generated from backend/ws/protocol.schema.json; do not edit by hand. */
export type BackendClientMessage =
  AuthMessage | SitCommand | StandCommand | ActionCommand | AddChipsCommand | ChatCommand;
export type SchemaVersion = 1 | null;
export type Token = string;
export type Type = 'auth';
export type Buyin = number;
export type CommandId = string | null;
export type SchemaVersion1 = 1 | null;
export type Seat = number;
export type Type1 = 'sit';
export type CommandId1 = string | null;
export type SchemaVersion2 = 1 | null;
export type Type2 = 'stand';
export type ActionCommand = {
  [k: string]: unknown;
};
export type Amount = number;
export type CommandId2 = string | null;
export type SchemaVersion3 = 1 | null;
export type Type3 = 'add_chips';
export type CommandId3 = string | null;
export type SchemaVersion4 = 1 | null;
export type Text = string;
export type Type4 = 'chat';

export interface AuthMessage {
  schema_version?: SchemaVersion;
  token: Token;
  type: Type;
  [k: string]: unknown;
}
export interface SitCommand {
  buyin: Buyin;
  command_id?: CommandId;
  schema_version?: SchemaVersion1;
  seat: Seat;
  type: Type1;
  [k: string]: unknown;
}
export interface StandCommand {
  command_id?: CommandId1;
  schema_version?: SchemaVersion2;
  type: Type2;
  [k: string]: unknown;
}
export interface AddChipsCommand {
  amount: Amount;
  command_id?: CommandId2;
  schema_version?: SchemaVersion3;
  type: Type3;
  [k: string]: unknown;
}
export interface ChatCommand {
  command_id?: CommandId3;
  schema_version?: SchemaVersion4;
  text: Text;
  type: Type4;
  [k: string]: unknown;
}

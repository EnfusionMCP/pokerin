/** Generated from backend/ws/protocol.schema.json; do not edit by hand. */
export const BACKEND_PROTOCOL_SCHEMA_VERSION = 1 as const;
export const BACKEND_PROTOCOL_GENERATED_FROM = "backend.ws.protocol" as const;
export const BACKEND_PROTOCOL_SCHEMA_SHA256 = "9643d2d99e9b6fc5075b6cdd1a8edfebb3fd8339388f5d2b987a1a0086fd9c34" as const;
export const BACKEND_CLIENT_MESSAGE_TYPES = ["action","add_chips","auth","chat","sit","stand"] as const;
export const BACKEND_SERVER_MESSAGE_TYPES = ["ack","action_on","action_prompt","bank_time_start","chat","community","deal","error","hand_result","hand_start","player_action","seat_update","table_state"] as const;

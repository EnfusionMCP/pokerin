/** Generated from backend/ws/protocol.schema.json; do not edit by hand. */
export const BACKEND_PROTOCOL_SCHEMA_VERSION = 1 as const;
export const BACKEND_PROTOCOL_GENERATED_FROM = "backend.ws.protocol" as const;
export const BACKEND_PROTOCOL_SCHEMA_SHA256 = "11bd2e87fdba2ed7693eb74d6bf91a00e307f96061b5e101034c7658c9e9ddb2" as const;
export const BACKEND_CLIENT_MESSAGE_TYPES = ["action","add_chips","auth","chat","sit","stand"] as const;
export const BACKEND_SERVER_MESSAGE_TYPES = ["ack","action_on","action_prompt","bank_time_start","chat","community","deal","error","hand_result","hand_start","player_action","seat_update","table_state"] as const;

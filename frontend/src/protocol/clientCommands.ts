/** Client command envelope construction, kept pure for deterministic tests. */

import {
  PROTOCOL_SCHEMA_VERSION,
  type ActionPromptMsg,
  type ClientMessage,
} from '../types/ws.ts';

export type VersionedClientMessage = ClientMessage & {
  schema_version: typeof PROTOCOL_SCHEMA_VERSION;
  command_id: string;
};

export function prepareClientCommand(
  message: ClientMessage,
  commandId: string,
  prompt: ActionPromptMsg | null,
): VersionedClientMessage {
  const envelope = {
    ...message,
    schema_version: PROTOCOL_SCHEMA_VERSION,
    command_id: message.command_id ?? commandId,
  };

  if (message.type !== 'action' || !prompt) return envelope as VersionedClientMessage;

  return {
    ...envelope,
    ...(message.prompt_id || !prompt.prompt_id ? {} : { prompt_id: prompt.prompt_id }),
    ...(message.turn_token || !prompt.turn_token ? {} : { turn_token: prompt.turn_token }),
  } as VersionedClientMessage;
}

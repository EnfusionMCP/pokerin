/** Generated declarations for protocolValidator.generated.js. */
import type { BackendClientMessage } from './clientProtocol.generated.ts';
import type { BackendServerMessage } from './serverProtocol.generated.ts';

export interface GeneratedValidationError {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params: Record<string, unknown>;
  message?: string;
}

export interface GeneratedValidator<T> {
  (value: unknown): value is T;
  errors: GeneratedValidationError[] | null;
}

export const validateServerMessage: GeneratedValidator<BackendServerMessage>;
export const validateClientMessage: GeneratedValidator<BackendClientMessage>;

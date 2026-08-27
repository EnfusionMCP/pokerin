import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { enqueueClientCommand } from '../src/protocol/socketSend.ts';

describe('WebSocket command enqueue boundary', () => {
  test('does not report success or call send when the socket is not open', () => {
    let sends = 0;
    const result = enqueueClientCommand({
      socket: { readyState: 0, send: () => { sends += 1; } },
      message: { type: 'chat', text: 'hello' },
      prompt: null,
      commandId: 'cmd-not-open',
    });

    assert.deepEqual(result, {
      ok: false,
      code: 'SOCKET_NOT_READY',
      message: 'The table connection is not ready. Your command was not sent.',
    });
    assert.equal(sends, 0);
  });

  test('does not report success when WebSocket.send throws', () => {
    const result = enqueueClientCommand({
      socket: { readyState: 1, send: () => { throw new Error('closed concurrently'); } },
      message: { type: 'chat', text: 'hello' },
      prompt: null,
      commandId: 'cmd-send-throws',
    });

    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'COMMAND_SEND_FAILED');
  });

  test('returns correlation only after a schema-valid command is enqueued', () => {
    const frames: string[] = [];
    const result = enqueueClientCommand({
      socket: { readyState: 1, send: (frame) => { frames.push(frame); } },
      message: { type: 'chat', text: 'hello' },
      prompt: null,
      commandId: 'cmd-enqueued',
    });

    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.commandId, 'cmd-enqueued');
    assert.equal(frames.length, 1);
    assert.deepEqual(JSON.parse(frames[0]), {
      type: 'chat',
      text: 'hello',
      schema_version: 1,
      command_id: 'cmd-enqueued',
    });
  });

  test('enforces client constraints generated from the backend schema', () => {
    let sends = 0;
    const result = enqueueClientCommand({
      socket: { readyState: 1, send: () => { sends += 1; } },
      message: { type: 'chat', text: 'x'.repeat(201) },
      prompt: null,
      commandId: 'cmd-too-long',
    });

    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'INVALID_CLIENT_COMMAND');
    assert.equal(sends, 0);
  });

  test('rejects a versioned action without the current prompt capability', () => {
    let sends = 0;
    const result = enqueueClientCommand({
      socket: { readyState: 1, send: () => { sends += 1; } },
      message: { type: 'action', action: 'check' },
      prompt: null,
      commandId: 'cmd-no-capability',
    });

    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'INVALID_CLIENT_COMMAND');
    assert.equal(sends, 0);
  });
});

import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { prepareClientCommand } from '../src/protocol/clientCommands.ts';
import { classifySocketClose } from '../src/protocol/connection.ts';
import { parseServerMessage } from '../src/protocol/wsValidation.ts';
import { useTableStore } from '../src/stores/tableStore.ts';
import type { ActionPromptMsg, TableStateMsg } from '../src/types/ws.ts';

const SERVER_TIME = '2026-08-18T12:00:00Z';
const STREAM_A = 'stream-a';
const STREAM_B = 'stream-b';

function snapshot(revision: number, overrides: Partial<TableStateMsg> = {}): TableStateMsg {
  return {
    type: 'table_state',
    schema_version: 1,
    stream_id: STREAM_A,
    revision,
    server_time: SERVER_TIME,
    table_id: 'alpha',
    table_name: `Alpha r${revision}`,
    seats: [
      { seat: 0, user_id: 7, name: 'Pilot', stack: 10_000, status: 'waiting', current_bet: 0 },
      { seat: 1, user_id: null, status: 'empty' },
    ],
    community: [],
    pots: [],
    dealer: 0,
    action_on: -1,
    street: 'preflop',
    phase: 'idle',
    your_cards: null,
    hand_num: 0,
    seed_hash: null,
    winners: [],
    shown_cards: {},
    blinds: { small: 50, big: 100 },
    ...overrides,
  };
}

afterEach(() => {
  useTableStore.getState().reset();
});

describe('runtime protocol boundary', () => {
  test('accepts and normalizes a generated-schema snapshot', () => {
    const wire = snapshot(3) as unknown as Record<string, unknown>;
    wire.seats = [
      { seat: 0, status: 'empty', name: null, stack: null, current_bet: null, portrait: null },
    ];

    const result = parseServerMessage(wire);
    assert.equal(result.ok, true);
    if (!result.ok || result.message.type !== 'table_state') return;
    assert.equal(result.message.seats[0].user_id, null);
  });

  test('enforces backend-schema envelope constraints and message discriminators', () => {
    const negativeRevision = parseServerMessage(snapshot(-1));
    assert.equal(negativeRevision.ok, false);
    if (!negativeRevision.ok) assert.match(negativeRevision.error.message, />= 0/);

    const invalidTimestamp = parseServerMessage(snapshot(1, { server_time: 'not-a-timestamp' }));
    assert.equal(invalidTimestamp.ok, false);
    if (!invalidTimestamp.ok) assert.match(invalidTimestamp.error.message, /date-time/);

    const unknown = parseServerMessage({ type: 'mystery' });
    assert.equal(unknown.ok, false);
    if (!unknown.ok) assert.equal(unknown.error.code, 'INVALID_SERVER_MESSAGE');
  });

  test('requires both legal-action capability fields from the backend schema', () => {
    const invalid = parseServerMessage({
      type: 'action_prompt',
      schema_version: 1,
      stream_id: STREAM_A,
      revision: 8,
      server_time: SERVER_TIME,
      prompt_id: 'prompt-a',
      valid: ['fold', 'call'],
      call_amount: 100,
      min_raise: 200,
      max_raise: 1_000,
      timeout: 30,
    });
    assert.equal(invalid.ok, false);
  });

  test('requires an explicit receipt status on acknowledgements', () => {
    const acknowledgement = {
      type: 'ack',
      schema_version: 1,
      stream_id: STREAM_A,
      revision: 8,
      server_time: SERVER_TIME,
      command_id: 'cmd-ack',
      command_type: 'chat',
    };
    assert.equal(parseServerMessage(acknowledgement).ok, false);
    assert.equal(parseServerMessage({ ...acknowledgement, status: 'received' }).ok, true);
  });
});

describe('snapshot and event revisions', () => {
  test('applies nondecreasing snapshots and discards stale snapshots', () => {
    const store = useTableStore.getState();
    store.setMyUserId(7);
    store.setConnectionState('alpha', 'syncing');

    assert.equal(store.handleMessage(snapshot(5)), 'applied');
    assert.equal(useTableStore.getState().connectionState, 'connected');
    assert.equal(useTableStore.getState().mySeat, 0);
    assert.equal(useTableStore.getState().revision, 5);

    assert.equal(store.handleMessage(snapshot(4, { table_name: 'stale' })), 'stale');
    assert.equal(store.handleMessage(snapshot(5, { table_name: 'equal authoritative snapshot' })), 'applied');
    assert.equal(useTableStore.getState().tableName, 'equal authoritative snapshot');

    assert.equal(store.handleMessage(snapshot(6)), 'applied');
    assert.equal(useTableStore.getState().tableName, 'Alpha r6');
  });

  test('accepts equal-revision private events but rejects older state events', () => {
    const store = useTableStore.getState();
    store.handleMessage(snapshot(10, { phase: 'betting', action_on: 0 }));

    const prompt: ActionPromptMsg = {
      type: 'action_prompt',
      schema_version: 1,
      stream_id: STREAM_A,
      revision: 10,
      server_time: SERVER_TIME,
      prompt_id: 'turn-10',
      turn_token: 'turn-10',
      valid: ['check', 'bet'],
      call_amount: 0,
      min_raise: 100,
      max_raise: 1_000,
      timeout: 30,
    };
    assert.equal(store.handleMessage(prompt), 'applied');
    assert.equal(useTableStore.getState().prompt?.prompt_id, 'turn-10');

    assert.equal(store.handleMessage({
      type: 'community',
      schema_version: 1,
      stream_id: STREAM_A,
      revision: 9,
      server_time: SERVER_TIME,
      street: 'flop',
      cards: ['Ah', 'Kd', '2c'],
      board: ['Ah', 'Kd', '2c'],
    }), 'stale');
    assert.deepEqual(useTableStore.getState().community, []);
  });

  test('allows the current authoritative snapshot in a reconnect epoch', () => {
    const store = useTableStore.getState();
    store.handleMessage(snapshot(4));
    store.setConnectionState('alpha', 'reconnecting');
    store.setConnectionState('alpha', 'syncing');

    assert.equal(store.handleMessage(snapshot(4, { table_name: 'resynchronized' })), 'applied');
    assert.equal(useTableStore.getState().tableName, 'resynchronized');
    assert.equal(useTableStore.getState().connectionState, 'connected');
  });
});

describe('command outcomes and lifecycle', () => {
  test('delivers pre-snapshot auth errors and preserves the terminal close policy', () => {
    const store = useTableStore.getState();
    assert.equal(store.handleMessage({
      type: 'error',
      schema_version: 1,
      stream_id: 'process-stream',
      revision: 0,
      server_time: SERVER_TIME,
      code: 'invalid_token',
      message: 'Authentication failed',
    }), 'applied');
    assert.equal(useTableStore.getState().lastErrorCode, 'invalid_token');
    assert.equal(useTableStore.getState().lastError, 'Authentication failed');
    assert.equal(useTableStore.getState().streamId, null);
    assert.equal(useTableStore.getState().revision, -1);

    const close = classifySocketClose(4001);
    assert.equal(close.terminalReason, 'auth_failed');
    assert.equal(close.reconnect, false);
    store.setConnectionState('alpha', 'terminal', {
      terminalReason: close.terminalReason,
      message: close.message,
    });
    assert.equal(useTableStore.getState().connectionState, 'terminal');
    assert.equal(useTableStore.getState().terminalReason, 'auth_failed');
  });

  test('delivers a foreign process error without replacing the table cursor', () => {
    const store = useTableStore.getState();
    store.handleMessage(snapshot(20));

    assert.equal(store.handleMessage({
      type: 'error',
      schema_version: 1,
      stream_id: 'process-stream',
      revision: 99,
      server_time: SERVER_TIME,
      code: 'server_not_ready',
      message: 'Table service is starting',
    }), 'applied');
    assert.equal(useTableStore.getState().lastErrorCode, 'server_not_ready');
    assert.equal(useTableStore.getState().streamId, STREAM_A);
    assert.equal(useTableStore.getState().revision, 20);
    assert.equal(useTableStore.getState().snapshotRevision, 20);
  });

  test('correlates ACKs and structured errors even when their revision is older', () => {
    const store = useTableStore.getState();
    store.handleMessage(snapshot(20));
    store.handleMessage({
      type: 'action_prompt',
      stream_id: STREAM_A,
      revision: 20,
      prompt_id: 'current-turn',
      turn_token: 'current-turn',
      valid: ['check'],
      call_amount: 0,
      min_raise: 100,
      max_raise: 1_000,
      timeout: 30,
    });
    useTableStore.setState({ prompt: null });
    store.recordCommand({ commandId: 'cmd-ok', commandType: 'sit', sentAt: Date.now() });
    store.recordCommand({ commandId: 'cmd-bad', commandType: 'action', sentAt: Date.now() });

    assert.equal(store.handleMessage({
      type: 'ack',
      schema_version: 1,
      stream_id: STREAM_A,
      revision: 19,
      server_time: SERVER_TIME,
      command_id: 'cmd-ok',
      command_type: 'sit',
      status: 'received',
    }), 'applied');
    assert.equal(useTableStore.getState().pendingCommands['cmd-ok']?.transportStatus, 'received');
    assert.equal(typeof useTableStore.getState().pendingCommands['cmd-ok']?.receivedAt, 'number');
    assert.equal(useTableStore.getState().lastAck?.command_id, 'cmd-ok');

    store.handleMessage({
      type: 'ack',
      schema_version: 1,
      stream_id: STREAM_A,
      revision: 19,
      server_time: SERVER_TIME,
      command_id: 'cmd-bad',
      command_type: 'action',
      status: 'received',
    });

    assert.equal(store.handleMessage({
      type: 'error',
      schema_version: 1,
      stream_id: STREAM_A,
      revision: 19,
      server_time: SERVER_TIME,
      code: 'stale_prompt',
      message: 'That turn has already ended',
      command_id: 'cmd-bad',
      details: { expected_prompt_id: 'next-turn' },
    }), 'applied');
    assert.equal(useTableStore.getState().pendingCommands['cmd-bad'], undefined);
    assert.equal(useTableStore.getState().lastErrorCode, 'stale_prompt');
    assert.equal(useTableStore.getState().lastError, 'That turn has already ended');
    assert.equal(useTableStore.getState().prompt, null);
    assert.equal(useTableStore.getState().activePrompt, null);
    assert.equal(useTableStore.getState().revision, 20);
  });

  test('tracks terminal versus reconnectable close outcomes', () => {
    assert.deepEqual(classifySocketClose(4002), {
      terminalReason: 'replaced',
      reconnect: false,
      message: 'This table connection was replaced by another tab.',
    });
    assert.equal(classifySocketClose(4004).terminalReason, 'table_not_found');
    assert.equal(classifySocketClose(4003).reconnect, true);
    assert.equal(classifySocketClose(1006).reconnect, true);
  });

  test('restores the current action prompt after a correlated retryable error', () => {
    const store = useTableStore.getState();
    store.handleMessage(snapshot(2));
    const prompt: ActionPromptMsg = {
      type: 'action_prompt',
      stream_id: STREAM_A,
      revision: 2,
      prompt_id: 'retry-turn',
      turn_token: 'retry-turn',
      valid: ['bet', 'check'],
      call_amount: 0,
      min_raise: 100,
      max_raise: 2_000,
      timeout: 30,
    };
    store.handleMessage(prompt);
    useTableStore.setState({ prompt: null });
    store.recordCommand({ commandId: 'retry-action', commandType: 'action', sentAt: Date.now() });
    store.handleMessage({
      type: 'ack',
      schema_version: 1,
      stream_id: STREAM_A,
      revision: 2,
      server_time: SERVER_TIME,
      command_id: 'retry-action',
      command_type: 'action',
      status: 'received',
    });
    store.handleMessage({
      type: 'error',
      schema_version: 1,
      stream_id: STREAM_A,
      revision: 2,
      server_time: SERVER_TIME,
      code: 'invalid_action',
      message: 'Choose a currently legal action',
      command_id: 'retry-action',
    });

    assert.equal(useTableStore.getState().prompt?.prompt_id, 'retry-turn');
  });

  test('adds correlation metadata and echoes the current turn capability', () => {
    useTableStore.getState().handleMessage(snapshot(7));
    const prompt: ActionPromptMsg = {
      type: 'action_prompt',
      stream_id: STREAM_A,
      prompt_id: 'turn-7',
      turn_token: 'turn-7',
      valid: ['call', 'fold'],
      call_amount: 100,
      min_raise: 300,
      max_raise: 2_000,
      timeout: 30,
    };
    useTableStore.getState().handleMessage(prompt);
    // The action panel hides the visible prompt optimistically before calling
    // send; the capability must remain available independently.
    useTableStore.setState({ prompt: null });
    const retainedPrompt = useTableStore.getState().activePrompt;
    assert.equal(retainedPrompt?.prompt_id, 'turn-7');

    const command = prepareClientCommand(
      { type: 'action', action: 'call' },
      'cmd-7',
      retainedPrompt,
    );
    assert.equal(command.schema_version, 1);
    assert.equal(command.command_id, 'cmd-7');
    assert.equal(command.prompt_id, 'turn-7');
    assert.equal(command.turn_token, 'turn-7');
  });

  test('requires a new authoritative snapshot before changing server streams', () => {
    const store = useTableStore.getState();
    store.handleMessage(snapshot(20));
    store.recordCommand({ commandId: 'old-stream-command', commandType: 'sit', sentAt: Date.now() });

    assert.equal(store.handleMessage({
      type: 'community',
      schema_version: 1,
      stream_id: STREAM_B,
      revision: 1,
      server_time: SERVER_TIME,
      street: 'flop',
      cards: ['Ah', 'Kd', '2c'],
      board: ['Ah', 'Kd', '2c'],
    }), 'awaiting_snapshot');
    assert.equal(useTableStore.getState().streamId, STREAM_A);
    assert.equal(useTableStore.getState().revision, 20);
    assert.deepEqual(useTableStore.getState().community, []);

    assert.equal(store.handleMessage(snapshot(2, {
      stream_id: STREAM_B,
      table_name: 'Restarted table',
    })), 'applied');
    assert.equal(useTableStore.getState().streamId, STREAM_B);
    assert.equal(useTableStore.getState().revision, 2);
    assert.equal(useTableStore.getState().tableName, 'Restarted table');
    assert.deepEqual(useTableStore.getState().pendingCommands, {});

    assert.equal(store.handleMessage({
      type: 'community',
      schema_version: 1,
      stream_id: STREAM_B,
      revision: 1,
      server_time: SERVER_TIME,
      street: 'flop',
      cards: ['Ah', 'Kd', '2c'],
      board: ['Ah', 'Kd', '2c'],
    }), 'stale');
  });
});

/** Table game state populated only by validated protocol messages. */

import { create } from 'zustand';
import {
  decideRevision,
  type ConnectionState,
  type TerminalConnectionReason,
} from '../protocol/connection.ts';
import type {
  AckMsg,
  ActionPromptMsg,
  ClientMessage,
  PotData,
  SeatData,
  ServerMessage,
  WinnerInfo,
} from '../types/ws.ts';
import type { ActionType, CardStr, HandPhase, Street } from '../types/game.ts';

interface LastAction {
  action: ActionType;
  amount: number;
  timestamp: number;
}

interface ChatMessage {
  userId: number;
  name: string;
  text: string;
  system?: boolean;
  timestamp: number;
}

export interface QueuedCommand {
  commandId: string;
  commandType: ClientMessage['type'];
  sentAt: number;
}

export interface PendingCommand extends QueuedCommand {
  transportStatus: 'queued' | 'received';
  receivedAt: number | null;
}

export type SendCommand = (message: ClientMessage) => string | null;

export type MessageHandlingResult = 'applied' | 'stale' | 'awaiting_snapshot';

interface ConnectionDetails {
  terminalReason?: TerminalConnectionReason | null;
  message?: string | null;
}

interface ProtocolErrorLike {
  code: string;
  message: string;
}

interface TableState {
  // Connection and synchronization
  tableId: string | null;
  connected: boolean;
  connectionState: ConnectionState;
  terminalReason: TerminalConnectionReason | null;
  connectionMessage: string | null;
  streamId: string | null;
  revision: number;
  snapshotRevision: number | null;

  // Table info
  tableName: string;
  seats: SeatData[];
  community: CardStr[];
  pots: PotData[];
  dealer: number;
  actionOn: number;
  street: Street;
  phase: HandPhase;
  myCards: CardStr[] | null;
  handNum: number;
  seedHash: string | null;
  serverSeed: string | null;
  blinds: { small: number; big: number };

  // Action prompt
  prompt: ActionPromptMsg | null;
  /** Kept through optimistic prompt hiding so send() can still echo its token. */
  activePrompt: ActionPromptMsg | null;
  promptTimerStart: number | null;
  actionTimeout: number;
  bankTimeSeat: number | null;

  // Showdown
  shownCards: Record<string, CardStr[]>;
  winners: WinnerInfo[];

  lastActions: Record<number, LastAction>;
  chatMessages: ChatMessage[];

  mySeat: number;
  myUserId: number | null;

  // Protocol and command outcomes
  lastError: string | null;
  lastErrorCode: string | null;
  pendingCommands: Record<string, PendingCommand>;
  lastAck: AckMsg | null;

  dealKey: number;
  handStartStacks: Record<number, number>;
  preAction: 'check_fold' | 'check' | 'call_any' | 'fold' | null;
  sitOutNext: boolean;
  foldToAnyBet: boolean;
  collectingBets: boolean;

  send: SendCommand | null;
  setSend: (fn: SendCommand | null) => void;
  recordCommand: (command: QueuedCommand) => void;
  recordProtocolError: (error: ProtocolErrorLike) => void;
  clearError: () => void;

  handleMessage: (msg: ServerMessage) => MessageHandlingResult;
  setConnectionState: (
    tableId: string,
    connectionState: ConnectionState,
    details?: ConnectionDetails,
  ) => void;
  /** Compatibility shim for callers that only know connected/disconnected. */
  setConnection: (tableId: string, connected: boolean) => void;
  setMyUserId: (userId: number) => void;
  reset: () => void;
}

function findMySeat(seats: SeatData[], userId: number | null): number {
  if (userId === null) return -1;
  return seats.findIndex((seat) => seat.user_id === userId);
}

function commandWithPrompt(
  action: ActionType,
  prompt: ActionPromptMsg,
): ClientMessage {
  return {
    type: 'action',
    action,
    ...(prompt.prompt_id ? { prompt_id: prompt.prompt_id } : {}),
    ...(prompt.turn_token ? { turn_token: prompt.turn_token } : {}),
  };
}

let collectTimeout: ReturnType<typeof setTimeout> | null = null;

function clearTransientTimers(): void {
  if (collectTimeout) {
    clearTimeout(collectTimeout);
    collectTimeout = null;
  }
}

const INITIAL_STATE = {
  tableId: null as string | null,
  connected: false,
  connectionState: 'idle' as ConnectionState,
  terminalReason: null as TerminalConnectionReason | null,
  connectionMessage: null as string | null,
  streamId: null as string | null,
  revision: -1,
  snapshotRevision: null as number | null,
  tableName: '',
  seats: [] as SeatData[],
  community: [] as CardStr[],
  pots: [] as PotData[],
  dealer: -1,
  actionOn: -1,
  street: 'preflop' as Street,
  phase: 'idle' as HandPhase,
  myCards: null as CardStr[] | null,
  handNum: 0,
  seedHash: null as string | null,
  serverSeed: null as string | null,
  blinds: { small: 0, big: 0 },
  prompt: null as ActionPromptMsg | null,
  activePrompt: null as ActionPromptMsg | null,
  promptTimerStart: null as number | null,
  actionTimeout: 30,
  bankTimeSeat: null as number | null,
  shownCards: {} as Record<string, CardStr[]>,
  winners: [] as WinnerInfo[],
  lastActions: {} as Record<number, LastAction>,
  chatMessages: [] as ChatMessage[],
  mySeat: -1,
  myUserId: null as number | null,
  lastError: null as string | null,
  lastErrorCode: null as string | null,
  pendingCommands: {} as Record<string, PendingCommand>,
  lastAck: null as AckMsg | null,
  send: null as SendCommand | null,
  dealKey: 0,
  handStartStacks: {} as Record<number, number>,
  preAction: null as 'check_fold' | 'check' | 'call_any' | 'fold' | null,
  sitOutNext: false,
  foldToAnyBet: false,
  collectingBets: false,
};

export const useTableStore = create<TableState>((set, get) => ({
  ...INITIAL_STATE,

  setSend: (fn) => set({ send: fn }),

  recordCommand: (command) => set((state) => {
    const recent = Object.fromEntries(
      Object.entries(state.pendingCommands)
        .filter(([, pending]) => Date.now() - pending.sentAt < 60_000)
        .slice(-49),
    );
    return {
      pendingCommands: {
        ...recent,
        [command.commandId]: {
          ...command,
          transportStatus: 'queued',
          receivedAt: null,
        },
      },
    };
  }),

  recordProtocolError: (error) => set({
    lastError: error.message,
    lastErrorCode: error.code,
  }),

  clearError: () => set({ lastError: null, lastErrorCode: null }),

  setConnectionState: (tableId, connectionState, details = {}) => set((state) => ({
    tableId,
    connectionState,
    connected: connectionState === 'connected',
    terminalReason: details.terminalReason
      ?? (connectionState === 'terminal' ? state.terminalReason : null),
    connectionMessage: details.message
      ?? (connectionState === 'connected' ? null : state.connectionMessage),
    // A new transport epoch may legitimately deliver the same authoritative
    // snapshot revision again. Clear only the per-connection duplicate marker.
    ...((connectionState === 'connecting' || connectionState === 'reconnecting')
      ? { snapshotRevision: null }
      : {}),
  })),

  setConnection: (tableId, connected) => get().setConnectionState(
    tableId,
    connected ? 'connected' : 'reconnecting',
  ),

  setMyUserId: (userId) => set((state) => ({
    myUserId: userId,
    mySeat: findMySeat(state.seats, userId),
  })),

  reset: () => {
    clearTransientTimers();
    set({ ...INITIAL_STATE });
  },

  handleMessage: (msg) => {
    const state = get();
    const decision = decideRevision(
      {
        streamId: state.streamId,
        revision: state.revision,
        snapshotRevision: state.snapshotRevision,
      },
      msg,
    );
    if (!decision.apply) {
      return decision.reason;
    }

    const revisionPatch = {
      streamId: decision.streamId,
      revision: decision.revision,
      snapshotRevision: decision.snapshotRevision,
    };

    switch (msg.type) {
      case 'table_state':
        clearTransientTimers();
        set({
          ...revisionPatch,
          connected: true,
          connectionState: 'connected',
          terminalReason: null,
          connectionMessage: null,
          tableName: msg.table_name,
          seats: msg.seats,
          community: msg.community,
          pots: msg.pots,
          dealer: msg.dealer,
          actionOn: msg.action_on,
          street: msg.street,
          phase: msg.phase,
          myCards: msg.your_cards,
          handNum: msg.hand_num,
          seedHash: msg.seed_hash,
          serverSeed: null,
          blinds: msg.blinds,
          mySeat: findMySeat(msg.seats, state.myUserId),
          shownCards: msg.shown_cards ?? {},
          winners: msg.winners ?? [],
          lastActions: {},
          ...(decision.streamChanged ? {
            chatMessages: [],
            pendingCommands: {},
            lastAck: null,
            lastError: null,
            lastErrorCode: null,
            handStartStacks: {},
          } : {}),
          prompt: null,
          activePrompt: null,
          promptTimerStart: null,
          bankTimeSeat: null,
          collectingBets: false,
        });
        break;

      case 'hand_start': {
        clearTransientTimers();
        const freshSeats = msg.seats ?? state.seats;
        const stacks: Record<number, number> = {};
        for (let index = 0; index < freshSeats.length; index += 1) {
          if (freshSeats[index].user_id !== null) {
            stacks[index] = freshSeats[index].stack ?? 0;
          }
        }
        set({
          ...revisionPatch,
          seats: freshSeats,
          mySeat: findMySeat(freshSeats, state.myUserId),
          handNum: msg.hand_num,
          seedHash: msg.seed_hash,
          serverSeed: null,
          dealer: msg.dealer,
          phase: 'dealing',
          street: 'preflop',
          actionOn: -1,
          community: [],
          pots: msg.pot ? [{ amount: msg.pot, eligible: [] }] : [],
          myCards: null,
          shownCards: {},
          winners: [],
          lastActions: {},
          prompt: null,
          activePrompt: null,
          promptTimerStart: null,
          bankTimeSeat: null,
          collectingBets: false,
          dealKey: state.dealKey + 1,
          handStartStacks: stacks,
          preAction: state.sitOutNext ? 'fold' : state.foldToAnyBet ? 'check_fold' : null,
          chatMessages: [
            ...state.chatMessages.slice(-99),
            {
              userId: 0,
              name: 'Dealer',
              text: `Hand #${msg.hand_num} started`,
              system: true,
              timestamp: Date.now(),
            },
          ],
        });
        break;
      }

      case 'deal':
        set({ ...revisionPatch, myCards: msg.cards, phase: 'dealing' });
        break;

      case 'community':
        if (collectTimeout) clearTimeout(collectTimeout);
        set({
          ...revisionPatch,
          collectingBets: true,
          community: msg.board,
          street: msg.street,
          phase: 'dealing',
          lastActions: {},
          prompt: null,
          activePrompt: null,
          promptTimerStart: null,
          bankTimeSeat: null,
        });
        collectTimeout = setTimeout(() => {
          collectTimeout = null;
          set((current) => ({
            seats: current.seats.map((seat) => ({ ...seat, current_bet: 0 })),
            collectingBets: false,
          }));
        }, 400);
        break;

      case 'player_action': {
        const newSeats = [...state.seats];
        const seat = newSeats[msg.seat];
        const playerName = seat?.name ?? `Seat ${msg.seat}`;
        if (seat) {
          newSeats[msg.seat] = {
            ...seat,
            stack: msg.stack,
            current_bet: msg.current_bet ?? seat.current_bet,
            status: msg.status ?? seat.status,
          };
        }
        const amount = msg.amount > 0 ? ` ${(msg.amount / 100).toLocaleString()} ISK` : '';
        const systemText = msg.action === 'fold' ? `${playerName} folds`
          : msg.action === 'check' ? `${playerName} checks`
          : msg.action === 'call' ? `${playerName} calls${amount}`
          : msg.action === 'bet' ? `${playerName} bets${amount}`
          : msg.action === 'raise' ? `${playerName} raises to${amount}`
          : msg.action === 'allin' ? `${playerName} goes all-in${amount}`
          : null;
        set({
          ...revisionPatch,
          phase: 'betting',
          seats: newSeats,
          pots: [{ amount: msg.pot, eligible: [] }],
          actionOn: msg.action_on ?? state.actionOn,
          prompt: null,
          activePrompt: null,
          promptTimerStart: null,
          lastActions: {
            ...state.lastActions,
            [msg.seat]: { action: msg.action, amount: msg.amount, timestamp: Date.now() },
          },
          ...(systemText ? {
            chatMessages: [
              ...state.chatMessages.slice(-99),
              { userId: 0, name: 'Dealer', text: systemText, system: true, timestamp: Date.now() },
            ],
          } : {}),
        });
        break;
      }

      case 'action_prompt': {
        const preAction = state.preAction;
        const send = state.send;
        if (preAction && send) {
          let action: ActionType | null = null;
          if (preAction === 'fold') action = 'fold';
          if ((preAction === 'check_fold' || preAction === 'check' || preAction === 'call_any')
              && msg.valid.includes('check')) {
            action = 'check';
          }
          if (action) {
            const enqueued = send(commandWithPrompt(action, msg));
            if (enqueued) {
              set({
                ...revisionPatch,
                preAction: null,
                phase: 'betting',
                activePrompt: msg,
              });
              break;
            }
          }
        }
        set({
          ...revisionPatch,
          phase: 'betting',
          prompt: msg,
          activePrompt: msg,
          promptTimerStart: Date.now(),
          actionTimeout: msg.timeout,
          bankTimeSeat: null,
          preAction: null,
        });
        break;
      }

      case 'hand_result': {
        clearTransientTimers();
        const winMessages = msg.winners.map((winner) => {
          const winnerName = state.seats[winner.seat]?.name ?? `Seat ${winner.seat}`;
          const hand = winner.hand ? ` with ${winner.hand}` : '';
          return {
            userId: 0,
            name: 'Dealer',
            text: `${winnerName} wins${hand}`,
            system: true as const,
            timestamp: Date.now(),
          };
        });
        set({
          ...revisionPatch,
          phase: 'showdown',
          community: msg.community,
          winners: msg.winners,
          shownCards: msg.shown_cards,
          serverSeed: msg.server_seed,
          pots: msg.pots,
          prompt: null,
          activePrompt: null,
          promptTimerStart: null,
          bankTimeSeat: null,
          actionOn: -1,
          collectingBets: false,
          chatMessages: [
            ...state.chatMessages.slice(-(100 - winMessages.length)),
            ...winMessages,
          ],
        });
        break;
      }

      case 'seat_update': {
        const newSeats = [...state.seats];
        if (msg.seat >= 0 && msg.seat < newSeats.length) newSeats[msg.seat] = msg;
        set({
          ...revisionPatch,
          seats: newSeats,
          mySeat: findMySeat(newSeats, state.myUserId),
        });
        break;
      }

      case 'chat':
        set({
          ...revisionPatch,
          chatMessages: [
            ...state.chatMessages.slice(-99),
            { userId: msg.user_id, name: msg.name, text: msg.text, timestamp: Date.now() },
          ],
        });
        break;

      case 'action_on':
        set({
          ...revisionPatch,
          phase: 'betting',
          actionOn: msg.seat,
          prompt: null,
          activePrompt: null,
          promptTimerStart: Date.now(),
          actionTimeout: msg.timeout,
          bankTimeSeat: null,
        });
        break;

      case 'bank_time_start':
        set({
          ...revisionPatch,
          actionOn: msg.seat,
          promptTimerStart: Date.now(),
          actionTimeout: msg.duration,
          bankTimeSeat: msg.seat,
        });
        break;

      case 'ack': {
        const pending = state.pendingCommands[msg.command_id];
        const pendingCommands = pending
          ? {
              ...state.pendingCommands,
              [msg.command_id]: {
                ...pending,
                transportStatus: 'received' as const,
                receivedAt: Date.now(),
              },
            }
          : state.pendingCommands;
        set({ ...revisionPatch, pendingCommands, lastAck: msg });
        break;
      }

      case 'error': {
        const pendingCommands = { ...state.pendingCommands };
        const pendingCommand = msg.command_id ? pendingCommands[msg.command_id] : undefined;
        const failedCommandType = pendingCommand?.commandType
          ?? (msg.command_id && state.lastAck?.command_id === msg.command_id
            ? state.lastAck.command_type
            : undefined);
        if (msg.command_id) delete pendingCommands[msg.command_id];
        const stalePrompt = msg.code === 'stale_prompt' || msg.code === 'prompt_token_mismatch';
        const restorePrompt = failedCommandType === 'action' && !stalePrompt
          ? state.activePrompt
          : null;
        set({
          ...revisionPatch,
          pendingCommands,
          lastError: msg.message,
          lastErrorCode: msg.code ?? 'LEGACY_SERVER_ERROR',
          ...(restorePrompt ? { prompt: restorePrompt } : {}),
          ...(stalePrompt ? { prompt: null, activePrompt: null } : {}),
        });
        break;
      }
    }

    return 'applied';
  },
}));

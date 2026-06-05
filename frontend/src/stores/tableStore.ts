/** Table game state — populated by WebSocket messages */

import { create } from 'zustand';
import type {
  SeatData, PotData, ActionPromptMsg, WinnerInfo,
  ServerMessage, ClientMessage,
} from '../types/ws';
import type { ActionType, CardStr, HandPhase, Street } from '../types/game';

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

interface TableState {
  // Connection
  tableId: string | null;
  connected: boolean;

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
  promptTimerStart: number | null;
  actionTimeout: number;
  bankTimeSeat: number | null;  // seat currently on its one-shot bank time

  // Showdown
  shownCards: Record<string, CardStr[]>;
  winners: WinnerInfo[];

  // Per-seat last action (for badges)
  lastActions: Record<number, LastAction>;

  // Chat
  chatMessages: ChatMessage[];

  // My seat (-1 if standing)
  mySeat: number;
  myUserId: number | null;

  // Errors
  lastError: string | null;

  // Deal animation trigger
  dealKey: number;

  // Stack snapshot at hand start for profit calculation
  handStartStacks: Record<number, number>;

  // Pre-action selection (before your turn)
  preAction: 'check_fold' | 'check' | 'call_any' | 'fold' | null;

  // Persistent toggles
  sitOutNext: boolean;
  foldToAnyBet: boolean;

  // Bet collection animation state
  collectingBets: boolean;

  // Send function (set by useWebSocket)
  send: ((msg: ClientMessage) => void) | null;
  setSend: (fn: (msg: ClientMessage) => void) => void;

  // Message handler
  handleMessage: (msg: ServerMessage) => void;
  setConnection: (tableId: string, connected: boolean) => void;
  setMyUserId: (userId: number) => void;
  reset: () => void;
}

function findMySeat(seats: SeatData[], userId: number | null): number {
  if (!userId) return -1;
  for (let i = 0; i < seats.length; i++) {
    if (seats[i].user_id === userId) return i;
  }
  return -1;
}

// Module-level timeout for bet collection animation (not in zustand — not serializable)
let _collectTimeout: ReturnType<typeof setTimeout> | null = null;

const INITIAL_STATE = {
  tableId: null as string | null,
  connected: false,
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
  send: null as ((msg: ClientMessage) => void) | null,
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
  setConnection: (tableId, connected) => set({ tableId, connected }),
  setMyUserId: (userId) => set({ myUserId: userId }),

  reset: () => set({ ...INITIAL_STATE }),

  handleMessage: (msg: ServerMessage) => {
    const state = get();

    switch (msg.type) {
      case 'table_state':
        set({
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
          blinds: msg.blinds,
          mySeat: findMySeat(msg.seats, state.myUserId),
          // Clear stale state on full snapshot
          shownCards: {},
          winners: [],
          lastActions: {},
          prompt: null,
          promptTimerStart: null,
          bankTimeSeat: null,
        });
        break;

      case 'hand_start': {
        // Use fresh seat data from server if provided, otherwise keep current
        const freshSeats = msg.seats ?? state.seats;
        // Snapshot stacks for profit calculation
        const stacks: Record<number, number> = {};
        for (let i = 0; i < freshSeats.length; i++) {
          if (freshSeats[i].user_id !== null) {
            stacks[i] = freshSeats[i].stack ?? 0;
          }
        }
        set({
          seats: freshSeats,
          mySeat: findMySeat(freshSeats, state.myUserId),
          handNum: msg.hand_num,
          seedHash: msg.seed_hash,
          serverSeed: null,
          dealer: msg.dealer,
          community: [],
          pots: msg.pot ? [{ amount: msg.pot, eligible: [] }] : [],
          myCards: null,
          shownCards: {},
          winners: [],
          lastActions: {},
          prompt: null,
          promptTimerStart: null,
          bankTimeSeat: null,
          dealKey: state.dealKey + 1,
          handStartStacks: stacks,
          preAction: state.sitOutNext ? 'fold' : state.foldToAnyBet ? 'check_fold' : null,
          chatMessages: [
            ...state.chatMessages.slice(-99),
            { userId: 0, name: 'Dealer', text: `Hand #${msg.hand_num} started`, system: true, timestamp: Date.now() },
          ],
        });
        break;
      }

      case 'deal':
        set({ myCards: msg.cards });
        break;

      case 'community': {
        // Show community cards IMMEDIATELY — never delay card display.
        // Only the bet-clearing animation is deferred.
        const boardSnapshot = msg.board;
        const clearedSeats = state.seats.map(s => ({ ...s, current_bet: 0 }));
        if (_collectTimeout) clearTimeout(_collectTimeout);
        set({
          collectingBets: true,
          community: boardSnapshot,
          street: msg.street,
          lastActions: {},
        });
        _collectTimeout = setTimeout(() => {
          _collectTimeout = null;
          set({
            seats: clearedSeats,
            collectingBets: false,
          });
        }, 400);
        break;
      }

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
        // System chat for all actions
        const amtStr = msg.amount > 0 ? ` ${(msg.amount / 100).toLocaleString()} ISK` : '';
        const sysMsg = msg.action === 'fold' ? `${playerName} folds`
          : msg.action === 'check' ? `${playerName} checks`
          : msg.action === 'call' ? `${playerName} calls${amtStr}`
          : msg.action === 'bet' ? `${playerName} bets${amtStr}`
          : msg.action === 'raise' ? `${playerName} raises to${amtStr}`
          : msg.action === 'allin' ? `${playerName} goes all-in${amtStr}`
          : null;
        set({
          seats: newSeats,
          // Update pot from server
          pots: msg.pot != null ? [{ amount: msg.pot, eligible: [] }] : state.pots,
          // Update whose turn it is
          actionOn: msg.action_on ?? state.actionOn,
          lastActions: {
            ...state.lastActions,
            [msg.seat]: {
              action: msg.action,
              amount: msg.amount,
              timestamp: Date.now(),
            },
          },
          ...(sysMsg ? {
            chatMessages: [
              ...state.chatMessages.slice(-99),
              { userId: 0, name: 'Dealer', text: sysMsg, system: true, timestamp: Date.now() },
            ],
          } : {}),
        });
        break;
      }

      case 'action_prompt': {
        const pa = state.preAction;
        const sendFn = state.send;

        // Auto-fire pre-action ONLY for zero-cost actions (check, fold)
        // Never auto-call — the bet size may have changed since pre-action was set
        if (pa && sendFn) {
          const validActions = msg.valid as string[];
          let fired = false;

          if (pa === 'fold') {
            // Sit out — always fold
            sendFn({ type: 'action', action: 'fold' });
            fired = true;
          } else if (pa === 'check_fold') {
            if (validActions.includes('check')) {
              sendFn({ type: 'action', action: 'check' });
              fired = true;
            }
            // Don't auto-fold — show the prompt so player can reconsider
          } else if (pa === 'check') {
            if (validActions.includes('check')) {
              sendFn({ type: 'action', action: 'check' });
              fired = true;
            }
          } else if (pa === 'call_any') {
            if (validActions.includes('check')) {
              sendFn({ type: 'action', action: 'check' });
              fired = true;
            }
            // Don't auto-call — show prompt so player sees the amount first
          }

          if (fired) {
            set({ preAction: null });
            break;
          }
        }

        set({
          prompt: msg,
          promptTimerStart: Date.now(),
          bankTimeSeat: null,
          preAction: null, // clear pre-action when prompt shows
        });
        break;
      }

      case 'hand_result': {
        const winMsgs = (msg.winners ?? []).map((w) => {
          const wName = state.seats[w.seat]?.name ?? `Seat ${w.seat}`;
          const handStr = w.hand ? ` with ${w.hand}` : '';
          return { userId: 0, name: 'Dealer', text: `${wName} wins${handStr}`, system: true as const, timestamp: Date.now() };
        });
        set({
          community: msg.community,
          winners: msg.winners,
          shownCards: msg.shown_cards,
          serverSeed: msg.server_seed,
          pots: msg.pots ?? state.pots,
          prompt: null,
          promptTimerStart: null,
          actionOn: -1,
          chatMessages: [
            ...state.chatMessages.slice(-(100 - winMsgs.length)),
            ...winMsgs,
          ],
        });
        break;
      }

      case 'seat_update': {
        const newSeats = [...state.seats];
        if (msg.seat >= 0 && msg.seat < newSeats.length) {
          newSeats[msg.seat] = msg;
        }
        set({
          seats: newSeats,
          mySeat: findMySeat(newSeats, state.myUserId),
        });
        break;
      }

      case 'chat':
        set({
          chatMessages: [
            ...state.chatMessages.slice(-99),
            { userId: msg.user_id, name: msg.name, text: msg.text, timestamp: Date.now() },
          ],
        });
        break;

      case 'action_on':
        set({
          actionOn: msg.seat,
          promptTimerStart: Date.now(),
          actionTimeout: msg.timeout ?? 30,
          bankTimeSeat: null,  // fresh turn → base timer
        });
        break;

      case 'bank_time_start':
        // The base timer expired; restart the ring (amber) for the bank window.
        set({
          actionOn: msg.seat,
          promptTimerStart: Date.now(),
          actionTimeout: msg.duration ?? 15,
          bankTimeSeat: msg.seat,
        });
        break;

      case 'error':
        set({ lastError: msg.message });
        // Auto-clear after 5 seconds
        setTimeout(() => {
          if (get().lastError === msg.message) {
            set({ lastError: null });
          }
        }, 5000);
        break;

      default:
        // Unknown message type — log for debugging
        console.warn('[WS] Unknown message type:', (msg as { type?: string }).type);
        break;
    }
  },
}));

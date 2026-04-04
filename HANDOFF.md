# pokerin.space — Handoff Document (Updated 2026-04-04)

## What This Is
An EVE Online ISK poker site. Texas Hold'em, real ISK stakes. Players log in via EVE SSO, deposit ISK to POKER IN SPACE character, play poker, withdraw winnings. House earns via rake (percentage of each pot, no cap).

## Current Status

### What's Working
- **Backend**: Fully deployed at `pokerin.space` on Hetzner CX22 (204.168.202.11)
- **EVE SSO**: Players log in with EVE characters, JWT auth
- **5 poker tables**: Micro (50K/100K), Small (250K/500K), Medium (1M/2M), High (5M/10M), Whale (25M/50M)
- **Poker engine**: Full NLHE state machine — blinds, betting, side pots, showdown, hand evaluation
- **BankService**: DB-backed buy-in/cash-out with SELECT FOR UPDATE
- **Hand history**: Persisted to DB after each hand
- **Deposit worker**: Polls ALL pages of ESI wallet journal, matches by sender character_id, persists last_ref_id across restarts
- **In-process bot system**: Bots run as asyncio tasks inside the server, no WebSocket needed. Admin API to start/stop.
- **Admin panel**: Full admin page at /admin with user management, withdrawal processing, hand history, rake stats, bot controls
- **Frontend**: React + Vite + TypeScript + Tailwind + Zustand
  - Login page with How It Works section
  - Lobby (table list), cashier (deposit/withdraw), stats (hand history)
  - Poker table: Stake-style UI with floating bet chips, SB/BB labels, dealer button, chat panel, side menu
  - Action panel: compact bottom-right, fold/check/call/raise with bet presets
  - Seat timer bar under active player, persistent action badges
  - Deal animation, community card animations, pot counter animation
  - Pre-action buttons (check/fold, check, call any)
  - Hand strength indicator
  - About page with HyperNet comparison, skill argument, casino history, ToS analysis, CCP message
  - Toast notifications, error handling, loading skeletons, responsive design

### Known Issues / Still TODO
- **H10**: Winner's stack doesn't visually update at showdown until next hand. Server needs to broadcast seat_updates after pot distribution.
- **Bot QA**: 1 bot works, but iterative testing (1→2→3→...→9 bots) hasn't been completed.
- **No rate limiting** on any endpoint (slowapi not installed).
- **Sit-out timer** not implemented — players can squat seats indefinitely.
- **React Error Boundary** not added — unhandled JS exception = white screen.

### Bugs Fixed (from 10-agent audit)
Full audit at `C:\ENI\eve\pokerin\AUDIT.md` — 63 findings, 40 fixed, 22 won't-fix, 1 partial.

Key fixes:
- All-in players no longer folded on disconnect
- Reconnecting players no longer force-folded (handle_disconnect only fires for actual disconnects)
- Disconnected players' stacks credited to bank before seat removal
- Stale total_bet/current_bet cleared between hands
- Table crash now refunds all player stacks
- esi_ref_id has UNIQUE constraint (no double-credit)
- JWT secret validated at startup
- Ban enforced on WebSocket AND REST API
- Bot create can't impersonate real users
- Stand_up blocked during all active hand phases
- Broadcast disconnect passes WS identity
- Deposit worker paginates all ESI journal pages
- Deposit worker persists last_ref_id across restarts
- Deposit worker auto-restarts on crash
- Shutdown credits after task cancellation (no double-credit)
- Malformed JSON doesn't kill WS connection
- Withdrawal has 100K ISK minimum and 5 pending max
- Admin credit can't go below zero balance

## Architecture

```
Browser (React SPA at pokerin.space)
    |
    v
Caddy (auto-SSL, serves frontend, proxies API/WS)
    |
    v
Uvicorn (single worker, FastAPI)
    ├── REST: /auth/*, /api/*, /api/admin/*
    ├── WebSocket: /ws/table/{id}?token=jwt
    ├── Poker tables: asyncio task per table
    ├── Bot service: asyncio tasks, direct table access
    ├── Deposit worker: polls ESI every 60s (with auto-restart)
    └── DB: PostgreSQL 16 + Redis 7 (Redis unused)
```

## Server Access

```bash
ssh -i ~/.ssh/pokerin_hetzner root@204.168.202.11
cd /home/pokerin/app
docker compose logs app --tail 50
docker compose exec postgres psql -U pokerin
docker compose up -d --build app
```

### Deploying Frontend
```bash
cd C:/ENI/eve/pokerin/frontend
npm run build
ssh -i ~/.ssh/pokerin_hetzner root@204.168.202.11 "rm -rf /home/pokerin/app/frontend_dist/*"
scp -i ~/.ssh/pokerin_hetzner -r dist/. root@204.168.202.11:/home/pokerin/app/frontend_dist/
```

### Deploying Backend
```bash
scp -i ~/.ssh/pokerin_hetzner <changed_files> root@204.168.202.11:/home/pokerin/app/backend/...
ssh -i ~/.ssh/pokerin_hetzner root@204.168.202.11 "cd /home/pokerin/app && docker compose up -d --build app"
```

### Starting Bots
```bash
# Get admin token
ssh -i ~/.ssh/pokerin_hetzner root@204.168.202.11 'cd /home/pokerin/app && docker compose exec app python3 -c "from backend.auth.jwt import create_token; print(create_token(1, 2116875456, \"Darothius Inkunen\"))"'

# Start 1 bot on micro
curl -X POST "https://pokerin.space/api/admin/bots/start?table_id=micro-1&count=1" -H "Authorization: Bearer <token>"

# Stop bots
curl -X POST "https://pokerin.space/api/admin/bots/stop?table_id=micro-1" -H "Authorization: Bearer <token>"
```

## Key Files

### Backend (C:\ENI\eve\pokerin\backend\)
- `main.py` — FastAPI app, lifespan, table configs, JWT validation, deposit supervisor
- `config.py` — pydantic-settings, all env vars
- `deps.py` — get_current_user (with ban check), get_admin_user
- `auth/router.py` — EVE SSO login/callback (with ban check)
- `auth/jwt.py` — JWT create/decode
- `poker/table.py` — Core state machine (~950 lines). Key: _bot_users set, async _cleanup_disconnected, auto-check timeout
- `poker/evaluator.py` — phevaluator wrapper
- `services/bank.py` — BankService with debit/credit/save_hand/record_rake
- `services/bot_service.py` — In-process bots, admin start/stop, direct table interaction
- `services/table_manager.py` — Table lifecycle, crash recovery with stack refunds
- `services/deposit_worker.py` — ESI polling, all pages, persisted last_ref_id
- `ws/router.py` — WebSocket endpoint, ban check, JSON error handling
- `ws/manager.py` — ConnectionManager, disconnect returns bool, broadcast passes ws identity
- `api/admin.py` — Full admin API (users, withdrawals, bots, rake, hands, deposits)

### Frontend (C:\ENI\eve\pokerin\frontend\src\)
- `main.tsx` — JWT extraction with history.replaceState (no token in history)
- `stores/tableStore.ts` — Full game state, pre-actions, bet collection animation, actionOn from player_action
- `hooks/useWebSocket.ts` — Reconnecting WS hook
- `components/table/` — PokerTable, Felt, Seat (with timer), ActionPanel, PreActionBar, BetChip, DealAnimation, ChatPanel, SideMenu
- `components/about/AboutPage.tsx` — Public-facing About page
- `components/admin/AdminPage.tsx` — Admin dashboard
- `components/stats/StatsPage.tsx` — Player stats + hand history (no rake shown)

## EVE SSO Apps
1. **pokerin.space** (player login): Client ID `6451d04f10a34d24afae4328ff3e7a32`
2. **pokerin-bank** (bank character): Client ID `018838babf9943a2a3644af51eae2197`

## Bank Character
- **Name**: POKER IN SPACE
- **Character ID**: 2124265885

## Table Stakes (ISK-cents, no rake cap)
| Table | Blinds | Buy-in | Rake |
|-------|--------|--------|------|
| Micro | 50K/100K | 4M–10M | 5% |
| Small | 250K/500K | 20M–50M | 4% |
| Medium | 1M/2M | 80M–200M | 3.5% |
| High | 5M/10M | 400M–1B | 3% |
| Whale | 25M/50M | 2B–5B | 2.5% |

## Database
8 tables: users (with is_admin, is_bot), deposit_codes (unused), device_fingerprints, transactions (with UNIQUE esi_ref_id), withdrawals, hands, hand_players, hand_actions

Migrations: initial + is_admin/is_bot columns + esi_ref_id unique constraint

## Rake Visibility Policy
Rake is NEVER shown to players. "Rake" renamed to "Table Fee" in transaction labels. Rake column removed from player-facing hand history. hand_result WS message strips rake before broadcast. Only visible in admin panel.

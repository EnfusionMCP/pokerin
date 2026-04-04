/** REST API response types — mirrors backend Pydantic schemas */

export interface TableInfo {
  table_id: string;
  name: string;
  game_type: string;
  max_seats: number;
  small_blind: number;
  big_blind: number;
  min_buyin: number;
  max_buyin: number;
  player_count: number;
  avg_pot: number;
}

export interface BalanceResponse {
  balance: number;
}

export interface WithdrawRequest {
  amount: number;
}

export interface WithdrawResponse {
  withdrawal_id: number;
  amount: number;
  status: string;
}

export interface TransactionItem {
  id: number;
  type: string;
  amount: number;
  balance_after: number;
  reference_id: string | null;
  created_at: string;
}

export interface HandSummary {
  id: number;
  table_id: string;
  hand_number: number;
  community_cards: string | null;
  pot_total: number;
  rake_taken: number;
  started_at: string;
  ended_at: string;
  server_seed_hash: string;
}

// Admin types

export interface AdminUser {
  id: number;
  character_id: number;
  character_name: string;
  balance: number;
  is_banned: boolean;
  is_bot: boolean;
  is_admin: boolean;
  created_at: string | null;
}

export interface AdminWithdrawal {
  id: number;
  user_id: number;
  character_name: string;
  amount: number;
  created_at: string | null;
}

export interface AdminHandSummary {
  id: number;
  table_id: string;
  hand_number: number;
  community_cards: string | null;
  pot_total: number;
  rake_taken: number;
  player_count: number;
  started_at: string;
  ended_at: string;
}

export interface AdminHandPlayer {
  user_id: number;
  character_name: string;
  seat: number;
  hole_cards: string | null;
  starting_stack: number;
  ending_stack: number;
  net_won: number;
  is_winner: boolean;
}

export interface AdminHandAction {
  user_id: number;
  character_name: string;
  seat: number;
  street: string;
  action: string;
  amount: number;
  order: number;
}

export interface AdminHandDetail {
  id: number;
  table_id: string;
  hand_number: number;
  community_cards: string | null;
  pot_total: number;
  rake_taken: number;
  started_at: string;
  ended_at: string;
  server_seed: string;
  server_seed_hash: string;
  players: AdminHandPlayer[];
  actions: AdminHandAction[];
}

export interface AdminDeposit {
  id: number;
  user_id: number;
  character_name: string;
  amount: number;
  balance_after: number;
  created_at: string | null;
}

export interface AdminRakeStats {
  total_rake: number;
}

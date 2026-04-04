/** Game enums matching backend poker/types.py */

export type SeatStatus = 'empty' | 'waiting' | 'active' | 'folded' | 'allin' | 'sitting_out';
export type HandPhase = 'idle' | 'posting' | 'dealing' | 'betting' | 'showdown' | 'complete';
export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

/** 2-char card string: rank + suit, e.g. "Ah", "Td", "2c" */
export type CardStr = string;

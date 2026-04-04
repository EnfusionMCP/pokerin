/** Card parsing and display helpers */

const RANK_NAMES: Record<string, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
  '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A',
};

const SUIT_SYMBOLS: Record<string, string> = {
  'h': '\u2665', // ♥
  'd': '\u2666', // ♦
  'c': '\u2663', // ♣
  's': '\u2660', // ♠
};

const SUIT_COLORS: Record<string, string> = {
  'h': '#dc2626', // red
  'd': '#dc2626', // red
  'c': '#1a1a1a', // black
  's': '#1a1a1a', // black
};

export interface ParsedCard {
  rank: string;
  suit: string;
  rankDisplay: string;
  suitSymbol: string;
  color: string;
}

export function parseCard(cardStr: string): ParsedCard {
  const rank = cardStr[0];
  const suit = cardStr[1];
  return {
    rank,
    suit,
    rankDisplay: RANK_NAMES[rank] ?? rank,
    suitSymbol: SUIT_SYMBOLS[suit] ?? suit,
    color: SUIT_COLORS[suit] ?? '#e5e5e5',
  };
}

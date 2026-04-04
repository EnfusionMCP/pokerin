/** Client-side hand strength evaluation.
 *
 * Not a full poker hand evaluator — pattern matches hole cards + community
 * to determine the current hand category and relevant cards.
 * Used for the "One Pair: 9s" indicator during play.
 */

const RANK_ORDER = '23456789TJQKA';
const RANK_NAMES: Record<string, string> = {
  '2': '2s', '3': '3s', '4': '4s', '5': '5s', '6': '6s', '7': '7s',
  '8': '8s', '9': '9s', 'T': '10s', 'J': 'Jacks', 'Q': 'Queens', 'K': 'Kings', 'A': 'Aces',
};

interface ParsedCard {
  rank: number; // 2-14 (2=2, 14=A)
  suit: string;
  label: string; // original rank char
}

function parseRank(r: string): number {
  const idx = RANK_ORDER.indexOf(r);
  return idx >= 0 ? idx + 2 : 0;
}

function parseCards(cards: string[]): ParsedCard[] {
  return cards.map(c => ({
    rank: parseRank(c[0]),
    suit: c[1],
    label: c[0],
  }));
}

function rankName(r: string): string {
  return RANK_NAMES[r] ?? r;
}

function highRankLabel(rank: number): string {
  return RANK_ORDER[rank - 2] ?? '?';
}

export function evaluateHandStrength(holeCards: string[], community: string[]): string {
  if (holeCards.length < 2) return '';

  const all = parseCards([...holeCards, ...community]);
  if (all.length < 2) return '';

  // Count ranks and suits
  const rankCounts: Record<number, number> = {};
  const suitCounts: Record<string, number> = {};
  for (const c of all) {
    rankCounts[c.rank] = (rankCounts[c.rank] ?? 0) + 1;
    suitCounts[c.suit] = (suitCounts[c.suit] ?? 0) + 1;
  }

  const ranks = Object.entries(rankCounts)
    .map(([r, count]) => ({ rank: Number(r), count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  // Check flush (5+ of same suit)
  const flushSuit = Object.entries(suitCounts).find(([, c]) => c >= 5)?.[0];
  const isFlush = !!flushSuit;

  // Check straight
  const uniqueRanks = [...new Set(all.map(c => c.rank))].sort((a, b) => b - a);
  let straightHigh = 0;

  // Check for A-2-3-4-5 (wheel)
  if (uniqueRanks.includes(14) && uniqueRanks.includes(2) && uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
    straightHigh = 5;
  }

  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
      straightHigh = Math.max(straightHigh, uniqueRanks[i]);
      break;
    }
  }

  const isStraight = straightHigh > 0;

  // Straight flush check
  if (isFlush && isStraight) {
    const flushCards = all.filter(c => c.suit === flushSuit);
    const flushRanks = [...new Set(flushCards.map(c => c.rank))].sort((a, b) => b - a);
    let sfHigh = 0;
    if (flushRanks.includes(14) && flushRanks.includes(2) && flushRanks.includes(3) && flushRanks.includes(4) && flushRanks.includes(5)) {
      sfHigh = 5;
    }
    for (let i = 0; i <= flushRanks.length - 5; i++) {
      if (flushRanks[i] - flushRanks[i + 4] === 4) {
        sfHigh = Math.max(sfHigh, flushRanks[i]);
        break;
      }
    }
    if (sfHigh > 0) {
      return sfHigh === 14 ? 'Royal Flush' : `Straight Flush: ${highRankLabel(sfHigh)} high`;
    }
  }

  // Four of a kind
  const quads = ranks.find(r => r.count >= 4);
  if (quads) return `Four of a Kind: ${rankName(highRankLabel(quads.rank))}`;

  // Full house
  const trips = ranks.find(r => r.count >= 3);
  const pair = ranks.find(r => r.count >= 2 && r.rank !== trips?.rank);
  if (trips && pair) return `Full House: ${rankName(highRankLabel(trips.rank))} full of ${rankName(highRankLabel(pair.rank))}`;

  // Flush
  if (isFlush) return `Flush: ${highRankLabel(Math.max(...all.filter(c => c.suit === flushSuit).map(c => c.rank)))} high`;

  // Straight
  if (isStraight) return `Straight: ${highRankLabel(straightHigh)} high`;

  // Three of a kind
  if (trips) return `Three of a Kind: ${rankName(highRankLabel(trips.rank))}`;

  // Two pair
  const pairs = ranks.filter(r => r.count >= 2);
  if (pairs.length >= 2) {
    const sorted = pairs.sort((a, b) => b.rank - a.rank);
    return `Two Pair: ${rankName(highRankLabel(sorted[0].rank))} & ${rankName(highRankLabel(sorted[1].rank))}`;
  }

  // One pair
  if (pairs.length === 1) return `One Pair: ${rankName(highRankLabel(pairs[0].rank))}`;

  // High card
  const highest = Math.max(...all.map(c => c.rank));
  return `High Card: ${highRankLabel(highest)}`;
}

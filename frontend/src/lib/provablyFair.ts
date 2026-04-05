/**
 * Provably fair verification — HMAC-SHA256 deterministic deck reproduction.
 *
 * Matches the Python backend algorithm exactly:
 *   key   = raw bytes from hex seed
 *   msg   = "{table_id}:{hand_number}:{counter}" as UTF-8
 *   hmac  = HMAC-SHA256(key, msg)
 *   j     = first 4 bytes as big-endian uint32, mod (i+1)
 */

const SUITS = ['c', 'd', 'h', 's'] as const;
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;

/** Canonical 52-card ordering — must match Python's ALL_CARDS exactly. */
const ALL_CARDS: string[] = [];
for (const suit of SUITS) {
  for (const rank of RANKS) {
    ALL_CARDS.push(rank + suit);
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Reproduce the exact deck order from a revealed server seed. */
export async function reproduceShuffle(
  serverSeed: string,
  tableId: string,
  handNumber: number,
): Promise<string[]> {
  const keyBytes = hexToBytes(serverSeed);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );

  const cards = [...ALL_CARDS];
  const encoder = new TextEncoder();
  let counter = 0;

  for (let i = cards.length - 1; i > 0; i--) {
    const msg = encoder.encode(`${tableId}:${handNumber}:${counter}`);
    const hmacResult = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, msg));
    const value = (hmacResult[0] << 24) | (hmacResult[1] << 16) | (hmacResult[2] << 8) | hmacResult[3];
    const j = (value >>> 0) % (i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
    counter++;
  }

  return cards;
}

/** Verify that SHA-256(serverSeed) matches the committed hash. */
export async function verifySeedHash(
  serverSeed: string,
  expectedHash: string,
): Promise<boolean> {
  const data = new TextEncoder().encode(serverSeed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hashBuffer)) === expectedHash;
}

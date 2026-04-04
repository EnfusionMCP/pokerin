/** ISK formatting — all backend values are ISK-cents (ISK * 100) */

export function formatIsk(cents: number): string {
  if (cents === 0 || !isFinite(cents)) return '0 ISK';
  const isk = cents / 100;
  return isk.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ISK';
}

export function formatIskCompact(cents: number): string {
  if (cents === 0 || !isFinite(cents)) return '0';
  const isk = cents / 100;
  const abs = Math.abs(isk);
  const sign = isk < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return sign + (abs / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(1) + 'K';
  return isk.toFixed(0);
}

export function formatIskShort(cents: number): string {
  if (cents === 0 || !isFinite(cents)) return '0';
  const isk = cents / 100;
  const abs = Math.abs(isk);
  const sign = isk < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return sign + (abs / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return sign + Math.round(abs / 1_000) + 'K';
  return isk.toFixed(0);
}

export function formatBlinds(smallCents: number, bigCents: number): string {
  return `${formatIskShort(smallCents)}/${formatIskShort(bigCents)}`;
}

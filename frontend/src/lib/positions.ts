/** 9-max seat positions around the oval table.
 *
 * Seats are placed on the actual ellipse using parametric math,
 * then pulled inward so they sit inside the felt, not on the border.
 * getPositions() rotates so the hero seat is always at bottom-center.
 */

interface SeatPosition {
  x: number;  // % from left
  y: number;  // % from top
}

// Ellipse center and radii (in % of the container).
// The felt is a rounded-[50%] div filling the container,
// so the ellipse radii are half the container dimensions.
const CX = 50;
const CY = 50;
const RX = 42;  // horizontal radius (pulled in from 50 to stay inside border)
const RY = 38;  // vertical radius (pulled in from 50 to stay inside border)

/**
 * Build base positions for N seats evenly spaced on the ellipse.
 * Angle 0 = bottom-center (6 o'clock), going clockwise.
 */
function buildBase(n: number): SeatPosition[] {
  const seats: SeatPosition[] = [];
  for (let i = 0; i < n; i++) {
    // Start at bottom (π/2) and go clockwise (subtract because CSS y-axis is flipped)
    const angle = (Math.PI / 2) - (2 * Math.PI * i) / n;
    seats.push({
      x: CX + RX * Math.cos(angle),
      y: CY - RY * Math.sin(angle),
    });
  }
  return seats;
}

/**
 * Get seat positions rotated so heroSeat is at bottom-center.
 * Returns an array indexed by actual seat number.
 */
export function getPositions(heroSeat: number, maxSeats: number = 9): SeatPosition[] {
  const base = buildBase(maxSeats);
  const positions: SeatPosition[] = [];
  for (let i = 0; i < maxSeats; i++) {
    const visualIdx = (i - heroSeat + maxSeats) % maxSeats;
    positions.push(base[visualIdx]);
  }
  return positions;
}

/**
 * Portrait stadium felt positions for mobile — 8 villain seats at top arc, hero at bottom.
 * Ellipse: rx=40%, ry=32%, center at (50%, 42%).
 */
const PORTRAIT_CX = 50;
const PORTRAIT_CY = 42;
const PORTRAIT_RX = 40;
const PORTRAIT_RY = 32;

function buildBasePortrait(n: number): SeatPosition[] {
  // Villains line the top arc (10°→170°); hero is appended at bottom-center.
  const villainCount = n - 1;
  const seats: SeatPosition[] = [];

  for (let i = 0; i < villainCount; i++) {
    // Spread evenly across the arc. Guard the heads-up case (villainCount===1)
    // where dividing by (villainCount-1) would be a division by zero → NaN;
    // a single villain sits at the top-center (90°).
    const frac = villainCount === 1 ? 0.5 : i / (villainCount - 1);
    const angle = (10 + 160 * frac) * (Math.PI / 180);
    seats.push({
      x: PORTRAIT_CX + PORTRAIT_RX * Math.cos(angle),
      y: PORTRAIT_CY - PORTRAIT_RY * Math.sin(angle),
    });
  }

  // Hero at bottom-center.
  seats.push({ x: PORTRAIT_CX, y: PORTRAIT_CY + PORTRAIT_RY });

  return seats;
}

export function getPositionsPortrait(heroSeat: number, maxSeats: number = 9): SeatPosition[] {
  const base = buildBasePortrait(maxSeats);          // [villain0..villainN-1, hero]
  const villainCount = maxSeats - 1;
  const heroPos = base[villainCount];
  const positions: SeatPosition[] = [];
  for (let i = 0; i < maxSeats; i++) {
    if (i === heroSeat) {
      positions.push(heroPos);
    } else {
      // Map the (maxSeats-1) villain seats bijectively onto base[0..villainCount-1].
      // Subtract 1 so the seat immediately clockwise of the hero lands on base[0],
      // with no collision and no skipped index.
      const villainVisualIdx = ((i - heroSeat - 1 + maxSeats) % maxSeats) % villainCount;
      positions.push(base[villainVisualIdx]);
    }
  }
  return positions;
}

/**
 * Get the position for a player's bet chip, floating between seat and center.
 */
export function getBetPosition(seatPos: SeatPosition): SeatPosition {
  const centerX = 50;
  const centerY = 42;
  const t = 0.40;
  return {
    x: seatPos.x + (centerX - seatPos.x) * t,
    y: seatPos.y + (centerY - seatPos.y) * t,
  };
}

/**
 * Get the position for the dealer button — offset to the clockwise side of the seat,
 * pushed well away so it never overlaps the nameplate or stack.
 */
export function getDealerPosition(seatPos: SeatPosition, cx: number = CX, cy: number = CY): SeatPosition {
  const dx = cx - seatPos.x;
  const dy = cy - seatPos.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular (clockwise) + inward toward center
  const perpX = -dy / len;
  const perpY = dx / len;
  return {
    x: seatPos.x + perpX * 10 + dx * 0.18,
    y: seatPos.y + perpY * 10 + dy * 0.18,
  };
}

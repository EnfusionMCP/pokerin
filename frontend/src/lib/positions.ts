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
export function getDealerPosition(seatPos: SeatPosition): SeatPosition {
  const dx = CX - seatPos.x;
  const dy = CY - seatPos.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular (clockwise) + inward toward center
  const perpX = -dy / len;
  const perpY = dx / len;
  return {
    x: seatPos.x + perpX * 10 + dx * 0.18,
    y: seatPos.y + perpY * 10 + dy * 0.18,
  };
}

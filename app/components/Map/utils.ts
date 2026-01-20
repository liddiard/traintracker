import { MEMO_ZOOM_THRESHOLD } from './constants'

/**
 * Check if two coordinate arrays are equal (by value)
 */
export function coordsAreEqual(
  prev: number[] | null | undefined,
  next: number[] | null | undefined,
): boolean {
  if (prev === next) return true
  if (!prev || !next) return prev === next
  return prev[0] === next[0] && prev[1] === next[1]
}

/**
 * Check if zoom change is below threshold (effectively equal for rendering purposes)
 */
export function zoomIsEffectivelyEqual(
  prevZoom: number,
  nextZoom: number,
  threshold = MEMO_ZOOM_THRESHOLD,
): boolean {
  return Math.abs(prevZoom - nextZoom) < threshold
}

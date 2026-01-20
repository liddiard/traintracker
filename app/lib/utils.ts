// Backend-safe utility functions

/**
 * Rounds a number to a specified number of decimal places.
 *
 * @param num Number to round
 * @param decimals Number of decimal places to round to
 * @returns Rounded number
 */
export const roundToDecimals = (num: number, decimals: number): number => {
  const factor = Math.pow(10, decimals)
  return Math.round(num * factor) / factor
}

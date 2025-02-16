export const headingToRotationMap: Record<string, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
}

// minimum completion of the progress bar to avoid display issues with border-radius
export const MIN_PROGRESS_PX = 16

export const TRAIN_SEARCH_PARAMS = ['from', 'to', 'trainName', 'trainNumber']

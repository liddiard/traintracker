// map from 2-letter code to Amtraker API route name
export const codeToRouteMap: Record<string, string> = {
  AC: 'Acela',
  AD: 'Adirondack',
  CA: 'Amtrak Cascades',
  HL: 'Amtrak Hartford Line',
  AT: 'Auto Train',
  BF: 'Berkshire Flyer',
  BR: 'Borealis',
  BL: 'Brightline',
  CZ: 'California Zephyr',
  CC: 'Capitol Corridor',
  CD: 'Cardinal',
  CL: 'Carolinian',
  NO: 'City of New Orleans',
  CS: 'Coast Starlight',
  CR: 'Crescent',
  DE: 'Downeaster',
  EB: 'Empire Builder',
  ES: 'Empire Service',
  EA: 'Ethan Allen Express',
  FL: 'Floridian',
  HF: 'Heartland Flyer',
  HW: 'Hiawatha',
  IL: 'Illini',
  IZ: 'Illinois Zephyr',
  KS: 'Keystone',
  LS: 'Lake Shore Limited',
  LI: 'Lincoln Service',
  LR: 'Lincoln River Runner',
  ML: 'Maple Leaf',
  MS: 'Michigan Services',
  MR: 'Missouri River Runner',
  NE: 'Northeast Regional',
  PM: 'Palmetto',
  PS: 'Pacific Surfliner',
  PA: 'Pennsylvanian',
  PD: 'Piedmont',
  SJ: 'San Joaquins',
  SM: 'Silver Meteor',
  SC: 'Southwest Chief',
  SL: 'Sunset Limited',
  TE: 'Texas Eagle',
  VF: 'Valley Flyer',
  VT: 'Vermonter',
  WL: 'Wolverine',
}

export const routeToCodeMap = Object.fromEntries(
  Object.entries(codeToRouteMap).map(([code, route]) => [route, code]),
)

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

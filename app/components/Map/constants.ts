// at this and higher map zoom levels, extrapolate train positions and show their
// headings with an arrow
export const DETAIL_ZOOM_LEVEL = 8

// Zoom threshold for skipping React.memo re-renders on minor zoom changes
export const MEMO_ZOOM_THRESHOLD = 0.5

// how often to recalculate extrapolated train positions in ms
export const TRAIN_UPDATE_FREQ = 5000

// MapLibre layer data sources
export const sourceId = {
  track: 'track',
  stations: 'stations',
  stationLabels: 'station-labels',
  trains: 'trains',
  trainGPS: 'train-gps',
}

// map from API route name to 2-letter code (arbitrarily chosen by me)
export const routeToCodeMap: Record<string, string> = {
  // Amtrak
  Acela: 'AC',
  Adirondack: 'AD',
  'Amtrak Cascades': 'CA',
  'Amtrak Hartford Line': 'HL',
  'Auto Train': 'AT',
  'Berkshire Flyer': 'BF',
  'Blue Water': 'BW',
  'Blue Water/Michigan Service': 'BW',
  Borealis: 'BA',
  Brightline: 'BL',
  'California Zephyr': 'CZ',
  'Capitol Corridor': 'CC',
  Cardinal: 'CD',
  Carolinian: 'CL',
  'Carolinian / Piedmont': 'CL',
  'City of New Orleans': 'NO',
  'Coast Starlight': 'CS',
  Crescent: 'CR',
  Downeaster: 'DE',
  'Empire Builder': 'EB',
  'Empire Service': 'ES',
  'Ethan Allen Express': 'EA',
  Floridian: 'FL',
  'Gold Runner': 'GR',
  'Heartland Flyer': 'HF',
  Hiawatha: 'HW',
  Illini: 'IL',
  'Illinois Zephyr': 'IZ',
  'Illinois Zephyr/Carl Sandburg': 'IZ',
  Keystone: 'KS',
  'Lake Shore Limited': 'LS',
  'Lincoln Service': 'LN',
  'Lincoln Service/Illinois Service': 'LN',
  'Lincoln Service/Michigan Service': 'LN',
  'Lincoln Service Missouri River Runner': 'LN',
  'Lincoln River Runner': 'LR',
  'Maple Leaf': 'ML',
  'Mardi Gras Service': 'MG',
  'Michigan Services': 'MS',
  'Missouri River Runner': 'MR',
  'Northeast Regional': 'NE',
  Palmetto: 'PM',
  'Pacific Surfliner': 'PS',
  Pennsylvanian: 'PA',
  'Pere Marquette/Michigan Service': 'PM',
  Piedmont: 'PD',
  'Carl Sandburg': 'SB',
  Saluki: 'SU',
  'Saluki/Illinois Service': 'SU',
  'San Joaquins': 'SJ',
  'Silver Meteor': 'SM',
  'Southwest Chief': 'SC',
  'Sunset Limited': 'SL',
  'Texas Eagle': 'TE',
  'Valley Flyer': 'VF',
  Vermonter: 'VT',
  'Winter Park Express': 'WP',
  Wolverine: 'WV',
  'Wolverine/Michigan Service': 'WV',

  // VIA Rail
  Canadian: 'CN',
  Corridor: 'CR',
  Ocean: 'OC',
  'Jasper–Prince Rupert': 'JP',
  'Montreal–Jonquière': 'MJ',
  'Montreal–Senneterre': 'MS',
  'Sudbury–White River': 'SW',
  'Winnipeg–Churchill': 'WC',
  'The Pas–Pukatawagan': 'PP',
}

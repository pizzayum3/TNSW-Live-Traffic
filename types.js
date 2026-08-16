// Mirrors the TYPES config in index.html so embed colors match the website exactly.
const graded = (mod) => [
  { id: 'heavy', label: 'Heavy', color: '#8B1E1E' },
  { id: 'moderate', label: 'Moderate', color: mod },
  { id: 'low', label: 'Low', color: '#9AA5B1' },
];
const binary = (active) => [{ id: 'active', label: 'Active', color: active }];
const water = () => [
  { id: 'major', label: 'Major', color: '#8B1E1E' },
  { id: 'moderate', label: 'Moderate', color: '#1958c9' },
  { id: 'minor', label: 'Minor', color: '#9AA5B1' },
];
const rfs = () => [
  { id: 'advice', label: 'Advice', color: '#E8B923' },
  { id: 'watch_act', label: 'Watch and Act', color: '#E8781F' },
  { id: 'emergency', label: 'Emergency', color: '#C8202F' },
];

export const ENDED_COLOR = '#B9C0C9';

export const TYPES = [
  { id: 'crash', label: 'Crash', icon: '🚗', levels: graded('#E8B923') },
  { id: 'breakdown', label: 'Breakdown', icon: '🔧', levels: graded('#E8B923') },
  { id: 'hazard', label: 'General Hazard', icon: '⚠️', levels: graded('#E8B923') },
  { id: 'roadwork', label: 'Roadwork', icon: '🚧', levels: graded('#E8781F') },
  { id: 'traffic_conditions', label: 'Changed Traffic Conditions', icon: 'ℹ️', levels: graded('#E8781F') },
  { id: 'closure', label: 'Road Closure', icon: '⛔', levels: binary('#C8202F') },
  { id: 'traffic_lights', label: 'Traffic Lights Fault', icon: '🚦', levels: graded('#E8B923') },
  { id: 'event', label: 'Public Event', icon: '⭐', levels: binary('#1958c9') },
  { id: 'fire', label: 'Fire', icon: '🔥', levels: binary('#C8202F') },
  { id: 'flood', label: 'Flood', icon: '🌊', levels: binary('#1958c9') },
  { id: 'water_level', label: 'Water Level Indicator', icon: '📊', levels: water() },
  { id: 'snow_ice', label: 'Snow / Ice', icon: '❄️', levels: binary('#1958c9') },
  { id: 'weather', label: 'Adverse Weather', icon: '🌧️', levels: binary('#1958c9') },
  { id: 'rfs', label: 'Rural Fire Service', icon: '🔺', levels: rfs() },
];

export function typeInfo(id) {
  return TYPES.find((t) => t.id === id) || TYPES[0];
}
export function levelInfo(type, levelId) {
  const t = typeInfo(type);
  return t.levels.find((l) => l.id === levelId) || t.levels[0];
}
export function colorInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}
// Matches the filenames written by generate_icons.mjs into assets/icons/
export function iconFileName(typeId, levelId, isResolved) {
  return isResolved ? `${typeId}_ended.png` : `${typeId}_${levelId}.png`;
}

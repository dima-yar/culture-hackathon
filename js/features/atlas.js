/**
 * Atlas logic (no DOM): map styles, states, administrative units and cities for a year,
 * plus point-in-territory lookups. Data comes from js/data/atlas (imported from Okraina).
 *
 * Heavy geometry is loaded on demand:
 *   await loadAtlasBase()     geography + states (overview level)  — before the map is drawn
 *   await loadStateDetail()   finer state borders                   — when the user zooms in
 *   await loadAdminUnits()    administrative division               — when the layer is switched on
 */

import { POLITIES } from '../data/atlas/polities.js';
import { CITIES } from '../data/atlas/cities.js';
import { MAP_STYLES } from '../data/atlas/styles.js';

/* ---------- decoding ---------- */

/** Rings and lines are stored as integer deltas in thousandths of a degree (see tools/okraina/geometry.py). */
export function decodeRing(encoded) {
  const ring = new Array(encoded.length / 2);
  let lon = 0;
  let lat = 0;
  for (let i = 0; i < encoded.length; i += 2) {
    lon += encoded[i];
    lat += encoded[i + 1];
    ring[i / 2] = [lon / 1000, lat / 1000];
  }
  return ring;
}

const decodeShapes = shapes => shapes.map(shape => ({ ...shape, rings: shape.rings.map(decodeRing) }));

/* ---------- lazy data ---------- */

const data = {
  geography: null,
  stateShapes: { overview: null, detail: null },
  statePeriods: null,
  admin: null, // { systems, units, periods }
};
const loading = {};

const once = (key, loader) => {
  loading[key] ??= loader();
  return loading[key];
};

export function loadAtlasBase() {
  return Promise.all([
    once('geography', () => import('../data/atlas/geography.js').then(module => {
      const { land, lakes, rivers, source } = module.GEOGRAPHY;
      data.geography = {
        source,
        land: land.map(decodeRing),
        lakes: lakes.map(decodeRing),
        rivers: rivers.map(river => ({ rank: river.rank, points: decodeRing(river.points) })),
      };
    })),
    once('states', () => import('../data/atlas/states.js').then(module => {
      data.stateShapes.overview = decodeShapes(module.STATE_SHAPES);
      data.statePeriods = module.STATE_PERIODS;
    })),
  ]);
}

export const loadStateDetail = () => once('stateDetail', () => import('../data/atlas/states-detail.js').then(module => {
  data.stateShapes.detail = decodeShapes(module.STATE_SHAPES);
}));

export const loadAdminUnits = () => once('admin', () => import('../data/atlas/admin.js').then(module => {
  data.admin = {
    systems: module.ADMIN_SYSTEMS,
    units: decodeShapes(module.ADMIN_UNITS),
    periods: module.ADMIN_PERIODS,
  };
}));

export const getGeography = () => data.geography;
export const isStateDetailLoaded = () => Boolean(data.stateShapes.detail);
export const isAdminLoaded = () => Boolean(data.admin);

/* ---------- styles ---------- */

/** Map palette of the epoch: the latest style that started on or before `year`. */
export const getStyleForYear = year =>
  MAP_STYLES.reduce((current, style) => (style.fromYear <= year ? style : current), MAP_STYLES[0]);

/* ---------- geometry helpers ---------- */

const coversYear = (period, year) => period.from <= year && (period.to === null || year < period.to);

/** Even-odd point-in-polygon over all rings (holes included), points as [lon, lat]. */
function isInside([lon, lat], rings) {
  let inside = false;
  rings.forEach(ring => {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
  });
  return inside;
}

/* ---------- states ---------- */

export const findPolity = id => POLITIES.find(polity => polity.id === id);

const getStatePeriod = year => data.statePeriods?.find(period => coversYear(period, year)) || null;

/**
 * States present in `year`, sorted for drawing (lower z first).
 * `level` picks the border detail; falls back to the overview while the detail is loading.
 * @returns {Array<{ polity, rings, label: [lon, lat, km²] | undefined, surveyed: boolean }>}
 */
export function getPolitiesAt(year, level = 'overview') {
  const period = getStatePeriod(year);
  if (!period) return [];
  const shapes = data.stateShapes[level] || data.stateShapes.overview;

  return period.shapes
    .map(index => {
      const polity = findPolity(shapes[index].polity);
      return polity && {
        polity,
        rings: shapes[index].rings,
        label: period.labels[polity.id],
        surveyed: period.surveyed.includes(polity.id),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.polity.z - b.polity.z);
}

/** Legend order: states of the Ukrainian line first, then the rest by name. */
export const getLegend = year => getPolitiesAt(year)
  .map(entry => entry.polity)
  .sort((a, b) => Number(b.ukrainian) - Number(a.ukrainian) || a.name.localeCompare(b.name, 'uk'));

/** The state that holds a point in `year` (highest z wins), or null. */
export function getPolityAtPoint(point, year) {
  const holders = getPolitiesAt(year).filter(entry => isInside(point, entry.rings));
  return holders.length ? holders[holders.length - 1].polity : null;
}

/** Continuous years the state existed around `year`, e.g. "1667–1764" or "з 1991". */
export function getShapePeriod(polity, year) {
  const periods = data.statePeriods || [];
  const index = periods.indexOf(getStatePeriod(year));
  if (index < 0) return '';

  const shapes = data.stateShapes.overview;
  const hasPolity = period => period.shapes.some(shapeIndex => shapes[shapeIndex].polity === polity.id);
  let first = index;
  let last = index;
  while (first > 0 && hasPolity(periods[first - 1])) first -= 1;
  while (last < periods.length - 1 && hasPolity(periods[last + 1])) last += 1;

  const end = periods[last].to;
  return end === null ? `з ${periods[first].from}` : `${periods[first].from}–${end}`;
}

/** True when the state's border in `year` follows surveyed OpenHistoricalMap lines. */
export const isSurveyed = (polity, year) => Boolean(getStatePeriod(year)?.surveyed.includes(polity.id));

/* ---------- administrative division ---------- */

const findSystem = id => data.admin?.systems.find(system => system.id === id);

/**
 * Administrative units in `year` (requires loadAdminUnits()).
 * @returns {Array<{ key, system, unit: { id, name, seat }, rings, surveyed }>}
 */
export function getAdminUnitsAt(year) {
  if (!data.admin) return [];
  const period = data.admin.periods.find(item => coversYear(item, year));
  if (!period) return [];

  return period.units.map(index => {
    const shape = data.admin.units[index];
    const system = findSystem(shape.system);
    return {
      key: `${shape.system}/${shape.unit}`,
      system,
      unit: system.units[shape.unit],
      rings: shape.rings,
      surveyed: shape.surveyed,
    };
  });
}

/** Unit by key "<systemId>/<unitIndex>" in `year`. */
export const findAdminUnit = (key, year) => getAdminUnitsAt(year).find(unit => unit.key === key) || null;

/** The administrative unit that contains a point in `year`, or null. */
export const getAdminUnitAtPoint = (point, year) =>
  getAdminUnitsAt(year).find(unit => isInside(point, unit.rings)) || null;

/** Systems active in `year`, e.g. "Воєводства Речі Посполитої". */
export function getAdminSystemsAt(year) {
  const seen = new Map();
  getAdminUnitsAt(year).forEach(unit => seen.set(unit.system.id, unit.system));
  return [...seen.values()];
}

/* ---------- cities ---------- */

const isCityVisible = (city, year) => city.year <= year && (!city.toYear || year <= city.toYear);

export const getCitiesAt = year => CITIES.filter(city => isCityVisible(city, year));

export const findCity = id => CITIES.find(city => city.id === id);

/** Name of the city in `year` (cities are renamed on historical dates). */
export const getCityName = (city, year) =>
  city.names.reduce((name, entry) => (entry.from <= year ? entry.name : name), city.names[0].name);

/** Earlier names, e.g. for Dnipro: ["Катеринослав", "Дніпропетровськ"]. */
export function getFormerNames(city, year) {
  const current = getCityName(city, year);
  return [...new Set(city.names.filter(entry => entry.from <= year).map(entry => entry.name))]
    .filter(name => name !== current);
}

/** Visible cities that lie in the territory of `polity` in `year`, biggest first. */
export const getCitiesOfPolity = (polity, year, limit = 8) => getCitiesAt(year)
  .filter(city => getPolityAtPoint(city.point, year)?.id === polity.id)
  .sort((a, b) => a.rank - b.rank)
  .slice(0, limit);

/** Visible cities inside an administrative unit, biggest first. */
export const getCitiesOfAdminUnit = (unit, year, limit = 8) => getCitiesAt(year)
  .filter(city => isInside(city.point, unit.rings))
  .sort((a, b) => a.rank - b.rank)
  .slice(0, limit);

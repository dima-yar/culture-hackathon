/**
 * SVG layers of the atlas. Every function returns an SVG string; map-view.js puts it into the right <g>.
 * Heavy territory paths are built once per shape and cached.
 */

import { escapeHtml } from '../../core/utils.js';
import { getYearLabel } from '../../data/events.js';
import { getAdminUnitsAt, getCitiesAt, getCityName, getGeography, getPolitiesAt } from '../../features/atlas.js';
import { MAP_HEIGHT, MAP_WIDTH, project, toLinePath, toPolygonPath } from './projection.js';

/** States smaller than this get no name label. */
const MIN_LABEL_AREA_KM2 = 3000;
/** Ring radius around a place that has several events. */
const PIN_RING_BASE = 24;

const isOnSheet = ([x, y]) => x > 0 && x < MAP_WIDTH && y > 0 && y < MAP_HEIGHT;

/** Natural Earth rank → stroke width: lower rank = bigger river. */
const riverWidth = rank => Math.max(0.5, 2.6 - rank * 0.3);

/** Territories have tens of thousands of points; their SVG paths are built once and reused. */
const pathCache = new WeakMap();

function getTerritoryPath(rings) {
  if (!pathCache.has(rings)) pathCache.set(rings, toPolygonPath(rings));
  return pathCache.get(rings);
}

/* ---------- static ---------- */

export function renderGeography() {
  const { land, lakes, rivers } = getGeography();
  const landPath = toPolygonPath(land);

  return `
    <defs>
      <clipPath id="atlas-land-clip"><path d="${landPath}"/></clipPath>
    </defs>
    <rect class="atlas__sea" width="${MAP_WIDTH}" height="${MAP_HEIGHT}"/>
    <path class="atlas__land" d="${landPath}"/>
    <g id="atlas-polities" clip-path="url(#atlas-land-clip)"></g>
    <g id="atlas-admin" clip-path="url(#atlas-land-clip)"></g>
    <path class="atlas__lake" d="${toPolygonPath(lakes)}"/>
    <g class="atlas__rivers">
      ${rivers.map(river => `<path class="atlas__river" d="${toLinePath(river.points)}" style="stroke-width: ${riverWidth(river.rank)}"/>`).join('')}
    </g>
    <g id="atlas-polity-labels"></g>
    <g id="atlas-admin-labels"></g>
    <g id="atlas-cities"></g>
    <g id="atlas-pins"></g>`;
}

/* ---------- states ---------- */

export function renderPolities(entries, selectedPolityId) {
  return entries.map(({ polity, rings }) => {
    const modifiers = [
      polity.ukrainian && 'atlas__polity--ukrainian',
      polity.id === selectedPolityId && 'atlas__polity--selected',
    ].filter(Boolean).join(' ');

    return `
      <path class="atlas__polity ${modifiers}" data-polity="${polity.id}" d="${getTerritoryPath(rings)}"
            style="--polity-color: ${polity.color}">
        <title>${escapeHtml(polity.name)}</title>
      </path>`;
  }).join('');
}

/** State names at Okraina's label spots; font size follows the area and shrinks as you zoom in. */
export function renderPolityLabels(year, zoom) {
  return getPolitiesAt(year).map(({ polity, label }) => {
    if (!label) return '';
    const [lon, lat, areaKm2] = label;
    const point = project([lon, lat]);
    if (!isOnSheet(point) || areaKm2 < MIN_LABEL_AREA_KM2) return '';

    const size = Math.min(17, 8 + Math.sqrt(areaKm2) / 70) / zoom;
    return `
      <text class="atlas__polity-label ${polity.ukrainian ? 'atlas__polity-label--ukrainian' : ''}"
            x="${point[0].toFixed(1)}" y="${point[1].toFixed(1)}" style="font-size: ${size.toFixed(2)}px">
        ${escapeHtml(polity.name.toUpperCase())}
      </text>`;
  }).join('');
}

/* ---------- administrative division ---------- */

export function renderAdminUnits(units, selectedKey) {
  return units.map(unit => `
    <path class="atlas__admin-unit ${unit.key === selectedKey ? 'atlas__admin-unit--selected' : ''}"
          data-admin="${unit.key}" d="${getTerritoryPath(unit.rings)}">
      <title>${escapeHtml(unit.unit.name)}</title>
    </path>`).join('');
}

/** Unit names at their seats, shown from a little zoom on so the map stays readable. */
export function renderAdminLabels(year, zoom) {
  if (zoom < 1.4) return '';
  return getAdminUnitsAt(year).map(({ unit }) => {
    if (!unit.seat) return '';
    const point = project(unit.seat);
    if (!isOnSheet(point)) return '';
    return `
      <text class="atlas__admin-label" x="${point[0].toFixed(1)}" y="${(point[1] - 6 / zoom).toFixed(1)}"
            style="font-size: ${(10 / zoom).toFixed(2)}px">${escapeHtml(unit.name)}</text>`;
  }).join('');
}

/* ---------- cities ---------- */

const CITY_RADIUS = { 1: 4.2, 2: 3.2, 3: 2.5, 4: 2, 5: 1.8 };
/** Up to which rank cities are labelled, depending on zoom. */
const labelledRank = zoom => (zoom >= 3 ? 5 : zoom >= 1.8 ? 3 : 2);

export function renderCities(year, zoom, selectedCityId) {
  const maxLabelRank = labelledRank(zoom);

  return getCitiesAt(year)
    .sort((a, b) => b.rank - a.rank) // big cities on top
    .map(city => {
      const [x, y] = project(city.point);
      const radius = (CITY_RADIUS[city.rank] || 2) / Math.sqrt(zoom);
      const name = getCityName(city, year);
      const selected = city.id === selectedCityId ? 'atlas__city--selected' : '';
      const label = city.rank <= maxLabelRank
        ? `<text class="atlas__city-label atlas__city-label--rank-${city.rank}" x="${(x + radius + 2 / zoom).toFixed(1)}" y="${(y + 3.5 / zoom).toFixed(1)}"
                 style="font-size: ${((city.rank === 1 ? 12.5 : 10.5) / zoom).toFixed(2)}px">${escapeHtml(name)}</text>`
        : '';

      return `
        <g class="atlas__city ${selected}" data-city="${city.id}">
          <circle class="atlas__city-hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(9 / zoom).toFixed(2)}"/>
          <circle class="atlas__city-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(2)}"/>
          ${label}
          <title>${escapeHtml(name)} — натисни, щоб побачити історію</title>
        </g>`;
    }).join('');
}

/* ---------- event pins ---------- */

/**
 * @param {Array} visibleEvents — events of the time window
 * @param {Array} pastEvents — older events, drawn as small dots
 */
export function renderPins({ visibleEvents, pastEvents, zoom, selectedEventId, exploredEvents }) {
  const scale = 0.75 / zoom ** 0.8;
  const latest = visibleEvents[visibleEvents.length - 1];

  const pastDots = pastEvents.map(event => {
    const [x, y] = project(event.point);
    return `<circle class="atlas__past-event" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(3 / Math.sqrt(zoom)).toFixed(2)}"/>`;
  }).join('');

  // Events of one place are spread on a ring so they don't overlap.
  const byPlace = new Map();
  visibleEvents.forEach(event => {
    const key = event.point.join();
    if (!byPlace.has(key)) byPlace.set(key, []);
    byPlace.get(key).push(event);
  });

  const pins = [...byPlace.values()].flatMap(group => group.map((event, index) => {
    let [x, y] = project(event.point);
    let connector = '';

    if (group.length > 1) {
      const angle = (index / group.length) * 2 * Math.PI - Math.PI / 2;
      const radius = (PIN_RING_BASE + group.length * 6) * scale;
      const [cx, cy] = [x, y];
      x += Math.cos(angle) * radius;
      y += Math.sin(angle) * radius;
      connector = `<line class="pin__connector" x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
    }

    const modifiers = [
      event === latest && 'pin--latest',
      event.id === selectedEventId && 'pin--selected',
      exploredEvents[event.id] && 'pin--seen',
    ].filter(Boolean).join(' ');

    return `${connector}
      <g class="pin ${modifiers}" data-event="${event.id}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(3)})">
        <circle class="pin__circle" r="18"/>
        <text class="pin__icon" y="6">${event.icon}</text>
        <text class="pin__year" y="36">${getYearLabel(event)}</text>
        <title>${escapeHtml(event.title)}</title>
      </g>`;
  }));

  return pastDots + pins.join('');
}

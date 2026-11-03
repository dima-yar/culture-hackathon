/**
 * Projection of [lon, lat] onto the SVG sheet.
 * Equirectangular with the x axis scaled by cos(48.5°), which keeps Ukraine's shape close to a conic map.
 */

export const VIEW = { west: 20, east: 42, south: 43.3, north: 53.9 };

const CENTER_LATITUDE = 48.5;
const SCALE = 50; // px per degree of latitude
const X_SCALE = SCALE * Math.cos((CENTER_LATITUDE * Math.PI) / 180);

export const MAP_WIDTH = Math.round((VIEW.east - VIEW.west) * X_SCALE);
export const MAP_HEIGHT = Math.round((VIEW.north - VIEW.south) * SCALE);

export const project = ([lon, lat]) => [(lon - VIEW.west) * X_SCALE, (VIEW.north - lat) * SCALE];

const formatPoint = point => project(point).map(n => n.toFixed(1)).join(',');

/** Closed SVG path for one or more rings. */
export const toPolygonPath = rings => rings.map(ring => `M${ring.map(formatPoint).join('L')}Z`).join('');

/** Open SVG path for a line. */
export const toLinePath = points => `M${points.map(formatPoint).join('L')}`;

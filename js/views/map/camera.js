/**
 * Map camera: zoom (wheel, buttons), drag to pan, smooth fly-to. Works by changing the SVG viewBox.
 */

import { MAP_HEIGHT, MAP_WIDTH, project } from './projection.js';

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const WHEEL_STEP = 1.2;
const DRAG_THRESHOLD_PX = 4;
const FLY_DURATION_MS = 700;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * @param {SVGSVGElement} svg
 * @param {(zoom: number) => void} onZoomChange — called when the zoom level changes (labels re-scale)
 */
export function createCamera(svg, onZoomChange) {
  // Center of the view in map pixels + zoom level.
  let view = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, zoom: 1 };
  let lastZoom = 1;
  let animation = null;
  let dragged = false;

  const apply = () => {
    const width = MAP_WIDTH / view.zoom;
    const height = MAP_HEIGHT / view.zoom;
    view.x = clamp(view.x, width / 2, MAP_WIDTH - width / 2);
    view.y = clamp(view.y, height / 2, MAP_HEIGHT - height / 2);
    svg.setAttribute('viewBox', `${view.x - width / 2} ${view.y - height / 2} ${width} ${height}`);

    if (view.zoom !== lastZoom) {
      lastZoom = view.zoom;
      onZoomChange(view.zoom);
    }
  };

  const stopAnimation = () => {
    if (animation) cancelAnimationFrame(animation);
    animation = null;
  };

  /** Screen point → map pixels. */
  const toMapPoint = (clientX, clientY) => {
    const rect = svg.getBoundingClientRect();
    const width = MAP_WIDTH / view.zoom;
    const height = MAP_HEIGHT / view.zoom;
    return {
      x: view.x - width / 2 + ((clientX - rect.left) / rect.width) * width,
      y: view.y - height / 2 + ((clientY - rect.top) / rect.height) * height,
    };
  };

  /** Zoom keeping the map point under (clientX, clientY) in place. */
  function zoomAt(factor, clientX, clientY) {
    stopAnimation();
    const rect = svg.getBoundingClientRect();
    const anchorX = clientX ?? rect.left + rect.width / 2;
    const anchorY = clientY ?? rect.top + rect.height / 2;
    const before = toMapPoint(anchorX, anchorY);

    view.zoom = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    const after = toMapPoint(anchorX, anchorY);
    view.x += before.x - after.x;
    view.y += before.y - after.y;
    apply();
  }

  /** Smoothly move to a [lon, lat] point at the given zoom. */
  function flyTo(point, zoom = 2.4) {
    stopAnimation();
    const [targetX, targetY] = project(point);
    const start = { ...view };
    const target = { x: targetX, y: targetY, zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) };
    const startTime = performance.now();

    const step = now => {
      const t = easeInOut(Math.min(1, (now - startTime) / FLY_DURATION_MS));
      view = {
        x: start.x + (target.x - start.x) * t,
        y: start.y + (target.y - start.y) * t,
        zoom: start.zoom + (target.zoom - start.zoom) * t,
      };
      apply();
      animation = t < 1 ? requestAnimationFrame(step) : null;
    };
    animation = requestAnimationFrame(step);
  }

  function reset() {
    stopAnimation();
    view = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, zoom: 1 };
    apply();
  }

  /* ---------- pointer input ---------- */

  svg.addEventListener('wheel', event => {
    event.preventDefault();
    zoomAt(event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP, event.clientX, event.clientY);
  }, { passive: false });

  let dragStart = null;

  svg.addEventListener('pointerdown', event => {
    stopAnimation();
    dragged = false;
    dragStart = { clientX: event.clientX, clientY: event.clientY, x: view.x, y: view.y };
  });

  svg.addEventListener('pointermove', event => {
    if (!dragStart) return;
    const dx = event.clientX - dragStart.clientX;
    const dy = event.clientY - dragStart.clientY;
    if (!dragged && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

    if (!dragged) svg.setPointerCapture(event.pointerId);
    dragged = true;
    const rect = svg.getBoundingClientRect();
    view.x = dragStart.x - (dx / rect.width) * (MAP_WIDTH / view.zoom);
    view.y = dragStart.y - (dy / rect.height) * (MAP_HEIGHT / view.zoom);
    apply();
  });

  const endDrag = () => {
    dragStart = null;
  };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  apply();

  return {
    zoomIn: () => zoomAt(1.5),
    zoomOut: () => zoomAt(1 / 1.5),
    reset,
    flyTo,
    getZoom: () => view.zoom,
    /** True if the last pointer gesture was a drag (so the click should be ignored). */
    wasDragged: () => dragged,
  };
}

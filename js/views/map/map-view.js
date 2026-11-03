/**
 * Map screen: Okraina-style historical atlas with a year slider.
 *
 * - map style (palette) follows the epoch
 * - states as coloured territories (exact borders, finer level when zoomed in), legend and state cards
 * - administrative division of the year (lands, voivodeships, regiments, gubernias, oblasts)
 * - cities appear at their first mention and are renamed on historical dates; click → history and legends
 * - event pins of a time window, history tour, zoom / pan / fullscreen
 *
 * Optimisation: heavy layers (states, admin units) are redrawn only when the set of territories changes,
 * labels / cities / pins are cheap and follow every year or zoom change (at most once per frame).
 */

import { $, $$, escapeHtml, plural } from '../../core/utils.js';
import { state, saveState } from '../../core/state.js';
import { emit, on } from '../../core/events.js';
import { addXp, unlockAchievement } from '../../core/progress.js';
import { XP_REWARD } from '../../data/achievements.js';
import { ERAS, EVENTS, MAX_YEAR, MIN_YEAR, findEvent, getYearLabel } from '../../data/events.js';
import { MAP_STYLES } from '../../data/atlas/styles.js';
import {
  findAdminUnit, findCity, findPolity, getAdminUnitsAt, getPolitiesAt, getStyleForYear,
  isAdminLoaded, isStateDetailLoaded, loadAdminUnits, loadAtlasBase, loadStateDetail,
} from '../../features/atlas.js';
import { loadResearch } from '../../features/research.js';
import { isLessonActive } from '../../lesson/player.js';
import { MAP_HEIGHT, MAP_WIDTH } from './projection.js';
import { createCamera } from './camera.js';
import {
  renderAdminLabels, renderAdminUnits, renderCities, renderGeography, renderPins, renderPolities, renderPolityLabels,
} from './atlas-layers.js';
import {
  renderAdminCard, renderCityCard, renderEventCard, renderHelpCard, renderLegend, renderPolityCard,
} from './info-cards.js';
import { isCityHistoryOpen, openCityHistory } from './city-history.js';
import { createTour } from './tour.js';

/** Events younger than this (in years) are pins, older ones grey dots. */
const YEAR_WINDOW = 120;
const EVENTS_FOR_ACHIEVEMENT = 5;
const TOUR_ZOOM = 2.6;
/** From this zoom level on, the finer state borders are used. */
const DETAIL_ZOOM = 1.8;

const LAYERS = [
  { id: 'polities', label: 'Держави' },
  { id: 'admin', label: 'Адмінподіл' },
  { id: 'cities', label: 'Міста' },
  { id: 'events', label: 'Події' },
];

let currentYear = 988;
/** @type {{ type: 'event' | 'city' | 'polity' | 'admin', id: string } | null} */
let selection = null;
const visibleLayers = { polities: true, admin: false, cities: true, events: true };

let camera = null;
let pendingFrame = null;
let lastEventWasNew = false;
/** Year the side panel was last rendered for. */
let panelYear = null;
/** What the heavy layers currently show, to skip identical redraws. */
const drawn = { polities: null, admin: null };

const tour = createTour({
  onStep: showTourStep,
  onStop: () => renderPanel(),
});

const isMapVisible = () => $('#view-map').classList.contains('view--active');
const exploredCount = () => EVENTS.filter(event => state.exploredEvents[event.id]).length;
const isInWindow = (event, year) => event.year <= year && event.year > year - YEAR_WINDOW;
const yearToPercent = year => ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
const selectedId = type => (selection?.type === type ? selection.id : null);

/** Same territories (by identity) and same selection → nothing to redraw. */
const isSameDrawing = (previous, rings, selected) => previous
  && previous.selected === selected
  && previous.rings.length === rings.length
  && previous.rings.every((item, index) => item === rings[index]);

/* ---------- static markup ---------- */

function renderSlider() {
  const styleMarks = MAP_STYLES
    .filter(style => style.fromYear > MIN_YEAR)
    .map(style => `
      <span class="year-slider__style-mark" style="left: ${yearToPercent(style.fromYear)}%" title="${escapeHtml(style.name)}">
        ${style.fromYear}
      </span>`).join('');

  const eventMarks = [...new Set(EVENTS.map(event => event.year))]
    .map(year => `<i class="year-slider__event-mark" style="left: ${yearToPercent(year)}%"></i>`)
    .join('');

  return `
    <div class="year-slider">
      <div class="year-slider__head">
        <b class="year-slider__year" id="atlas-year-label"></b>
        <span class="year-slider__style" id="atlas-style-name"></span>
        <small class="year-slider__info" id="atlas-window-info"></small>
      </div>
      <div class="year-slider__row">
        <button class="btn btn--ghost btn--small" id="atlas-prev" title="Попередня подія (←)">◀</button>
        <div class="year-slider__track">
          <input class="year-slider__input" id="atlas-year" type="range" min="${MIN_YEAR}" max="${MAX_YEAR}" step="1" aria-label="Рік">
          <div class="year-slider__marks">${eventMarks}</div>
          <div class="year-slider__styles">${styleMarks}</div>
        </div>
        <button class="btn btn--ghost btn--small" id="atlas-next" title="Наступна подія (→)">▶</button>
      </div>
    </div>`;
}

function renderMapCard() {
  return `
    <div class="card atlas-card" id="atlas-card">
      <div class="atlas" id="atlas">
        <svg class="atlas__svg" id="atlas-svg" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" preserveAspectRatio="xMidYMid meet"
             role="img" aria-label="Історична карта українських земель">
          ${renderGeography()}
        </svg>
        <div class="atlas__toolbar">
          <button class="atlas__tool" data-camera="in" title="Наблизити">＋</button>
          <button class="atlas__tool" data-camera="out" title="Віддалити">－</button>
          <button class="atlas__tool" data-camera="reset" title="Уся карта">⟲</button>
          <button class="atlas__tool" data-camera="fullscreen" title="На весь екран">⛶</button>
        </div>
        <aside class="atlas__panel info-panel" id="atlas-panel"></aside>
      </div>

      ${renderSlider()}

      <div class="map-layers">
        ${LAYERS.map(layer => `
          <label class="map-layers__item">
            <input class="map-layers__checkbox" type="checkbox" data-layer="${layer.id}" ${visibleLayers[layer.id] ? 'checked' : ''}>
            ${layer.label}
          </label>`).join('')}
        <button class="btn btn--gold btn--small map-layers__tour" id="atlas-tour">🧭 Екскурсія історією</button>
      </div>

      <h4 class="legend__title">Хто тримає землю</h4>
      <div class="legend" id="atlas-legend"></div>

      <p class="atlas-card__caption">
        Узбережжя — сітка провінцій Okraina за Natural Earth; річки й озера — Natural Earth (public domain);
        кордони держав і адмінподіл — OpenHistoricalMap (CC0), де лінії відомі, інакше реконструкція;
        міста, події, перекази й дослідницька база — проєкт Okraina з посиланнями на джерела.
      </p>
    </div>`;
}

/* ---------- updates ---------- */

function applyStyle() {
  const style = getStyleForYear(currentYear);
  const atlas = $('#atlas');
  Object.entries(style.palette).forEach(([name, value]) => {
    if (typeof value === 'string') atlas.style.setProperty(`--atlas-${name}`, value);
  });
  $('#atlas-style-name').textContent = `🎨 ${style.name}`;
}

function drawHeavyLayers(zoom) {
  const level = zoom >= DETAIL_ZOOM && isStateDetailLoaded() ? 'detail' : 'overview';
  if (zoom >= DETAIL_ZOOM && !isStateDetailLoaded()) loadStateDetail().then(scheduleUpdate);

  const polities = getPolitiesAt(currentYear, level);
  const polityRings = polities.map(entry => entry.rings);
  if (!isSameDrawing(drawn.polities, polityRings, selectedId('polity'))) {
    $('#atlas-polities').innerHTML = renderPolities(polities, selectedId('polity'));
    drawn.polities = { rings: polityRings, selected: selectedId('polity') };
  }

  const units = visibleLayers.admin ? getAdminUnitsAt(currentYear) : [];
  const unitRings = units.map(unit => unit.rings);
  if (!isSameDrawing(drawn.admin, unitRings, selectedId('admin'))) {
    $('#atlas-admin').innerHTML = renderAdminUnits(units, selectedId('admin'));
    drawn.admin = { rings: unitRings, selected: selectedId('admin') };
  }
}

function drawLightLayers(zoom) {
  const visibleEvents = EVENTS.filter(event => isInWindow(event, currentYear));

  $('#atlas-polity-labels').innerHTML = renderPolityLabels(currentYear, zoom);
  $('#atlas-admin-labels').innerHTML = visibleLayers.admin ? renderAdminLabels(currentYear, zoom) : '';
  $('#atlas-cities').innerHTML = renderCities(currentYear, zoom, selectedId('city'));
  $('#atlas-pins').innerHTML = renderPins({
    visibleEvents,
    pastEvents: EVENTS.filter(event => event.year <= currentYear - YEAR_WINDOW),
    zoom,
    selectedEventId: selectedId('event'),
    exploredEvents: state.exploredEvents,
  });

  return visibleEvents.length;
}

function updateMap() {
  pendingFrame = null;
  if (!$('#atlas')) return;

  const slider = $('#atlas-year');
  if (Number(slider.value) !== currentYear) slider.value = currentYear;
  $('#atlas-year-label').textContent = `${currentYear} р.`;

  // Cards depend on the year (names, holders, admin systems); zoom alone does not change them.
  if (panelYear !== currentYear) renderPanel();

  applyStyle();
  const zoom = camera.getZoom();
  drawHeavyLayers(zoom);
  const visibleCount = drawLightLayers(zoom);

  $('#atlas-window-info').textContent =
    `${visibleCount} ${plural(visibleCount, 'подія', 'події', 'подій')} за ${Math.max(MIN_YEAR, currentYear - YEAR_WINDOW + 1)}–${currentYear} рр.`;
  $('#atlas-legend').innerHTML = renderLegend(currentYear, selectedId('polity'));
  $('#atlas-explored').textContent = `${exploredCount()} / ${EVENTS.length}`;

  $$('[data-era]').forEach(chip => chip.classList.toggle('chip--active', Number(chip.dataset.era) === currentYear));
  $$('[data-timeline]').forEach(chip => {
    chip.classList.toggle('chip--seen', Boolean(state.exploredEvents[chip.dataset.timeline]));
    chip.classList.toggle('chip--current', chip.dataset.timeline === selectedId('event'));
  });
}

/** Redraw at most once per animation frame (the slider fires many input events). */
function scheduleUpdate() {
  if (pendingFrame === null) pendingFrame = requestAnimationFrame(updateMap);
}

function setYear(year) {
  currentYear = Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.round(year)));
  scheduleUpdate();
}

/** Jump to the previous (-1) or next (+1) year that has an event. */
function stepToEvent(direction) {
  const years = [...new Set(EVENTS.map(event => event.year))];
  const target = direction > 0
    ? years.find(year => year > currentYear)
    : years.reverse().find(year => year < currentYear);
  if (target !== undefined) setYear(target);
}

/* ---------- selection & side panel ---------- */

/** Marks an event as explored; returns true when it was new. */
function exploreEvent(eventId) {
  if (state.exploredEvents[eventId]) return false;
  state.exploredEvents[eventId] = true;
  saveState();
  addXp(XP_REWARD.mapEvent);
  if (exploredCount() >= EVENTS_FOR_ACHIEVEMENT) unlockAchievement('map5');
  return true;
}

function select(type, id) {
  selection = { type, id };
  if (type === 'event') {
    const event = findEvent(id);
    if (!isInWindow(event, currentYear)) currentYear = event.year;
    lastEventWasNew = exploreEvent(id);
  }
  renderPanel();
  scheduleUpdate();
}

function renderSelectionCard() {
  if (!selection) return renderHelpCard(currentYear);
  if (selection.type === 'event') return renderEventCard(findEvent(selection.id), currentYear, { isNew: lastEventWasNew });
  if (selection.type === 'city') return renderCityCard(findCity(selection.id), currentYear);
  if (selection.type === 'admin') {
    const unit = findAdminUnit(selection.id, currentYear);
    return unit ? renderAdminCard(unit, currentYear) : renderHelpCard(currentYear);
  }
  return renderPolityCard(findPolity(selection.id), currentYear);
}

function renderPanel() {
  const panel = $('#atlas-panel');
  if (!panel) return;
  panelYear = currentYear;

  panel.innerHTML = `
    ${tour.isActive() ? tour.renderControls() : ''}
    ${renderSelectionCard()}
    ${selection && !tour.isActive() ? '<button class="link-button" data-clear-selection>← До підказки</button>' : ''}`;
}

/* ---------- tour ---------- */

function showTourStep(event) {
  if (!isMapVisible()) {
    tour.stop();
    return;
  }
  currentYear = event.year;
  selection = { type: 'event', id: event.id };
  lastEventWasNew = exploreEvent(event.id);
  camera.flyTo(event.point, TOUR_ZOOM);
  renderPanel();
  scheduleUpdate();
}

/* ---------- input ---------- */

function handleMapClick(clickEvent) {
  if (camera.wasDragged()) return;
  const target = clickEvent.target;

  const pin = target.closest('[data-event]');
  if (pin) return select('event', pin.dataset.event);

  const city = target.closest('[data-city]');
  if (city) return select('city', city.dataset.city);

  const unit = target.closest('[data-admin]');
  if (unit) return select('admin', unit.dataset.admin);

  const polity = target.closest('[data-polity]');
  if (polity) return select('polity', polity.dataset.polity);
}

function handlePanelClick(clickEvent) {
  const button = clickEvent.target.closest('button');
  if (!button) return;

  if (button.dataset.tour) tour.handleAction(button.dataset.tour);
  else if (button.dataset.openPolity) select('polity', button.dataset.openPolity);
  else if (button.dataset.openCity) select('city', button.dataset.openCity);
  else if (button.dataset.cityHistory) openCityHistory(button.dataset.cityHistory, currentYear);
  else if (button.dataset.askAi) emit('ai:ask', `Розкажи про подію «${findEvent(button.dataset.askAi).title}»`);
  else if (button.hasAttribute('data-clear-selection')) {
    selection = null;
    renderPanel();
    scheduleUpdate();
  }
}

function handleGlobalKeys(event) {
  if (!isMapVisible() || isLessonActive() || isCityHistoryOpen()) return;

  const active = document.activeElement;
  const isTextField = (active?.tagName === 'INPUT' && active.type !== 'range' && active.type !== 'checkbox') || active?.tagName === 'TEXTAREA';
  if (isTextField) return;

  if (tour.handleKey(event.key)) {
    event.preventDefault();
    return;
  }

  // The slider itself moves by one year with the arrow keys; elsewhere ←/→ jump between events.
  const isSlider = active?.id === 'atlas-year';
  if (!isSlider && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    event.preventDefault();
    stepToEvent(event.key === 'ArrowRight' ? 1 : -1);
  }
}

function toggleFullscreen() {
  const card = $('#atlas-card');
  if (document.fullscreenElement) document.exitFullscreen();
  else card.requestFullscreen?.();
}

async function toggleLayer(layerId, isVisible) {
  visibleLayers[layerId] = isVisible;
  $('#atlas').classList.toggle(`atlas--without-${layerId}`, !isVisible);
  if (layerId === 'admin' && isVisible && !isAdminLoaded()) {
    $('#atlas-window-info').textContent = 'Завантажуємо адмінподіл…';
    await loadAdminUnits();
  }
  if (layerId === 'admin' && !isVisible && selection?.type === 'admin') selection = null;
  renderPanel();
  scheduleUpdate();
}

function bindControls(container) {
  $('#atlas-year').addEventListener('input', event => setYear(Number(event.target.value)));
  $('#atlas-prev').addEventListener('click', () => stepToEvent(-1));
  $('#atlas-next').addEventListener('click', () => stepToEvent(1));

  $('#atlas-svg').addEventListener('click', handleMapClick);
  $('#atlas-panel').addEventListener('click', handlePanelClick);
  $('#atlas-legend').addEventListener('click', handlePanelClick);

  $$('[data-camera]', container).forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.camera;
      if (action === 'in') camera.zoomIn();
      else if (action === 'out') camera.zoomOut();
      else if (action === 'fullscreen') toggleFullscreen();
      else camera.reset();
    });
  });

  $$('[data-layer]', container).forEach(checkbox => {
    checkbox.addEventListener('change', () => toggleLayer(checkbox.dataset.layer, checkbox.checked));
  });

  $('#atlas-tour').addEventListener('click', () => (tour.isActive() ? tour.stop() : tour.start(currentYear)));

  $$('[data-era]', container).forEach(chip => chip.addEventListener('click', () => setYear(Number(chip.dataset.era))));
  $$('[data-timeline]', container).forEach(chip => chip.addEventListener('click', () => select('event', chip.dataset.timeline)));
}

/* ---------- public ---------- */

/** Resolves when the latest render has finished (other screens wait for it before selecting). */
let lastRender = Promise.resolve();

export function renderMapView() {
  lastRender = buildMapView();
  return lastRender;
}

async function buildMapView() {
  tour.stop();
  const container = $('#view-map');

  // Geography and borders (~0.8 MB) are fetched only the first time the map opens.
  container.innerHTML = '<div class="page-head"><h1>Історична карта</h1><p class="page-head__text">Завантажуємо карту…</p></div>';
  await Promise.all([loadAtlasBase(), visibleLayers.admin ? loadAdminUnits() : null]);
  if (!isMapVisible()) return;

  container.innerHTML = `
    <div class="page-head">
      <h1>Історична карта</h1>
      <p class="page-head__text">
        Тягни повзунок — від Русі до незалежної України: держави, адмінподіл, міста з їхньою історією та легендами,
        події з джерелами. За кожну нову подію +${XP_REWARD.mapEvent} XP.
      </p>
    </div>

    <div class="chips eras">
      ${ERAS.map(era => `<button class="chip chip--small" data-era="${era.year}">${escapeHtml(era.title)}</button>`).join('')}
    </div>

    ${renderMapCard()}

    <h3 class="section-title">Стрічка часу · досліджено <span id="atlas-explored"></span></h3>
    <div class="chips">
      ${EVENTS.map(event => `
        <button class="chip chip--small" data-timeline="${event.id}">
          <b class="chip__year">${getYearLabel(event)}</b>${escapeHtml(event.title)}
        </button>`).join('')}
    </div>`;

  LAYERS.forEach(layer => $('#atlas').classList.toggle(`atlas--without-${layer.id}`, !visibleLayers[layer.id]));
  drawn.polities = null;
  drawn.admin = null;

  camera = createCamera($('#atlas-svg'), () => scheduleUpdate());
  bindControls(container);
  renderPanel();
  updateMap();

  // City cards show how many research records a city has; load the base in the background.
  loadResearch().then(() => {
    if (selection?.type === 'city') renderPanel();
  });
}

document.addEventListener('keydown', handleGlobalKeys);

// Another screen (AI plan, Chronicle) asks to show an event or a city.
on('map:open', async eventId => {
  emit('navigate', 'map');
  await lastRender;
  select('event', eventId);
  camera.flyTo(findEvent(eventId).point, TOUR_ZOOM);
});

on('map:city', async cityId => {
  emit('navigate', 'map');
  await lastRender;
  const city = findCity(cityId);
  if (!city) return;
  if (city.year > currentYear) currentYear = city.year;
  select('city', cityId);
  camera.flyTo(city.point, TOUR_ZOOM);
});

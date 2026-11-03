/**
 * HTML of the map side panel: help, event / city / state / administrative unit cards, legend.
 */

import { escapeHtml, plural } from '../../core/utils.js';
import { XP_REWARD } from '../../data/achievements.js';
import { getYearLabel } from '../../data/events.js';
import {
  getAdminSystemsAt, getCitiesOfAdminUnit, getCitiesOfPolity, getCityName, getFormerNames, getLegend,
  getPolityAtPoint, getShapePeriod, getStyleForYear, isSurveyed,
} from '../../features/atlas.js';
import { getResearchOfCity, isLegend } from '../../features/research.js';

const FIDELITY = {
  historical: { label: 'підтверджено джерелами', modifier: 'historical' },
  plausible: { label: 'ймовірна реконструкція', modifier: 'plausible' },
};

const YEAR_NOTES = {
  first_mention: 'перша згадка',
  founded: 'заснування',
  ancient: 'античне місто',
};

const renderFidelity = fidelity => {
  const info = FIDELITY[fidelity] || FIDELITY.plausible;
  return `<span class="info-card__fidelity info-card__fidelity--${info.modifier}">${info.label}</span>`;
};

function renderSources(sources) {
  if (!sources?.length) return '';
  return `
    <details class="info-card__sources">
      <summary>Джерела · ${sources.length}</summary>
      <ul class="info-card__source-list">
        ${sources.map(source => `<li>${escapeHtml(source)}</li>`).join('')}
      </ul>
    </details>`;
}

function renderHolder(point, year) {
  const holder = getPolityAtPoint(point, year);
  if (!holder) return '';
  return `
    <p class="info-card__holder">
      Чия земля: <button class="link-button" data-open-polity="${holder.id}">${escapeHtml(holder.name)}</button>
    </p>`;
}

const renderCityLinks = (cities, year) => cities
  .map(city => `<button class="link-button" data-open-city="${city.id}">${escapeHtml(getCityName(city, year))}</button>`)
  .join(', ');

/* ---------- cards ---------- */

export function renderHelpCard(year) {
  const style = getStyleForYear(year);
  const systems = getAdminSystemsAt(year);
  return `
    <div class="info-card">
      <div class="info-card__kicker">👆 Досліджуй карту</div>
      <p>Тягни повзунок часу — змінюються держави, адмінподіл і назви міст, а карта набуває стилю своєї епохи.</p>
      <ul class="info-card__hints">
        <li>Місто — історія, легенди, назви різними мовами</li>
        <li>Мітка події — історія з джерелами (+${XP_REWARD.mapEvent} XP за нову)</li>
        <li>Територія — хто тримав землю; з шаром «Адмінподіл» — воєводство, полк, губернія чи область</li>
        <li>Коліщатко миші / кнопки — масштаб, перетягування — рух, ⛶ — на весь екран</li>
      </ul>
      <p class="text--muted text--small">
        Стиль карти: <b>${escapeHtml(style.name)}</b> (з ${style.fromYear} р.)
        ${systems.length ? `<br>Адмінподіл: ${systems.map(system => escapeHtml(system.name)).join('; ')}` : ''}
      </p>
    </div>`;
}

export function renderEventCard(event, year, { isNew }) {
  return `
    <div class="info-card">
      <div class="info-card__kicker">${event.icon} ${escapeHtml(event.categoryName)} · ${getYearLabel(event)}</div>
      <h2 class="info-card__title">${escapeHtml(event.title)}</h2>
      ${event.place ? `<p class="info-card__place">📍 ${escapeHtml(event.place)}</p>` : ''}
      <p>${escapeHtml(event.text)}</p>
      ${renderHolder(event.point, event.year)}
      ${renderFidelity(event.fidelity)}
      ${event.research ? `<span class="info-card__fidelity info-card__fidelity--historical">звірено: ${event.research}</span>` : ''}
      ${renderSources(event.sources)}
      ${isNew
        ? `<p class="text--accent">+${XP_REWARD.mapEvent} XP за дослідження</p>`
        : '<p class="text--muted text--small">✓ Подію досліджено</p>'}
      <button class="btn btn--purple btn--small" data-ask-ai="${event.id}">🤖 Спитати AI про подію</button>
    </div>`;
}

export function renderCityCard(city, year) {
  const name = getCityName(city, year);
  const formerNames = getFormerNames(city, year);
  const research = getResearchOfCity(city);
  const legends = city.lore.filter(item => item.kind === 'legend' || item.kind === 'folklore').length + research.filter(isLegend).length;
  const total = city.lore.length + research.length;
  const recent = [...city.lore, ...research]
    .filter(item => item.year && item.year <= year)
    .sort((a, b) => b.year - a.year)
    .slice(0, 3);

  return `
    <div class="info-card">
      <div class="info-card__kicker">🏙️ Місто · ${YEAR_NOTES[city.yearNote] || 'з'} ${city.year} р.</div>
      <h2 class="info-card__title">${escapeHtml(name)}</h2>
      ${formerNames.length ? `<p class="info-card__place">Раніше: ${formerNames.map(escapeHtml).join(', ')}</p>` : ''}
      ${renderHolder(city.point, year)}

      <button class="btn btn--gold btn--small info-card__cta" data-city-history="${city.id}">
        📖 Історія і легенди · ${total} ${plural(total, 'запис', 'записи', 'записів')}${legends ? ` (легенд: ${legends})` : ''}
      </button>

      ${recent.length ? `
        <h4 class="info-card__subtitle">Останнє до ${year} р.</h4>
        <ol class="lore">
          ${recent.map(item => `
            <li class="lore__item">
              <span class="lore__meta">${item.year}</span>
              <b class="lore__title">${escapeHtml(item.title)}</b>
            </li>`).join('')}
        </ol>` : ''}

      ${renderFidelity(city.fidelity)}
      ${renderSources(city.sources)}
    </div>`;
}

export function renderPolityCard(polity, year) {
  const cities = getCitiesOfPolity(polity, year);
  const surveyed = isSurveyed(polity, year);
  return `
    <div class="info-card">
      <div class="info-card__kicker">
        <span class="legend__swatch" style="--polity-color: ${polity.color}"></span>
        Держава · ${getShapePeriod(polity, year)}
      </div>
      <h2 class="info-card__title">${escapeHtml(polity.name)}</h2>
      ${polity.ukrainian ? '<p class="info-card__badge">🇺🇦 Українська державна традиція</p>' : ''}
      ${polity.description ? `<p>${escapeHtml(polity.description)}</p>` : ''}
      ${cities.length ? `<p class="info-card__place">Міста: ${renderCityLinks(cities, year)}</p>` : ''}
      ${renderFidelity(surveyed ? 'historical' : 'plausible')}
      ${renderSources(polity.sources)}
      <p class="text--muted text--small">
        ${surveyed
          ? 'Кордон цього року — за історичними лініями OpenHistoricalMap.'
          : 'Для цього року точних ліній немає — кордон реконструйовано вздовж річок і договірних ліній.'}
      </p>
    </div>`;
}

export function renderAdminCard(unit, year) {
  const { system } = unit;
  const cities = getCitiesOfAdminUnit(unit, year);
  const period = system.to === null ? `з ${system.from}` : `${system.from}–${system.to}`;
  return `
    <div class="info-card">
      <div class="info-card__kicker">🗂️ ${escapeHtml(system.kind)} · ${period}</div>
      <h2 class="info-card__title">${escapeHtml(unit.unit.name)}</h2>
      <p class="info-card__place">${escapeHtml(system.name)}</p>
      ${unit.unit.seat ? renderHolder(unit.unit.seat, year) : ''}
      ${cities.length ? `<p class="info-card__place">Міста: ${renderCityLinks(cities, year)}</p>` : ''}
      ${renderFidelity(unit.surveyed ? 'historical' : 'plausible')}
      ${renderSources(system.sources)}
      <p class="text--muted text--small">
        ${unit.surveyed
          ? 'Межу проведено за історичною лінією OpenHistoricalMap.'
          : 'Межу реконструйовано за найближчим центром одиниці.'}
      </p>
    </div>`;
}

/* ---------- legend ---------- */

export function renderLegend(year, selectedPolityId) {
  const polities = getLegend(year);
  if (!polities.length) return '<p class="text--muted text--small">На карті ще немає держав.</p>';

  return polities.map(polity => `
    <button class="legend__item ${polity.ukrainian ? 'legend__item--ukrainian' : ''} ${polity.id === selectedPolityId ? 'legend__item--active' : ''}"
            data-open-polity="${polity.id}">
      <span class="legend__swatch" style="--polity-color: ${polity.color}"></span>
      ${escapeHtml(polity.name)}
    </button>`).join('');
}

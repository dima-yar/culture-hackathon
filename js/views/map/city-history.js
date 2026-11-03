/**
 * "Історія і легенди міста" dialog: everything known about a city in one timeline —
 * first mention, renames, city lore, research entries, map events and archive documents —
 * plus a tab of legends and a tab of names (by date and in the languages of the period).
 */

import { $, $$, escapeHtml, plural } from '../../core/utils.js';
import { EVENTS, getYearLabel } from '../../data/events.js';
import { ARCHIVE_DOCUMENTS } from '../../data/atlas/documents.js';
import { findCity, getCityName } from '../../features/atlas.js';
import { CATEGORIES, CONFIDENCE, getResearchOfCity, isLegend, loadResearch } from '../../features/research.js';

/** Events closer than this to the city (degrees, ~25 km) belong to its history. */
const EVENT_RADIUS_DEGREES = 0.25;

const LORE_KINDS = {
  art: { icon: '🎨', name: 'Мистецтво' },
  discovery: { icon: '⛏️', name: 'Відкриття' },
  religion: { icon: '⛪', name: 'Віра' },
  folklore: { icon: '🪕', name: 'Фольклор' },
  legend: { icon: '🐉', name: 'Легенда' },
};

const LANGUAGES = {
  old_east_slavic: 'давньоруська',
  ruthenian: 'руська (староукраїнська)',
  ukrainian: 'українська',
  polish: 'польська',
  russian: 'російська',
  latin: 'латина',
  crimean_tatar: 'кримськотатарська',
  ottoman_turkish: 'османська',
  romanian: 'румунська',
  hungarian: 'угорська',
  german: 'німецька',
  greek: 'грецька',
  yiddish: 'їдиш',
  lithuanian: 'литовська',
};

const YEAR_NOTES = {
  first_mention: 'Перша згадка в джерелах',
  founded: 'Заснування',
  ancient: 'Античне місто',
};

let tab = 'timeline';
let dialog = null;

/* ---------- collecting the history ---------- */

const isNear = (point, city) => Math.hypot(
  (point[0] - city.point[0]) * Math.cos((city.point[1] * Math.PI) / 180),
  point[1] - city.point[1],
) < EVENT_RADIUS_DEGREES;

function collectHistory(city) {
  const names = new Set(city.names.map(entry => entry.name));
  const items = [];

  items.push({
    year: city.year,
    icon: '🏛️',
    kind: YEAR_NOTES[city.yearNote] || 'Перша згадка',
    title: getCityName(city, city.year),
    sources: city.sources,
  });

  city.names.slice(1).forEach(entry => items.push({
    year: entry.from,
    icon: '✍️',
    kind: 'Нова назва',
    title: `Місто перейменовано: ${entry.name}`,
  }));

  city.lore.forEach(item => {
    const kind = LORE_KINDS[item.kind] || { icon: '📌', name: '' };
    items.push({ year: item.year, icon: kind.icon, kind: kind.name, title: item.title, text: item.text, sources: item.sources, legend: item.kind === 'legend' || item.kind === 'folklore' });
  });

  getResearchOfCity(city).forEach(entry => {
    const category = CATEGORIES[entry.category] || { icon: '📌', name: '' };
    items.push({
      year: entry.year,
      date: entry.date,
      icon: category.icon,
      kind: category.name,
      title: entry.title,
      text: entry.text,
      original: entry.original,
      confidence: entry.confidence,
      sources: entry.sources,
      legend: isLegend(entry),
      researchId: entry.id,
    });
  });

  EVENTS
    .filter(event => isNear(event.point, city) || [...names].some(name => event.place?.includes(name)))
    .forEach(event => items.push({
      year: event.year,
      date: getYearLabel(event),
      icon: event.icon,
      kind: `Подія карти · ${event.categoryName}`,
      title: event.title,
      text: event.text,
      sources: event.sources,
    }));

  ARCHIVE_DOCUMENTS
    .filter(doc => names.has(doc.place))
    .forEach(doc => items.push({
      year: doc.year,
      icon: doc.kind === 'legend' ? '🐉' : '📜',
      kind: doc.kind === 'legend' ? 'Легенда (архів)' : 'Документ',
      title: doc.title,
      original: doc.original,
      text: doc.translation !== doc.original ? doc.translation : '',
      sources: doc.sources,
      legend: doc.kind === 'legend',
    }));

  return items.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
}

/* ---------- rendering ---------- */

function renderEntry(item, currentYear) {
  const confidence = item.confidence && CONFIDENCE[item.confidence];
  const isFuture = item.year && item.year > currentYear;

  return `
    <li class="history-entry ${isFuture ? 'history-entry--future' : ''} ${item.legend ? 'history-entry--legend' : ''}">
      <div class="history-entry__year">${escapeHtml(item.date || item.year || '—')}</div>
      <div class="history-entry__body">
        <div class="history-entry__meta">
          ${item.icon} ${escapeHtml(item.kind || '')}
          ${confidence ? `<span class="info-card__fidelity info-card__fidelity--${confidence.modifier}">${confidence.name}</span>` : ''}
          ${isFuture ? '<span class="history-entry__later">пізніше на шкалі часу</span>' : ''}
        </div>
        <b class="history-entry__title">${escapeHtml(item.title)}</b>
        ${item.original ? `<blockquote class="history-entry__quote">${escapeHtml(item.original)}</blockquote>` : ''}
        ${item.text ? `<p class="history-entry__text">${escapeHtml(item.text)}</p>` : ''}
        ${item.sources?.length ? `
          <details class="info-card__sources">
            <summary>Джерела · ${item.sources.length}${item.researchId ? ` · ${item.researchId}` : ''}</summary>
            <ul class="info-card__source-list">${item.sources.map(source => `<li>${escapeHtml(source)}</li>`).join('')}</ul>
          </details>` : ''}
      </div>
    </li>`;
}

function renderNames(city) {
  const byDate = city.names.map((entry, index) => {
    const next = city.names[index + 1];
    return `<li class="history-names__item"><b>${escapeHtml(entry.name)}</b> <span class="text--muted">з ${entry.from}${next ? ` до ${next.from}` : ''}</span></li>`;
  }).join('');

  const byLanguage = city.periodNames.map(form => `
    <tr>
      <td class="history-names__years">${form.from}–${form.to >= 2014 ? 'нині' : form.to}</td>
      <td class="history-names__form">${escapeHtml(form.text)}</td>
      <td class="text--muted">${escapeHtml(LANGUAGES[form.language] || form.language)}</td>
    </tr>`).join('');

  return `
    <h4 class="history-names__title">Назва на мапі за датами</h4>
    <ul class="history-names">${byDate}</ul>
    ${byLanguage ? `
      <h4 class="history-names__title">Як писали назву мовами влади й доби</h4>
      <table class="history-names__table"><tbody>${byLanguage}</tbody></table>` : ''}`;
}

function render(city, year) {
  const items = collectHistory(city);
  const legends = items.filter(item => item.legend);
  const namesCount = city.names.length + city.periodNames.length;

  const tabs = [
    ['timeline', `🗓️ Хронологія · ${items.length}`],
    ['legends', `🐉 Легенди й перекази · ${legends.length}`],
    ['names', `✍️ Назви · ${namesCount}`],
  ];

  const body = tab === 'names'
    ? renderNames(city)
    : (tab === 'legends' ? legends : items).map(item => renderEntry(item, year)).join('')
      || '<li class="text--muted">Легенд про це місто в базі поки немає.</li>';

  dialog.innerHTML = `
    <div class="history-dialog__window" role="dialog" aria-modal="true" aria-label="Історія міста">
      <header class="history-dialog__head">
        <div>
          <small class="history-dialog__kicker">🏙️ Місто · ${YEAR_NOTES[city.yearNote] || 'з'} ${city.year} р.</small>
          <h2 class="history-dialog__title">${escapeHtml(getCityName(city, year))}</h2>
          <p class="history-dialog__subtitle">
            ${items.length} ${plural(items.length, 'запис', 'записи', 'записів')} із джерелами ·
            записи після ${year} р. приглушено
          </p>
        </div>
        <button class="lesson__close" data-history-close title="Закрити (Esc)">✕</button>
      </header>
      <div class="tabs history-dialog__tabs">
        ${tabs.map(([id, label]) => `<button class="tabs__item ${tab === id ? 'tabs__item--active' : ''}" data-history-tab="${id}">${label}</button>`).join('')}
      </div>
      <div class="history-dialog__body">
        ${tab === 'names' ? body : `<ol class="history-list">${body}</ol>`}
      </div>
    </div>`;

  $$('[data-history-tab]', dialog).forEach(button => button.addEventListener('click', () => {
    tab = button.dataset.historyTab;
    render(city, year);
  }));
  $('[data-history-close]', dialog).addEventListener('click', closeCityHistory);
}

/* ---------- public ---------- */

/** While the dialog is open it owns the keyboard (the map's ←/→ and Esc must not react). */
function handleKeydown(event) {
  event.stopPropagation();
  if (event.key === 'Escape') closeCityHistory();
}

export const isCityHistoryOpen = () => dialog !== null;

export function closeCityHistory() {
  dialog?.remove();
  dialog = null;
  document.removeEventListener('keydown', handleKeydown, true);
  document.body.classList.remove('page--no-scroll');
}

/** Opens the history of a city as seen from `year` (later records are dimmed). */
export async function openCityHistory(cityId, year) {
  const city = findCity(cityId);
  if (!city) return;
  await loadResearch();

  closeCityHistory();
  tab = 'timeline';
  dialog = document.createElement('div');
  dialog.className = 'history-dialog';
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeCityHistory();
  });
  document.body.append(dialog);
  document.body.classList.add('page--no-scroll');
  document.addEventListener('keydown', handleKeydown, true);
  render(city, year);
}

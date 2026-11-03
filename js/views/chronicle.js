/**
 * Chronicle screen: the whole Okraina research base (~1170 sourced entries, 482–2000)
 * with filters by epoch and category, search, and links to cities on the map.
 */

import { $, $$, escapeHtml, plural } from '../core/utils.js';
import { emit } from '../core/events.js';
import { CATEGORIES, CONFIDENCE, EPOCHS, filterResearch, getResearch, loadResearch } from '../features/research.js';
import { findCity, getCityName } from '../features/atlas.js';

const PAGE_SIZE = 40;

const filters = { epoch: 0, category: '', query: '' };
let shown = PAGE_SIZE;

function renderEntry(entry) {
  const category = CATEGORIES[entry.category] || { icon: '📌', name: entry.category };
  const confidence = CONFIDENCE[entry.confidence];
  const city = entry.city && findCity(entry.city);

  return `
    <article class="card chronicle-entry">
      <div class="chronicle-entry__meta">
        <b class="chronicle-entry__date">${escapeHtml(entry.date)}</b>
        ${category.icon} ${escapeHtml(category.name)}
        ${confidence ? `<span class="info-card__fidelity info-card__fidelity--${confidence.modifier}">${confidence.name}</span>` : ''}
        <span class="chronicle-entry__id">${entry.id}</span>
      </div>
      <h3 class="chronicle-entry__title">${escapeHtml(entry.title)}</h3>
      ${entry.original ? `<blockquote class="history-entry__quote">${escapeHtml(entry.original)}</blockquote>` : ''}
      <p class="chronicle-entry__text">${escapeHtml(entry.text)}</p>
      <div class="chronicle-entry__footer">
        ${entry.places.length ? `<span class="text--muted">📍 ${entry.places.map(escapeHtml).join('; ')}</span>` : ''}
        ${city ? `<button class="link-button" data-map-city="${city.id}">Показати ${escapeHtml(getCityName(city, entry.year || city.year))} на карті →</button>` : ''}
      </div>
      <details class="info-card__sources">
        <summary>Джерела · ${entry.sources.length}</summary>
        <ul class="info-card__source-list">${entry.sources.map(source => `<li>${escapeHtml(source)}</li>`).join('')}</ul>
      </details>
    </article>`;
}

function renderResults() {
  const results = filterResearch({ epoch: filters.epoch, category: filters.category, query: filters.query });
  const box = $('#chronicle-results');

  box.innerHTML = `
    <p class="text--muted">${results.length} ${plural(results.length, 'запис', 'записи', 'записів')}</p>
    <div class="layout layout--stack">${results.slice(0, shown).map(renderEntry).join('')}</div>
    ${results.length > shown ? `<button class="btn btn--ghost chronicle__more" id="chronicle-more">Показати ще ${Math.min(PAGE_SIZE, results.length - shown)}</button>` : ''}`;

  $('#chronicle-more')?.addEventListener('click', () => {
    shown += PAGE_SIZE;
    renderResults();
  });
  $$('[data-map-city]', box).forEach(button => button.addEventListener('click', () => emit('map:city', button.dataset.mapCity)));
}

function renderFilters() {
  const counts = {};
  getResearch().forEach(entry => { counts[entry.category] = (counts[entry.category] || 0) + 1; });

  return `
    <div class="tabs chronicle__epochs">
      <button class="tabs__item ${filters.epoch === 0 ? 'tabs__item--active' : ''}" data-epoch="0">Усі доби</button>
      ${EPOCHS.map(epoch => `
        <button class="tabs__item ${filters.epoch === epoch.id ? 'tabs__item--active' : ''}" data-epoch="${epoch.id}" title="${escapeHtml(epoch.title)}">
          ${epoch.years}
        </button>`).join('')}
    </div>
    <div class="chips chronicle__categories">
      <button class="chip chip--small ${filters.category ? '' : 'chip--active'}" data-category="">Усе</button>
      ${Object.entries(CATEGORIES).filter(([id]) => counts[id]).map(([id, category]) => `
        <button class="chip chip--small ${filters.category === id ? 'chip--active' : ''}" data-category="${id}">
          ${category.icon} ${category.name} · ${counts[id]}
        </button>`).join('')}
    </div>
    <input class="field chronicle__search" id="chronicle-search" placeholder="Пошук: Мазепа, Хотин, 1648, Лавра…" value="${escapeHtml(filters.query)}" autocomplete="off">`;
}

export async function renderChronicleView() {
  const container = $('#view-chronicle');
  container.innerHTML = '<div class="page-head"><h1>Хроніка</h1><p class="page-head__text">Завантажуємо дослідницьку базу…</p></div>';
  await loadResearch();

  container.innerHTML = `
    <div class="page-head">
      <h1>Хроніка</h1>
      <p class="page-head__text">
        Дослідницька база історії українських земель 482–2000 рр.: події, битви, договори, постаті, місця, культура й легенди.
        Кожен запис — з джерелами та рівнем довіри (засвідчено, консенсус, дискусійно, легенда).
      </p>
    </div>
    <div id="chronicle-filters">${renderFilters()}</div>
    <div id="chronicle-results"></div>`;

  const rerender = () => {
    shown = PAGE_SIZE;
    renderResults();
  };

  $$('[data-epoch]', container).forEach(button => button.addEventListener('click', () => {
    filters.epoch = Number(button.dataset.epoch);
    $$('[data-epoch]', container).forEach(item => item.classList.toggle('tabs__item--active', item === button));
    rerender();
  }));
  $$('[data-category]', container).forEach(button => button.addEventListener('click', () => {
    filters.category = button.dataset.category;
    $$('[data-category]', container).forEach(item => item.classList.toggle('chip--active', item === button));
    rerender();
  }));
  $('#chronicle-search').addEventListener('input', event => {
    filters.query = event.target.value;
    rerender();
  });

  renderResults();
}

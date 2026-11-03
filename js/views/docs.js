/**
 * Old Rus' documents: tap-to-translate words, full translation and a mini quiz.
 */

import { $, $$, escapeHtml } from '../core/utils.js';
import { state, saveState } from '../core/state.js';
import { addXp, unlockAchievement } from '../core/progress.js';
import { showToast } from '../ui/toast.js';
import { XP_REWARD } from '../data/achievements.js';
import { DOCUMENTS, OLD_LETTERS } from '../data/documents.js';
import { ARCHIVE_DOCUMENTS } from '../data/atlas/documents.js';

const ARCHIVE_KINDS = {
  document: '📜 Документ',
  legend: '🐉 Легенда',
  proverb: '🗣️ Прислів’я',
};

const LANGUAGES = {
  old_east_slavic: 'давньоруська',
  ukrainian: 'українська',
  latin: 'латина',
  polish: 'польська',
  russian: 'російська',
};

let currentDocumentId = DOCUMENTS[0].id;
let isTranslationVisible = false;

/** Wraps every word that has a glossary entry into a clickable span. */
function renderOldText(documentData) {
  return documentData.text
    .split(/(\s+|[,.;:])/)
    .map(token => {
      const key = token.toLowerCase();
      return documentData.glossary[key]
        ? `<span class="old-text__word" data-word="${escapeHtml(key)}">${escapeHtml(token)}</span>`
        : escapeHtml(token);
    })
    .join('');
}

function renderTabs() {
  return DOCUMENTS.map(doc => `
    <button class="doc-tab ${doc.id === currentDocumentId ? 'doc-tab--active' : ''}" data-document="${doc.id}">
      <span class="doc-tab__icon">${doc.icon}</span>
      <span>
        <b>${escapeHtml(doc.title)}</b>
        <small class="doc-tab__date">${escapeHtml(doc.date)}${state.readDocuments[doc.id] ? ' · ✓ прочитано' : ''}</small>
      </span>
    </button>`).join('');
}

function renderQuiz(documentData) {
  const isSolved = state.readDocuments[documentData.id];
  return `
    <div class="card">
      <h3 class="card__title">Перевір себе ${isSolved ? '✓' : `· +${XP_REWARD.documentQuiz} XP`}</h3>
      <p>${escapeHtml(documentData.quiz.q)}</p>
      <div class="option-list">
        ${documentData.quiz.options.map((option, index) => `
          <button class="option option--compact" data-quiz-option="${index}">${escapeHtml(option)}</button>`).join('')}
      </div>
    </div>`;
}

function renderAlphabet() {
  return `
    <div class="card alphabet">
      <h3 class="card__title">Давня абетка</h3>
      ${OLD_LETTERS.map(({ letter, name, rule, example }) => `
        <p class="alphabet__row">
          <b class="alphabet__letter">${letter}</b>${name} — ${rule}: <i>${example}</i>
        </p>`).join('')}
    </div>`;
}

/** Archive imported from Okraina: original quote, translation on demand, sources. */
function renderArchive() {
  return `
    <h3 class="section-title">Архів джерел · ${ARCHIVE_DOCUMENTS.length}</h3>
    <div class="archive">
      ${ARCHIVE_DOCUMENTS.map(doc => `
        <article class="card archive-item">
          <div class="archive-item__meta">
            ${ARCHIVE_KINDS[doc.kind] || ''}
            ${doc.year ? ` · ${doc.year}` : ''}${doc.place ? ` · ${escapeHtml(doc.place)}` : ''}
            ${LANGUAGES[doc.language] ? ` · ${LANGUAGES[doc.language]}` : ''}
          </div>
          <h4 class="archive-item__title">${escapeHtml(doc.title)}</h4>
          <blockquote class="archive-item__original">${escapeHtml(doc.original)}</blockquote>
          ${doc.translation && doc.translation !== doc.original ? `
            <details class="archive-item__details">
              <summary>Переклад</summary>
              <p class="archive-item__translation">${escapeHtml(doc.translation)}</p>
            </details>` : ''}
          <small class="archive-item__source">Джерело: ${doc.sources.map(escapeHtml).join('; ')}</small>
        </article>`).join('')}
    </div>`;
}

function answerQuiz(documentData, button) {
  const isRight = Number(button.dataset.quizOption) === documentData.quiz.answer;
  button.classList.add(isRight ? 'option--right' : 'option--wrong');

  if (!isRight) {
    showToast({ icon: '🤔', html: 'Не зовсім. Підказка: натисни на слова в тексті' });
    return;
  }
  if (!state.readDocuments[documentData.id]) {
    state.readDocuments[documentData.id] = true;
    saveState();
    addXp(XP_REWARD.documentQuiz);
    unlockAchievement('doc');
    setTimeout(renderDocsView, 700);
  }
}

export function renderDocsView() {
  const container = $('#view-docs');
  const documentData = DOCUMENTS.find(doc => doc.id === currentDocumentId);

  container.innerHTML = `
    <div class="page-head">
      <h1>Документи староруською</h1>
      <p class="page-head__text">Читай справжні давні тексти. Натисни на підкреслене слово — побачиш переклад.</p>
    </div>

    <div class="doc-tabs">${renderTabs()}</div>

    <div class="layout layout--aside">
      <div class="card">
        <div class="doc-about">${escapeHtml(documentData.about)}</div>
        <div class="old-text">${renderOldText(documentData)}</div>
        <div class="gloss" id="docs-gloss">👆 Натисни на будь-яке підкреслене слово</div>
        <button class="btn btn--ghost btn--small" id="docs-toggle-translation">
          ${isTranslationVisible ? 'Сховати' : 'Показати'} переклад
        </button>
        <div class="translation" ${isTranslationVisible ? '' : 'hidden'}>${escapeHtml(documentData.translation)}</div>
      </div>
      <aside class="layout layout--stack">
        ${renderQuiz(documentData)}
        ${renderAlphabet()}
      </aside>
    </div>

    ${renderArchive()}`;

  $$('[data-document]', container).forEach(tab => {
    tab.addEventListener('click', () => {
      currentDocumentId = tab.dataset.document;
      isTranslationVisible = false;
      renderDocsView();
    });
  });

  const words = $$('.old-text__word', container);
  words.forEach(word => {
    word.addEventListener('click', () => {
      words.forEach(item => item.classList.remove('old-text__word--active'));
      word.classList.add('old-text__word--active');
      $('#docs-gloss').innerHTML = `
        <b class="gloss__word">${escapeHtml(word.textContent)}</b> → ${escapeHtml(documentData.glossary[word.dataset.word])}`;
    });
  });

  $('#docs-toggle-translation').addEventListener('click', () => {
    isTranslationVisible = !isTranslationVisible;
    renderDocsView();
  });

  $$('[data-quiz-option]', container).forEach(button => {
    button.addEventListener('click', () => answerQuiz(documentData, button));
  });
}

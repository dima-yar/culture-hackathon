/**
 * AI screen with three tabs: assistant chat, role-play, personal plan.
 */

import { $, $$, escapeHtml, plural } from '../core/utils.js';
import { state } from '../core/state.js';
import { emit, on } from '../core/events.js';
import { renderChat } from '../ui/chat.js';
import { getAssistantReply, getFigureReply } from '../features/assistant.js';
import { FIGURES } from '../data/people.js';
import { UNITS } from '../data/units.js';
import { EVENTS, getYearLabel } from '../data/events.js';
import { getRecommendation, isLessonCompleted } from '../lesson/catalog.js';
import { startLesson } from '../lesson/player.js';
import { loadResearch } from '../features/research.js';

const TABS = [
  { id: 'chat', label: '💬 Помічник' },
  { id: 'roleplay', label: '🎭 Рольова гра' },
  { id: 'plan', label: '🧭 Мій план' },
];

const ASSISTANT_SUGGESTIONS = ['Що сталося у 1654 році?', 'Хто такий Пилип Орлик?', 'Розкажи про Акт Злуки', 'Чому Ярослав — Мудрий?'];

let activeTab = 'chat';
let activeFigure = null;
let pendingQuestion = null;

/* Chat histories survive switching tabs and screens. */
const assistantLog = [
  { html: 'Привіт! Я — <b>Літописець</b>, твій AI-помічник з історії. Спитай про дату, подію чи постать — і я поясню простими словами.' },
];
const roleplayLogs = {};

/* ---------- tabs ---------- */

function renderAssistant(container) {
  const send = renderChat(container, assistantLog, {
    avatar: '🤖',
    headHtml: `
      <span class="chat__avatar">🤖</span>
      <div><b>Літописець</b><small class="chat__status">AI-помічник · онлайн</small></div>`,
    suggestions: ASSISTANT_SUGGESTIONS,
    reply: getAssistantReply,
  });

  if (pendingQuestion) {
    send(pendingQuestion);
    pendingQuestion = null;
  }
}

function renderFigurePicker(container) {
  container.innerHTML = `
    <p><b>Обери співрозмовника</b> — постать відповідатиме від першої особи, у стилі своєї епохи.</p>
    <div class="figure-grid">
      ${FIGURES.map(figure => `
        <button class="figure-card" data-figure="${figure.id}">
          <span class="figure-card__icon">${figure.icon}</span>
          <b class="figure-card__name">${escapeHtml(figure.name)}</b>
          <small class="figure-card__desc">${escapeHtml(figure.description)}</small>
        </button>`).join('')}
    </div>`;

  $$('[data-figure]', container).forEach(card => {
    card.addEventListener('click', () => {
      activeFigure = FIGURES.find(figure => figure.id === card.dataset.figure);
      renderAiView();
    });
  });
}

function renderRoleplay(container) {
  if (!activeFigure) {
    renderFigurePicker(container);
    return;
  }

  const figure = activeFigure;
  roleplayLogs[figure.id] ??= [{ html: escapeHtml(figure.greeting) }];

  renderChat(container, roleplayLogs[figure.id], {
    avatar: figure.icon,
    headHtml: `
      <span class="chat__avatar">${figure.icon}</span>
      <div><b>${escapeHtml(figure.name)}</b><small class="chat__status">рольова гра · ${escapeHtml(figure.description)}</small></div>
      <button class="link-button link-button--push-right" id="ai-change-figure">← інша постать</button>`,
    suggestions: figure.suggestions,
    reply: question => getFigureReply(figure, question),
  });

  $('#ai-change-figure').addEventListener('click', () => {
    activeFigure = null;
    renderAiView();
  });
}

function renderTopicProgress(unit) {
  const completed = unit.lessons.filter(lesson => isLessonCompleted(lesson.id)).length;
  const mistakes = state.topicMistakes[unit.title] || 0;

  return `
    <div class="topic-progress">
      <div class="topic-progress__row">
        <span>${escapeHtml(unit.title)}</span>
        <span>
          ${completed}/${unit.lessons.length}
          ${mistakes ? `<span class="topic-progress__errors">· ${mistakes} ${plural(mistakes, 'помилка', 'помилки', 'помилок')}</span>` : ''}
        </span>
      </div>
      <div class="progress"><i class="progress__fill" style="width: ${completed / unit.lessons.length * 100}%"></i></div>
    </div>`;
}

function renderPlan(container) {
  const recommendation = getRecommendation();
  const unexplored = EVENTS.find(event => !state.exploredEvents[event.id]);
  const rolePlayFigure = FIGURES[1];

  container.innerHTML = `
    <div class="layout layout--split">
      <div class="card">
        <h3 class="card__title">Твої теми</h3>
        ${UNITS.map(renderTopicProgress).join('')}
        <p class="text--muted text--small">AI аналізує помилки і підбирає вправи з тем, які даються найважче.</p>
      </div>

      <div class="card">
        <h3 class="card__title">План на сьогодні</h3>
        <ol class="steps">
          <li class="steps__item">
            <span class="steps__icon">📘</span>
            <div class="steps__body">
              <b>${recommendation.lessonId ? 'Урок' : 'Повторення'}</b>
              <small class="steps__desc">${escapeHtml(recommendation.text)}</small>
            </div>
            ${recommendation.lessonId ? `<button class="btn btn--small" data-plan-lesson="${recommendation.lessonId}">Почати</button>` : ''}
          </li>
          ${unexplored ? `
            <li class="steps__item">
              <span class="steps__icon">🗺️</span>
              <div class="steps__body">
                <b>Карта</b>
                <small class="steps__desc">Досліди подію «${escapeHtml(unexplored.title)}» (${getYearLabel(unexplored)})</small>
              </div>
              <button class="btn btn--ghost btn--small" data-plan-event="${unexplored.id}">Відкрити</button>
            </li>` : ''}
          <li class="steps__item">
            <span class="steps__icon">🎭</span>
            <div class="steps__body">
              <b>Рольова гра</b>
              <small class="steps__desc">Розпитай: ${escapeHtml(rolePlayFigure.name)} — про війну 1648 року</small>
            </div>
            <button class="btn btn--ghost btn--small" data-plan-roleplay>Почати</button>
          </li>
        </ol>
      </div>
    </div>`;

  $('[data-plan-lesson]', container)?.addEventListener('click', event => startLesson(event.currentTarget.dataset.planLesson));
  $('[data-plan-event]', container)?.addEventListener('click', event => emit('map:open', event.currentTarget.dataset.planEvent));
  $('[data-plan-roleplay]', container).addEventListener('click', () => {
    activeFigure = rolePlayFigure;
    activeTab = 'roleplay';
    renderAiView();
  });
}

/* ---------- public ---------- */

const TAB_RENDERERS = {
  chat: renderAssistant,
  roleplay: renderRoleplay,
  plan: renderPlan,
};

export function renderAiView() {
  const container = $('#view-ai');
  loadResearch(); // the assistant also searches the research base once it is loaded

  container.innerHTML = `
    <div class="page-head">
      <h1>AI-помічник</h1>
      <p class="page-head__text">
        Чатбот-літописець, рольові ігри з історичними постатями та персональний план навчання.
        Відкриті відповіді в уроках AI теж перевіряє.
      </p>
    </div>

    <div class="tabs">
      ${TABS.map(tab => `
        <button class="tabs__item ${tab.id === activeTab ? 'tabs__item--active' : ''}" data-tab="${tab.id}">${tab.label}</button>`).join('')}
    </div>

    <div id="ai-tab-content"></div>

    <p class="demo-note">
      ℹ️ Демо: відповіді формуються за сценарієм із локальної бази фактів.
      У продукті тут працюватиме мовна модель із перевіркою за верифікованими джерелами.
    </p>`;

  $$('[data-tab]', container).forEach(button => {
    button.addEventListener('click', () => {
      activeTab = button.dataset.tab;
      renderAiView();
    });
  });

  TAB_RENDERERS[activeTab]($('#ai-tab-content'));
}

// Another screen (map) asks the assistant a question.
on('ai:ask', question => {
  pendingQuestion = question;
  activeTab = 'chat';
  emit('navigate', 'ai');
});

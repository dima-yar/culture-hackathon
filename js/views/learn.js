/**
 * Learning path screen: AI recommendation, daily goal and units with lesson nodes.
 */

import { $, $$, escapeHtml, plural } from '../core/utils.js';
import { state } from '../core/state.js';
import { showToast } from '../ui/toast.js';
import { DAILY_GOAL_XP } from '../data/achievements.js';
import { UNITS } from '../data/units.js';
import { getRecommendation, isLessonCompleted, isLessonOpen } from '../lesson/catalog.js';
import { startLesson } from '../lesson/player.js';

/** Horizontal zig-zag of the path, repeated every 8 lessons. */
const NODE_OFFSETS = [0, 60, 90, 60, 0, -60, -90, -60];

function renderRecommendation() {
  const recommendation = getRecommendation();
  return `
    <div class="card recommendation">
      <div class="recommendation__icon">🤖</div>
      <div>
        <small class="recommendation__label">AI рекомендує</small>
        <p class="recommendation__text">${escapeHtml(recommendation.text)}</p>
        ${recommendation.lessonId
          ? `<button class="btn btn--small" data-lesson="${recommendation.lessonId}">Почати</button>`
          : ''}
      </div>
    </div>`;
}

function renderDailyGoal() {
  const earned = Math.min(state.todayXp, DAILY_GOAL_XP);
  return `
    <div class="card daily-goal">
      <small class="daily-goal__label">Щоденна мета</small>
      <b class="daily-goal__value">${earned} / ${DAILY_GOAL_XP} XP</b>
      <div class="progress">
        <i class="progress__fill progress__fill--gold" style="width: ${earned / DAILY_GOAL_XP * 100}%"></i>
      </div>
      <p class="daily-goal__streak">🔥 Серія: ${state.streak} ${plural(state.streak, 'день', 'дні', 'днів')} поспіль</p>
    </div>`;
}

function renderLessonNode(lesson, index, lessons) {
  const isDone = isLessonCompleted(lesson.id);
  const isOpen = isLessonOpen(lessons, index);
  const isCurrent = isOpen && !isDone;

  const modifiers = [
    isDone && 'lesson-node--done',
    !isOpen && 'lesson-node--locked',
    isCurrent && 'lesson-node--current',
  ].filter(Boolean).join(' ');

  const icon = isDone ? '✓' : isOpen ? lesson.icon : '🔒';

  return `
    <div class="lesson-node ${modifiers}" style="--offset: ${NODE_OFFSETS[index % NODE_OFFSETS.length]}px">
      ${isCurrent ? '<span class="lesson-node__bubble">ПОЧАТИ</span>' : ''}
      <button class="lesson-node__button" data-lesson="${lesson.id}" ${isOpen ? '' : 'data-locked'}
              title="${escapeHtml(lesson.title)}">${icon}</button>
      <span class="lesson-node__label">${escapeHtml(lesson.title)}</span>
    </div>`;
}

function renderUnit(unit, index) {
  const completed = unit.lessons.filter(lesson => isLessonCompleted(lesson.id)).length;

  return `
    <section class="unit" style="--unit-color: ${unit.color}; --unit-color-dark: ${unit.colorDark}">
      <header class="unit__head">
        <div>
          <small class="unit__label">Розділ ${index + 1} · ${unit.period}</small>
          <h2 class="unit__title">${escapeHtml(unit.title)}</h2>
          <span class="unit__learners">🟢 ${unit.learners} учнів проходять зараз</span>
        </div>
        <div class="unit__progress">
          <b class="unit__progress-value">${completed}/${unit.lessons.length}</b>уроків
        </div>
      </header>
      <div class="unit__path">
        ${unit.lessons.map(renderLessonNode).join('')}
      </div>
    </section>`;
}

export function renderLearnView() {
  const container = $('#view-learn');

  container.innerHTML = `
    <div class="learn">
      <div class="layout layout--feature layout--stretch learn__top">
        ${renderRecommendation()}
        ${renderDailyGoal()}
      </div>
      ${UNITS.map(renderUnit).join('')}
    </div>`;

  $$('[data-lesson]', container).forEach(button => {
    button.addEventListener('click', () => {
      if (button.hasAttribute('data-locked')) {
        showToast({ icon: '🔒', html: 'Спершу заверши попередній урок розділу' });
        return;
      }
      startLesson(button.dataset.lesson);
    });
  });
}

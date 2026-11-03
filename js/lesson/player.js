/**
 * Lesson player: full-screen overlay that runs a lesson exercise by exercise.
 *
 * Flow: answer → check → feedback → next … → result screen.
 * A wrong exercise costs 1 HP and is repeated once at the end of the lesson.
 */

import { $, $$, escapeHtml, pickRandom, randomInt, replayAnimation } from '../core/utils.js';
import { state, saveState } from '../core/state.js';
import { emit } from '../core/events.js';
import { addXp, registerCorrectAnswer, registerMistake, unlockAchievement } from '../core/progress.js';
import { showToast } from '../ui/toast.js';
import { openHpModal } from '../ui/hud.js';
import { XP_REWARD } from '../data/achievements.js';
import { recordGroupResult } from '../features/groups.js';
import { findLesson } from './catalog.js';
import { EXERCISE_RENDERERS } from './exercises/index.js';

const PRAISE = ['Чудово!', 'Правильно!', 'Так тримати!', 'Відмінно!', 'Блискуче!'];
const COMBO_TOAST_EVERY = 3;

/** Phases of the active session. */
const PHASE = {
  answer: 'answer',
  checking: 'checking',
  feedback: 'feedback',
  done: 'done',
};

let session = null;
const dom = {};

export const isLessonActive = () => session !== null;

/* ---------- open / close ---------- */

export function startLesson(lessonId) {
  if (state.hp <= 0) {
    openHpModal(true);
    return;
  }

  const lesson = findLesson(lessonId);
  if (!lesson || !lesson.exercises.length) return;

  session = {
    lesson,
    queue: lesson.exercises.map((exercise, index) => ({ ...exercise, index })),
    total: lesson.exercises.length,
    correct: 0,
    mistakes: 0,
    retried: new Set(),   // indexes of exercises already re-queued
    gainedXp: 0,
    phase: PHASE.answer,
    current: null,
    handler: null,
  };

  dom.root.hidden = false;
  document.body.classList.add('page--no-scroll');
  showNextExercise();
}

export function closeLesson() {
  dom.root.hidden = true;
  document.body.classList.remove('page--no-scroll');
  session = null;
  emit('lesson:closed');
}

/* ---------- rendering helpers ---------- */

function setProgress(ratio) {
  dom.progress.style.width = `${ratio * 100}%`;
}

function setFooter(mode) {
  dom.footer.className = mode ? `lesson__footer lesson__footer--${mode}` : 'lesson__footer';
  dom.feedback.className = mode ? `feedback feedback--${mode}` : 'feedback';
}

function setCheckButton({ label, color = 'green', disabled = false }) {
  dom.check.className = `btn btn--${color} lesson__check`;
  dom.check.textContent = label;
  dom.check.disabled = disabled;
}

/* ---------- flow ---------- */

function showNextExercise() {
  if (!session.queue.length) {
    finishLesson();
    return;
  }

  session.current = session.queue.shift();
  session.phase = PHASE.answer;

  setProgress(session.correct / session.total);
  dom.hp.textContent = state.hp;
  setFooter(null);
  dom.feedback.innerHTML = '';
  dom.scroll.scrollTop = 0;

  const container = document.createElement('div');
  container.className = 'exercise';
  dom.content.replaceChildren(container);

  const context = {
    setReady: isReady => {
      if (session?.phase === PHASE.answer) dom.check.disabled = !isReady;
    },
    isLocked: () => !session || session.phase !== PHASE.answer,
  };

  const render = EXERCISE_RENDERERS[session.current.type];
  session.handler = render(session.current, container, context);
  setCheckButton({ label: session.handler.label || 'Перевірити', disabled: true });
}

async function checkAnswer() {
  session.phase = PHASE.checking;
  dom.check.disabled = true;

  const result = await session.handler.check();
  if (!session) return; // lesson closed while the AI was "thinking"

  session.phase = PHASE.feedback;
  if (result.ok) showCorrect(result);
  else showWrong(result);

  setProgress(session.correct / session.total);
  setCheckButton({
    label: state.hp <= 0 ? 'Завершити' : 'Далі',
    color: result.ok ? 'green' : 'red',
  });
}

function showCorrect(result) {
  session.correct += 1;

  const xp = result.xp ?? XP_REWARD.correctAnswer;
  session.gainedXp += xp;
  addXp(xp);

  const combo = registerCorrectAnswer();
  if (combo > 1 && combo % COMBO_TOAST_EVERY === 0) {
    showToast({ icon: '⚡', html: `<b>Комбо ×${combo}!</b>` });
  }

  setFooter('good');
  dom.feedback.innerHTML = `
    <div class="feedback__icon">✔</div>
    <div>
      <b class="feedback__title">${escapeHtml(result.title || pickRandom(PRAISE))}</b>
    </div>`;
}

function showWrong(result) {
  session.mistakes += 1;
  registerMistake(session.lesson.topic);
  dom.hp.textContent = state.hp;
  replayAnimation(dom.hpBox, 'lesson__hp--hit');

  // Each exercise gets exactly one retry at the end of the lesson.
  const willRetry = !session.retried.has(session.current.index);
  if (willRetry) {
    session.retried.add(session.current.index);
    session.queue.push(session.current);
  }

  setFooter('bad');
  dom.feedback.innerHTML = `
    <div class="feedback__icon">✖</div>
    <div>
      <b class="feedback__title">${escapeHtml(result.title || 'Неправильно')}</b>
      <p class="feedback__text">Правильна відповідь: ${escapeHtml(result.answer)}</p>
      <p class="feedback__note">−1 HP${willRetry ? ' · повторимо це завдання наприкінці' : ''}</p>
    </div>`;
}

function finishLesson() {
  const { lesson } = session;
  const isPerfect = session.mistakes === 0;
  const bonus = XP_REWARD.lessonComplete + (isPerfect ? XP_REWARD.perfectBonus : 0);
  const firstTryScore = session.total - session.retried.size;

  addXp(bonus);
  session.gainedXp += bonus;

  state.completedLessons[lesson.id] = true;
  saveState();
  unlockAchievement('first');
  if (isPerfect) unlockAchievement('perfect');
  if (lesson.groupRef) recordGroupResult(lesson.groupRef, firstTryScore);

  const answered = session.correct + session.mistakes;
  const accuracy = Math.round(session.correct / Math.max(1, answered) * 100);

  setProgress(1);
  setFooter(null);
  dom.feedback.innerHTML = '';
  dom.content.innerHTML = `
    <div class="result">
      <div class="result__trophy">${isPerfect ? '🏆' : '🎉'}</div>
      <h1>Урок завершено!</h1>
      <p class="result__subtitle">${escapeHtml(lesson.title)}</p>

      <div class="result__tiles">
        <div class="result__tile">
          <small class="result__tile-label">Отримано</small>
          <b class="result__tile-value">⭐ ${session.gainedXp}</b>
        </div>
        <div class="result__tile result__tile--green">
          <small class="result__tile-label">Точність</small>
          <b class="result__tile-value">🎯 ${accuracy}%</b>
        </div>
        <div class="result__tile result__tile--red">
          <small class="result__tile-label">Втрачено HP</small>
          <b class="result__tile-value">❤️ ${session.mistakes}</b>
        </div>
      </div>

      ${isPerfect ? `<p class="result__note result__note--accent">💎 Ідеально! +${XP_REWARD.perfectBonus} XP бонус</p>` : ''}
      ${lesson.groupRef ? `<p class="result__note result__note--accent">👥 Результат для групи: ${firstTryScore}/${session.total} з першої спроби</p>` : ''}
      <p class="result__note">👥 Сьогодні цей урок пройшли ще ${randomInt(40, 240)} учнів</p>
    </div>`;

  setCheckButton({ label: 'Продовжити' });
  session.phase = PHASE.done;
}

function handleCheckButton() {
  if (!session) return;

  switch (session.phase) {
    case PHASE.answer:
      checkAnswer();
      break;
    case PHASE.feedback:
      if (state.hp <= 0) {
        closeLesson();
        openHpModal(true);
      } else {
        showNextExercise();
      }
      break;
    case PHASE.done:
      closeLesson();
      break;
    default:
      break;
  }
}

/* ---------- keyboard: Enter = check/next, 1–9 = pick option, Esc = close ---------- */

function handleKeydown(event) {
  if (!session) return;

  const tag = document.activeElement?.tagName;
  const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';

  if (event.key === 'Escape') {
    closeLesson();
  } else if (event.key === 'Enter' && tag !== 'TEXTAREA') {
    if (!dom.check.disabled) {
      event.preventDefault();
      dom.check.click();
    }
  } else if (/^[1-9]$/.test(event.key) && !isTyping) {
    $$('[data-hotkey]', dom.content)[Number(event.key) - 1]?.click();
  }
}

export function initLessonPlayer() {
  dom.root = $('#lesson');
  dom.scroll = $('#lesson-scroll');
  dom.content = $('#lesson-content');
  dom.progress = $('#lesson-progress');
  dom.hp = $('#lesson-hp');
  dom.hpBox = $('#lesson-hp-box');
  dom.footer = $('#lesson-footer');
  dom.feedback = $('#lesson-feedback');
  dom.check = $('#lesson-check');

  $('#lesson-close').addEventListener('click', closeLesson);
  dom.check.addEventListener('click', handleCheckButton);
  document.addEventListener('keydown', handleKeydown);
}

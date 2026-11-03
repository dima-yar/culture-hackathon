/**
 * Open answer checked by "AI" (keyword coverage in the demo).
 */

import { $, escapeHtml } from '../../core/utils.js';
import { XP_REWARD } from '../../data/achievements.js';

const MIN_ANSWER_LENGTH = 10;
const REVIEW_DELAY_MS = 1300;

/** Which key points of the model answer the text covers. */
function reviewAnswer(text, keyPoints) {
  const lowerText = text.toLowerCase();
  const points = keyPoints.map(point => ({
    label: point.l,
    covered: point.k.some(stem => lowerText.includes(stem)),
  }));
  const coveredCount = points.filter(point => point.covered).length;

  return {
    points,
    score: Math.round(coveredCount / keyPoints.length * 100),
    passed: coveredCount >= Math.ceil(keyPoints.length / 2),
  };
}

export function renderOpenAnswer(exercise, container, context) {
  container.innerHTML = `
    <div class="exercise__kind">Відкрита відповідь · перевіряє AI</div>
    <h2 class="exercise__question">${escapeHtml(exercise.q)}</h2>
    <textarea class="answer-field" placeholder="Напиши своїми словами…"></textarea>
    <div class="ai-review" hidden></div>`;

  const textarea = $('.answer-field', container);
  const review = $('.ai-review', container);

  textarea.addEventListener('input', () => context.setReady(textarea.value.trim().length >= MIN_ANSWER_LENGTH));
  setTimeout(() => textarea.focus(), 50);

  return {
    label: 'Перевірити з AI',
    check() {
      textarea.disabled = true;
      review.hidden = false;
      review.innerHTML = `
        <span class="typing"><i class="typing__dot"></i><i class="typing__dot"></i><i class="typing__dot"></i></span>
        AI аналізує відповідь…`;

      return new Promise(resolve => {
        setTimeout(() => {
          const { points, score, passed } = reviewAnswer(textarea.value, exercise.keys);

          review.innerHTML = `
            <div class="ai-review__head">🤖 Оцінка AI: ${score}% · ${passed ? 'зараховано' : 'потрібно доповнити'}</div>
            <ul class="ai-review__list">
              ${points.map(point => `
                <li class="ai-review__point ${point.covered ? 'ai-review__point--hit' : ''}">
                  ${point.covered ? '✔' : '○'} ${escapeHtml(point.label)}
                </li>`).join('')}
            </ul>
            <p class="ai-review__sample"><b>Зразок відповіді:</b> ${escapeHtml(exercise.sample)}</p>`;

          resolve({
            ok: passed,
            xp: passed ? XP_REWARD.openAnswer : 0,
            title: passed ? 'Змістовна відповідь!' : 'Варто доповнити відповідь',
            answer: 'дивись зразок вище',
          });
        }, REVIEW_DELAY_MS);
      });
    },
  };
}

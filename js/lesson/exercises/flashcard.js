/**
 * Flashcard: flip to see the answer. Always counts as correct.
 */

import { $, escapeHtml } from '../../core/utils.js';
import { XP_REWARD } from '../../data/achievements.js';

export function renderFlashcard(exercise, container, context) {
  container.innerHTML = `
    <div class="exercise__kind">Флеш-картка · натисни, щоб перевернути</div>
    <div class="flashcard">
      <div class="flashcard__inner">
        <div class="flashcard__face flashcard__face--front">
          <small class="flashcard__label">Що це?</small>
          <b class="flashcard__title">${escapeHtml(exercise.front)}</b>
          <span class="flashcard__tap">👆 торкнись картки</span>
        </div>
        <div class="flashcard__face flashcard__face--back">
          <b class="flashcard__title">${escapeHtml(exercise.back)}</b>
          <p class="flashcard__note">${escapeHtml(exercise.note || '')}</p>
        </div>
      </div>
    </div>`;

  const card = $('.flashcard', container);
  card.addEventListener('click', () => {
    card.classList.toggle('flashcard--flipped');
    context.setReady(true);
  });

  return {
    label: 'Запам’ятав',
    check: () => ({ ok: true, xp: XP_REWARD.flashcard, title: 'Картку додано до повторення' }),
  };
}

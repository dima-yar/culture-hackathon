/**
 * Fill in the blank: tap a word to put it into "___".
 */

import { $, $$, escapeHtml, shuffle } from '../../core/utils.js';

export function renderFillBlank(exercise, container, context) {
  const [before, after] = exercise.text.split('___');

  container.innerHTML = `
    <div class="exercise__kind">Заповни пропуск</div>
    <h2 class="exercise__question exercise__question--fill">
      ${escapeHtml(before)}<span class="blank">&nbsp;</span>${escapeHtml(after)}
    </h2>
    <div class="chips">
      ${shuffle(exercise.options).map(option => `<button class="chip" data-hotkey>${escapeHtml(option)}</button>`).join('')}
    </div>`;

  const blank = $('.blank', container);
  const chips = $$('.chip', container);
  let value = null;

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (context.isLocked()) return;
      chips.forEach(item => item.classList.remove('chip--used'));
      chip.classList.add('chip--used');
      value = chip.textContent;
      blank.textContent = value;
      context.setReady(true);
    });
  });

  // Tapping the filled blank clears it.
  blank.addEventListener('click', () => {
    if (context.isLocked() || !value) return;
    value = null;
    blank.innerHTML = '&nbsp;';
    chips.forEach(item => item.classList.remove('chip--used'));
    context.setReady(false);
  });

  return {
    check() {
      const ok = value === exercise.answer;
      blank.classList.add(ok ? 'blank--right' : 'blank--wrong');
      return { ok, answer: exercise.answer };
    },
  };
}

/**
 * Multiple choice. Also the base for the meme exercise.
 *
 * Every exercise renderer has the same contract:
 *   render(exercise, container, context) → { label?, check() }
 *   context.setReady(boolean) — enables / disables the "check" button
 *   context.isLocked()        — true once the answer has been checked
 *   check() returns { ok, answer, title?, xp? } or a Promise of it.
 */

import { $$, escapeHtml } from '../../core/utils.js';

export function renderMultipleChoice(exercise, container, context, { kind = 'Обери правильну відповідь', introHtml = '' } = {}) {
  container.innerHTML = `
    <div class="exercise__kind">${kind}</div>
    ${introHtml}
    <h2 class="exercise__question">${escapeHtml(exercise.q)}</h2>
    <div class="option-list">
      ${exercise.options.map((text, index) => `
        <button class="option" data-index="${index}" data-hotkey>
          <span class="option__key">${index + 1}</span>${escapeHtml(text)}
        </button>`).join('')}
    </div>`;

  const options = $$('.option', container);
  let selectedIndex = null;

  options.forEach(option => {
    option.addEventListener('click', () => {
      if (context.isLocked()) return;
      options.forEach(item => item.classList.remove('option--selected'));
      option.classList.add('option--selected');
      selectedIndex = Number(option.dataset.index);
      context.setReady(true);
    });
  });

  return {
    check() {
      const ok = selectedIndex === exercise.answer;
      options.forEach(item => item.classList.remove('option--selected'));
      options[exercise.answer].classList.add('option--right');
      if (!ok) options[selectedIndex].classList.add('option--wrong');
      return { ok, answer: exercise.options[exercise.answer] };
    },
  };
}

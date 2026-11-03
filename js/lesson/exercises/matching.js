/**
 * Matching pairs: pick one item on the left and one on the right.
 * Any wrong attempt makes the whole exercise count as a mistake.
 */

import { $$, escapeHtml, shuffle } from '../../core/utils.js';

const WRONG_FLASH_MS = 450;

export function renderMatching(exercise, container, context) {
  const leftItems = shuffle(exercise.pairs.map(([text], pairIndex) => ({ text, pairIndex })));
  const rightItems = shuffle(exercise.pairs.map(([, text], pairIndex) => ({ text, pairIndex })));

  const renderColumn = (items, side) => `
    <div class="match__column">
      ${items.map(item => `
        <button class="match__item" data-side="${side}" data-pair="${item.pairIndex}">
          ${escapeHtml(item.text)}
        </button>`).join('')}
    </div>`;

  container.innerHTML = `
    <div class="exercise__kind">Встанови відповідність</div>
    <h2 class="exercise__question">Знайди пари</h2>
    <div class="match">
      ${renderColumn(leftItems, 'left')}
      ${renderColumn(rightItems, 'right')}
    </div>`;

  let selected = null;
  let matchedCount = 0;
  let wrongAttempts = 0;

  const flashWrong = element => {
    element.classList.add('match__item--wrong');
    setTimeout(() => element.classList.remove('match__item--wrong'), WRONG_FLASH_MS);
  };

  $$('.match__item', container).forEach(item => {
    item.addEventListener('click', () => {
      if (context.isLocked() || item.classList.contains('match__item--matched')) return;

      // First pick, or switching the pick within the same column.
      if (!selected || selected.dataset.side === item.dataset.side) {
        selected?.classList.remove('match__item--selected');
        selected = item;
        item.classList.add('match__item--selected');
        return;
      }

      selected.classList.remove('match__item--selected');

      if (selected.dataset.pair === item.dataset.pair) {
        selected.classList.add('match__item--matched');
        item.classList.add('match__item--matched');
        matchedCount += 1;
        if (matchedCount === exercise.pairs.length) context.setReady(true);
      } else {
        wrongAttempts += 1;
        flashWrong(selected);
        flashWrong(item);
      }
      selected = null;
    });
  });

  return {
    check: () => ({
      ok: wrongAttempts === 0,
      title: wrongAttempts ? `Помилок у парах: ${wrongAttempts}` : '',
      answer: exercise.pairs.map(pair => pair.join(' — ')).join('; '),
    }),
  };
}

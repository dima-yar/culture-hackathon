/**
 * Crossword with auto-advance between cells and a letter hint.
 */

import { $, $$, escapeHtml, pickRandom } from '../../core/utils.js';
import { unlockAchievement } from '../../core/progress.js';
import { CROSSWORDS } from '../../data/units.js';
import { XP_REWARD } from '../../data/achievements.js';

/** Builds a rows×cols grid of letters (null = empty cell) and numbers of word starts. */
function buildGrid(crossword) {
  const letters = Array.from({ length: crossword.rows }, () => Array(crossword.cols).fill(null));
  const numbers = {};

  crossword.words.forEach(word => {
    [...word.word].forEach((letter, offset) => {
      const row = word.row + (word.direction === 'down' ? offset : 0);
      const col = word.col + (word.direction === 'across' ? offset : 0);
      letters[row][col] = letter;
    });
    numbers[`${word.row}:${word.col}`] = word.number;
  });

  return { letters, numbers };
}

function renderCell(letter, row, col, number) {
  if (!letter) return '<div class="crossword__cell crossword__cell--empty"></div>';

  return `
    <div class="crossword__cell">
      ${number ? `<sup class="crossword__number">${number}</sup>` : ''}
      <input class="crossword__input" maxlength="2" data-row="${row}" data-col="${col}"
             autocomplete="off" spellcheck="false" aria-label="Клітинка ${row + 1}:${col + 1}">
    </div>`;
}

export function renderCrossword(exercise, container, context) {
  const crossword = CROSSWORDS[exercise.id];
  const { letters, numbers } = buildGrid(crossword);

  const renderClues = direction => crossword.words
    .filter(word => word.direction === direction)
    .map(word => `<p class="crossword__clue"><b>${word.number}.</b> ${escapeHtml(word.clue)}</p>`)
    .join('');

  container.innerHTML = `
    <div class="exercise__kind">Кросворд</div>
    <h2 class="exercise__question">Розгадай кросворд</h2>
    <div class="crossword">
      <div class="crossword__grid" style="grid-template-columns: repeat(${crossword.cols}, 1fr)">
        ${letters.map((row, rowIndex) => row
          .map((letter, colIndex) => renderCell(letter, rowIndex, colIndex, numbers[`${rowIndex}:${colIndex}`]))
          .join('')).join('')}
      </div>
      <div class="crossword__clues">
        <h4 class="crossword__clues-title">По горизонталі →</h4>
        ${renderClues('across')}
        <h4 class="crossword__clues-title">По вертикалі ↓</h4>
        ${renderClues('down')}
      </div>
    </div>
    <button class="link-button crossword__hint">💡 Підказка: відкрити літеру</button>`;

  const inputs = $$('.crossword__input', container);
  const expectedLetter = input => letters[input.dataset.row][input.dataset.col];
  const inputAt = (row, col) => inputs.find(input => Number(input.dataset.row) === row && Number(input.dataset.col) === col);
  const updateReady = () => context.setReady(inputs.every(input => input.value.trim()));

  inputs.forEach(input => {
    input.addEventListener('input', () => {
      input.value = input.value.toLocaleUpperCase('uk').slice(-1);

      // Jump to the next empty cell to the right, otherwise below.
      if (input.value) {
        const row = Number(input.dataset.row);
        const col = Number(input.dataset.col);
        const next = inputAt(row, col + 1) || inputAt(row + 1, col);
        if (next && !next.value) next.focus();
      }
      updateReady();
    });
  });

  $('.crossword__hint', container).addEventListener('click', () => {
    if (context.isLocked()) return;
    const unsolved = inputs.filter(input => input.value !== expectedLetter(input));
    if (!unsolved.length) return;

    const input = pickRandom(unsolved);
    input.value = expectedLetter(input);
    input.parentElement.classList.add('crossword__cell--hinted');
    updateReady();
  });

  return {
    check() {
      let ok = true;
      inputs.forEach(input => {
        const isRight = input.value === expectedLetter(input);
        input.parentElement.classList.add(isRight ? 'crossword__cell--right' : 'crossword__cell--wrong');
        input.disabled = true;
        ok = ok && isRight;
      });

      if (ok) unlockAchievement('cross');

      return {
        ok,
        xp: XP_REWARD.crossword,
        title: ok ? 'Кросворд розгадано!' : 'Є неправильні літери',
        answer: crossword.words.map(word => `${word.number} — ${word.word}`).join(', '),
      };
    },
  };
}

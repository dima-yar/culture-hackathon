/**
 * Chronology: tap events in order from the oldest to the newest.
 */

import { $, $$, escapeHtml, shuffle } from '../../core/utils.js';

export function renderChronology(exercise, container, context) {
  const items = shuffle(exercise.items);
  const picked = [];

  container.innerHTML = `
    <div class="exercise__kind">Хронологія</div>
    <h2 class="exercise__question">Розстав події від найдавнішої до найновішої</h2>
    <ol class="order-list"></ol>
    <div class="chips chips--column"></div>`;

  const slots = $('.order-list', container);
  const pool = $('.chips', container);

  const renderSlots = () => {
    const filled = picked.map((item, index) => `
      <li class="order-list__item" data-slot="${index}">
        <span class="order-list__number">${index + 1}</span>
        ${escapeHtml(item.t)}
        <span class="order-list__year"></span>
      </li>`).join('');

    const placeholder = picked.length < items.length
      ? '<li class="order-list__item order-list__item--placeholder">Натискай події нижче по черзі</li>'
      : '';

    slots.innerHTML = filled + placeholder;
  };

  const renderPool = () => {
    pool.innerHTML = items.map((item, index) => `
      <button class="chip ${picked.includes(item) ? 'chip--used' : ''}" data-item="${index}" data-hotkey>
        ${escapeHtml(item.t)}
      </button>`).join('');
  };

  const draw = () => {
    renderSlots();
    renderPool();

    // Tap a slot to take the event back.
    $$('[data-slot]', slots).forEach(slot => {
      slot.addEventListener('click', () => {
        if (context.isLocked()) return;
        picked.splice(Number(slot.dataset.slot), 1);
        draw();
      });
    });

    $$('[data-item]', pool).forEach(chip => {
      chip.addEventListener('click', () => {
        if (context.isLocked()) return;
        picked.push(items[Number(chip.dataset.item)]);
        draw();
      });
    });

    context.setReady(picked.length === items.length);
  };

  draw();

  return {
    check() {
      const correctOrder = [...items].sort((a, b) => a.y - b.y);
      const slotElements = $$('[data-slot]', slots);

      picked.forEach((item, index) => {
        const isRight = item === correctOrder[index];
        slotElements[index].classList.add(isRight ? 'order-list__item--right' : 'order-list__item--wrong');
        $('.order-list__year', slotElements[index]).textContent = item.y;
      });

      return {
        ok: picked.every((item, index) => item === correctOrder[index]),
        answer: correctOrder.map(item => `${item.y} — ${item.t}`).join(' → '),
      };
    },
  };
}

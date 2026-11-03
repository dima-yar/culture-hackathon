/**
 * History tour (from Okraina's "map textbook"): steps through all events in order.
 * Each step sets the year, flies to the place and shows the card.
 * Controls: Back / Next, autoplay, keys ←/→, Space, Esc.
 */

import { EVENTS, getYearLabel } from '../../data/events.js';

const AUTOPLAY_MS = 4500;

/**
 * @param {{ onStep: (event) => void, onStop: () => void }} handlers
 */
export function createTour({ onStep, onStop }) {
  let index = -1;
  let timer = null;

  const isActive = () => index >= 0;
  const isPlaying = () => timer !== null;

  function pause() {
    clearInterval(timer);
    timer = null;
  }

  function goTo(newIndex) {
    index = Math.max(0, Math.min(EVENTS.length - 1, newIndex));
    onStep(EVENTS[index]);
    if (index === EVENTS.length - 1) pause();
  }

  function play() {
    pause();
    timer = setInterval(() => goTo(index + 1), AUTOPLAY_MS);
  }

  function togglePlay() {
    if (isPlaying()) pause();
    else play();
    onStep(EVENTS[index]); // redraw the controls with the new button label
  }

  function stop() {
    pause();
    index = -1;
    onStop();
  }

  /** Start from the first event at or after `year`. */
  function start(year) {
    const first = EVENTS.findIndex(event => event.year >= year);
    goTo(first === -1 ? 0 : first);
  }

  function renderControls() {
    const event = EVENTS[index];
    return `
      <div class="tour">
        <div class="tour__head">
          <b class="tour__title">🧭 Екскурсія історією</b>
          <span class="tour__step">${index + 1} / ${EVENTS.length} · ${getYearLabel(event)}</span>
        </div>
        <div class="progress tour__progress">
          <i class="progress__fill progress__fill--gold" style="width: ${((index + 1) / EVENTS.length) * 100}%"></i>
        </div>
        <div class="tour__controls">
          <button class="btn btn--ghost btn--small" data-tour="prev" ${index === 0 ? 'disabled' : ''} title="Назад (←)">◀</button>
          <button class="btn btn--small" data-tour="toggle" title="Автоплей (пробіл)">${isPlaying() ? '⏸ Пауза' : '▶ Автоплей'}</button>
          <button class="btn btn--ghost btn--small" data-tour="next" ${index === EVENTS.length - 1 ? 'disabled' : ''} title="Далі (→)">▶</button>
          <button class="btn btn--ghost btn--small" data-tour="stop" title="Завершити (Esc)">✕</button>
        </div>
        <small class="tour__hint">Клавіші: ← → · пробіл · Esc — завершити</small>
      </div>`;
  }

  /** Handles a click on [data-tour] buttons; returns true if it was handled. */
  function handleAction(action) {
    if (action === 'prev') goTo(index - 1);
    else if (action === 'next') goTo(index + 1);
    else if (action === 'toggle') togglePlay();
    else if (action === 'stop') stop();
    else return false;
    return true;
  }

  /** Keyboard while the tour is active; returns true if the key was used. */
  function handleKey(key) {
    if (!isActive()) return false;
    if (key === 'ArrowLeft') goTo(index - 1);
    else if (key === 'ArrowRight') goTo(index + 1);
    else if (key === ' ') handleAction('toggle');
    else if (key === 'Escape') stop();
    else return false;
    return true;
  }

  return { start, stop, pause, isActive, renderControls, handleAction, handleKey };
}

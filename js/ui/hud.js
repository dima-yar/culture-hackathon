/**
 * Heads-up display: streak, XP, HP, level bar and the HitPoints dialog.
 */

import { $ } from '../core/utils.js';
import { state } from '../core/state.js';
import { on } from '../core/events.js';
import { getLevel, getLevelTitle, restoreHp, xpToNextLevel } from '../core/progress.js';
import { MAX_HP, XP_PER_LEVEL } from '../data/achievements.js';
import { openModal, closeModal } from './modal.js';
import { showToast } from './toast.js';

export function renderHud() {
  const level = getLevel();

  $('#hud-streak').textContent = state.streak;
  $('#hud-xp').textContent = state.xp;
  $('#hud-hp').textContent = state.hp;
  $('#hud-level').textContent = level;
  $('#hud-level-title').textContent = getLevelTitle(level);
  $('#hud-level-fill').style.width = `${(state.xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100}%`;
  $('#hud-level-hint').textContent = `${xpToNextLevel()} XP до рівня ${level + 1}`;
  $('#hud-hp-button').classList.toggle('stat--empty', state.hp === 0);
}

function showXpGain(amount) {
  const label = document.createElement('div');
  label.className = 'xp-gain';
  label.textContent = `+${amount} XP`;
  document.body.append(label);
  setTimeout(() => label.remove(), 1100);
}

/** Explains HitPoints; when `isOut` is true the player has no HP left. */
export function openHpModal(isOut = state.hp === 0) {
  const canRefill = state.hp < MAX_HP;

  const dialog = openModal(`
    <div class="modal__icon">${isOut ? '💔' : '❤️'}</div>
    <h2>${isOut ? 'HP закінчились' : `HitPoints: ${state.hp} / ${MAX_HP}`}</h2>
    <p class="modal__text">
      Кожна помилка забирає 1 HP — так видно, які теми ще «болять».
      У повній версії HP відновлюються з часом або за повторення помилок.
    </p>
    ${canRefill ? '<button class="btn btn--red" data-action="refill">Відновити HP (демо)</button>' : ''}
    <button class="btn btn--ghost" data-action="close">${isOut ? 'Пізніше' : 'Зрозуміло'}</button>`);

  dialog.querySelector('[data-action="close"]').addEventListener('click', closeModal);
  dialog.querySelector('[data-action="refill"]')?.addEventListener('click', () => {
    restoreHp();
    closeModal();
    showToast({ icon: '❤️', html: 'HP відновлено!' });
  });
}

export function initHud() {
  $('#hud-hp-button').addEventListener('click', () => openHpModal());
  on('progress:changed', renderHud);
  on('xp:gained', showXpGain);
  renderHud();
}

/**
 * Gamification rules: XP, levels, HP, combo, achievements.
 * UI reacts through events (see core/events.js), so this module has no DOM code
 * except toasts for unlocked achievements and level-ups.
 */

import { state, saveState } from './state.js';
import { emit } from './events.js';
import { showToast } from '../ui/toast.js';
import { ACHIEVEMENTS, LEVEL_TITLES, MAX_HP, XP_PER_LEVEL } from '../data/achievements.js';

const COMBO_FOR_ACHIEVEMENT = 5;

export const getLevel = (xp = state.xp) => Math.floor(xp / XP_PER_LEVEL) + 1;

export const getLevelTitle = level => LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1];

export const xpToNextLevel = () => XP_PER_LEVEL - (state.xp % XP_PER_LEVEL);

export function addXp(amount) {
  if (!amount) return;

  const levelBefore = getLevel();
  state.xp += amount;
  state.todayXp += amount;
  saveState();

  emit('xp:gained', amount);
  emit('progress:changed');

  const level = getLevel();
  if (level > levelBefore) {
    showToast({
      icon: '🎉',
      html: `<b>Новий рівень ${level}!</b><br>Тепер ти — ${getLevelTitle(level)}`,
      modifier: 'level',
    });
  }
  if (level >= 3) unlockAchievement('lvl3');
}

export function unlockAchievement(id) {
  if (state.achievements[id]) return;

  state.achievements[id] = Date.now();
  saveState();

  const achievement = ACHIEVEMENTS.find(item => item.id === id);
  showToast({
    icon: achievement.icon,
    html: `<b>Досягнення!</b><br>${achievement.title}`,
    modifier: 'achievement',
  });
  emit('achievement:unlocked', id);
}

export const countAchievements = () => ACHIEVEMENTS.filter(item => state.achievements[item.id]).length;

/** Correct answer: grow the combo. Returns the new combo length. */
export function registerCorrectAnswer() {
  state.combo += 1;
  saveState();
  if (state.combo >= COMBO_FOR_ACHIEVEMENT) unlockAchievement('combo5');
  return state.combo;
}

/** Wrong answer: lose 1 HP, reset combo, remember the weak topic. */
export function registerMistake(topic) {
  state.combo = 0;
  state.hp = Math.max(0, state.hp - 1);
  state.topicMistakes[topic] = (state.topicMistakes[topic] || 0) + 1;
  saveState();
  emit('progress:changed');
}

export function restoreHp() {
  state.hp = MAX_HP;
  saveState();
  emit('progress:changed');
}

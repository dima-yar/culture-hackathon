/**
 * Player state, persisted in localStorage.
 * `state` is a single mutable object; call saveState() after changing it.
 */

import { today } from './utils.js';
import { MAX_HP } from '../data/achievements.js';
import { DEFAULT_FRIENDS } from '../data/users.js';
import { createSampleGroups } from '../data/sample-groups.js';

const STORAGE_KEY = 'litopys-demo-v2';

function createInitialState() {
  return {
    xp: 0,
    hp: MAX_HP,
    streak: 3,
    combo: 0,
    day: today(),
    todayXp: 0,
    completedLessons: {},   // lessonId → true
    exploredEvents: {},     // eventId → true
    readDocuments: {},      // documentId → true
    achievements: {},       // achievementId → timestamp
    topicMistakes: {},      // unit title → count
    friends: [...DEFAULT_FRIENDS],
    groups: createSampleGroups(),
  };
}

function loadState() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    // Storage blocked or corrupted — start fresh.
  }

  const loaded = Object.assign(createInitialState(), saved);

  // New day: reset the daily goal and continue the streak.
  if (loaded.day !== today()) {
    loaded.day = today();
    loaded.todayXp = 0;
    loaded.streak += 1;
  }
  return loaded;
}

export const state = loadState();

export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or quota exceeded — progress simply won't persist.
  }
}

export function resetState() {
  Object.keys(state).forEach(key => delete state[key]);
  Object.assign(state, createInitialState());
  saveState();
}

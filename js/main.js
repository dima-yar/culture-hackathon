/**
 * Entry point: wires the app shell, lesson player, navigation and social feed.
 */

import { $$ } from './core/utils.js';
import { saveState } from './core/state.js';
import { on } from './core/events.js';
import { initHud } from './ui/hud.js';
import { initModal } from './ui/modal.js';
import { initLessonPlayer, isLessonActive } from './lesson/player.js';
import { startSocialFeed } from './features/social.js';
import { getCurrentView, navigate, refreshView } from './router.js';

function bindNavigation() {
  $$('[data-view]').forEach(button => {
    button.addEventListener('click', () => navigate(button.dataset.view));
  });
}

function bindAppEvents() {
  on('navigate', navigate);
  on('lesson:closed', refreshView);
  on('achievement:unlocked', () => {
    if (getCurrentView() === 'profile') refreshView();
  });
}

function start() {
  saveState(); // persist the new-day streak update
  initModal();
  initHud();
  initLessonPlayer();
  bindNavigation();
  bindAppEvents();
  startSocialFeed(isLessonActive);
  navigate('learn');
}

start();

/**
 * Screen switching. Each view exports a render function that redraws its <section>.
 */

import { $$ } from './core/utils.js';
import { renderLearnView } from './views/learn.js';
import { renderMapView } from './views/map/map-view.js';
import { renderDocsView } from './views/docs.js';
import { renderAiView } from './views/ai.js';
import { renderGroupsView } from './views/groups.js';
import { renderFriendsView } from './views/friends.js';
import { renderProfileView } from './views/profile.js';
import { renderChronicleView } from './views/chronicle.js';

const VIEWS = {
  learn: renderLearnView,
  map: renderMapView,
  docs: renderDocsView,
  chronicle: renderChronicleView,
  ai: renderAiView,
  groups: renderGroupsView,
  friends: renderFriendsView,
  profile: renderProfileView,
};

let currentView = 'learn';

export const getCurrentView = () => currentView;

export function navigate(viewName) {
  if (!VIEWS[viewName]) return;
  currentView = viewName;

  $$('[data-view]').forEach(button => {
    button.classList.toggle('nav__item--active', button.dataset.view === viewName);
  });
  $$('.view').forEach(section => {
    section.classList.toggle('view--active', section.id === `view-${viewName}`);
  });
  document.querySelector('.app__main').classList.toggle('app__main--wide', WIDE_VIEWS.has(viewName));

  VIEWS[viewName]();
  window.scrollTo(0, 0);
}

/** Screens that use the full window width. */
const WIDE_VIEWS = new Set(['map']);

/** Redraws the current screen (e.g. after a lesson changed progress). */
export function refreshView() {
  VIEWS[currentView]();
}

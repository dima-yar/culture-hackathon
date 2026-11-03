/**
 * Social proof: "online now" counter and pop-ups about friends' activity.
 * Only friends trigger pop-ups; with no friends there are none.
 */

import { $, escapeHtml, pickRandom, randomInt } from '../core/utils.js';
import { state } from '../core/state.js';
import { showToast } from '../ui/toast.js';
import { findUser } from '../data/users.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { EVENTS } from '../data/events.js';
import { getAllLessons } from '../lesson/catalog.js';

const ONLINE_REFRESH_MS = 5000;
const FIRST_FRIEND_TOAST_MS = 8000;
const FRIEND_TOAST_INTERVAL_MS = 25000;

function describeFriendAction(user) {
  const isFemale = user.gender === 'f';
  const verb = (female, male) => (isFemale ? female : male);

  const actions = [
    () => `${verb('завершила', 'завершив')} урок «${pickRandom(getAllLessons()).title}»`,
    () => `${verb('отримала', 'отримав')} досягнення «${pickRandom(ACHIEVEMENTS).title}»`,
    () => `${verb('досягла', 'досяг')} рівня ${Math.floor(user.xp / 100) + 2}`,
    () => `${verb('дослідила', 'дослідив')} подію «${pickRandom(EVENTS).title}»`,
  ];
  return pickRandom(actions)();
}

function showFriendToast(isBusy) {
  if (isBusy() || document.hidden || !state.friends.length) return;

  const friend = findUser(pickRandom(state.friends));
  if (!friend) return;

  showToast({
    icon: friend.avatar,
    html: `<b>${escapeHtml(friend.name)}</b> · друг<br>щойно ${escapeHtml(describeFriendAction(friend))}`,
  });
}

function refreshOnlineCounter() {
  $('#online-count').textContent = randomInt(1200, 1400).toLocaleString('uk-UA');
}

/** @param {() => boolean} isBusy — true while a lesson is open (no distractions). */
export function startSocialFeed(isBusy) {
  setInterval(refreshOnlineCounter, ONLINE_REFRESH_MS);
  setTimeout(() => showFriendToast(isBusy), FIRST_FRIEND_TOAST_MS);
  setInterval(() => showFriendToast(isBusy), FRIEND_TOAST_INTERVAL_MS);
}

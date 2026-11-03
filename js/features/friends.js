/**
 * Friends: add, remove, search.
 */

import { state, saveState } from '../core/state.js';
import { unlockAchievement } from '../core/progress.js';
import { USERS, findUser } from '../data/users.js';

export const getFriends = () => state.friends.map(findUser).filter(Boolean);

export const isFriend = userId => state.friends.includes(userId);

export function addFriend(userId) {
  if (isFriend(userId)) return;
  state.friends.push(userId);
  saveState();
  unlockAchievement('friend');
}

export function removeFriend(userId) {
  state.friends = state.friends.filter(id => id !== userId);
  saveState();
}

/** Non-friends matching name, @nick or city. Empty query → suggestions. */
export function searchPeople(query, suggestionCount = 4) {
  const others = USERS.filter(user => !isFriend(user.id));
  const needle = query.trim().toLowerCase().replace(/^@/, '');

  if (!needle) return others.slice(0, suggestionCount);

  return others.filter(user => `${user.name} ${user.nick} ${user.city}`.toLowerCase().includes(needle));
}

/**
 * Friends screen: friend list, people search, activity feed.
 */

import { $, $$, escapeHtml } from '../core/utils.js';
import { showToast } from '../ui/toast.js';
import { findUser } from '../data/users.js';
import { addFriend, getFriends, removeFriend, searchPeople } from '../features/friends.js';
import { getLevel } from '../core/progress.js';

let searchQuery = '';

function renderPerson(user, actionHtml) {
  return `
    <li class="person">
      <span class="person__avatar">${user.avatar}</span>
      <div class="person__info">
        <b>${escapeHtml(user.name)}</b>
        <small class="person__meta">
          @${user.nick} · ${escapeHtml(user.city)} · рівень ${getLevel(user.xp)} · 🔥 ${user.streak}
        </small>
      </div>
      <span class="person__xp">⭐ ${user.xp}</span>
      ${actionHtml}
    </li>`;
}

function renderFriendList(friends) {
  if (!friends.length) return '<p class="text--muted">Поки що немає друзів. Знайди їх у пошуку 🔍</p>';

  return `
    <ul class="person-list">
      ${friends.map(user => renderPerson(user, `<button class="btn btn--ghost btn--small" data-remove-friend="${user.id}">Видалити</button>`)).join('')}
    </ul>`;
}

function renderSearch() {
  const results = searchPeople(searchQuery);
  const hasQuery = Boolean(searchQuery.trim());

  return `
    <input class="field" id="friends-search" placeholder="Ім’я, @нік або місто" value="${escapeHtml(searchQuery)}" autocomplete="off">
    <p class="text--muted text--small">${hasQuery ? `Знайдено: ${results.length}` : 'Можливо, ви знайомі'}</p>
    <ul class="person-list">
      ${results.map(user => renderPerson(user, `<button class="btn btn--small" data-add-friend="${user.id}">Додати</button>`)).join('')
        || '<li class="text--muted">Нікого не знайдено</li>'}
    </ul>`;
}

function renderFeed(friends) {
  if (!friends.length) return '';

  return `
    <h3 class="section-title">Стрічка друзів</h3>
    <div class="card feed">
      ${friends.map(user => `
        <div class="feed__item">
          ${user.avatar} <b>${escapeHtml(user.name)}</b> ${escapeHtml(user.lastAction)}
          <small class="feed__time">${user.lastSeen}</small>
        </div>`).join('')}
    </div>`;
}

export function renderFriendsView() {
  const container = $('#view-friends');
  const friends = getFriends();

  container.innerHTML = `
    <div class="page-head">
      <h1>Друзі</h1>
      <p class="page-head__text">
        Додавай друзів, стеж за їхніми успіхами й запрошуй у групи. Сповіщення про досягнення приходять лише від друзів.
      </p>
    </div>

    <div class="layout layout--split">
      <div class="card">
        <h3 class="card__title">Мої друзі · ${friends.length}</h3>
        ${renderFriendList(friends)}
      </div>
      <div class="card">
        <h3 class="card__title">🔍 Знайти друзів</h3>
        ${renderSearch()}
      </div>
    </div>

    ${renderFeed(friends)}`;

  const search = $('#friends-search');
  search.addEventListener('input', () => {
    searchQuery = search.value;
    renderFriendsView();
    const field = $('#friends-search');
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  });

  $$('[data-add-friend]', container).forEach(button => {
    button.addEventListener('click', () => {
      const user = findUser(button.dataset.addFriend);
      addFriend(user.id);
      showToast({ icon: user.avatar, html: `<b>${escapeHtml(user.name)}</b> тепер у твоїх друзях` });
      renderFriendsView();
    });
  });

  $$('[data-remove-friend]', container).forEach(button => {
    button.addEventListener('click', () => {
      const user = findUser(button.dataset.removeFriend);
      if (!confirm(`Видалити ${user.name} з друзів?`)) return;
      removeFriend(user.id);
      renderFriendsView();
    });
  });
}

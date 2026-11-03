/**
 * Profile: stats, achievements and the weekly league.
 */

import { $, escapeHtml, plural } from '../core/utils.js';
import { state, resetState } from '../core/state.js';
import { emit } from '../core/events.js';
import { countAchievements, getLevel, getLevelTitle } from '../core/progress.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { LEAGUE, shortName } from '../data/users.js';

const PROMOTION_PLACES = 3;

function renderStatTiles() {
  const tiles = [
    { value: `⭐ ${state.xp}`, label: 'усього XP' },
    { value: `🔥 ${state.streak}`, label: `${plural(state.streak, 'день', 'дні', 'днів')} поспіль` },
    { value: `📘 ${Object.keys(state.completedLessons).length}`, label: 'уроків пройдено' },
    { value: `🗺️ ${Object.keys(state.exploredEvents).length}`, label: 'подій досліджено' },
  ];

  return `
    <div class="stat-tiles">
      ${tiles.map(tile => `
        <div class="stat-tile">
          <b class="stat-tile__value">${tile.value}</b>
          <small class="stat-tile__label">${tile.label}</small>
        </div>`).join('')}
    </div>`;
}

function renderAchievements() {
  return `
    <div class="card">
      <h3>Досягнення · ${countAchievements()}/${ACHIEVEMENTS.length}</h3>
      <div class="achievement-grid">
        ${ACHIEVEMENTS.map(achievement => `
          <div class="achievement ${state.achievements[achievement.id] ? '' : 'achievement--locked'}">
            <div class="achievement__icon">${achievement.icon}</div>
            <b class="achievement__title">${achievement.title}</b>
            <small class="achievement__desc">${achievement.description}</small>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderLeague() {
  const rows = [
    ...LEAGUE.map(user => ({ name: shortName(user), xp: user.xp, avatar: '👤' })),
    { name: 'Ти', xp: state.xp, avatar: '🧑‍🎓', isMe: true },
  ].sort((a, b) => b.xp - a.xp);

  return `
    <div class="card">
      <h3>🥉 Бронзова ліга</h3>
      <p class="text--muted text--small text--flush">
        Тиждень закінчиться через 4 дні. Топ-${PROMOTION_PLACES} переходять до Срібної ліги.
      </p>
      <ol class="leaderboard">
        ${rows.map((row, index) => {
          const modifiers = [row.isMe && 'leaderboard__item--me', index < PROMOTION_PLACES && 'leaderboard__item--top']
            .filter(Boolean).join(' ');
          const zone = index === PROMOTION_PLACES - 1 ? '<li class="leaderboard__zone">▲ зона підвищення</li>' : '';
          return `
            <li class="leaderboard__item ${modifiers}">
              <span class="leaderboard__rank">${index + 1}</span>
              ${row.avatar} ${escapeHtml(row.name)}
              <span class="leaderboard__score">${row.xp} XP</span>
            </li>${zone}`;
        }).join('')}
      </ol>
    </div>`;
}

export function renderProfileView() {
  const container = $('#view-profile');
  const level = getLevel();

  container.innerHTML = `
    <div class="profile-head">
      <div class="profile-head__avatar">🧑‍🎓</div>
      <div>
        <h1>Учень-демо</h1>
        <p class="profile-head__meta">Рівень ${level} · ${getLevelTitle(level)} · у Літописі з листопада 2026</p>
      </div>
    </div>

    ${renderStatTiles()}

    <div class="layout layout--feature">
      ${renderAchievements()}
      ${renderLeague()}
    </div>

    <p><button class="btn btn--ghost btn--small" id="profile-reset">Скинути прогрес демо</button></p>`;

  $('#profile-reset').addEventListener('click', () => {
    if (!confirm('Скинути весь прогрес демо?')) return;
    resetState();
    emit('progress:changed');
    emit('navigate', 'learn');
  });
}

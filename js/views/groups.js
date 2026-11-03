/**
 * Groups screen: list of groups → group page with tests and competitions.
 */

import { $, $$, copyToClipboard, escapeHtml, formatDate, plural } from '../core/utils.js';
import { showToast } from '../ui/toast.js';
import { state } from '../core/state.js';
import { findUser } from '../data/users.js';
import { searchFacts } from '../features/facts.js';
import {
  buildGroupLessonId, canEditTest, createCompetition, createGroup, deleteTest, findGroup, findTest,
  inviteMember, isCompetitionOver, isGroupAdmin, joinGroupByCode, leaveGroup, publishTest, removeMember,
} from '../features/groups.js';
import { startLesson } from '../lesson/player.js';

const GROUP_EMOJIS = ['🏛️', '⚔️', '📜', '🌻', '🦁', '🎓'];
const MEDALS = ['🥇', '🥈', '🥉'];
const ANSWER_VARIANTS = 3;

let openGroupId = null;
let activeTab = 'tests';
let draftTest = { title: '', questions: [] };

const resetDraft = () => {
  draftTest = { title: '', questions: [] };
};

const countLabel = (count, one, few, many) => `${count} ${plural(count, one, few, many)}`;

/* ---------- group list ---------- */

function renderGroupCard(group) {
  return `
    <button class="card group-card" data-group="${group.id}">
      <span class="group-card__emoji">${group.emoji}</span>
      <b class="group-card__name">${escapeHtml(group.name)}</b>
      <small class="group-card__meta">
        ${countLabel(group.members.length + 1, 'учасник', 'учасники', 'учасників')} ·
        ${countLabel(group.tests.length, 'тест', 'тести', 'тестів')} ·
        ${countLabel(group.competitions.length, 'змагання', 'змагання', 'змагань')}
      </small>
      ${isGroupAdmin(group) ? '<span class="tag">ти — адмін</span>' : ''}
    </button>`;
}

function renderGroupList(container) {
  container.innerHTML = `
    <div class="page-head">
      <h1>Групи</h1>
      <p class="page-head__text">
        Створюй групи з друзями, однокласниками чи учнями — усередині можна робити власні тести й проводити змагання.
      </p>
    </div>

    ${state.groups.length
      ? `<div class="group-grid">${state.groups.map(renderGroupCard).join('')}</div>`
      : '<p class="text--muted">Ти ще не в жодній групі.</p>'}

    <div class="layout layout--split layout--spaced">
      <form class="card form" id="group-create-form">
        <h3>➕ Нова група</h3>
        <input class="field" name="name" placeholder="Назва, напр.: Історичний клуб" required maxlength="40">
        <div class="emoji-picker">
          ${GROUP_EMOJIS.map((emoji, index) => `
            <label>
              <input class="emoji-picker__input" type="radio" name="emoji" value="${emoji}" ${index === 0 ? 'checked' : ''}>
              <span class="emoji-picker__face">${emoji}</span>
            </label>`).join('')}
        </div>
        <button class="btn btn--green">Створити групу</button>
      </form>

      <form class="card form" id="group-join-form">
        <h3>🔑 Приєднатися за кодом</h3>
        <input class="field" name="code" placeholder="HIST-0000" required maxlength="12">
        <button class="btn">Приєднатися</button>
        <p class="text--muted text--small">Код можна отримати від будь-кого з учасників групи.</p>
      </form>
    </div>`;

  $$('[data-group]', container).forEach(card => {
    card.addEventListener('click', () => openGroup(card.dataset.group));
  });

  $('#group-create-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const group = createGroup({ name: form.get('name').trim(), emoji: form.get('emoji') });
    showToast({ icon: group.emoji, html: `Групу «${escapeHtml(group.name)}» створено` });
    openGroup(group.id);
  });

  $('#group-join-form').addEventListener('submit', event => {
    event.preventDefault();
    const result = joinGroupByCode(new FormData(event.target).get('code'));
    showToast(result === 'joined'
      ? { icon: '👥', html: 'Вітаємо в групі! (демо)' }
      : { icon: 'ℹ️', html: 'Ти вже в цій групі' });
    renderGroupsView();
  });
}

function openGroup(groupId) {
  openGroupId = groupId;
  activeTab = 'tests';
  resetDraft();
  renderGroupsView();
}

/* ---------- group page ---------- */

function renderMembers(group) {
  const isAdmin = isGroupAdmin(group);
  const members = group.members.map(findUser).filter(Boolean);
  const invitable = state.friends.filter(id => !group.members.includes(id)).map(findUser).filter(Boolean);

  return `
    <aside class="card">
      <h3>Учасники · ${members.length + 1}</h3>
      <ul class="members">
        <li class="members__item">
          <span class="members__avatar">🧑‍🎓</span>
          <b class="members__name">Ти</b>
          ${isAdmin ? '<span class="tag">адмін</span>' : ''}
        </li>
        ${members.map(user => `
          <li class="members__item">
            <span class="members__avatar">${user.avatar}</span>
            <b class="members__name">${escapeHtml(user.name)}</b>
            ${group.owner === user.id ? '<span class="tag">адмін</span>' : ''}
            ${isAdmin ? `<button class="icon-button" data-remove-member="${user.id}" title="Видалити з групи">✕</button>` : ''}
          </li>`).join('')}
      </ul>
      ${invitable.length ? `
        <div class="invite">
          <select class="field" id="group-invite-select" aria-label="Друг">
            ${invitable.map(user => `<option value="${user.id}">${escapeHtml(user.name)}</option>`).join('')}
          </select>
          <button class="btn btn--small" id="group-invite-button">Запросити</button>
        </div>` : '<p class="text--muted text--small">Запрошувати можна друзів — додай їх у вкладці «Друзі».</p>'}
    </aside>`;
}

function renderGroupPage(container, group) {
  const isAdmin = isGroupAdmin(group);

  container.innerHTML = `
    <p><button class="link-button" id="group-back">← Усі групи</button></p>

    <div class="card group-head">
      <span class="group-head__emoji">${group.emoji}</span>
      <div class="group-head__info">
        <h1>${escapeHtml(group.name)}</h1>
        <p class="group-head__code">
          Код для вступу: <b class="code-badge">${group.code}</b>
          <button class="link-button" id="group-copy-code">Копіювати</button>
        </p>
      </div>
      <button class="btn btn--ghost btn--small" id="group-leave">${isAdmin ? 'Видалити групу' : 'Вийти з групи'}</button>
    </div>

    <div class="layout layout--aside">
      <div class="layout layout--stack">
        <div class="tabs tabs--tight">
          <button class="tabs__item ${activeTab === 'tests' ? 'tabs__item--active' : ''}" data-tab="tests">📝 Тести · ${group.tests.length}</button>
          <button class="tabs__item ${activeTab === 'competitions' ? 'tabs__item--active' : ''}" data-tab="competitions">🏆 Змагання · ${group.competitions.length}</button>
        </div>
        <div class="layout layout--stack" id="group-tab-content"></div>
      </div>
      ${renderMembers(group)}
    </div>`;

  $('#group-back').addEventListener('click', () => {
    openGroupId = null;
    renderGroupsView();
  });

  $('#group-copy-code').addEventListener('click', async () => {
    const copied = await copyToClipboard(group.code);
    showToast({ icon: '📋', html: copied ? 'Код скопійовано' : `Код: ${group.code}` });
  });

  $('#group-leave').addEventListener('click', () => {
    const question = isAdmin ? `Видалити групу «${group.name}»?` : `Вийти з групи «${group.name}»?`;
    if (!confirm(question)) return;
    leaveGroup(group);
    openGroupId = null;
    renderGroupsView();
  });

  $$('[data-tab]', container).forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      renderGroupsView();
    });
  });

  $$('[data-remove-member]', container).forEach(button => {
    button.addEventListener('click', () => {
      removeMember(group, button.dataset.removeMember);
      renderGroupsView();
    });
  });

  $('#group-invite-button')?.addEventListener('click', () => {
    const userId = $('#group-invite-select').value;
    inviteMember(group, userId);
    showToast({ icon: '✉️', html: `${escapeHtml(findUser(userId).name)} тепер у групі` });
    renderGroupsView();
  });

  const tabContent = $('#group-tab-content');
  if (activeTab === 'tests') renderTestsTab(tabContent, group);
  else renderCompetitionsTab(tabContent, group);
}

/* ---------- tests tab ---------- */

function renderTestCard(group, test) {
  const author = test.author === 'me' ? 'ти' : escapeHtml(findUser(test.author)?.name || '—');
  const result = test.myBest != null ? ` · твій результат: ${test.myBest}/${test.questions.length}` : '';

  return `
    <div class="card test-card">
      <div class="test-card__info">
        <b>${escapeHtml(test.title)}</b>
        <small class="test-card__meta">
          ${countLabel(test.questions.length, 'питання', 'питання', 'питань')} · автор: ${author}${result}
        </small>
      </div>
      ${canEditTest(group, test) ? `<button class="icon-button" data-delete-test="${test.id}" title="Видалити тест">✕</button>` : ''}
      <button class="btn btn--green btn--small" data-play-test="${test.id}">▶ Пройти</button>
    </div>`;
}

function renderTestBuilder() {
  const questionCount = draftTest.questions.length;

  return `
    <div class="card form">
      <h3>🛠️ Новий тест</h3>
      <input class="field" id="draft-title" placeholder="Назва тесту" value="${escapeHtml(draftTest.title)}" maxlength="60">

      ${questionCount ? `
        <div class="draft-list">
          ${draftTest.questions.map((question, index) => `
            <div class="draft-list__item">
              <span>${index + 1}. ${escapeHtml(question.q)} <span class="text--muted">→ ${escapeHtml(question.options[question.answer])}</span></span>
              <button class="icon-button" data-remove-question="${index}" title="Прибрати">✕</button>
            </div>`).join('')}
        </div>` : ''}

      <form class="form" id="draft-question-form">
        <input class="field" name="question" placeholder="Питання ${questionCount + 1}" required>
        ${Array.from({ length: ANSWER_VARIANTS }, (_, index) => `
          <label class="option-row">
            <input class="option-row__radio" type="radio" name="answer" value="${index}" ${index === 0 ? 'checked' : ''} title="Правильна відповідь">
            <input class="field" name="option${index}" placeholder="Варіант ${index + 1}" required>
          </label>`).join('')}
        <small class="text--muted">Познач кружечком правильний варіант</small>
        <button class="btn btn--ghost btn--small">+ Додати питання</button>
      </form>

      <button class="btn btn--gold" id="draft-publish" ${questionCount ? '' : 'disabled'}>
        Опублікувати тест · ${countLabel(questionCount, 'питання', 'питання', 'питань')}
      </button>

      <details class="fact-check">
        <summary class="fact-check__summary">🔎 Перевірити факт перед публікацією</summary>
        <input class="field fact-check__field" id="fact-check-query" placeholder="Напр.: Полтавська битва, 1919, Орлик">
        <div class="fact-list" id="fact-check-results"></div>
      </details>
    </div>`;
}

function renderFactResults(query) {
  const facts = query ? searchFacts(query).slice(0, 4) : [];
  if (!facts.length) return query ? '<p class="text--muted text--small">Нічого не знайдено.</p>' : '';

  return facts.map(fact => `
    <div class="fact">
      <b class="fact__title">${escapeHtml(fact.title)}</b>
      <p class="fact__text">${escapeHtml(fact.text)}</p>
      <small class="fact__source">✔ Перевірено · ${escapeHtml(fact.source)}</small>
    </div>`).join('');
}

function renderTestsTab(container, group) {
  container.innerHTML = `
    ${group.tests.length
      ? group.tests.map(test => renderTestCard(group, test)).join('')
      : '<p class="text--muted">Тестів ще немає — створи перший!</p>'}
    ${renderTestBuilder()}`;

  $$('[data-play-test]', container).forEach(button => {
    button.addEventListener('click', () => startLesson(buildGroupLessonId(group.id, button.dataset.playTest)));
  });

  $$('[data-delete-test]', container).forEach(button => {
    button.addEventListener('click', () => {
      if (!confirm('Видалити тест разом із його змаганнями?')) return;
      deleteTest(group, button.dataset.deleteTest);
      renderGroupsView();
    });
  });

  $('#draft-title').addEventListener('input', event => {
    draftTest.title = event.target.value;
  });

  $$('[data-remove-question]', container).forEach(button => {
    button.addEventListener('click', () => {
      draftTest.questions.splice(Number(button.dataset.removeQuestion), 1);
      renderGroupsView();
    });
  });

  $('#draft-question-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.target);
    draftTest.questions.push({
      q: form.get('question').trim(),
      options: Array.from({ length: ANSWER_VARIANTS }, (_, index) => form.get(`option${index}`).trim()),
      answer: Number(form.get('answer')),
    });
    renderGroupsView();
    $('#draft-question-form [name="question"]').focus();
  });

  $('#draft-publish').addEventListener('click', () => {
    publishTest(group, { title: draftTest.title.trim(), questions: draftTest.questions });
    resetDraft();
    showToast({ icon: '✅', html: 'Тест опубліковано — учасники групи вже бачать його' });
    renderGroupsView();
  });

  const factQuery = $('#fact-check-query');
  factQuery.addEventListener('input', () => {
    $('#fact-check-results').innerHTML = renderFactResults(factQuery.value.trim());
  });
}

/* ---------- competitions tab ---------- */

function renderCompetition(group, competition) {
  const test = findTest(group, competition.testId);
  const maxScore = test ? test.questions.length : 0;
  const isOver = isCompetitionOver(competition);

  const rows = [
    ...Object.entries(competition.scores).map(([userId, score]) => ({ name: findUser(userId)?.name || '—', score })),
    ...(competition.myBest != null ? [{ name: 'Ти', score: competition.myBest, isMe: true }] : []),
  ].sort((a, b) => b.score - a.score);

  return `
    <div class="card competition">
      <div class="competition__head">
        <div class="competition__info">
          <b>🏆 ${escapeHtml(competition.title)}</b>
          <small class="competition__meta">
            Тест «${escapeHtml(test ? test.title : '—')}» ·
            ${isOver ? 'завершено' : `до ${formatDate(competition.endsOn)}`} ·
            ${countLabel(rows.length, 'учасник', 'учасники', 'учасників')}
          </small>
        </div>
        ${!isOver && test ? `
          <button class="btn btn--purple btn--small" data-join-competition="${competition.id}">
            ${competition.myBest != null ? 'Покращити' : '▶ Взяти участь'}
          </button>` : ''}
      </div>
      <ol class="leaderboard">
        ${rows.map((row, index) => `
          <li class="leaderboard__item ${row.isMe ? 'leaderboard__item--me' : ''}">
            <span class="leaderboard__rank">${MEDALS[index] || index + 1}</span>
            ${escapeHtml(row.name)}
            <span class="leaderboard__score">${row.score}/${maxScore}</span>
          </li>`).join('') || '<li class="leaderboard__item text--muted">Ще ніхто не взяв участі</li>'}
      </ol>
    </div>`;
}

function renderCompetitionForm(group) {
  if (!group.tests.length) {
    return `
      <div class="card form">
        <h3>⚡ Нове змагання</h3>
        <p class="text--muted">Змагання проводиться на основі тесту — спершу створи тест у вкладці «Тести».</p>
      </div>`;
  }

  return `
    <form class="card form" id="competition-form">
      <h3>⚡ Нове змагання</h3>
      <input class="field" name="title" placeholder="Назва, напр.: Турнір знавців Русі" required maxlength="60">
      <label class="field-label">
        Тест
        <select class="field" name="test">
          ${group.tests.map(test => `<option value="${test.id}">${escapeHtml(test.title)}</option>`).join('')}
        </select>
      </label>
      <label class="field-label">
        Тривалість
        <select class="field" name="days">
          <option value="1">1 день</option>
          <option value="3">3 дні</option>
          <option value="7" selected>Тиждень</option>
        </select>
      </label>
      <p class="text--muted text--small">
        Учасники групи проходять тест — рейтинг будується за кількістю правильних відповідей з першої спроби.
      </p>
      <button class="btn btn--purple">Оголосити змагання</button>
    </form>`;
}

function renderCompetitionsTab(container, group) {
  container.innerHTML = `
    ${group.competitions.length
      ? group.competitions.map(competition => renderCompetition(group, competition)).join('')
      : '<p class="text--muted">Змагань ще немає.</p>'}
    ${renderCompetitionForm(group)}`;

  $$('[data-join-competition]', container).forEach(button => {
    const competition = group.competitions.find(item => item.id === button.dataset.joinCompetition);
    button.addEventListener('click', () => startLesson(buildGroupLessonId(group.id, competition.testId, competition.id)));
  });

  $('#competition-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.target);
    createCompetition(group, {
      title: form.get('title').trim(),
      testId: form.get('test'),
      days: Number(form.get('days')),
    });
    showToast({ icon: '⚡', html: 'Змагання оголошено! Учасники групи отримали запрошення' });
    renderGroupsView();
  });
}

/* ---------- public ---------- */

export function renderGroupsView() {
  const container = $('#view-groups');
  const group = openGroupId && findGroup(openGroupId);

  if (group) renderGroupPage(container, group);
  else renderGroupList(container);
}

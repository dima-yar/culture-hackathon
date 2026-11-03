/**
 * Groups domain: groups, members, tests and competitions.
 * Views call these functions; they never mutate state.groups directly.
 */

import { state, saveState } from '../core/state.js';
import { unlockAchievement } from '../core/progress.js';
import { USERS } from '../data/users.js';
import { daysFromNow, randomId, randomInt, shuffle, today } from '../core/utils.js';

/** Who in a competition has a score from the start (simulated). */
const SIMULATED_PARTICIPATION = 0.7;

const createGroupCode = () => `HIST-${randomInt(1000, 9999)}`;

export const findGroup = id => state.groups.find(group => group.id === id);

export const isGroupAdmin = group => group.owner === 'me';

export const findTest = (group, testId) => group.tests.find(test => test.id === testId);

export const isCompetitionOver = competition => competition.endsOn < today();

/* ---------- groups ---------- */

export function createGroup({ name, emoji }) {
  const group = {
    id: randomId('g'),
    name,
    emoji,
    owner: 'me',
    code: createGroupCode(),
    members: [],
    tests: [],
    competitions: [],
  };
  state.groups.push(group);
  saveState();
  unlockAchievement('group');
  return group;
}

/**
 * Demo join: any unknown code creates a group with random members.
 * @returns {'joined' | 'already-member'}
 */
export function joinGroupByCode(rawCode) {
  const code = rawCode.trim().toUpperCase();
  if (state.groups.some(group => group.code === code)) return 'already-member';

  const members = shuffle(USERS).slice(0, randomInt(3, 6)).map(user => user.id);
  state.groups.push({
    id: randomId('g'),
    name: `Група ${code}`,
    emoji: '📚',
    owner: members[0],
    code,
    members,
    tests: [],
    competitions: [],
  });
  saveState();
  return 'joined';
}

/** Admin deletes the group, anyone else leaves it — locally both just remove it. */
export function leaveGroup(group) {
  state.groups = state.groups.filter(item => item !== group);
  saveState();
}

export function inviteMember(group, userId) {
  if (!group.members.includes(userId)) group.members.push(userId);
  saveState();
}

export function removeMember(group, userId) {
  group.members = group.members.filter(id => id !== userId);
  saveState();
}

/* ---------- tests ---------- */

export function publishTest(group, { title, questions }) {
  group.tests.push({
    id: randomId('t'),
    author: 'me',
    title: title || `Тест ${group.tests.length + 1}`,
    questions,
  });
  saveState();
}

/** Deletes a test together with its competitions. */
export function deleteTest(group, testId) {
  group.tests = group.tests.filter(test => test.id !== testId);
  group.competitions = group.competitions.filter(competition => competition.testId !== testId);
  saveState();
}

export const canEditTest = (group, test) => isGroupAdmin(group) || test.author === 'me';

/* ---------- competitions ---------- */

export function createCompetition(group, { title, testId, days }) {
  const test = findTest(group, testId);
  const scores = {};

  group.members.forEach(memberId => {
    if (Math.random() < SIMULATED_PARTICIPATION) {
      scores[memberId] = randomInt(0, test.questions.length);
    }
  });

  group.competitions.push({
    id: randomId('c'),
    title,
    testId,
    endsOn: daysFromNow(days),
    scores,
  });
  saveState();
}

/* ---------- lesson integration ---------- */

/** Lesson id used by the lesson player: "g:<groupId>:<testId>[:<competitionId>]". */
export const buildGroupLessonId = (groupId, testId, competitionId) =>
  ['g', groupId, testId, competitionId].filter(Boolean).join(':');

/** Turns a group lesson id back into a playable lesson, or null. */
export function getGroupLesson(lessonId) {
  const [, groupId, testId, competitionId] = lessonId.split(':');
  const group = findGroup(groupId);
  const test = group && findTest(group, testId);
  if (!test) return null;

  const competition = competitionId && group.competitions.find(item => item.id === competitionId);

  return {
    id: lessonId,
    title: competition ? `Змагання: ${competition.title}` : test.title,
    icon: '👥',
    topic: 'Група',
    exercises: test.questions.map(question => ({ type: 'mcq', ...question })),
    groupRef: { groupId, testId, competitionId },
  };
}

/** Saves the best first-try score for a group test / competition. */
export function recordGroupResult({ groupId, testId, competitionId }, score) {
  const group = findGroup(groupId);
  const test = group && findTest(group, testId);
  if (!test) return;

  test.myBest = Math.max(test.myBest ?? 0, score);

  const competition = competitionId && group.competitions.find(item => item.id === competitionId);
  if (competition) {
    competition.myBest = Math.max(competition.myBest ?? 0, score);
    unlockAchievement('champ');
  }
  saveState();
}

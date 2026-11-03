/**
 * Group a new player is already a member of, so the Groups screen is not empty.
 */

import { daysFromNow } from '../core/utils.js';

export function createSampleGroups() {
  return [
    {
      id: 'g1',
      name: '8-Б · Історія України',
      emoji: '🏛️',
      owner: 'u2',
      code: 'HIST-4821',
      members: ['u1', 'u2', 'u3', 'u5', 'u6'],
      tests: [
        {
          id: 't1',
          author: 'u2',
          title: 'Козацька доба: експрес-тест',
          questions: [
            { q: 'У якому році почалася Хмельниччина?', options: ['1648', '1654', '1709'], answer: 0 },
            { q: 'Хто автор Конституції 1710 р.?', options: ['Іван Мазепа', 'Пилип Орлик', 'Богдан Хмельницький'], answer: 1 },
            { q: 'Де звели першу Січ?', options: ['На Малій Хортиці', 'У Батурині', 'У Чигирині'], answer: 0 },
          ],
        },
      ],
      competitions: [
        {
          id: 'c1',
          title: 'Турнір тижня: Козаччина',
          testId: 't1',
          endsOn: daysFromNow(4),
          scores: { u1: 3, u3: 2, u5: 2, u6: 1 },
        },
      ],
    },
  ];
}

/**
 * Demo users: potential friends, group members and league rivals.
 */

export const USERS = [
  { id: 'u1', name: 'Олена Ковальчук', nick: 'olena_k', gender: 'f', city: 'Львів', xp: 340, streak: 12, avatar: '👩‍🎓', lastAction: 'завершила урок «Гетьманщина»', lastSeen: '5 хв тому' },
  { id: 'u2', name: 'Марко Дорошенко', nick: 'marko_d', gender: 'm', city: 'Київ', xp: 310, streak: 7, avatar: '👨‍🎓', lastAction: 'створив змагання «Турнір тижня»', lastSeen: '20 хв тому' },
  { id: 'u3', name: 'Софія Петренко', nick: 'sofia_p', gender: 'f', city: 'Полтава', xp: 265, streak: 21, avatar: '👩', lastAction: 'дослідила подію «Полтавська битва»', lastSeen: '1 год тому' },
  { id: 'u4', name: 'Тарас Бондар', nick: 'taras_b', gender: 'm', city: 'Чернігів', xp: 220, streak: 4, avatar: '🧑', lastAction: 'розгадав кросворд', lastSeen: '2 год тому' },
  { id: 'u5', name: 'Ірина Мельник', nick: 'iryna_m', gender: 'f', city: 'Одеса', xp: 180, streak: 9, avatar: '👩‍🦰', lastAction: 'отримала досягнення «Картограф»', lastSeen: '3 год тому' },
  { id: 'u6', name: 'Андрій Лисенко', nick: 'andrii_l', gender: 'm', city: 'Харків', xp: 140, streak: 3, avatar: '👨', lastAction: 'прочитав «Руську правду»', lastSeen: 'вчора' },
  { id: 'u7', name: 'Вікторія Сидоренко', nick: 'vika_s', gender: 'f', city: 'Вінниця', xp: 95, streak: 2, avatar: '👧', lastAction: 'досягла рівня 2', lastSeen: 'вчора' },
  { id: 'u8', name: 'Назар Гнатюк', nick: 'nazar_g', gender: 'm', city: 'Луцьк', xp: 60, streak: 1, avatar: '👦', lastAction: 'почав розділ «Київська Русь»', lastSeen: '2 дні тому' },
  { id: 'u9', name: 'Дарина Шевчук', nick: 'daryna_sh', gender: 'f', city: 'Дніпро', xp: 410, streak: 30, avatar: '👩‍🏫', lastAction: 'поговорила з Ярославом Мудрим', lastSeen: '10 хв тому' },
  { id: 'u10', name: 'Богдан Кравець', nick: 'bohdan_k', gender: 'm', city: 'Ужгород', xp: 155, streak: 5, avatar: '🧔', lastAction: 'пройшов тест «Козацька доба»', lastSeen: '4 год тому' },
  { id: 'u11', name: 'Юлія Ткаченко', nick: 'yulia_t', gender: 'f', city: 'Житомир', xp: 230, streak: 8, avatar: '👱‍♀️', lastAction: 'перемогла у змаганні групи', lastSeen: '6 год тому' },
  { id: 'u12', name: 'Максим Олійник', nick: 'max_o', gender: 'm', city: 'Запоріжжя', xp: 75, streak: 2, avatar: '🧑‍🦱', lastAction: 'дослідив подію «Замок Байди на Хортиці»', lastSeen: '3 дні тому' },
];

export const findUser = id => USERS.find(user => user.id === id);

/** "Олена Ковальчук" → "Олена К." */
export const shortName = user => user.name.replace(/ (.).*/, ' $1.');

/** Weekly league: first eight demo users. */
export const LEAGUE = USERS.slice(0, 8);

/** Friends a new player starts with. */
export const DEFAULT_FRIENDS = ['u1', 'u4'];

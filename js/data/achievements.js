/**
 * Gamification constants: levels, achievements, rewards.
 */

export const XP_PER_LEVEL = 100;
export const MAX_HP = 5;
export const DAILY_GOAL_XP = 50;

export const XP_REWARD = {
  correctAnswer: 10,
  flashcard: 5,
  openAnswer: 15,
  crossword: 30,
  lessonComplete: 20,
  perfectBonus: 10,
  mapEvent: 5,
  documentQuiz: 15,
};

export const LEVEL_TITLES = ['Новачок', 'Писар', 'Літописець', 'Козак', 'Сотник', 'Полковник', 'Гетьман'];

export const ACHIEVEMENTS = [
  { id: 'first', icon: '🎯', title: 'Перший крок', description: 'Заверши перший урок' },
  { id: 'perfect', icon: '💎', title: 'Без подряпини', description: 'Урок без жодної помилки' },
  { id: 'combo5', icon: '⚡', title: 'Комбо ×5', description: '5 правильних відповідей поспіль' },
  { id: 'map5', icon: '🗺️', title: 'Картограф', description: 'Досліди 5 подій на карті' },
  { id: 'doc', icon: '📜', title: 'Книжник', description: 'Прочитай давній документ' },
  { id: 'ai', icon: '🤖', title: 'Співрозмовник', description: 'Поговори з AI або історичною постаттю' },
  { id: 'cross', icon: '🧩', title: 'Кросвордист', description: 'Розгадай кросворд' },
  { id: 'lvl3', icon: '⚔️', title: 'Літописець', description: 'Досягни 3 рівня' },
  { id: 'group', icon: '👥', title: 'Організатор', description: 'Створи власну групу' },
  { id: 'friend', icon: '🤝', title: 'Не сам', description: 'Додай друга' },
  { id: 'champ', icon: '🏅', title: 'Учасник турніру', description: 'Візьми участь у змаганні групи' },
];

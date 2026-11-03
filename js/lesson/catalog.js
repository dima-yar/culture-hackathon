/**
 * Lesson lookup and the "what to learn next" recommendation.
 */

import { state } from '../core/state.js';
import { plural } from '../core/utils.js';
import { UNITS } from '../data/units.js';
import { getGroupLesson } from '../features/groups.js';

/** Every lesson of the learning path, each with a link to its unit. */
export const getAllLessons = () =>
  UNITS.flatMap(unit => unit.lessons.map(lesson => ({ ...lesson, unit })));

export const isLessonCompleted = lessonId => Boolean(state.completedLessons[lessonId]);

/** A lesson is open when it is first in its unit or the previous one is completed. */
export const isLessonOpen = (lessons, index) => index === 0 || isLessonCompleted(lessons[index - 1].id);

/** Returns a playable lesson ({ id, title, topic, exercises, groupRef? }) or null. */
export function findLesson(lessonId) {
  if (lessonId.startsWith('g:')) return getGroupLesson(lessonId);

  const lesson = getAllLessons().find(item => item.id === lessonId);
  return lesson ? { ...lesson, topic: lesson.unit.title } : null;
}

const getNextLesson = () => getAllLessons().find(lesson => !isLessonCompleted(lesson.id));

/** Unit with the most mistakes, as [title, count], or null. */
export function getWeakestTopic() {
  const [weakest] = Object.entries(state.topicMistakes)
    .filter(([topic]) => UNITS.some(unit => unit.title === topic))
    .sort((a, b) => b[1] - a[1]);

  return weakest && weakest[1] > 0 ? weakest : null;
}

/** "AI" recommendation: repeat the weakest topic, otherwise continue the path. */
export function getRecommendation() {
  const weakest = getWeakestTopic();
  if (weakest) {
    const [topic, mistakes] = weakest;
    const unit = UNITS.find(item => item.title === topic);
    const lesson = unit.lessons.find(item => !isLessonCompleted(item.id)) || unit.lessons[0];
    return {
      lessonId: lesson.id,
      text: `Тема «${topic}» дається складніше — ${mistakes} ${plural(mistakes, 'помилка', 'помилки', 'помилок')}. `
        + `Раджу урок «${lesson.title}», щоб закріпити.`,
    };
  }

  const next = getNextLesson();
  if (next) {
    return {
      lessonId: next.id,
      text: `Наступний крок для тебе: урок «${next.title}» з розділу «${next.unit.title}».`,
    };
  }

  return {
    lessonId: null,
    text: 'Ти пройшов усі уроки демо! Спробуй карту подій або рольову гру з історичною постаттю.',
  };
}

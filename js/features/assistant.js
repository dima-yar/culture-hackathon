/**
 * Scripted "AI": answers built from the local fact base.
 * In a real product this is where an LLM call with source checking would go.
 */

import { escapeHtml } from '../core/utils.js';
import { findFactByYear, searchFacts } from './facts.js';

const GREETING_PATTERN = /^(привіт|вітаю|добр|хай)/;
const THANKS_PATTERN = /дякую|спасиб/;

/** Returns escaped HTML for the assistant chat. */
export function getAssistantReply(question) {
  const text = question.toLowerCase();

  if (GREETING_PATTERN.test(text)) {
    return 'Привіт! Спитай, наприклад: «Що сталося у 1654 році?» або «Хто такий Пилип Орлик?»';
  }
  if (THANKS_PATTERN.test(text)) {
    return 'Радий допомогти! Закріпи знання в уроці — за це дають XP ⭐';
  }

  const year = text.match(/\d{3,4}/)?.[0];
  const fact = (year && findFactByYear(year)) || searchFacts(question)[0];

  if (!fact) {
    return 'Хм, у демо-базі поки немає відповіді. Спробуй спитати про рік («1709»), постать («Мазепа») чи подію («Акт Злуки»).';
  }

  return `
    <b>${escapeHtml(fact.title)}</b><br>
    ${escapeHtml(fact.text)}<br>
    <small class="message__source">✔ Перевірено за базою фактів: ${escapeHtml(fact.source)}</small>`;
}

/** Role-play answer of a historical figure (escaped HTML). */
export function getFigureReply(figure, question) {
  const text = question.toLowerCase();
  const rule = figure.rules.find(([pattern]) => pattern.test(text));
  return escapeHtml(rule ? rule[1] : figure.fallback);
}

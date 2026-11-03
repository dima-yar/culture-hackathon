/**
 * Meme card + multiple-choice question about it.
 */

import { escapeHtml } from '../../core/utils.js';
import { renderMultipleChoice } from './multiple-choice.js';

export function renderMeme(exercise, container, context) {
  const introHtml = `
    <div class="meme">
      ${escapeHtml(exercise.top)}
      <div class="meme__emoji">${exercise.em}</div>
      ${escapeHtml(exercise.bottom)}
      <small class="meme__caption">мем-картка · історія з гумором</small>
    </div>`;

  return renderMultipleChoice(exercise, container, context, { kind: 'Мем дня: впізнай подію', introHtml });
}

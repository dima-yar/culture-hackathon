/**
 * Reusable chat window (AI assistant and role-play).
 */

import { $, $$, escapeHtml } from '../core/utils.js';
import { unlockAchievement } from '../core/progress.js';

const TYPING_DELAY_MS = 700;

const typingIndicator = `
  <span class="typing">
    <i class="typing__dot"></i><i class="typing__dot"></i><i class="typing__dot"></i>
  </span>`;

/**
 * @param {HTMLElement} container
 * @param {Array<{ fromUser?: boolean, text?: string, html?: string }>} log — kept between renders
 * @param {{ avatar: string, headHtml: string, suggestions: string[], reply: (question: string) => string }} options
 *        `reply` returns escaped HTML.
 * @returns {(question: string) => void} send function
 */
export function renderChat(container, log, { avatar, headHtml, suggestions, reply }) {
  container.innerHTML = `
    <div class="card card--flush chat">
      <div class="chat__head">${headHtml}</div>
      <div class="chat__messages"></div>
      <div class="chips chat__suggestions">
        ${suggestions.map(text => `<button class="chip chip--small" data-suggestion>${escapeHtml(text)}</button>`).join('')}
      </div>
      <form class="chat__form">
        <input class="field" placeholder="Напиши питання…" autocomplete="off" aria-label="Питання">
        <button class="btn btn--small" aria-label="Надіслати">➤</button>
      </form>
    </div>`;

  const messages = $('.chat__messages', container);
  const form = $('.chat__form', container);
  const input = $('.field', form);

  const renderMessage = message => `
    <div class="message ${message.fromUser ? 'message--me' : 'message--bot'}">
      ${message.fromUser ? '' : `<span class="message__avatar">${avatar}</span>`}
      <div class="message__bubble">${message.fromUser ? escapeHtml(message.text) : message.html}</div>
    </div>`;

  const draw = () => {
    messages.innerHTML = log.map(renderMessage).join('');
    messages.scrollTop = messages.scrollHeight;
  };

  const send = question => {
    const text = question.trim();
    if (!text) return;

    log.push({ fromUser: true, text });
    draw();

    messages.insertAdjacentHTML('beforeend', renderMessage({ html: typingIndicator }));
    messages.scrollTop = messages.scrollHeight;

    setTimeout(() => {
      log.push({ html: reply(text) });
      draw();
      unlockAchievement('ai');
    }, TYPING_DELAY_MS + Math.random() * 600);
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    send(input.value);
    input.value = '';
  });

  $$('[data-suggestion]', container).forEach(chip => {
    chip.addEventListener('click', () => send(chip.textContent));
  });

  draw();
  return send;
}

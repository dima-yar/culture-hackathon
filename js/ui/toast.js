/**
 * Toast notifications in the top-right corner.
 */

const VISIBLE_MS = 3400;
const LEAVE_ANIMATION_MS = 500;

/**
 * @param {{ icon: string, html: string, modifier?: 'achievement' | 'level' }} options
 *        `html` must already be escaped by the caller.
 */
export function showToast({ icon, html, modifier }) {
  const toast = document.createElement('div');
  toast.className = modifier ? `toast toast--${modifier}` : 'toast';
  toast.innerHTML = `
    <span class="toast__icon">${icon}</span>
    <div class="toast__body">${html}</div>`;

  document.getElementById('toast-stack').append(toast);

  setTimeout(() => toast.classList.add('toast--leaving'), VISIBLE_MS);
  setTimeout(() => toast.remove(), VISIBLE_MS + LEAVE_ANIMATION_MS);
}

/**
 * Small shared helpers: DOM queries, HTML escaping, randomness, dates, plurals.
 */

export const $ = (selector, root = document) => root.querySelector(selector);

export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape user/content text before inserting it into an HTML template. */
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => HTML_ESCAPES[char]);

/** Returns a shuffled copy, the original array is untouched. */
export function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const pickRandom = items => items[Math.floor(Math.random() * items.length)];

/** Random integer in [min, max]. */
export const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

export const randomId = prefix => prefix + Math.random().toString(36).slice(2, 8);

/**
 * Ukrainian plural form: plural(3, 'урок', 'уроки', 'уроків') → 'уроки'.
 */
export function plural(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Today as "YYYY-MM-DD". */
export const today = () => new Date().toISOString().slice(0, 10);

export function daysFromNow(days) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

/** "2026-11-07" → "7 листопада". */
export const formatDate = isoDate => new Date(isoDate).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });

/** Restart a CSS animation by toggling a modifier class. */
export function replayAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

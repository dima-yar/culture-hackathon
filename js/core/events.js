/**
 * Tiny publish/subscribe bus. Lets modules talk without importing each other.
 *
 * Events used in the app:
 *   navigate            (viewName)  — switch screen
 *   progress:changed                — XP / HP / streak changed, redraw HUD
 *   xp:gained           (amount)    — show floating "+N XP"
 *   achievement:unlocked (id)
 *   lesson:closed
 *   ai:ask              (question)  — open the AI chat with a question
 *   map:open            (eventId)   — open the map on an event
 */

const listeners = new Map();

export function on(eventName, handler) {
  if (!listeners.has(eventName)) listeners.set(eventName, []);
  listeners.get(eventName).push(handler);
}

export function emit(eventName, payload) {
  (listeners.get(eventName) || []).forEach(handler => handler(payload));
}

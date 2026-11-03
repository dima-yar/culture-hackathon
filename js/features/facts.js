/**
 * Fact search over historical figures and events (used by the AI assistant
 * and by the fact-check helper in the group test builder).
 */

import { PEOPLE } from '../data/people.js';
import { EVENTS, getYearLabel } from '../data/events.js';
import { CITIES } from '../data/atlas/cities.js';
import { ARCHIVE_DOCUMENTS } from '../data/atlas/documents.js';
import { getResearch } from './research.js';

const STOP_WORDS = new Set([
  'що', 'хто', 'такий', 'така', 'таке', 'коли', 'який', 'яка', 'які', 'чому', 'як', 'про',
  'розкажи', 'сталося', 'було', 'році', 'року', 'рік', 'подію', 'подія', 'це', 'мені',
  'скажи', 'де', 'був', 'була',
]);

const FACTS = [
  ...PEOPLE.map(person => ({
    title: `${person.name} (${person.dates})`,
    text: person.text,
    source: 'біографічна довідка',
    searchText: `${person.name} ${person.dates} ${person.text}`.toLowerCase(),
  })),
  ...EVENTS.map(event => ({
    title: `${getYearLabel(event)} — ${event.title}`,
    text: event.text,
    source: 'літопис / шкільна програма',
    searchText: `${event.title} ${event.text} ${event.place} ${event.year}`.toLowerCase(),
  })),
  // City lore from Okraina: art, discoveries, faith, folklore.
  ...CITIES.flatMap(city => city.lore.map(item => {
    const cityName = city.names[city.names.length - 1].name;
    return {
      title: `${item.year ? `${item.year} · ` : ''}${cityName}: ${item.title}`,
      text: item.text || item.title,
      source: item.sources.join('; ') || 'міська історія',
      searchText: `${city.names.map(name => name.name).join(' ')} ${item.title} ${item.text} ${item.year ?? ''}`.toLowerCase(),
    };
  })),
  ...ARCHIVE_DOCUMENTS.map(doc => ({
    title: `${doc.year ? `${doc.year} · ` : ''}${doc.title}`,
    text: `«${doc.original}»${doc.translation && doc.translation !== doc.original ? ` — ${doc.translation}` : ''}`,
    source: doc.sources.join('; '),
    searchText: `${doc.title} ${doc.original} ${doc.translation} ${doc.place} ${doc.year ?? ''}`.toLowerCase(),
  })),
];

/** Research entries (loaded lazily by the AI screen) as searchable facts. */
let researchFacts = [];
function getResearchFacts() {
  const research = getResearch();
  if (researchFacts.length !== research.length) {
    researchFacts = research.map(entry => ({
      title: `${entry.date} — ${entry.title}`,
      text: entry.text,
      source: `дослідницька база ${entry.id}`,
      searchText: `${entry.title} ${entry.text} ${entry.places.join(' ')} ${entry.date}`.toLowerCase(),
    }));
  }
  return researchFacts;
}

/** Cut Ukrainian endings so "Орлика" matches "Орлик". */
const toStem = word => word.slice(0, Math.max(3, word.length - 2));

/** Returns facts sorted by the number of matched query words. */
export function searchFacts(query) {
  const stems = query
    .toLowerCase()
    .split(/[^a-zа-яіїєґѣ'’0-9]+/)
    .filter(word => word.length >= 3 && !STOP_WORDS.has(word))
    .map(toStem);

  if (!stems.length) return [];

  // A stem must start a word: "лав" finds "Лавра", not "Ярослав".
  const patterns = stems.map(stem => new RegExp(`(^|[^a-zа-яіїєґѣ0-9])${stem}`));

  return [...FACTS, ...getResearchFacts()]
    .map(fact => ({ ...fact, score: patterns.filter(pattern => pattern.test(fact.searchText)).length }))
    .filter(fact => fact.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Fact about an event that happened exactly in `year`, if any. */
export function findFactByYear(year) {
  const event = EVENTS.find(item => String(item.year) === String(year));
  if (!event) return null;
  return {
    title: `${getYearLabel(event)} — ${event.title}`,
    text: event.text,
    source: 'літопис / шкільна програма',
  };
}

/**
 * Okraina research base (~1170 sourced entries, 482–2000), loaded on demand.
 * Used by the Chronicle screen, city histories and the AI fact search.
 */

let entries = null;
let loading = null;

export const EPOCHS = [
  { id: 1, title: 'Анти, хозари, Русь', years: '482–1054' },
  { id: 2, title: 'Князівська доба, Галицько-Волинська держава', years: '1054–1340' },
  { id: 3, title: 'Литва, Польща, Крим, перші козаки', years: '1340–1569' },
  { id: 4, title: 'Річ Посполита, Хмельниччина, Руїна, Мазепа', years: '1569–1709' },
  { id: 5, title: 'Імперії та національне відродження', years: '1709–1917' },
  { id: 6, title: 'Революція, СРСР, незалежність', years: '1917–2000' },
];

export const CATEGORIES = {
  event: { icon: '📌', name: 'Подія' },
  battle: { icon: '⚔️', name: 'Битва' },
  treaty: { icon: '📜', name: 'Договір' },
  person: { icon: '👤', name: 'Постать' },
  place: { icon: '📍', name: 'Місце' },
  art: { icon: '🎨', name: 'Мистецтво' },
  law: { icon: '⚖️', name: 'Право' },
  discovery: { icon: '💡', name: 'Відкриття' },
  religion: { icon: '⛪', name: 'Віра' },
  demography: { icon: '👥', name: 'Населення' },
  economy: { icon: '💰', name: 'Господарство' },
  folklore: { icon: '🪕', name: 'Фольклор' },
  legend: { icon: '🐉', name: 'Легенда' },
};

export const CONFIDENCE = {
  attested: { name: 'засвідчено джерелом', modifier: 'historical' },
  consensus: { name: 'науковий консенсус', modifier: 'historical' },
  contested: { name: 'дискусійно', modifier: 'plausible' },
  legend: { name: 'легенда / переказ', modifier: 'legend' },
};

/** Legends and folklore: shown in the "Легенди" part of a city history. */
export const isLegend = entry => entry.category === 'legend' || entry.category === 'folklore' || entry.confidence === 'legend';

export function loadResearch() {
  loading ??= import('../data/atlas/research.js').then(module => {
    entries = module.RESEARCH;
    return entries;
  });
  return loading;
}

export const getResearch = () => entries || [];

/**
 * Research entries about a city, without those already present in the city's own lore
 * (Okraina builds part of its city lore from the same research records).
 */
export function getResearchOfCity(city) {
  const inLore = new Set(city.lore.map(item => item.research).filter(Boolean));
  return getResearch().filter(entry => entry.city === city.id && !inLore.has(entry.id));
}

/**
 * Filtered list for the Chronicle screen.
 * @param {{ epoch?: number, category?: string, query?: string }} filters
 */
export function filterResearch({ epoch, category, query }) {
  const needle = (query || '').trim().toLowerCase();
  return getResearch().filter(entry =>
    (!epoch || entry.epoch === epoch)
    && (!category || entry.category === category)
    && (!needle || `${entry.title} ${entry.text} ${entry.places.join(' ')} ${entry.date}`.toLowerCase().includes(needle)));
}

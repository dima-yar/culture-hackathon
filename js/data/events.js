/**
 * Historical events shown on the map and in the history tour, sorted by year.
 *
 * Main source: the 58 sourced key events imported from Okraina (js/data/atlas/events.js).
 * LOCAL_EVENTS adds events of this app that Okraina does not have.
 *
 * Fields: id, year, label (display year), icon, category, title, place, point [lon, lat], text, fidelity, sources.
 */

import { ATLAS_EVENTS } from './atlas/events.js';

const KYIV = [30.52, 50.45];

const CATEGORY_ICONS = {
  politics: '🏛️',
  war: '⚔️',
  faith: '✝️',
  culture: '📜',
  disaster: '🕯️',
  economy: '💰',
};

const CATEGORY_NAMES = {
  politics: 'Політика',
  war: 'Війна',
  faith: 'Віра',
  culture: 'Культура',
  disaster: 'Лихо',
  economy: 'Господарство',
};

/** "945–46" for events that lasted several years. */
const rangeLabel = (from, to) => (to && to !== from ? `${from}–${String(to).slice(-2)}` : String(from));

/**
 * Our own events. Each was checked against the Okraina research base (docs/VERIFICATION.md):
 * `research` names the confirming entry, its confidence becomes the event's fidelity.
 * Events outside the base (after 2000 or not covered) are marked `plausible` with a note in `sources`.
 */
const NOT_IN_RESEARCH = 'Не звірено: подія поза дослідницькою базою Okraina (482–2000)';

const LOCAL_EVENTS = [
  { id: 'e1037', year: 1037, category: 'faith', title: 'Закладено Софійський собор', place: 'Київ', point: KYIV, text: 'За літописом, Ярослав Мудрий заклав собор на згадку про перемогу над печенігами, а також Золоті ворота. Сьогодні Софія Київська — об’єкт Світової спадщини ЮНЕСКО.', research: 'E1-0056', fidelity: 'historical', sources: ['ПВЛ s.a. 6545 (1037)', 'CIUS Encyclopedia of Ukraine, «St Sophia Cathedral»'] },
  { id: 'e1113', year: 1113, category: 'culture', title: '«Повість временних літ»', place: 'Київ, Печерський монастир', point: [30.56, 50.43], text: 'Близько 1113 р. чернець Нестор уклав першу редакцію літопису, що розповідає, «звідки пішла Руська земля» (вона не збереглася; відомі редакції 1116 і 1118 рр.). Авторство Нестора дискусійне.', research: 'E1-0154', fidelity: 'plausible', sources: ['CIUS Encyclopedia of Ukraine, «Povist vremennykh lit»'] },
  { id: 'e1185', year: 1185, category: 'war', title: 'Похід князя Ігоря на половців', place: 'Новгород-Сіверський', point: [33.26, 52.0], text: 'Навесні 1185 р. Ігор Святославич без дозволу київського князя пішов на половців і був розбитий на Каялі; похід оспівано у «Слові о полку Ігоревім».', research: 'E2-0008', fidelity: 'historical', sources: ['Іпатіївський літопис s.a. 1185'] },
  { id: 'e1256', year: 1256, label: 'бл. 1256', category: 'politics', title: 'Перша згадка про Львів', place: 'Львів', point: [24.03, 49.84], text: 'Місто, засноване Данилом Галицьким і, за традицією, назване на честь його сина Лева, вперше згадано в Галицько-Волинському літописі під 1256 р.', research: 'E2-0040', fidelity: 'plausible', sources: ['Галицько-Волинський літопис s.a. 1256', 'CIUS Encyclopedia of Ukraine, «Lviv»'] },
  { id: 'e1574', year: 1574, category: 'culture', title: '«Апостол» Івана Федорова', place: 'Львів', point: [24.03, 49.84], text: 'У Львові Іван Федоров надрукував «Апостол» — першу датовану книгу, видану на українських землях.', fidelity: 'plausible', sources: ['Не звірено: у дослідницькій базі Okraina немає окремого запису'] },
  { id: 'e1581', year: 1581, label: '1580–81', category: 'culture', title: 'Острозька Біблія', place: 'Острог', point: [26.52, 50.33], text: 'В Острозі, осідку князя Костянтина Василя Острозького, Іван Федоров надрукував у 1580–1581 рр. Острозьку Біблію — перше повне друковане видання Біблії церковнослов’янською мовою.', research: 'E4-0122', fidelity: 'plausible', sources: ['CIUS Encyclopedia of Ukraine, «Ostrih Bible»'] },
  { id: 'e1632', year: 1632, category: 'culture', title: 'Києво-Могилянська колегія', place: 'Київ, Поділ', point: [30.52, 50.46], text: 'Митрополит Петро Могила 1632 р. об’єднав школу Київського братства зі своєю лаврською школою — так постала Київська колегія, згодом Києво-Могилянська академія.', research: 'E4-0007', fidelity: 'historical', sources: ['CIUS Encyclopedia of Ukraine, «Kyivan Mohyla Academy»'] },
  { id: 'e1708', year: 1708, category: 'war', title: 'Знищення Батурина', place: 'Батурин', point: [32.88, 51.34], text: '13 листопада 1708 р. військо Меншикова штурмом узяло й зруйнувало Батурин, столицю Мазепи, і вчинило різанину населення.', research: 'E4-0061', fidelity: 'historical', sources: ['CIUS Encyclopedia of Ukraine, «Baturyn»'] },
  { id: 'e1990', year: 1990, category: 'politics', title: 'Революція на граніті', place: 'Київ', point: KYIV, text: 'Студентське голодування в Києві (2–17 жовтня 1990 р.) домоглося відставки голови уряду УРСР Віталія Масола.', research: 'E6-0146', fidelity: 'plausible', sources: ['CIUS Encyclopedia of Ukraine, «Student movement»'] },
  { id: 'e2004', year: 2004, category: 'politics', title: 'Помаранчева революція', place: 'Київ', point: KYIV, text: 'Масові протести проти фальсифікації президентських виборів привели до повторного голосування.', fidelity: 'plausible', sources: [NOT_IN_RESEARCH] },
  { id: 'e2014', year: 2014, toYear: 2014, label: '2013–14', category: 'politics', title: 'Революція Гідності', place: 'Київ, Майдан Незалежності', point: KYIV, text: 'Масові протести 2013–2014 рр. проти відмови від євроінтеграції та свавілля влади.', fidelity: 'plausible', sources: [NOT_IN_RESEARCH] },
];

const fromAtlas = event => ({
  id: event.id,
  year: event.year,
  label: rangeLabel(event.year, event.toYear),
  category: event.category,
  title: event.title,
  place: event.place,
  point: event.point,
  text: event.text,
  fidelity: event.fidelity,
  sources: event.sources,
});

export const EVENTS = [...ATLAS_EVENTS.map(fromAtlas), ...LOCAL_EVENTS]
  .map(event => ({
    ...event,
    icon: CATEGORY_ICONS[event.category] || '📍',
    categoryName: CATEGORY_NAMES[event.category] || '',
    fidelity: event.fidelity || 'plausible',
  }))
  .sort((a, b) => a.year - b.year);

/** Quick jumps above the map. */
export const ERAS = [
  { title: 'Київська Русь', year: 988 },
  { title: 'Галицько-Волинська держава', year: 1253 },
  { title: 'Литовсько-польська доба', year: 1569 },
  { title: 'Козацька доба', year: 1654 },
  { title: 'Гетьманщина', year: 1710 },
  { title: 'Імперії', year: 1861 },
  { title: 'Українська революція', year: 1919 },
  { title: 'Незалежність', year: 1991 },
];

export const MIN_YEAR = 860;
export const MAX_YEAR = 2014;

/** Year as shown to the user, e.g. "1932–33". */
export const getYearLabel = event => event.label || String(event.year);

export const findEvent = id => EVENTS.find(event => event.id === id);

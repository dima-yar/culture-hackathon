# Літопис — demo MVP

A history learning app with Duolingo-style mechanics: lessons, HP/XP/levels, a historical atlas with exact borders,
administrative division and city histories, a research chronicle (1173 sourced entries), Old Rus' documents,
a (scripted) AI assistant, groups with tests and competitions, and friends.

Plain HTML + CSS + JavaScript (ES modules), no build step and no dependencies.

## Run

Just open `index.html` (double-click). Browsers block ES modules on `file://`, so in that case the page loads
the ready bundle `build/app.js`; over http(s) it loads the original modules from `js/`.

For development, serve the folder so edits show up without rebuilding:

```bash
python -m http.server 8765
```

## Build

`build/` is produced by `tools/build.py` (Python only, no npm) and committed, so the page works from disk.
It is rebuilt automatically before every commit by the git hook `tools/git-hooks/pre-commit`
(enabled once per clone with `git config core.hooksPath tools/git-hooks`). Manual rebuild:

```bash
python tools/build.py
```

## Structure

```
index.html              App shell: navigation, top bar, empty <section> per screen, lesson overlay
css/
  main.css              Entry point, imports everything in cascade order
  base/                 Design tokens (variables), reset, keyframes
  layout/               App grid, reusable content grids, screen visibility
  components/           Shared BEM blocks: btn, card, chip, field, tabs, modal, toast, leaderboard…
  blocks/<feature>/     Feature BEM blocks (one block per file): learn, lesson, map, docs, chronicle, ai, groups, friends, profile, shell
js/
  main.js               Entry point: initialises modules and wires events
  router.js             Screen switching
  core/                 utils, event bus, persisted state, gamification rules (XP, HP, achievements)
  data/                 Content only: units/lessons, events, documents, people, users, achievements
    atlas/              GENERATED from the Okraina project — geography, states (2 levels), admin division, cities,
                        events, map styles, archive, research base
  features/             Domain logic without DOM: atlas, research, groups, friends, fact search, scripted assistant, social feed
  lesson/               Lesson catalog, player, one file per exercise type in exercises/
  ui/                   Reusable UI pieces: HUD, modal, toast, chat window
  views/                One module per screen; each exports render…View()
    map/                Map screen: projection, camera (zoom/pan/fly-to), SVG layers, info cards, city history dialog, tour
build/                  GENERATED bundle for file:// (app.js + lazy/), do not edit
docs/
  VERIFICATION.md       Fact-check of lessons, events and bios against the Okraina research base
tools/
  build.py              Bundles js/ into build/
  git-hooks/pre-commit  Runs build.py and stages build/ before every commit
  import-okraina.py     Entry point of the Okraina importer (code in tools/okraina/, one module per topic)
  okraina/              localisation, geometry, geography, content, research, borders (states + admin), output
  translations/         research-uk.json — Ukrainian texts for research entries Okraina has only in Russian/English
```

## Data from Okraina

Everything on the map and in the Chronicle comes from the Okraina project, re-imported with:

```bash
python tools/import-okraina.py "C:/Users/<you>/Desktop/Okraina"
```

| Module (`js/data/atlas/`) | Content | Loaded |
|---|---|---|
| `geography.js` | land from the Okraina province mesh (Natural Earth coast, ~150 m), lakes and rivers (Natural Earth) | with the map |
| `states.js` / `states-detail.js` | exact state territories for 146 periods (OpenHistoricalMap lines where surveyed) — overview and fine level | with the map / on zoom |
| `admin.js` | administrative division of 23 systems: lands of Rus', voivodeships, regiments, gubernias, okruhy, oblasts | when the layer is switched on |
| `research.js` | 1173 research entries 482–2000 with sources and confidence; 824 linked to cities | Chronicle, city history, AI |
| `cities.js` | 132 cities: first mention, renames, names in period languages, city lore | always |
| `events.js`, `documents.js`, `styles.js`, `polities.js` | key events, archive quotes, epoch palettes, state metadata | always |

Rings are stored as integer deltas (thousandths of a degree). Rebuilding needs `shapely` (`pip install shapely`).
Research entries without Ukrainian text in Okraina are translated in `tools/translations/research-uk.json`;
`--missing-translations FILE` lists any new ones after an Okraina update.

Mechanics taken over from Okraina: year slider, map style per epoch, states as territories with a
"who holds the land" legend, administrative division per year, cities that appear at their first mention and are
renamed on historical dates (with their names in the languages of each period), city lore, and the history tour.

## Conventions

- **CSS — BEM.** `block`, `block__element`, `block--modifier`. One block per file, file named after the block.
  Blocks may be mixed on one element (`class="card group-card"`), state is always a modifier
  (`option--selected`, `lesson-node--locked`). Element visibility uses the `hidden` attribute.
- **JS hooks are separate from styles.** Scripts find elements by `id` or `data-*` attributes, never by BEM classes
  used only for styling (except inside the block's own renderer).
- **Modules don't import screens.** Cross-screen actions go through the event bus (`core/events.js`):
  `navigate`, `ai:ask`, `map:open`, `progress:changed`, `lesson:closed`, …
- **Data is separate from logic.** Adding a lesson, event or document means editing `js/data/*` only.
- **New exercise type:** add a renderer to `js/lesson/exercises/`, register it in `exercises/index.js`,
  add its BEM block to `css/blocks/lesson/` and import it in `css/main.css`.

## Demo limitations

AI answers, other users, groups and competitions are simulated locally; progress is stored in `localStorage`.

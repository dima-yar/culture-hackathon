"""
Entry point: python tools/import-okraina.py "C:/Users/<you>/Desktop/Okraina" [--missing-translations FILE]

Writes js/data/atlas/*.js. With --missing-translations it only lists research entries that still need
a Ukrainian translation into FILE (JSON) and exits.
"""

import json
import sys
from pathlib import Path

from .borders import ProvinceMesh, build_admin, build_states
from .content import build_cities, build_documents, build_events, build_polities, build_styles
from .geography import build_geography
from .localisation import Translator
from .output import write_exports, write_module
from .research import build_research, missing_translations


def main(argv=None):
    argv = argv if argv is not None else sys.argv[1:]
    if not argv:
        sys.exit(__doc__)
    project = Path(argv[0])
    t = Translator(project)

    if '--missing-translations' in argv:
        target = Path(argv[argv.index('--missing-translations') + 1])
        missing = missing_translations(project, t)
        target.write_text(json.dumps(missing, ensure_ascii=False, indent=1), encoding='utf-8')
        print(f'{len(missing)} research entries without Ukrainian text → {target}')
        return

    cities = build_cities(project, t)
    mesh = ProvinceMesh(project)
    write_module('geography.js', 'GEOGRAPHY', build_geography(project, mesh),
                 'Land (Okraina province mesh), lakes and rivers (Natural Earth 1:10m). Delta-encoded rings, loaded lazily.')
    write_module('polities.js', 'POLITIES', build_polities(project, t), 'States: names, colours, z-order, Ukrainian line, sources. Territories are in states*.js.')
    write_module('cities.js', 'CITIES', cities, 'Cities: first mention, names by date, city lore, names in period languages.')
    write_module('events.js', 'ATLAS_EVENTS', build_events(project, t, cities), 'Key events of the history tour, with sources.')
    write_module('styles.js', 'MAP_STYLES', build_styles(project, t), 'Map palettes by epoch, sorted by fromYear.')
    write_module('documents.js', 'ARCHIVE_DOCUMENTS', build_documents(project, t, cities), 'Quotes of documents, legends and proverbs with translations.')

    research = build_research(project, t, cities)
    write_module('research.js', 'RESEARCH', research,
                 'Okraina research base: sourced entries 482–2000 (events, people, places, culture, legends…). Loaded lazily.')

    for level, file_name in (('overview', 'states.js'), ('detail', 'states-detail.js')):
        states = build_states(mesh, level)
        write_exports(
            file_name,
            {'STATE_SHAPES': states['shapes'], 'STATE_PERIODS': states['periods']},
            f'Exact state territories per period ({level} level), assembled from the Okraina province mesh '
            '(OpenHistoricalMap lines, CC0, where surveyed). Loaded lazily by the map.',
        )

    admin = build_admin(project, t, mesh)
    write_exports(
        'admin.js',
        {'ADMIN_SYSTEMS': admin['systems'], 'ADMIN_UNITS': admin['units'], 'ADMIN_PERIODS': admin['periods']},
        'Administrative division per period (lands, voivodeships, regiments, gubernias, okruhy, oblasts). Loaded lazily.',
    )

    if t.missing:
        print(f'{len(t.missing)} missing strings, e.g. {t.missing[:5]}')

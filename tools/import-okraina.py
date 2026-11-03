"""
Imports map data and history content from the Okraina (KRAINA) Godot project into js/data/atlas/.

Usage:
    python tools/import-okraina.py "C:/Users/<you>/Desktop/Okraina"
    python tools/import-okraina.py "C:/…/Okraina" --missing-translations missing.json

Code lives in tools/okraina/ (one module per topic):
    localisation.py  Ukrainian strings from locale/*.uk.po
    geometry.py      simplification, clipping, compact ring encoding
    geography.py     coast, lakes, rivers → geography.js
    content.py       states metadata, cities + lore, key events, styles, archive → polities/cities/events/styles/documents.js
    research.py      research base → research.js (Ukrainian texts: Okraina .po + tools/translations/research-uk.json)
    borders.py       province mesh → states.js, states-detail.js, admin.js
    output.py        writes the JS modules

Requires shapely (pip install shapely). Generated files must not be edited by hand.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from okraina.main import main  # noqa: E402

if __name__ == '__main__':
    main()

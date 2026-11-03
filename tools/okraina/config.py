"""Shared settings of the Okraina importer."""

from pathlib import Path

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / 'js' / 'data' / 'atlas'

# Area kept from the Okraina sheet (lon/lat). Slightly larger than the visible map.
CLIP_BOX = (19.5, 42.8, 42.5, 54.4)       # west, south, east, north
SIMPLIFY_TOLERANCE = 0.004                # degrees, ~0.3 km
MAX_RIVER_RANK = 9                         # Natural Earth scale rank: smaller = bigger river
CITY_SNAP_DEGREES = 0.6                    # event → nearest city within ~50 km
OPEN_END_YEAR = 2001                       # Okraina ends in 2000; such ranges stay open

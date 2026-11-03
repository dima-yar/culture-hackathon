"""
Base geography of the map: land, lakes and rivers.

- land   — union of the Okraina province mesh (coast cut from Natural Earth at ~120 m), much finer than natural.json
- lakes, rivers — Natural Earth 1:10m via Okraina natural.json (public domain)

All rings and lines are delta-encoded (geometry.encode_ring).
"""

import json

from .config import MAX_RIVER_RANK, SIMPLIFY_TOLERANCE
from .geometry import clip_polygon, clip_polyline, encode_ring, simplify

LAND_TOLERANCE = 0.002   # degrees, ~0.15 km


def build_geography(project, mesh):
    from shapely.ops import unary_union

    natural = json.loads((project / 'assets/map/sheet/natural.json').read_text(encoding='utf-8'))

    land_union = unary_union([p for p in mesh.polygons if p is not None and not p.is_empty]).simplify(LAND_TOLERANCE)
    land_polygons = [land_union] if land_union.geom_type == 'Polygon' else list(land_union.geoms)
    land = [encode_ring(polygon.exterior.coords) for polygon in land_polygons if polygon.area > 0.0004]

    lakes = []
    for ring in natural['lakes']:
        clipped = clip_polygon(ring)
        if len(clipped) >= 3:
            simplified = simplify(clipped)
            if len(simplified) >= 3:
                lakes.append(encode_ring(simplified))

    rivers = []
    for river in natural['rivers']:
        if river['rank'] > MAX_RIVER_RANK:
            continue
        for run in clip_polyline(river['points']):
            simplified = simplify(run, SIMPLIFY_TOLERANCE)
            if len(simplified) > 1:
                rivers.append({'rank': river['rank'], 'points': encode_ring(simplified)})

    return {
        'source': 'Land: Okraina province mesh (Natural Earth coast); lakes and rivers: Natural Earth 1:10m (public domain)',
        'land': land,
        'lakes': lakes,
        'rivers': rivers,
    }

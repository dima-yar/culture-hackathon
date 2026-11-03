"""
Territories assembled from the Okraina province mesh (assets/map/sheet/provinces.json, 2368 provinces):

- states per period (who holds every province), in two levels of detail
- administrative units per period (lands, voivodeships, regiments, gubernias, okruhy, oblasts)

Identical territories in different periods are stored once; rings are delta-encoded (see geometry.encode_ring).
"""

import json

from .config import CLIP_BOX, OPEN_END_YEAR
from .geometry import encode_ring

STATE_TOLERANCE = {'overview': 0.008, 'detail': 0.0025}   # degrees: ~0.7 km / ~0.2 km
ADMIN_TOLERANCE = 0.005                                    # degrees, ~0.4 km
MIN_PART_AREA = 0.0004                                     # degrees², drops slivers smaller than ~3 km²


class ProvinceMesh:
    """Province polygons (clipped to the map area) with a cache of merged territories."""

    def __init__(self, project):
        from shapely.geometry import Polygon, box

        self.sheet = json.loads((project / 'assets/map/sheet/provinces.json').read_text(encoding='utf-8'))
        clip = box(*CLIP_BOX)
        self.polygons = []
        for province in self.sheet['provinces']:
            rings = province['rings']
            polygon = Polygon(rings[0], rings[1:]).buffer(0)
            self.polygons.append(polygon.intersection(clip) if polygon.intersects(clip) else None)
        self._union_cache = {}

    def merge(self, province_indexes, tolerance):
        """Union of provinces → list of encoded rings (outer rings and holes), or [] if nothing is on the map."""
        from shapely.ops import unary_union

        key = (frozenset(province_indexes), tolerance)
        if key in self._union_cache:
            return self._union_cache[key]

        parts = [self.polygons[i] for i in province_indexes if self.polygons[i] is not None and not self.polygons[i].is_empty]
        rings = []
        if parts:
            merged = unary_union(parts).simplify(tolerance, preserve_topology=True)
            polygons = [merged] if merged.geom_type == 'Polygon' else [g for g in getattr(merged, 'geoms', []) if g.geom_type == 'Polygon']
            for polygon in polygons:
                if polygon.area < MIN_PART_AREA:
                    continue
                rings.append(encode_ring(polygon.exterior.coords))
                rings += [encode_ring(hole.coords) for hole in polygon.interiors if hole.area >= MIN_PART_AREA]

        self._union_cache[key] = rings
        return rings


def group_by_owner(owners):
    groups = {}
    for province_index, owner in enumerate(owners):
        if owner >= 0:
            groups.setdefault(owner, []).append(province_index)
    return groups


# ---------- states ----------

def build_states(mesh, level):
    """
    shapes  — unique territories: { polity, rings }
    periods — { from, to, shapes: [index…], labels: { polityId: [lon, lat, km²] }, surveyed: [polityId…] }
    `level` is 'overview' or 'detail'; both levels produce the same periods and shape indexes.
    """
    states = mesh.sheet['states']
    polity_ids = states['polities']
    tolerance = STATE_TOLERANCE[level]
    shapes, index_by_key = [], {}

    periods = []
    for (start, end), owners, labels, surveyed in zip(states['periods'], states['owner'], states['labels'], states['surveyed']):
        shape_ids = []
        for owner, members in sorted(group_by_owner(owners).items()):
            key = (owner, frozenset(members))
            if key not in index_by_key:
                rings = mesh.merge(members, tolerance)
                index_by_key[key] = None
                if rings:
                    shapes.append({'polity': polity_ids[owner], 'rings': rings})
                    index_by_key[key] = len(shapes) - 1
            if index_by_key[key] is not None:
                shape_ids.append(index_by_key[key])

        periods.append({
            'from': start,
            'to': None if end >= OPEN_END_YEAR else end,
            'shapes': shape_ids,
            'labels': {polity_ids[int(i)]: [round(point[0], 3), round(point[1], 3), area] for i, (point, area) in labels.items()},
            'surveyed': [polity_ids[i] for i in surveyed],
        })

    return {'shapes': shapes, 'periods': periods}


# ---------- administrative division ----------

def build_admin(project, t, mesh):
    """
    systems — { id, name, kind, from, to, sources, fidelity, units: [{ id, name, seat }] }
    units   — unique territories: { system, unit (index in system.units), rings, surveyed }
    periods — { from, to, units: [index…] }

    In every period each province belongs to the unit of the latest-started active system that covers it
    (as Okraina's ProvinceMesh.unit_of does), so overlapping systems never draw double lines.
    """
    systems_data = sorted(
        json.loads((project / 'data/build/map_admin.json').read_text(encoding='utf-8')),
        key=lambda system: system['from'],
    )
    admin = mesh.sheet['admin']

    systems = []
    for system in systems_data:
        systems.append({
            'id': system['id'],
            'name': t(system['name_key'], system['id']),
            'kind': t('map.admkind.' + system['kind'], system['kind']),
            'from': system['from'],
            'to': None if system['to'] >= OPEN_END_YEAR else system['to'],
            'fidelity': system.get('fidelity', ''),
            'sources': system.get('sources', []),
            'units': [
                {'id': unit['id'], 'name': t('map.adm.' + unit['id'], unit['id']), 'seat': (unit.get('seats') or [None])[0]}
                for unit in system['units']
            ],
        })

    breakpoints = sorted({year for s in systems_data for year in (s['from'], min(s['to'], OPEN_END_YEAR))})
    units, index_by_key, periods = [], {}, []
    province_count = len(mesh.polygons)

    for start, end in zip(breakpoints, breakpoints[1:]):
        active = [s for s in systems_data if s['from'] <= start < s['to']]
        if not active:
            continue

        owner = [None] * province_count
        for system in active:  # later-started systems overwrite earlier ones
            assignment = admin[system['id']]['unit']
            for province_index, unit_index in enumerate(assignment):
                if unit_index >= 0:
                    owner[province_index] = (system['id'], unit_index)

        groups = {}
        for province_index, key in enumerate(owner):
            if key is not None:
                groups.setdefault(key, []).append(province_index)

        unit_ids = []
        for (system_id, unit_index), members in sorted(groups.items()):
            key = (system_id, unit_index, frozenset(members))
            if key not in index_by_key:
                rings = mesh.merge(members, ADMIN_TOLERANCE)
                index_by_key[key] = None
                if rings:
                    how = admin[system_id]['how']
                    surveyed = sum(1 for i in members if how[i] == 1) * 2 >= len(members)
                    units.append({'system': system_id, 'unit': unit_index, 'rings': rings, 'surveyed': surveyed})
                    index_by_key[key] = len(units) - 1
            if index_by_key[key] is not None:
                unit_ids.append(index_by_key[key])

        periods.append({'from': start, 'to': None if end >= OPEN_END_YEAR else end, 'units': unit_ids})

    return {'systems': systems, 'units': units, 'periods': periods}

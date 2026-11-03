"""
Okraina's research base (research/epochs/E*/{events,battles,…}.md): ~1170 sourced entries, 482–2000.

Ukrainian text comes, in order of preference, from:
  1. Okraina's translations — locale/content/research_events.uk.po (rs.*) and city_lore.uk.po (rl.*)
  2. our translations — tools/translations/research-uk.json  ({ "E4-0120": { "title": …, "text": … } })
Entries without Ukrainian text are listed by `missing_translations()` and are not exported.
"""

import json
import math
import re
from pathlib import Path

TRANSLATIONS_FILE = Path(__file__).resolve().parent.parent / 'translations' / 'research-uk.json'
CITY_LINK_DEGREES = 0.25   # an entry within ~25 km of a city belongs to its history

ENTRY_HEADER = re.compile(r'### (E(\d)-\d{4}) · ([^·]+) · (.+)')
FIELD = re.compile(r'^- ([a-z_]+): (.*)$', re.MULTILINE)
SOURCE_SPLIT = re.compile(r';\s*(?=\[[ABC]\])')


def parse_entries(project):
    entries = []
    for path in sorted((project / 'research' / 'epochs').glob('*/*.md')):
        if path.name == 'timeline.md':
            continue
        for block in re.split(r'\n(?=### E\d-\d{4})', path.read_text(encoding='utf-8')):
            header = ENTRY_HEADER.match(block)
            if not header:
                continue
            fields = dict(FIELD.findall(block))
            entries.append({
                'id': header.group(1),
                'epoch': int(header.group(2)),
                'date': header.group(3).strip(),
                'title_en': header.group(4).strip(),
                'fields': fields,
            })
    return entries


def parse_year(date):
    match = re.search(r'-?\d{3,4}', date)
    return int(match.group(0)) if match else None


def parse_places(value):
    """'Kyiv (uk: Київ); Lviv | coords: 50.45,30.52 | game: none' → (['Київ', 'Lviv'], [lon, lat] | None)."""
    parts = [part.strip() for part in value.split('|')]
    names = []
    for name in re.split(r';\s*', parts[0]) if parts and parts[0] else []:
        ukrainian = re.search(r'uk:\s*([^),;]+)', name)
        names.append((ukrainian.group(1) if ukrainian else re.sub(r'\s*\(.*?\)', '', name)).strip())

    point = None
    coords = next((part for part in parts if part.startswith('coords:')), '')
    numbers = re.findall(r'-?\d+(?:\.\d+)?', coords)
    if len(numbers) >= 2:
        lat, lon = float(numbers[0]), float(numbers[1])
        point = [round(lon, 3), round(lat, 3)]
    return [name for name in names if name and name != '—'], point


def ukrainian_from_okraina(t, entry_id):
    key = entry_id.replace('-', '_')
    for prefix in ('rs', 'rl'):
        title = t.optional(f'{prefix}.{key}.name')
        text = t.optional(f'{prefix}.{key}.text')
        if title and text:
            return {'title': title, 'text': text}
    return None


def load_our_translations():
    if TRANSLATIONS_FILE.exists():
        return json.loads(TRANSLATIONS_FILE.read_text(encoding='utf-8'))
    return {}


def link_city(names, point, cities):
    """City id of the entry: by Ukrainian name first, then by distance."""
    for city in cities:
        city_names = {entry['name'] for entry in city['names']}
        if any(name in city_names for name in names):
            return city['id']
    if point:
        best, best_distance = None, CITY_LINK_DEGREES
        for city in cities:
            dx = (city['point'][0] - point[0]) * math.cos(math.radians(point[1]))
            dy = city['point'][1] - point[1]
            distance = math.hypot(dx, dy)
            if distance < best_distance:
                best, best_distance = city['id'], distance
        return best
    return None


def build_research(project, t, cities):
    ours = load_our_translations()
    result = []
    for entry in parse_entries(project):
        texts = ukrainian_from_okraina(t, entry['id']) or ours.get(entry['id'])
        if not texts:
            continue
        fields = entry['fields']
        names, point = parse_places(fields.get('places', ''))
        sources = [source.strip() for source in SOURCE_SPLIT.split(fields.get('sources', '')) if source.strip()]

        record = {
            'id': entry['id'],
            'epoch': entry['epoch'],
            'year': parse_year(entry['date']),
            'date': entry['date'],
            'category': fields.get('category', ''),
            'title': texts['title'],
            'text': texts['text'],
            'places': names,
            'point': point,
            'city': link_city(names, point, cities),
            'confidence': fields.get('confidence', ''),
            'sources': sources,
        }
        if fields.get('original'):
            record['original'] = fields['original'].strip().strip('"')
        result.append(record)

    return sorted(result, key=lambda record: (record['year'] if record['year'] is not None else 9999, record['id']))


def missing_translations(project, t):
    """Entries that still need a Ukrainian translation (used while translating, see tools/translations)."""
    ours = load_our_translations()
    missing = []
    for entry in parse_entries(project):
        if ukrainian_from_okraina(t, entry['id']) or entry['id'] in ours:
            continue
        fields = entry['fields']
        missing.append({
            'id': entry['id'],
            'title_en': entry['title_en'],
            'summary_ru': fields.get('summary_ru', ''),
            'summary_en': fields.get('summary_en', ''),
        })
    return missing

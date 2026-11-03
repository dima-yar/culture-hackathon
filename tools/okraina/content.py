"""States metadata, cities with lore, key events, map styles, document archive."""

import json
import math
import re

from .config import CITY_SNAP_DEGREES, OPEN_END_YEAR


def build_polities(project, t):
    result = []
    for polity in json.loads((project / 'data/build/polities.json').read_text(encoding='utf-8')):
        result.append({
            'id': polity['id'],
            'name': t(polity['name_key'], polity['id']),
            'description': t.optional(polity['name_key'] + '.desc'),
            'color': polity['color'],
            'z': polity.get('z', 1),
            'ukrainian': bool(polity.get('ukrainian')),
            'fidelity': polity.get('fidelity', ''),
            'sources': polity.get('sources', []),
        })
    return result


def build_cities(project, t):
    lore_by_city = {}
    for item in json.loads((project / 'data/build/city_lore.json').read_text(encoding='utf-8')):
        lore_by_city.setdefault(item['city'], []).append({
            'year': item.get('year'),
            'kind': item.get('kind', ''),
            'title': t(item.get('name_key')),
            'text': t.clean(t(item.get('text_key'))),
            'sources': item.get('sources', []),
            'research': item.get('research_id', ''),   # same record as research.js entry, if any
        })

    # How the city was written in the languages of its rulers (Okraina period_texts, kind "place").
    period_names = {}
    for item in json.loads((project / 'data/build/period_texts.json').read_text(encoding='utf-8')):
        if item.get('kind') == 'place' and item.get('city'):
            period_names[item['city']] = [
                {'from': form['from'], 'to': min(form['to'], 2014), 'language': form.get('lang', ''), 'text': form['text']}
                for form in item['forms']
            ]

    cities = []
    for city in json.loads((project / 'data/build/map_cities.json').read_text(encoding='utf-8')):
        lore = sorted(lore_by_city.get(city['id'], []), key=lambda item: item['year'] or 0)
        cities.append({
            'id': city['id'],
            'names': [{'from': name['from'], 'name': t(name['key'], city['id'])} for name in city['names']],
            'point': [city['lon'], city['lat']],
            'year': city['year'],
            'yearNote': city.get('year_note', ''),
            'toYear': city.get('to_year'),
            'rank': city['rank'],
            'fidelity': city.get('fidelity', ''),
            'sources': city.get('sources', []),
            'lore': lore,
            'periodNames': period_names.get(city['id'], []),
        })
    return cities


def city_name_at(city, year):
    name = city['names'][0]['name']
    for entry in city['names']:
        if entry['from'] <= year:
            name = entry['name']
    return name


def nearest_city_name(cities, lon, lat, year):
    best, best_distance = None, CITY_SNAP_DEGREES
    for city in cities:
        if city['year'] > year + 50:
            continue
        distance = math.hypot((city['point'][0] - lon) * math.cos(math.radians(lat)), city['point'][1] - lat)
        if distance < best_distance:
            best, best_distance = city, distance
    return city_name_at(best, year) if best else ''


def build_events(project, t, cities):
    events = []
    for event in json.loads((project / 'data/build/history_events.json').read_text(encoding='utf-8')):
        key = 'hist.' + re.sub(r'^ev_', '', event['id'])
        events.append({
            'id': event['id'],
            'year': event['year'],
            'toYear': event.get('to_year'),
            'point': [event['lon'], event['lat']],
            'category': event['category'],
            'categoryName': t('hist.cat.' + event['category'], event['category']),
            'title': t(key + '.title', event['id']),
            'text': t(key + '.desc'),
            'place': nearest_city_name(cities, event['lon'], event['lat'], event['year']),
            'fidelity': event.get('fidelity', ''),
            'sources': event.get('sources', []),
        })
    return sorted(events, key=lambda e: (e['year'], e['id']))


def build_styles(project, t):
    styles = json.loads((project / 'data/build/map_styles.json').read_text(encoding='utf-8'))
    return sorted(
        [{'id': s['id'], 'name': t(s['name_key'], s['id']), 'fromYear': s['from_year'], 'palette': s['palette'], 'sources': s.get('sources', [])}
         for s in styles],
        key=lambda s: s['fromYear'],
    )


def build_documents(project, t, cities):
    city_by_id = {city['id']: city for city in cities}
    documents = []
    for doc in json.loads((project / 'data/build/documents.json').read_text(encoding='utf-8')):
        city = city_by_id.get(doc.get('city'))
        documents.append({
            'id': doc['id'],
            'kind': doc['kind'],
            'year': doc.get('year'),
            'place': city_name_at(city, doc.get('year') or 2000) if city else '',
            'language': doc.get('lang', ''),
            'title': t(doc.get('title_key'), doc['id']),
            'original': doc.get('original', ''),
            'translation': t(doc.get('translation_key')),
            'fidelity': doc.get('fidelity', ''),
            'sources': doc.get('sources', []),
        })
    # Dated documents in chronological order, undated legends and proverbs at the end.
    return sorted(documents, key=lambda d: (d['year'] is None, d['year'] or 0))

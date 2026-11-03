"""Ukrainian strings from Okraina's locale/*.uk.po (English fallback)."""

import json
import re


def parse_po(path):
    """Minimal .po reader: msgid/msgstr pairs, multi-line strings supported."""
    entries, key, value, target = {}, None, None, None
    unquote = lambda s: json.loads(s)

    for raw in path.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if line.startswith('msgid '):
            if key is not None and value:
                entries[key] = value
            key, value, target = unquote(line[6:]), '', 'id'
        elif line.startswith('msgstr '):
            value, target = unquote(line[7:]), 'str'
        elif line.startswith('"') and target == 'id':
            key += unquote(line)
        elif line.startswith('"') and target == 'str':
            value += unquote(line)
    if key is not None and value:
        entries[key] = value
    return entries


def load_strings(project, language):
    strings = {}
    for path in [project / 'locale' / f'{language}.po', *sorted((project / 'locale' / 'content').glob(f'*.{language}.po'))]:
        strings.update(parse_po(path))
    return strings


class Translator:
    def __init__(self, project):
        self.uk = load_strings(project, 'uk')
        self.en = load_strings(project, 'en')
        self.missing = []

    def __call__(self, key, default=''):
        if not key:
            return default
        text = self.uk.get(key) or self.en.get(key)
        if text is None:
            self.missing.append(key)
            return default
        return text

    def clean(self, text):
        """Drops sentences that mention Okraina's internal epoch codes (E1, E2…)."""
        return re.sub(r'[^.!?]*\bE\d+\b[^.!?]*[.!?]\s*', '', text).strip()

    def optional(self, key):
        return self.uk.get(key) or self.en.get(key) or ''

"""
Bundles the ES modules of js/ into classic scripts, so index.html also works when opened
straight from disk (file://), where browsers refuse to load ES modules.

    python tools/build.py

Output (committed, do not edit by hand):
    build/app.js          every statically imported module, entry js/main.js
    build/lazy/*.js       modules loaded with import(...) — e.g. the heavy state borders

index.html loads build/app.js on file:// and the original modules over http(s).
The git pre-commit hook (tools/git-hooks/pre-commit) runs this script automatically.

Supported syntax (all the project uses): `import { a, b as c } from './x.js';`,
`export const|function|async function NAME`, and `import('./x.js')` for lazy modules.
Import cycles are reported as an error, because bundled modules are evaluated in dependency order.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENTRY = 'js/main.js'
BUILD_DIR = ROOT / 'build'

STATIC_IMPORT = re.compile(r"^import\s*\{([^}]*)\}\s*from\s*'([^']+)';[ \t]*\n?", re.MULTILINE)
DYNAMIC_IMPORT = re.compile(r"import\('([^']+)'\)")
EXPORT = re.compile(r"^export\s+(?:(async\s+function|function)\s+([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*))", re.MULTILINE)
UNSUPPORTED = re.compile(r"^(?:export\s+(?:default|let|var|class|\{|\*)|import\s+(?:\*|[A-Za-z_$][\w$]*\s+from|'))", re.MULTILINE)

RUNTIME = """\
/* Minimal module runtime for the bundle (see tools/build.py). */
var __litopys = (function () {
  var definitions = {};
  var cache = {};

  function require(id) {
    if (!(id in cache)) {
      if (!definitions[id]) throw new Error('Module not bundled: ' + id);
      cache[id] = definitions[id](require, lazy);
    }
    return cache[id];
  }

  /** Loads a lazy bundle with a <script> tag (works on file://) and returns its exports. */
  function lazy(id, src) {
    if (definitions[id]) return Promise.resolve(require(id));
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.onload = function () { resolve(require(id)); };
      script.onerror = function () { reject(new Error('Cannot load ' + src)); };
      document.head.appendChild(script);
    });
  }

  return {
    define: function (id, factory) { definitions[id] = factory; },
    require: require,
  };
})();
"""


def resolve(from_id, specifier):
    """'js/views/map/map-view.js' + '../../core/utils.js' → 'js/core/utils.js'."""
    path = (ROOT / from_id).parent / specifier
    return path.resolve().relative_to(ROOT).as_posix()


def lazy_file_name(module_id):
    """'js/data/atlas/states.js' → 'build/lazy/data-atlas-states.js' (path relative to index.html)."""
    name = module_id.removeprefix('js/').removesuffix('.js').replace('/', '-')
    return f'build/lazy/{name}.js'


def transform(module_id, source):
    """
    Turns one ES module into `__litopys.define(id, function (__require, __lazy) { … return { exports }; });`.
    Returns (code, static dependencies, lazy dependencies).
    """
    bad = UNSUPPORTED.search(source)
    if bad:
        raise SystemExit(f'{module_id}: unsupported syntax "{bad.group(0).strip()}" — see tools/build.py')

    dependencies, lazy_dependencies = [], []

    def replace_import(match):
        target = resolve(module_id, match.group(2))
        dependencies.append(target)
        names = []
        for item in match.group(1).split(','):
            item = item.strip()
            if not item:
                continue
            original, _, alias = item.partition(' as ')
            names.append(f'{original.strip()}: {alias.strip()}' if alias else original.strip())
        return f"const {{ {', '.join(names)} }} = __require('{target}');\n"

    def replace_dynamic(match):
        target = resolve(module_id, match.group(1))
        lazy_dependencies.append(target)
        return f"__lazy('{target}', '{lazy_file_name(target)}')"

    exports = []

    def replace_export(match):
        kind, function_name, const_name = match.groups()
        name = function_name or const_name
        exports.append(name)
        return f'{kind} {name}' if kind else f'const {name}'

    body = STATIC_IMPORT.sub(replace_import, source)
    body = DYNAMIC_IMPORT.sub(replace_dynamic, body)
    body = EXPORT.sub(replace_export, body)

    code = (
        f"__litopys.define('{module_id}', function (__require, __lazy) {{\n"
        f"{body.rstrip()}\n"
        f"return {{ {', '.join(exports)} }};\n"
        f"}});\n"
    )
    return code, dependencies, lazy_dependencies


def collect(entry, lazy_roots):
    """Depth-first: returns modules in dependency order; lazy imports are collected into `lazy_roots`."""
    order, state = [], {}  # state: 'visiting' | 'done'
    codes = {}

    def visit(module_id, chain):
        if state.get(module_id) == 'done':
            return
        if state.get(module_id) == 'visiting':
            cycle = ' → '.join(chain[chain.index(module_id):] + [module_id])
            raise SystemExit(f'Import cycle: {cycle}')

        state[module_id] = 'visiting'
        source = (ROOT / module_id).read_text(encoding='utf-8')
        code, dependencies, lazy_dependencies = transform(module_id, source)
        for dependency in dependencies:
            visit(dependency, chain + [module_id])
        lazy_roots.extend(lazy_dependencies)

        state[module_id] = 'done'
        codes[module_id] = code
        order.append(module_id)

    visit(entry, [])
    return order, codes


def main():
    lazy_roots = []
    order, codes = collect(ENTRY, lazy_roots)
    header = '/* Generated by tools/build.py — do not edit. Sources: js/ */\n'

    BUILD_DIR.mkdir(exist_ok=True)
    app = header + RUNTIME + ''.join(codes[module_id] for module_id in order) + f"__litopys.require('{ENTRY}');\n"
    (BUILD_DIR / 'app.js').write_text(app, encoding='utf-8')
    print(f'build/app.js  {len(order)} modules, {len(app) // 1024} KB')

    lazy_dir = BUILD_DIR / 'lazy'
    lazy_dir.mkdir(exist_ok=True)
    for old in lazy_dir.glob('*.js'):
        old.unlink()

    for root in dict.fromkeys(lazy_roots):
        lazy_order, lazy_codes = collect(root, [])
        # Modules already in the main bundle are not repeated.
        own = [module_id for module_id in lazy_order if module_id not in codes]
        text = header + ''.join(lazy_codes[module_id] for module_id in own)
        path = ROOT / lazy_file_name(root)
        path.write_text(text, encoding='utf-8')
        print(f'{lazy_file_name(root)}  {len(text) // 1024} KB')


if __name__ == '__main__':
    sys.exit(main())

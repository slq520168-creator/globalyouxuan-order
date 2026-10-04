#!/usr/bin/env python3
"""Content-hash every local JS/CSS/image reference (?v=<hash>) and regenerate the service-worker
precache list + version. Run from the repo root before committing:  python3 tools/build_assets.py
A file's hash covers its own content and everything it references (transitively), so a changed
dependency always yields a new URL and the long immutable cache in _headers is always safe."""
import hashlib, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
PUBLIC_PAGES = ['shop.html', 'community.html', 'free-zone.html', 'member.html', 'login.html', 'face-translate.html']
SW_PAGES = ['shop', 'community', 'free-zone', 'member', 'login', 'face-translate']

def listing():
    assets = []
    for f in sorted(os.listdir('.')):
        if os.path.isfile(f) and re.search(r'\.(js|css)$', f) and f != 'sw.js':
            assets.append(f)
    for d in ('assets', 'vendor'):
        if os.path.isdir(d):
            assets += [f'{d}/{x}' for x in sorted(os.listdir(d)) if os.path.isfile(f'{d}/{x}')]
    return assets

ASSETS = listing()
TEXT = sorted([f for f in os.listdir('.') if os.path.isfile(f) and re.search(r'\.(html|js|css)$', f)])
VSTRIP = re.compile(r'\?v=[^"\'`\s)<>\\]*')

def pat(p):
    return re.compile(r'(?<![\w./-])(\./)?' + re.escape(p) + r'(\?v=[^"\'`\s)<>\\]*)?(?=["\'`\s)<>\\])')
PATS = {a: pat(a) for a in ASSETS}

def read(f):
    with open(f, encoding='utf-8') as h:
        return h.read()

def refs(text):
    return {a for a, p in PATS.items() if p.search(text)}

def is_text(f):
    return re.search(r'\.(js|css|html)$', f) and not f.startswith('vendor/')

content = {f: read(f) for f in set(TEXT) | {a for a in ASSETS if is_text(a)}}
h0, deps = {}, {}
for a in ASSETS:
    if is_text(a):
        h0[a] = hashlib.sha256(VSTRIP.sub('', content[a]).encode()).hexdigest()
        deps[a] = refs(content[a]) - {a}
    else:
        with open(a, 'rb') as h:
            h0[a] = hashlib.sha256(h.read()).hexdigest()
        deps[a] = set()

def closure(a):
    seen, stack = set(), [a]
    while stack:
        x = stack.pop()
        if x in seen:
            continue
        seen.add(x)
        stack += list(deps.get(x, ()))
    return seen

H = {a: hashlib.sha256(''.join(sorted(h0[x] for x in closure(a))).encode()).hexdigest()[:10] for a in ASSETS}

changed = []
for f, text in content.items():
    new = text
    for a, p in PATS.items():
        if a == f:
            continue
        new = p.sub(lambda m, a=a: (m.group(1) or '') + a + '?v=' + H[a], new)
    if new != text:
        with open(f, 'w', encoding='utf-8') as h:
            h.write(new)
        changed.append(f)
        content[f] = new

# service worker precache: everything the public pages load, directly or through script loaders
pre = set()
for page in PUBLIC_PAGES:
    for a in refs(content[page]):
        pre |= closure(a)
pre -= {'i18n-en.js', 'i18n-km.js'}  # language packs are fetched only for those visitors
pre_urls = sorted(f'{a}?v={H[a]}' for a in pre)
version = 'gyx-sw-' + hashlib.sha256((json.dumps(pre_urls) + ''.join(hashlib.sha256(content[p].encode()).hexdigest() for p in PUBLIC_PAGES)).encode()).hexdigest()[:12]
sw = read('sw.js')
block = ('/*BUILD:START*/\nconst VERSION = ' + json.dumps(version) + ';\nconst PAGES = ' + json.dumps(SW_PAGES) +
         ';\nconst PRECACHE = ' + json.dumps(pre_urls, indent=1) + ';\n/*BUILD:END*/')
sw2 = re.sub(r'/\*BUILD:START\*/.*?/\*BUILD:END\*/', lambda m: block, sw, flags=re.S)
if sw2 != sw:
    with open('sw.js', 'w', encoding='utf-8') as h:
        h.write(sw2)
    changed.append('sw.js')
print(f'{len(ASSETS)} assets hashed, {len(pre_urls)} precached, sw {version}; rewrote: {", ".join(sorted(changed)) or "nothing"}')

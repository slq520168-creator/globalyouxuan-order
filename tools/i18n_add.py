#!/usr/bin/env python3
"""Add/overwrite i18n keys in i18n.js (zh bundle) and the lazy en/km packs.
Usage: python3 tools/i18n_add.py keys.json   where keys.json = {"key": {"zh": "...", "en": "...", "km": "..."}}"""
import json, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load_obj(s, start):
    dec = json.JSONDecoder(); obj, end = dec.raw_decode(s, start); return obj, end
def main(path):
    keys = json.load(open(path, encoding='utf8'))
    p = os.path.join(ROOT, 'i18n.js'); s = open(p, encoding='utf8').read()
    i = s.index('const R={zh:') + len('const R={zh:')
    zh, end = load_obj(s, i)
    for k, v in keys.items(): zh[k] = v['zh']
    s = s[:i] + json.dumps(zh, ensure_ascii=False, separators=(',', ':')) + s[end:]
    open(p, 'w', encoding='utf8').write(s)
    for lang in ('en', 'km'):
        p = os.path.join(ROOT, f'i18n-{lang}.js'); s = open(p, encoding='utf8').read()
        i = s.index(f"push(['{lang}',") + len(f"push(['{lang}',")
        d, end = load_obj(s, i)
        for k, v in keys.items(): d[k] = v[lang]
        s = s[:i] + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + s[end:]
        open(p, 'w', encoding='utf8').write(s)
    print('added', len(keys), 'keys')
if __name__ == '__main__': main(sys.argv[1])

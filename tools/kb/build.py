import json, re, os, sys, math, glob, collections, hashlib
sys.path.insert(0, '/workspace/kb')
from tok import tokens
import jieba, jieba.analyse
jieba.setLogLevel(60)
RAW = '/workspace/kbraw'; OUT = '/workspace/kbout'; DR = OUT + '/drive'
SHARD_MAX = 48 * 1024 * 1024
groups = collections.OrderedDict([
  ('wikizh', [f'{RAW}/raw_wikizh2.jsonl']),
  ('wikien', [f'{RAW}/raw_wikien2_a.jsonl', f'{RAW}/raw_wikien2_b.jsonl']),
  ('stackexchange', sorted(glob.glob(f'{RAW}/raw_se_*.jsonl'))),
  ('fineweb2zh', sorted(glob.glob(f'{RAW}/raw_fw2_*.jsonl'))),
])
SE_QUOTA = {k: v // 2 for k, v in dict(money=3000, freelancing=1300, webmasters=2000, workplace=2000, ai=900, genai=150, pm=800, ux=800, graphicdesign=800,
  economics=500, avp=300, softwarerecs=400, wordpress=800, law=500, quant=200, expatriates=300, crafts=200, ebooks=200, opensource=200,
  salesforce=150, magento=150, sound=100, drupal=300, cooking=600, datascience=400, bitcoin=300, webapps=400, interpersonal=600, lifehacks=300).items()}
WIKIEN_MAX = 1200
seen_t = set(); meta = []  # (kbid, group, src, shard, line, quality, lang)
shards = []; cur = None; cur_bytes = 0; cur_lines = 0; kbseq = 0
total_bytes = 0; total_docs = 0
def open_shard(g):
    global cur, cur_bytes, cur_lines
    if cur: cur.close(); shards[-1]['bytes'] = cur_bytes; shards[-1]['records'] = cur_lines
    n = sum(1 for s in shards if s['group'] == g) + 1
    name = f'gyx-kb-{g}-{n:03d}.jsonl'
    shards.append({'no': len(shards) + 1, 'name': name, 'group': g})
    cur = open(f'{DR}/{name}', 'w', encoding='utf-8'); cur_bytes = 0; cur_lines = 0
def se_score(text):
    m = re.search(r'Best answer \(score (\d+)\)', text)
    return int(m.group(1)) if m else 0
for g, files in groups.items():
    open_shard(g)
    for f in files:
        if not os.path.exists(f): print('missing', f); continue
        for line in open(f, encoding='utf-8'):
            d = json.loads(line)
            nt = re.sub(r'\W', '', (d['title'] or '').lower())[:60]
            if not nt or (d['lang'], nt) in seen_t: continue
            seen_t.add((d['lang'], nt))
            kbseq += 1; kbid = 9_000_000_000 + kbseq
            rec = {'kb_id': kbid, 'src': d['src'], 'lang': d['lang'], 'license': d['license'], 'url': d.get('url'), 'title': d['title'],
                   'cat': d['cat'], 'tags': d.get('tags') or [], 'text': d['text']}
            s = json.dumps(rec, ensure_ascii=False) + '\n'; b = len(s.encode('utf-8'))
            if cur_bytes + b > SHARD_MAX: open_shard(g)
            cur.write(s); cur_bytes += b; cur_lines += 1; total_bytes += b; total_docs += 1
            if g == 'stackexchange': q = se_score(d['text']) + 0.0001 * min(len(d['text']), 6000)
            elif g == 'wikien': q = min(len(d['text']), 20000) / 1000
            else: q = 1
            meta.append((kbid, g, d['src'], shards[-1]['no'], cur_lines, q, d['lang']))
cur.close(); shards[-1]['bytes'] = cur_bytes; shards[-1]['records'] = cur_lines
print('drive docs', total_docs, 'bytes', total_bytes, 'shards', len(shards))
# select online set (CC BY-SA only: wikipedia + stackexchange; fineweb excluded from paid index)
sel = []
by = collections.defaultdict(list)
for m in meta: by[m[2]].append(m)
for src, L in by.items():
    if src == 'wikipedia-zh': sel += L
    elif src == 'wikipedia-en': sel += sorted(L, key=lambda x: -x[5])[:WIKIEN_MAX]
    elif src.startswith('stackexchange-'):
        sel += sorted(L, key=lambda x: -x[5])[:SE_QUOTA.get(src.split('-', 1)[1], 100)]
print('online selected', len(sel))
json.dump({'shards': shards, 'total_docs': total_docs, 'total_bytes': total_bytes}, open(OUT + '/manifest.json', 'w'), ensure_ascii=False, indent=1)
json.dump(sel, open(OUT + '/selected.json', 'w'))

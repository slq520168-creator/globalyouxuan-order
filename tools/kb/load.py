# One-off loader: posted index rows to the temporary edge function kb-bulk-load (now retired, always 410).
import json, gzip, sys, time, urllib.request, concurrent.futures as cf
URL = 'https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/kb-bulk-load'
TOK = open('/workspace/kb/.loadtoken').read().strip(); ANON = open('/workspace/kb/.anonkey').read().strip()
OUT = '/workspace/kbout'
def post(table, rows):
    data = gzip.compress(json.dumps({'table': table, 'rows': rows}, ensure_ascii=False).encode())
    for k in range(4):
        try:
            req = urllib.request.Request(URL, data=data, method='POST', headers={'authorization': 'Bearer ' + ANON, 'apikey': ANON, 'x-kb-token': TOK, 'x-gz': '1', 'content-type': 'application/json'})
            with urllib.request.urlopen(req, timeout=120) as r: return json.loads(r.read())
        except Exception as e:
            err = getattr(e, 'read', lambda: b'')().decode()[:300]; print('retry', table, k, e, err, flush=True); time.sleep(3 * (k + 1))
    raise SystemExit('failed ' + table)
def batches(L, n):
    for i in range(0, len(L), n): yield L[i:i + n]
what = sys.argv[1]
if what == 'shards':
    man = json.load(open(OUT + '/manifest.json'))
    print(post('kb_shards', [{'no': s['no'], 'name': s['name'], 'grp': s['group'], 'bytes': s['bytes'], 'records': s['records'], 'drive_file_id': s.get('drive_file_id')} for s in man['shards']]))
elif what == 'terms':
    rows = [{'term': l.split('\t')[0], 'df': int(l.split('\t')[1]), 'wt': float(l.split('\t')[2])} for l in open(OUT + '/kb_terms_w.tsv', encoding='utf-8') if l.strip()]
    with cf.ThreadPoolExecutor(4) as ex: print(sum(r['n'] for r in ex.map(lambda b: post('kb_terms', b), batches(rows, 2000))))
elif what == 'docs':
    lim = int(sys.argv[2]) if len(sys.argv) > 2 else 10**9
    rows = []
    for i, l in enumerate(open(OUT + '/kb_docs.jsonl', encoding='utf-8')):
        if i >= lim: break
        rows.append(json.loads(l))
    for r in rows: r['id'] = r.pop('kb_id')
    n = 0
    with cf.ThreadPoolExecutor(4) as ex:
        for res in ex.map(lambda b: post('kb_docs', b), batches(rows, 300)):
            n += res['n']
            if n % 3000 < 300: print('docs', n, flush=True)
    print('docs total', n)
elif what == 'meta':
    man = json.load(open(OUT + '/manifest.json')); n = sum(1 for _ in open(OUT + '/kb_docs.jsonl'))
    print(post('kb_meta', [{'key': 'stats', 'value': {'n': n, 'corpus_docs': man['total_docs'], 'corpus_bytes': man['total_bytes'], 'shards': len(man['shards']), 'built_at': time.strftime('%Y-%m-%dT%H:%M:%S%z')}}]))

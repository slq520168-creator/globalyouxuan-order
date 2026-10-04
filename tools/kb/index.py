import json, re, sys, math, collections
sys.path.insert(0, '/workspace/kb')
from tok import tokens
import jieba, jieba.analyse
jieba.setLogLevel(60)
OUT = '/workspace/kbout'; DR = OUT + '/drive'
man = json.load(open(OUT + '/manifest.json')); sel = json.load(open(OUT + '/selected.json'))
shard_name = {s['no']: s['name'] for s in man['shards']}
want = collections.defaultdict(set)
for m in sel: want[m[3]].add(m[4])
docs = []
for no, lines in sorted(want.items()):
    with open(f"{DR}/{shard_name[no]}", encoding='utf-8') as f:
        for i, line in enumerate(f, 1):
            if i in lines:
                d = json.loads(line); d['shard'] = no; d['line'] = i; docs.append(d)
print('loaded', len(docs))
SITE_ZH = {'money': '个人理财', 'freelancing': '自由职业', 'webmasters': '网站运营', 'workplace': '职场', 'ai': '人工智能', 'genai': '生成式AI',
  'pm': '项目管理', 'ux': '用户体验', 'graphicdesign': '平面设计', 'economics': '经济学', 'avp': '音视频制作', 'softwarerecs': '软件推荐',
  'wordpress': 'WordPress建站', 'law': '法律', 'quant': '量化金融', 'expatriates': '海外工作生活', 'crafts': '手工艺', 'ebooks': '电子书',
  'opensource': '开源', 'salesforce': 'Salesforce CRM', 'magento': 'Magento电商', 'sound': '音频设计'}
def clip(s, n):
    s = s.strip()
    if len(s) <= n: return s
    cut = s[:n]; k = max(cut.rfind('\n'), cut.rfind('。'), cut.rfind('. '))
    return (cut[:k + 1] if k > n * 0.6 else cut).rstrip() + ' …'
def first_sents(s, n):
    s = re.sub(r'\s+', ' ', s).strip()
    return clip(s, n)
def struct_count(t):
    return len(re.findall(r'(?m)^\s*(?:\d{1,2}[.、)]|[-*•]|第[一二三四五六七八九十]+|#+ )', t)) + len(re.findall(r'\n\n', t)) // 3
rows = []
for d in docs:
    t = d['text']; src = d['src']; lang = d['lang']
    if src.startswith('stackexchange-'):
        site = src.split('-', 1)[1]
        body = t.split('\n', 1)[1] if '\n' in t else t
        qpart = body.split('Best answer', 1)[0]
        summary = first_sents(qpart, 200) or first_sents(body, 200)
        kws = [x.replace('-', ' ') for x in d.get('tags', [])][:6] + [SITE_ZH.get(site, site)]
        attrib = f"来源：Stack Exchange「{site}」问答社区（作者见原帖），许可 CC BY-SA 4.0，原帖 {d['url']}。本方案为原问答的节选整理，按 CC BY-SA 4.0 相同方式共享。"
    else:
        lead = t.strip().split('\n', 1)[0]
        summary = first_sents(lead if len(lead) > 30 else t, 200)
        if lang == 'zh':
            kws = jieba.analyse.extract_tags(d['title'] + '。' + t[:3000], topK=8)
        else:
            c = collections.Counter(tokens(t[:4000])); kws = [w for w, _ in c.most_common(8)]
        name = '维基百科中文版' if lang == 'zh' else 'Wikipedia (English)'
        attrib = f"来源：{name}条目《{d['title']}》（维基百科贡献者），许可 CC BY-SA 4.0，原文 {d['url']}。本方案为条目节选整理，按 CC BY-SA 4.0 相同方式共享。"
    if len(summary) < 8: summary = (d['title'] + ' — ' + summary)[:200]
    depth = min(len(t), 12000) / 1000 + struct_count(t) * 0.4
    rows.append({'kb_id': d['kb_id'], 'src': src, 'lang': lang, 'cat': d['cat'], 'title': d['title'][:80], 'summary': summary[:280],
                 'keywords': [k[:40] for k in kws if k][:8], 'url': d['url'], 'shard': d['shard'], 'line': d['line'], 'text': t, 'attrib': attrib, 'depth': depth})
# tiers by depth percentile per source family (40/35/25)
fam = collections.defaultdict(list)
for r in rows: fam[r['src'].split('-')[0] + r['lang']].append(r)
for L in fam.values():
    L.sort(key=lambda r: r['depth'])
    n = len(L)
    for i, r in enumerate(L):
        r['tier'] = 'standard' if i < n * 0.40 else ('detailed' if i < n * 0.75 else 'professional')
BUDGET = {'standard': 600, 'detailed': 1000, 'professional': 1600}
TIER_ZH = {'standard': '标准操作答案', 'detailed': '详细实操方案', 'professional': '专业执行方案'}
for r in rows:
    body = r['text']
    if r['src'].startswith('stackexchange-'):
        body = body.replace('Question: ', '【问题】', 1).replace('Best answer', '【最佳回答】', 1).replace('Another answer', '【补充回答】', 1)
    r['detail'] = (f"【{TIER_ZH[r['tier']]}】{r['title']}\n\n【适用场景】{r['summary']}\n\n【核心内容与执行要点】\n" + clip(body, BUDGET[r['tier']]) +
                   f"\n\n【来源与许可】{r['attrib']}")
# tokens + df
df = collections.Counter()
for r in rows:
    tt = list(dict.fromkeys(tokens(r['title'])))
    kb = tokens(' '.join(r['keywords'])) + tokens(r['summary'])
    body_c = collections.Counter(tokens(r['text'][:5000]))
    r['_tt'] = tt; r['_kb'] = kb; r['_bc'] = body_c
    for w in set(tt) | set(kb) | set(body_c): df[w] += 1
N = len(rows)
idf = {w: math.log(1 + N / c) for w, c in df.items()}
for r in rows:
    body_top = sorted(r['_bc'].items(), key=lambda kv: -kv[1] * idf[kv[0]])[:30]
    tb = list(dict.fromkeys(r['_kb'] + [w for w, _ in body_top]))
    r['toks_t'] = r['_tt'][:30]; r['toks_b'] = [w for w in tb if w not in r['toks_t']][:28]
used = collections.Counter()
for r in rows:
    for w in set(r['toks_t']) | set(r['toks_b']): used[w] += 1
with open(OUT + '/kb_docs.jsonl', 'w', encoding='utf-8') as f:
    for r in rows:
        f.write(json.dumps({k: r[k] for k in ('kb_id', 'src', 'lang', 'cat', 'tier', 'title', 'summary', 'keywords', 'detail', 'url', 'shard', 'line', 'toks_t', 'toks_b')}, ensure_ascii=False) + '\n')
with open(OUT + '/kb_terms.tsv', 'w', encoding='utf-8') as f:
    for w, c in used.items(): f.write(f'{w}\t{c}\n')
tc = collections.Counter(r['tier'] for r in rows); lc = collections.Counter(r['lang'] for r in rows)
print('rows', N, 'terms', len(used), dict(tc), dict(lc))
print('avg detail chars', sum(len(r['detail']) for r in rows) / N, 'bytes', sum(len(r['detail'].encode()) for r in rows))

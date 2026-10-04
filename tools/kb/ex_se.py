import sys, json, re, py7zr, os, tempfile, shutil
from lxml import etree
sys.path.insert(0, '/workspace/kb')
from common import *; from domains import *
site, arc, out = sys.argv[1], sys.argv[2], sys.argv[3]
tmp = tempfile.mkdtemp(dir='/workspace/kbraw')
with py7zr.SevenZipFile(arc, 'r') as z:
    names = [x for x in z.getnames() if x.endswith('Posts.xml')]
    z.extract(path=tmp, targets=names)
posts = os.path.join(tmp, names[0])
qs, ans = {}, {}
for ev, el in etree.iterparse(posts, tag='row'):
    a = el.attrib
    t = a.get('PostTypeId')
    if t == '1':
        sc = int(a.get('Score', '0'))
        if sc >= 1:
            qs[a['Id']] = (a.get('Title', ''), a.get('Body', ''), a.get('Tags', ''), sc, a.get('AcceptedAnswerId'))
    elif t == '2':
        sc = int(a.get('Score', '0'))
        if sc >= 1:
            ans.setdefault(a['ParentId'], []).append((sc, a['Id'], a.get('Body', '')))
    el.clear()
shutil.rmtree(tmp, ignore_errors=True)
kept = 0
with open(out, 'w', encoding='utf-8') as fo:
    for qid, (title, body, tags, sc, acc) in qs.items():
        al = sorted(ans.get(qid, []), key=lambda x: (x[1] != acc, -x[0]))
        if not al: continue
        parts = ['Question: ' + title, html_to_text(body)]
        for i, (s, aid, ab) in enumerate(al[:2]):
            parts.append(('Best answer' if i == 0 else 'Another answer') + f' (score {s}):\n' + html_to_text(ab))
        text = clean_ws(strip_contacts('\n\n'.join(parts)))
        if len(text) < 400 or SPAM.search(text[:2000]): continue
        h = hits_en(title + ' ' + text[:2000] + ' ' + re.sub(r'[<>|]', ' ', tags))
        doc = {'id': sid('se', site, qid), 'src': f'stackexchange-{site}', 'lang': 'en', 'license': 'CC BY-SA 4.0',
               'url': f'https://{site}.stackexchange.com/q/{qid}', 'title': title, 'cat': category(h, True) if h else ('personal_income' if site in ('money','freelancing','workplace','ai','genai') else 'business_help'),
               'tags': (re.findall(r'<([^>]+)>', tags) or [x for x in tags.split('|') if x])[:8], 'text': text}
        fo.write(json.dumps(doc, ensure_ascii=False) + '\n'); kept += 1
print(site, 'questions', len(qs), 'kept', kept, flush=True)

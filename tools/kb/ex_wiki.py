import sys, json, re, pyarrow.parquet as pq, opencc
sys.path.insert(0, '/workspace/kb')
from common import *; from domains import *
lang, files, out = sys.argv[1], sys.argv[2].split(','), sys.argv[3]
cc = opencc.OpenCC('t2s') if lang == 'zh' else None
TAIL = re.compile(r'^(参考文献|参考资料|外部链接|外部連結|延伸阅读|延伸閱讀|参见|參見|参看|注释|註釋|脚注|腳註|相关条目|相關條目|References|External links|See also|Further reading|Notes|Bibliography|Sources|Citations|Footnotes)\s*$', re.M)
BIO_ZH = re.compile(r'（[^）]{0,40}\d{4}年\d{1,2}月\d{1,2}日[^）]{0,40}）|出生于|出生於')
BIO_EN = re.compile(r'\((?:born|b\.)\s|\(\d{1,2} \w+ \d{4}\s*[–-]|\(\w+ \d{1,2}, \d{4}\s*[–-]')
n = kept = 0
with open(out, 'w', encoding='utf-8') as fo:
    for f in files:
        pf = pq.ParquetFile(f)
        for batch in pf.iter_batches(batch_size=2000, columns=['id', 'url', 'title', 'text']):
            for r in batch.to_pylist():
                n += 1
                t = r['text'] or ''
                if len(t) < 800: continue
                m = TAIL.search(t)
                if m: t = t[:m.start()]
                head = (r['title'] or '') + '\n' + t[:3000]
                if lang == 'zh':
                    if BIO_ZH.search(t[:200]): continue
                    h = hits_zh(head); th = hits_zh(r['title'] or '')
                else:
                    if BIO_EN.search(t[:300]): continue
                    h = hits_en(head); th = hits_en(r['title'] or '')
                score = len(h) + 3 * len(th)
                if score < int(__import__('os').environ.get('KB_MIN', 5 if lang == 'en' else 4)): continue
                if SPAM.search(head): continue
                title = r['title']; text = t
                if cc: title = cc.convert(title); text = cc.convert(text)
                text = clean_ws(strip_contacts(text))
                if len(text) < 700: continue
                doc = {'id': sid('wiki', lang, r['id']), 'src': f'wikipedia-{lang}', 'lang': lang, 'license': 'CC BY-SA 4.0',
                       'url': r['url'], 'title': title, 'cat': category(h, lang == 'en'), 'text': text}
                fo.write(json.dumps(doc, ensure_ascii=False) + '\n'); kept += 1
print(out, 'scanned', n, 'kept', kept, flush=True)

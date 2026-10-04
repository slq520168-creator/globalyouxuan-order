import sys, json, re, pyarrow.parquet as pq, opencc
sys.path.insert(0, '/workspace/kb')
from common import *; from domains import *
f, out, part, nparts = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
cc = opencc.OpenCC('t2s')
TITLE_HOW = re.compile(r'怎么|如何|怎样|教程|攻略|指南|技巧|方法|步骤|入门|新手|经验分享|全流程|实操|干货|心得')
STEP = re.compile(r'(?:^|\n)\s*(?:第[一二三四五六七八九十]+[步点条]|[一二三四五六七八九十]+[、.．]|\d{1,2}[、.．)）]|（\d{1,2}）|\(\d{1,2}\)|步骤\s*\d|首先|其次|然后|最后)')
BAD = re.compile(r'娱乐场|娱乐城|彩票|博彩|开户送|加盟费|招商加盟|加盟热线|职位类别|任职要求|岗位职责|薪资面议|作者：|文案：|小说|章节|免责声明|版权所有|备案号|ICP备|上一篇|下一篇|热门推荐|相关阅读|点击查看|阅读全文|扫码|二维码|微信号|公众号|QQ群|代理商|报价|厂家|批发|价格表|现车|优惠\d|万元起|楼盘|售楼|成人|性感|美女|配资|旗舰店|您的位置|谁买过|效果如何|哪个牌子|什么牌子|实体店|专卖店|11选5|快3|时时|发布日期|浏览次数')
seen = set(); n = kept = 0
pf = pq.ParquetFile(f)
cols = [c for c in ('text', 'id', 'url') if c in pf.schema_arrow.names]
with open(out, 'w', encoding='utf-8') as fo:
    for gi in range(pf.num_row_groups):
        if gi % nparts != part: continue
        tb = pf.read_row_group(gi, columns=cols)
        for r in tb.to_pylist():
            n += 1
            t = r['text'] or ''
            if not (900 <= len(t) <= 15000): continue
            lines = [x.strip() for x in t.split('\n') if x.strip()]
            if len(lines) < 5: continue
            title = lines[0]
            if not (6 <= len(title) <= 50) or not TITLE_HOW.search(title): continue
            th = hits_zh(title)
            if not th: continue
            h = hits_zh(t[:5000])
            if len(h) < 3: continue
            if len(STEP.findall(t)) < 3: continue
            if SPAM.search(t) or len(BAD.findall(t)) >= 2 or BAD.search(title): continue
            if zh_ratio(t) < 0.6: continue
            # avg line length guard (lists of links / nav)
            if sum(len(x) for x in lines) / len(lines) < 18: continue
            key = re.sub(r'\W', '', title)[:40] + re.sub(r'\W', '', t[200:400])[:60]
            if key in seen: continue
            seen.add(key)
            t = cc.convert(t)
            text = clean_ws(strip_contacts(t))
            if len(text) < 800: continue
            title = cc.convert(title)
            doc = {'id': sid('fw2', r.get('id') or r.get('url')), 'src': 'fineweb2-cmn', 'lang': 'zh', 'license': 'ODC-By 1.0 (FineWeb-2 dataset); 原文版权归原网站作者',
                   'url': r.get('url'), 'title': title, 'cat': category(h | th), 'text': text}
            fo.write(json.dumps(doc, ensure_ascii=False) + '\n'); kept += 1
print(out, 'scanned', n, 'kept', kept, flush=True)

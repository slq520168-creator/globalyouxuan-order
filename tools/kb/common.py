import re, json, hashlib, html as htmlmod
OFFICIAL = re.compile(r'@qqyousubot|slq520168@gmail\.com', re.I)
CONTACT = [
    re.compile(r'https?://\S+', re.I), re.compile(r'\bwww\.\S+', re.I), re.compile(r'\b(?:t|telegram)\.me/\S*', re.I),
    re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+'), re.compile(r'(?<![\w@])@[A-Za-z0-9_]{3,}'),
    re.compile(r'\bT[1-9A-HJ-NP-Za-km-z]{33}\b'), re.compile(r'\b0x[a-fA-F0-9]{40}\b'), re.compile(r'\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}\b'),
    re.compile(r'(?:微信|威信|薇信|v信|电报|飞机号?|QQ号?|qq群|扣扣)\s*(?:号|id|群)?\s*[:：]?\s*[A-Za-z0-9_.\-]{3,}', re.I),
    re.compile(r'\b(?:vx|wx|wechat|whatsapp|telegram|tg|line|qq|skype|discord)\b\s*(?:id)?\s*[:：]\s*[A-Za-z0-9_.\-]{3,}', re.I),
    re.compile(r'(?:加我|联系我|私聊|私信我|添加客服|扫码)[^。！!\n]{0,30}'),
]
PHONE = re.compile(r'\+?\d[\d\s()-]{6,}\d')
YEARISH = re.compile(r'^\(?\d{3,4}\)?\s*[-–]\s*\(?\d{3,4}\)?$')
def strip_contacts(s):
    """Same anti-scam rules as learn-gap-worker stripContacts (links, TG, wallets, emails, handles, IM ids, phones);
    phone rule ignores year/number ranges such as 2019-2020 so encyclopedic text stays readable."""
    s = OFFICIAL.sub('', s)
    for r in CONTACT:
        s = r.sub('', s)
    def ph(m):
        t = m.group(0)
        digits = re.sub(r'\D', '', t)
        if YEARISH.match(t.strip()) or len(digits) < 8:
            return t
        return ''
    s = PHONE.sub(ph, s)
    return s
SPAM = re.compile(r'博彩|赌场|赌博|彩票|六合彩|百家乐|时时彩|棋牌|娱乐城|真人荷官|色情|裸聊|约炮|成人视频|av女优|代孕|办证|刷单|网赚秒到|日赚\d{3,}|月入[十百千万]{1,2}万|贷款秒批|套现|洗钱|黑卡|跑分|菠菜|USDT\s*兑换|casino|porn|escort|viagra', re.I)
def clean_ws(s):
    s = s.replace('\r', '')
    s = re.sub(r'[ \t\u00a0\u3000]+', ' ', s)
    s = re.sub(r'\n\s*\n\s*\n+', '\n\n', s)
    return s.strip()
def html_to_text(h):
    h = re.sub(r'(?is)<(script|style)[^>]*>.*?</\1>', ' ', h or '')
    h = re.sub(r'(?i)<br\s*/?>', '\n', h)
    h = re.sub(r'(?i)</(p|div|li|h[1-6]|pre|blockquote|tr)>', '\n', h)
    h = re.sub(r'(?i)<li[^>]*>', '\n- ', h)
    h = re.sub(r'(?i)<h[1-6][^>]*>', '\n## ', h)
    h = re.sub(r'<[^>]+>', ' ', h)
    return clean_ws(htmlmod.unescape(h))
def sid(*parts):
    return hashlib.sha1('|'.join(map(str, parts)).encode()).hexdigest()[:16]
CJK = re.compile(r'[\u3400-\u9fff]')
def zh_ratio(s):
    s = s[:3000]
    return len(CJK.findall(s)) / max(1, len(s))

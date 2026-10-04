import re
CJK = re.compile(r'[\u4e00-\u9fff]+')
LAT = re.compile(r'[a-z0-9][a-z0-9+#]*')
ZH_STOP = set('怎么 如何 什么 可以 我们 一个 这个 那个 没有 自己 需要 进行 问题 他们 你们 就是 因为 所以 但是 如果 还是 或者 以及 这些 那些 其中 通过 由于 对于 关于 已经 不是 也是 都是 一些 时候 现在 应该 能够 怎样 为什么 吗 的 了 是 在 和 有 我 你 他 她 它 这 那 就 都 也 要 会 能 让 把 被 给 从 到 对 为 与 及 或 而 但 并 等'.split())
EN_STOP = set('a an the and or but if then else of to in on at by for with from as is are was were be been being it its this that these those i you he she we they my your our their me him her us them do does did doing have has had having not no can could should would will shall may might must about into over under than too very just also so such what which who whom whose when where why how all any both each few more most other some only own same s t don now get got use using used one two way ways make made like want need help question answer best another score www com http https'.split())
def stem(w):
    if len(w) > 4 and w.endswith('ies'): return w[:-3] + 'y'
    if len(w) > 3 and w.endswith('s') and not w.endswith('ss'): return w[:-1]
    return w
def tokens(s):
    """Same algorithm as SQL public.kb_tokens(): CJK bigrams (+single char runs of len1 skipped) and latin words."""
    s = (s or '').lower()
    out = []
    for run in CJK.findall(s):
        if len(run) == 1: continue
        for i in range(len(run) - 1):
            b = run[i:i+2]
            if b not in ZH_STOP: out.append(b)
    for w in LAT.findall(s):
        if len(w) < 2 or w in EN_STOP or w.isdigit(): continue
        out.append(stem(w)[:24])
    return out

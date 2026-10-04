import re
CATS = {
 'content_monetization': ['自媒体','短视频','抖音','快手','小红书','哔哩哔哩','视频号','直播','网红','博主','主播','内容创作','剪辑','视频编辑','播客','YouTube','TikTok','公众号','知识付费','带货','文案','AI绘画','AI视频','生成式','文生图','配音','摄影','平面设计','社交媒体','网络营销','粉丝','流量','短剧','vlog','Vlog','直播电商'],
 'business_help': ['电子商务','电商','跨境','淘宝','天猫','京东','拼多多','亚马逊','速卖通','Shopee','Lazada','独立站','Shopify','零售','批发','供应链','物流','仓储','开店','加盟','连锁','餐饮','外卖','实体店','门店','中小企业','小微企业','个体工商户','营销','广告','品牌','市场营销','搜索引擎优化','客户关系','商业模式','创业','企业管理','移动支付','收银','会计','税务','报关','进出口','外贸','私域','引流','获客','转化率','选品','招商','促销','会员制'],
 'personal_income': ['副业','兼职','自由职业','零工','理财','投资','储蓄','被动收入','远程工作','远程办公','在线教育','求职','简历','面试','职场','考证','人工智能','ChatGPT','大语言模型','聊天机器人','机器学习','办公软件','Excel','编程','网站建设','小程序','低代码','自动化','提示词','AI工具','赚钱','变现','收入'],
}
CATS_EN = {
 'content_monetization': ['content creator','influencer','youtube','tiktok','instagram','podcast','video editing','social media marketing','livestream','live streaming','streamer','monetization','affiliate marketing','copywriting','graphic design','photography','generative ai','text-to-image','text-to-video','creator economy','digital media','blogging','newsletter','vlog'],
 'business_help': ['e-commerce','ecommerce','online marketplace','online shopping','dropshipping','retail','wholesale','supply chain','logistics','small business','entrepreneur','startup','franchise','restaurant','marketing','advertising','brand','search engine optimization','customer relationship','business model','payment system','mobile payment','point of sale','accounting','import','export','cross-border','amazon','shopify','alibaba','etsy','ebay','lead generation','conversion rate','sales funnel','pricing strategy','customer acquisition','inventory'],
 'personal_income': ['side hustle','freelance','freelancing','gig economy','gig worker','personal finance','passive income','remote work','telecommuting','online education','resume','job interview','career','artificial intelligence','chatbot','large language model','machine learning','automation','no-code','low-code','spreadsheet','productivity software','prompt engineering','web development','budget','saving','investing','income'],
}
ZH_KW = sorted({k for v in CATS.values() for k in v}, key=len, reverse=True)
EN_KW = sorted({k for v in CATS_EN.values() for k in v}, key=len, reverse=True)
ZH_RE = re.compile('|'.join(map(re.escape, ZH_KW)))
EN_RE = re.compile(r'\b(?:' + '|'.join(map(re.escape, EN_KW)) + r')\b', re.I)
HOWTO_ZH = re.compile(r'怎么|如何|步骤|方法|教程|技巧|攻略|指南|经验|注意事项|第[一二三四五六七八九十]步|首先|其次|最后')
def hits_zh(text):
    return {m.group(0) for m in ZH_RE.finditer(text)}
def hits_en(text):
    return {m.group(0).lower() for m in EN_RE.finditer(text)}
def category(hits, en=False):
    cats = CATS_EN if en else CATS
    best, bs = 'business_help', -1
    for c, kws in cats.items():
        s = sum(1 for k in kws if (k.lower() if en else k) in hits)
        if s > bs: best, bs = c, s
    return best

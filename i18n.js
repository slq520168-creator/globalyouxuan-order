(() => {
  'use strict';
  // Compatibility layer only: one canonical Chinese source vocabulary.
  // global-locale.js remains the single renderer/translator for every target language.
  const VALID = new Set(['zh-CN', 'en', 'km']);
  const SOURCE = {
    logout:'退出登录', memberId:'会员编号', joinedAt:'注册时间', profileTitle:'会员资料', phone:'电话', profileLanguage:'默认语言', saveProfile:'保存会员资料',
    favoritesTitle:'我的收藏', ordersTitle:'我的订单', materialsTitle:'我的资料', loading:'正在读取数据库…', noFavorites:'暂无收藏', navShop:'智能匹配',
    orderFavorite:'下单', removeFavorite:'取消收藏', confirmRemoveFavorite:'确定取消收藏吗？', errorName:'请输入账号ID或名称', errorPhone:'请输入有效联系电话', saving:'正在保存…', saved:'会员资料已保存',
    pending:'待付款', checking:'核验中', paid:'已付款', delivered:'已完成', expired:'已失效', failed:'失败', cancelled:'已取消', status:'状态', noOrders:'暂无订单',
    amount:'金额', network:'网络', createdAt:'创建时间', wallet:'收款地址', txidPlaceholder:'粘贴交易哈希 TXID', verifyTxid:'核验付款', checkingPayment:'正在核验…',
    viewPurchasedAnswer:'查看交付内容', copyAnswer:'复制内容', copied:'已复制', loadingAnswer:'正在读取交付内容…', answerReady:'交付内容', download:'下载',
    errorTxid:'请输入有效的64位交易哈希 TXID', errorAuth:'登录状态已失效，请重新登录', errorPaymentMismatch:'付款信息不匹配，请检查后重试', errorTxidUsed:'该交易哈希已被使用', errorNetwork:'网络连接失败，请稍后重试', errorGeneric:'操作失败，请稍后重试',
    refresh:'刷新', all:'全部', pendingPayment:'待付款', verifying:'核验中', completed:'已完成',
    edit:'编辑', delete:'删除', save:'保存', cancel:'取消', add:'新增', search:'搜索', close:'关闭', back:'返回', home:'首页', member:'会员', orders:'订单', favorites:'收藏'
  };
  const getLocale = () => {
    try {
      const value = localStorage.getItem('gyx_locale');
      return VALID.has(value) ? value : 'zh-CN';
    } catch { return 'zh-CN'; }
  };
  function interpolate(text, vars) {
    if (!vars || typeof vars !== 'object' || Array.isArray(vars)) return text;
    return String(text).replace(/\{(\w+)\}/g, (_, k) => vars[k] == null ? `{${k}}` : String(vars[k]));
  }
  window.GYXI18N = {
    get locale() { return window.GYXLocale?.get?.() || getLocale(); },
    setLanguage(locale) { if (VALID.has(locale)) window.GYXLocale?.set?.(locale); },
    t(key, varsOrFallback = '') {
      const source = SOURCE[key];
      if (source) return interpolate(source, varsOrFallback);
      // Never stringify an interpolation object as "[object Object]".
      if (typeof varsOrFallback === 'string' && varsOrFallback) return varsOrFallback;
      return String(key || '');
    },
    apply() { window.GYXLocale?.apply?.(); }
  };
})();

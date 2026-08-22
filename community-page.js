(() => {
  'use strict';

  const I = window.GYXI18N;
  const lang = I.locale;
  const db = () => window.gyxSupabase;
  const REFRESH_MS = 60 * 1000;
  const MAX_AGE_MS = 36 * 60 * 60 * 1000;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
  const bjDate = () => new Intl.DateTimeFormat(
    lang === 'zh' ? 'zh-CN' : lang === 'km' ? 'km-KH' : 'en-US',
    { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric' },
  ).format(new Date());

  let me = null;
  let rows = [];
  let titles = {};
  let active = 'A';
  let redeemItem = null;
  let refreshPromise = null;
  let tickerIndex = 0;

  const userPromise = (async () => {
    try {
      me = await window.gyxGetVerifiedUser?.() || null;
    } catch {
      me = null;
    }
    return me;
  })();

  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
  document.title = I.t('communityTitle') + ' · GlobalYouXuan';
  I.render(document);
  document.getElementById('todayDate').textContent = bjDate();

  function cleanTitle(value) {
    return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function hasHan(value) {
    return /[\u3400-\u9fff]/.test(value || '');
  }

  function hasKm(value) {
    return /[\u1780-\u17ff]/.test(value || '');
  }

  function localeReady(value) {
    return lang === 'km' ? hasKm(value) : hasHan(value);
  }

  function opportunityTitle(item) {
    const fallback = I.t('communityOpportunityFallback');
    const raw = cleanTitle(item?.title);
    if (lang === 'en') return raw || fallback;
    const key = 'communityOpportunity.' + String(item?.id || '') + '.title';
    const translated = I.t(key);
    if (translated && translated !== key && translated !== fallback) return translated;
    const cached = cleanTitle(titles[item?.id]);
    if (cached) return cached;
    if (localeReady(raw)) return raw;
    return raw || fallback;
  }

  function row(item) {
    const code = (item.batch_code || 'A') + String(item.opportunity_no || 0);
    const title = opportunityTitle(item);
    return `<article class="row"><span class="num">${esc(code)}</span><div class="title" title="${esc(title)}">${esc(title)}</div><button class="take" data-take="${item.id}">${esc(I.t('communityTake'))}</button></article>`;
  }

  function render() {
    const list = rows
      .filter((item) => item.batch_code === active)
      .sort((a, b) => (a.opportunity_no || 0) - (b.opportunity_no || 0));
    document.getElementById('feedList').innerHTML = list.length
      ? list.map(row).join('')
      : `<div class="empty">${esc(I.t('communityBatchLoading').replace('{{batch}}', active))}</div>`;
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.batch === active);
    });
  }

  function renderTicker() {
    const box = document.getElementById('tickerTrack');
    tickerIndex = 0;
    box.style.transition = 'none';
    box.style.transform = 'translateY(0)';
    if (!rows.length) {
      box.innerHTML = `<div class="empty">${esc(I.t('communityLoading'))}</div>`;
      return;
    }
    const list = [...rows, ...rows.slice(0, Math.min(5, rows.length))];
    box.innerHTML = list.map((item) => `<div class="tick"><i></i><b>${esc((item.batch_code || 'A') + String(item.opportunity_no || 0))} · ${esc(opportunityTitle(item))}</b></div>`).join('');
  }

  function advanceTicker() {
    const box = document.getElementById('tickerTrack');
    if (!box || rows.length < 2 || document.hidden) return;
    tickerIndex += 1;
    box.style.transition = 'transform .4s ease';
    box.style.transform = `translateY(${-tickerIndex * 25}px)`;
    if (tickerIndex >= rows.length) {
      setTimeout(() => {
        tickerIndex = 0;
        box.style.transition = 'none';
        box.style.transform = 'translateY(0)';
      }, 420);
    }
  }

  function applyStats(stats) {
    const value = stats || {};
    document.getElementById('publishedCount').textContent = value.today_published || 0;
    document.getElementById('takenCount').textContent = value.today_taken || 0;
    document.getElementById('remainingCount').textContent = value.remaining || 0;
    document.getElementById('cumulativeCount').textContent = value.cumulative_taken || 0;
  }

  async function loadTranslations(ids) {
    if (!me || lang === 'en' || !ids.length) return;
    const cacheLang = lang === 'km' ? 'km' : 'zh';
    try {
      const { data } = await db()
        .from('community_opportunity_translation_cache')
        .select('opportunity_id,title')
        .eq('lang', cacheLang)
        .in('opportunity_id', ids);
      (data || []).forEach((item) => {
        if (item?.opportunity_id && item.title) titles[item.opportunity_id] = item.title;
      });
      render();
      renderTicker();
    } catch {}
  }

  async function ensureCache() {
    if (!me || lang === 'en') return;
    const missing = rows.some((item) => item.id && !titles[item.id] && !localeReady(cleanTitle(item.title)));
    if (!missing) return;
    try {
      await window.gyxInvokeFunction('community-opportunity-translate', {});
    } catch {}
    await loadTranslations(rows.map((item) => item.id).filter(Boolean));
  }

  async function doRefresh() {
    const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString();
    const feedPromise = db()
      .from('community_external_feed')
      .select('id,title,body,source_url,batch_code,opportunity_no,batch_key,opportunity_status')
      .eq('opportunity_status', 'open')
      .is('claimed_by', null)
      .gte('created_at', cutoff)
      .order('batch_code', { ascending: true })
      .order('opportunity_no', { ascending: true })
      .limit(40);
    const statsPromise = db()
      .rpc('community_opportunity_public_stats_v3')
      .then((result) => result?.data?.[0] || {})
      .catch(() => ({}));
    const [{ data, error }, stats] = await Promise.all([feedPromise, statsPromise]);
    if (error) {
      if (!rows.length) {
        document.getElementById('feedList').innerHTML = `<div class="empty">${esc(I.t('communityFailed'))}</div>`;
      }
      return;
    }
    rows = data || [];
    if (!rows.some((item) => item.batch_code === active)) {
      active = rows.some((item) => item.batch_code === 'A') ? 'A' : 'B';
    }
    applyStats(stats);
    render();
    renderTicker();
    const ids = rows.map((item) => item.id).filter(Boolean);
    userPromise.then((user) => {
      if (!user) return;
      loadTranslations(ids).catch(() => {});
      ensureCache().catch(() => {});
    }).catch(() => {});
  }

  function refreshFeed() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = doRefresh()
      .catch(() => {})
      .finally(() => {
        refreshPromise = null;
      });
    return refreshPromise;
  }

  function authUrl() {
    if (typeof window.gyxAuthEntryUrl === 'function') return window.gyxAuthEntryUrl('community.html');
    let known = false;
    try {
      known = localStorage.getItem('gyx_known_member') === '1';
    } catch {}
    return `login.html?mode=${known ? 'login' : 'register'}&next=${encodeURIComponent('community.html')}`;
  }

  function closeRedeem() {
    document.getElementById('redeemMask').hidden = true;
    redeemItem = null;
  }

  function successRedeem(text) {
    document.getElementById('redeemBody').innerHTML = `<p class="redeem-success">${esc(text)}</p>`;
    document.getElementById('redeemActions').innerHTML = `<button class="redeem-cancel" type="button" data-close-redeem>${esc(I.t('communityCancel'))}</button><a class="redeem-downloads" href="member.html#downloads">${esc(I.t('communityDownloads'))}</a>`;
  }

  async function openRedeem(item) {
    await userPromise;
    if (!me) {
      location.href = authUrl();
      return;
    }
    redeemItem = item;
    const mask = document.getElementById('redeemMask');
    const body = document.getElementById('redeemBody');
    const actions = document.getElementById('redeemActions');
    mask.hidden = false;
    body.innerHTML = '<p class="redeem-note">…</p>';
    actions.innerHTML = '';
    const { data: account } = await db()
      .from('member_point_accounts')
      .select('balance')
      .eq('user_id', me.id)
      .maybeSingle();
    const balance = Number(account?.balance || 0);
    const short = Math.max(0, 2000 - balance);
    body.innerHTML = `<div class="redeem-cost">2000</div><p>${esc(opportunityTitle(item))}</p><p class="redeem-note">${esc(I.t('communityCurrentBalance', { balance }))}</p>${short ? `<p class="redeem-short">${esc(I.t('communityShort', { n: String(short) }))}</p>` : ''}`;
    actions.innerHTML = `<button class="redeem-cancel" type="button" data-close-redeem>${esc(I.t('communityCancel'))}</button><button class="redeem-confirm" type="button" data-confirm-redeem${short ? ' disabled' : ''}>${esc(I.t('communityConfirm'))}</button>`;
  }

  async function redeem() {
    if (!redeemItem) return;
    const button = document.querySelector('[data-confirm-redeem]');
    if (button) {
      button.disabled = true;
      button.textContent = I.t('communityWorking');
    }
    const { data, error } = await db().rpc('gyx_redeem_community_opportunity', {
      p_opportunity_id: redeemItem.id,
    });
    if (error) {
      const message = String(error.message || '');
      if (message.includes('INSUFFICIENT_POINTS:')) {
        const needed = message.split('INSUFFICIENT_POINTS:')[1]?.match(/\d+/)?.[0] || '';
        document.getElementById('redeemBody').innerHTML = `<p class="redeem-short">${esc(I.t('communityShort', { n: needed }))}</p>`;
        return;
      }
      if (message.includes('ALREADY_REDEEMED')) {
        successRedeem(I.t('communityAlready'));
        return;
      }
      successRedeem(I.t('communityUnavailable'));
      return;
    }
    successRedeem(I.t('communitySuccess'));
    await refreshFeed();
    window.dispatchEvent(new CustomEvent('gyx:orders-changed', {
      detail: { source: 'community-opportunity-redemption', redemption: data?.[0] || null },
    }));
  }

  document.addEventListener('click', (event) => {
    const tab = event.target.closest?.('[data-batch]');
    if (tab) {
      active = tab.dataset.batch;
      render();
      return;
    }
    const take = event.target.closest?.('[data-take]');
    if (take) {
      const item = rows.find((value) => value.id === take.dataset.take);
      if (item) openRedeem(item);
      return;
    }
    if (event.target.closest?.('[data-close-redeem]')) {
      closeRedeem();
      return;
    }
    if (event.target.closest?.('[data-confirm-redeem]')) redeem();
  }, true);

  document.getElementById('redeemMask').addEventListener('click', (event) => {
    if (event.target.id === 'redeemMask') closeRedeem();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshFeed();
  });
  window.addEventListener('online', refreshFeed, { passive: true });

  setInterval(advanceTicker, 2600);
  setInterval(refreshFeed, REFRESH_MS);
  refreshFeed();
})();

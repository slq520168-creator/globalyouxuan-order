(() => {
  'use strict';

  const db = window.gyxSupabase;
  const i18n = window.GYXI18N;
  if (!db || !i18n) return;

  const $ = (id) => document.getElementById(id);
  const t = (key, vars) => i18n.t(key, vars);
  let user = null;
  let profile = null;
  let favorites = [];
  let favoriteAnswers = new Map();
  let orders = [];
  let orderFilter = 'all';
  let materials = [];
  let editingMaterialId = null;

  function showMessage(id, message, kind = 'error') {
    const element = $(id);
    element.textContent = message;
    element.className = `form-message show ${kind}`;
  }

  function clearMessage(id) {
    const element = $(id);
    element.textContent = '';
    element.className = 'form-message';
  }

  function showToast(message, isError = false) {
    const toast = $('toast');
    toast.textContent = message;
    toast.className = `toast show${isError ? ' error' : ''}`;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.className = 'toast'; }, 3800);
  }

  function formatDate(value) {
    if (!value) return '—';
    const locale = i18n.locale === 'zh-CN' ? 'zh-CN' : i18n.locale === 'km' ? 'km-KH' : 'en-US';
    try {
      return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
    } catch {
      return String(value);
    }
  }

  function formatPrice(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) : String(value || '0.00');
  }

  function initials(value) {
    const clean = String(value || 'GY').trim();
    return (clean.slice(0, 2) || 'GY').toUpperCase();
  }

  function errorText(error) {
    const code = String(error?.code || error?.message || '').toUpperCase();
    if (code.includes('AUTH') || code.includes('SESSION') || code.includes('JWT')) return t('errorAuth');
    if (code.includes('PAYMENT_DETAILS_MISMATCH')) return t('errorPaymentMismatch');
    if (code.includes('TXID_ALREADY') || code.includes('DIFFERENT_TXID')) return t('errorTxidUsed');
    if (code.includes('FETCH') || code.includes('NETWORK')) return t('errorNetwork');
    return t('errorGeneric');
  }

  async function requireUser() {
    user = await window.gyxGetVerifiedUser();
    if (!user) {
      // 保留目标 hash（收藏/订单），登录后自动回到对应位置
      const target = 'member.html' + (location.hash || '');
      location.replace(`login.html?next=${encodeURIComponent(target)}`);
      return false;
    }
    return true;
  }

  async function loadProfile() {
    const { data, error } = await db
      .from('profiles')
      .select('user_id,display_name,phone,locale,created_at,updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      showMessage('profileMessage', errorText(error));
      return;
    }
    profile = data || { user_id: user.id, display_name: '', phone: '', locale: i18n.locale, created_at: user.created_at };
    if (profile.locale && profile.locale !== i18n.locale) i18n.setLanguage(profile.locale);
    renderProfile();
  }

  function renderProfile() {
    const name = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Member';
    $('profileAvatar').textContent = initials(name);
    $('profileHeading').textContent = name;
    $('profileEmail').textContent = user?.email || '—';
    $('profileUserId').textContent = user?.id || '—';
    $('profileJoinedAt').textContent = formatDate(profile?.created_at || user?.created_at);
    $('profileName').value = profile?.display_name || '';
    $('profilePhone').value = profile?.phone || '';
    $('profileLocale').value = profile?.locale || i18n.locale;
  }

  async function loadFavorites() {
    clearMessage('favoritesMessage');
    const list = $('favoriteList');
    list.replaceChildren();
    const loading = document.createElement('div');
    loading.className = 'loading-card';
    loading.textContent = t('loading');
    list.appendChild(loading);

    const { data, error } = await db
      .from('answer_favorites')
      .select('id,user_id,answer_id,question,selections,tier,product_id,quoted_price,matched_title,matched_summary,created_at,updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) {
      showMessage('favoritesMessage', errorText(error));
      list.replaceChildren();
      return;
    }
    favorites = data || [];
    favoriteAnswers = new Map();
    const answerIds = [...new Set(favorites.map((item) => item.answer_id).filter(Boolean))];
    if (answerIds.length) {
      const answerResult = await db
        .from('product_answer_options')
        .select('id,title,title_en,title_km,answer_summary,answer_summary_en,answer_summary_km')
        .in('id', answerIds);
      (answerResult.data || []).forEach((answer) => favoriteAnswers.set(Number(answer.id), answer));
    }
    renderFavorites();
  }

  function localizedFavoriteTitle(item) {
    const answer = favoriteAnswers.get(Number(item.answer_id));
    if (i18n.locale === 'en') return answer?.title_en || answer?.title || item.matched_title;
    if (i18n.locale === 'km') return answer?.title_km || answer?.title || item.matched_title;
    return answer?.title || item.matched_title;
  }

  function localizedFavoriteSummary(item) {
    const answer = favoriteAnswers.get(Number(item.answer_id));
    if (i18n.locale === 'en') return answer?.answer_summary_en || answer?.answer_summary || item.matched_summary;
    if (i18n.locale === 'km') return answer?.answer_summary_km || answer?.answer_summary || item.matched_summary;
    return answer?.answer_summary || item.matched_summary;
  }

  function renderFavorites() {
    const list = $('favoriteList');
    list.replaceChildren();
    if (!favorites.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = t('noFavorites');
      const link = document.createElement('a');
      link.className = 'btn btn-small';
      link.href = 'shop.html';
      link.textContent = t('navShop');
      empty.append(document.createElement('br'), document.createElement('br'), link);
      list.appendChild(empty);
      return;
    }

    favorites.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'favorite-card';
      const top = document.createElement('div');
      top.className = 'favorite-card-top';
      const heading = document.createElement('h3');
      heading.textContent = localizedFavoriteTitle(item);
      const price = document.createElement('strong');
      price.className = 'favorite-price';
      price.textContent = formatPrice(item.quoted_price) + ' USDT';
      top.append(heading, price);

      const summary = document.createElement('p');
      summary.className = 'material-preview';
      summary.textContent = localizedFavoriteSummary(item);
      const question = document.createElement('p');
      question.className = 'favorite-question';
      question.textContent = '“' + item.question + '”';

      const choices = document.createElement('div');
      choices.className = 'favorite-choices';
      (Array.isArray(item.selections) ? item.selections : []).forEach((selection) => {
        const chip = document.createElement('span');
        chip.textContent = selection;
        choices.appendChild(chip);
      });

      const actions = document.createElement('div');
      actions.className = 'material-actions';
      const order = document.createElement('a');
      order.className = 'btn btn-small';
      order.href = 'shop.html?favorite=' + encodeURIComponent(item.id) + '&resume=order';
      order.textContent = t('orderFavorite');
      const remove = document.createElement('button');
      remove.className = 'btn btn-danger btn-small';
      remove.type = 'button';
      remove.textContent = t('removeFavorite');
      remove.addEventListener('click', () => deleteFavorite(item.id));
      actions.append(order, remove);
      card.append(top, summary, question, choices, actions);
      list.appendChild(card);
    });
  }

  async function deleteFavorite(id) {
    if (!window.confirm(t('confirmRemoveFavorite'))) return;
    const { error } = await db
      .from('answer_favorites')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      showMessage('favoritesMessage', errorText(error));
      return;
    }
    favorites = favorites.filter((item) => item.id !== id);
    renderFavorites();
  }

  async function saveProfile(event) {
    event.preventDefault();
    clearMessage('profileMessage');
    const displayName = $('profileName').value.trim();
    const phone = $('profilePhone').value.trim();
    const locale = $('profileLocale').value;
    if (!displayName) {
      showMessage('profileMessage', t('errorName'));
      return;
    }
    if (phone && phone.length < 6) {
      showMessage('profileMessage', t('errorPhone'));
      return;
    }
    const button = $('saveProfileButton');
    button.disabled = true;
    button.textContent = t('saving');
    const { data, error } = await db
      .from('profiles')
      .update({ display_name: displayName, phone: phone || null, locale })
      .eq('user_id', user.id)
      .select('user_id,display_name,phone,locale,created_at,updated_at')
      .single();
    button.disabled = false;
    button.textContent = t('saveProfile');
    if (error) {
      showMessage('profileMessage', errorText(error));
      return;
    }
    profile = data;
    i18n.setLanguage(locale);
    renderProfile();
    showMessage('profileMessage', t('saved'), 'success');
  }

  async function loadOrders() {
    clearMessage('ordersMessage');
    const list = $('orderList');
    list.replaceChildren();
    const loading = document.createElement('div');
    loading.className = 'loading-card';
    loading.textContent = t('loading');
    list.appendChild(loading);

    const { data, error } = await db
      .from('orders')
      .select('id,order_no,product_id,product_name,product_price,payable_amount,currency,network,wallet_address,status,txid,answer_id,customer_question,answer_tier,matched_answer_title,created_at,updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      showMessage('ordersMessage', errorText(error));
      list.replaceChildren();
      return;
    }
    orders = data || [];
    renderOrders();
    renderDownloads();
  }

  function statusLabel(status) {
    const valid = new Set(['pending', 'checking', 'paid', 'delivered', 'expired', 'failed', 'cancelled']);
    return t(valid.has(status) ? status : 'status');
  }

  function effectiveStatus(order) {
    // 前端展示：待付款超过 24 小时视为已失效
    if (order.status === 'pending' && order.created_at) {
      const created = new Date(order.created_at).getTime();
      if (Number.isFinite(created) && Date.now() - created > 24 * 60 * 60 * 1000) {
        return 'expired';
      }
    }
    if (order.status === 'delivered') return 'delivered';
    return order.status;
  }

  function filteredOrders() {
    return orders.filter((order) => {
      const st = effectiveStatus(order);
      if (orderFilter === 'all') return true;
      if (orderFilter === 'paid') return st === 'paid' || st === 'delivered';
      if (orderFilter === 'delivered') return st === 'delivered' || st === 'paid';
      return st === orderFilter;
    });
  }


  function renderDownloads() {
    const list = $('downloadList');
    if (!list) return;
    list.replaceChildren();
    const items = orders.filter((o) => ['paid', 'delivered'].includes(effectiveStatus(o)));
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '暂无可下载内容';
      list.appendChild(empty);
      return;
    }
    items.forEach((order) => {
      const card = document.createElement('article');
      card.className = 'order-card';
      const title = document.createElement('h3');
      title.className = 'order-title';
      title.textContent = order.matched_answer_title || order.product_name || order.product_id;
      const meta = document.createElement('p');
      meta.className = 'order-number';
      meta.textContent = (order.order_no || '') + ' · ' + formatDate(order.updated_at || order.created_at);
      const badge = document.createElement('span');
      badge.className = 'status-badge ' + effectiveStatus(order);
      badge.textContent = statusLabel(effectiveStatus(order));
      const top = document.createElement('div');
      top.className = 'order-top';
      const wrap = document.createElement('div');
      wrap.append(title, meta);
      top.append(wrap, badge);
      card.appendChild(top);
      if (order.answer_id) {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.type = 'button';
        btn.textContent = t('viewPurchasedAnswer') || '查看交付内容';
        const box = document.createElement('div');
        box.className = 'purchased-answer hidden';
        const pre = document.createElement('pre');
        box.appendChild(pre);
        btn.addEventListener('click', () => loadPurchasedAnswer(order, btn, box, pre));
        card.append(btn, box);
      } else {
        const tip = document.createElement('p');
        tip.className = 'muted';
        tip.textContent = '该订单暂无在线文案，请联系客服领取。';
        card.appendChild(tip);
      }
      list.appendChild(card);
    });
  }

  function renderOrders() {
    const list = $('orderList');
    list.replaceChildren();
    const view = filteredOrders();
    if (!view.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = orders.length ? '该分类下暂无订单' : t('noOrders');
      list.appendChild(empty);
      renderDownloads();
      return;
    }

    view.forEach((order) => {
      const displayStatus = effectiveStatus(order);
      const card = document.createElement('article');
      card.className = 'order-card';
      const top = document.createElement('div');
      top.className = 'order-top';
      const titleWrap = document.createElement('div');
      const title = document.createElement('h3');
      title.className = 'order-title';
      title.textContent = order.matched_answer_title || order.product_name || order.product_id;
      const number = document.createElement('p');
      number.className = 'order-number';
      number.textContent = order.order_no;
      titleWrap.append(title, number);
      const badge = document.createElement('span');
      badge.className = `status-badge ${displayStatus}`;
      badge.textContent = statusLabel(displayStatus);
      top.append(titleWrap, badge);

      const info = document.createElement('div');
      info.className = 'order-info';
      [
        [t('amount'), `${formatPrice(order.payable_amount)} ${order.currency || 'USDT'}`],
        [t('network'), order.network || 'USDT-TRC20'],
        [t('createdAt'), formatDate(order.created_at)]
      ].forEach(([label, value]) => {
        const box = document.createElement('div');
        const labelEl = document.createElement('span');
        labelEl.textContent = label;
        const valueEl = document.createElement('strong');
        valueEl.textContent = value;
        box.append(labelEl, valueEl);
        info.appendChild(box);
      });
      card.append(top, info);

      if (order.customer_question) {
        const question = document.createElement('p');
        question.className = 'favorite-question';
        question.textContent = '“' + order.customer_question + '”';
        card.appendChild(question);
      }

      if (['pending', 'checking'].includes(displayStatus)) {
        const wallet = document.createElement('p');
        wallet.className = 'order-number';
        wallet.textContent = `${t('wallet')}: ${order.wallet_address || window.GYX_CONFIG.wallet}`;
        card.appendChild(wallet);

        const row = document.createElement('div');
        row.className = 'txid-row';
        const input = document.createElement('input');
        input.className = 'field';
        input.type = 'text';
        input.maxLength = 64;
        input.autocapitalize = 'characters';
        input.placeholder = t('txidPlaceholder');
        input.value = order.txid || '';
        input.dataset.orderTxid = String(order.id);
        const verify = document.createElement('button');
        verify.className = 'btn';
        verify.type = 'button';
        verify.textContent = t('verifyTxid');
        verify.addEventListener('click', () => verifyOrderPayment(order, input, verify));
        row.append(input, verify);
        card.appendChild(row);
      }

      if (order.answer_id && ['paid', 'delivered'].includes(displayStatus)) {
        const answerActions = document.createElement('div');
        answerActions.className = 'order-actions';
        const viewAnswer = document.createElement('button');
        viewAnswer.className = 'btn';
        viewAnswer.type = 'button';
        viewAnswer.textContent = t('viewPurchasedAnswer');
        const answerBox = document.createElement('div');
        answerBox.className = 'purchased-answer hidden';
        const answerText = document.createElement('pre');
        const copyAnswer = document.createElement('button');
        copyAnswer.className = 'btn btn-secondary btn-small';
        copyAnswer.type = 'button';
        copyAnswer.textContent = t('copyAnswer');
        copyAnswer.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(answerText.textContent || '');
            showToast(t('copied'));
          } catch {
            showToast(answerText.textContent || '');
          }
        });
        answerBox.append(answerText, copyAnswer);
        viewAnswer.addEventListener('click', () => loadPurchasedAnswer(order, viewAnswer, answerBox, answerText));
        answerActions.appendChild(viewAnswer);
        card.append(answerActions, answerBox);
      }

      if (displayStatus === 'delivered' && !order.answer_id) {
        const actions = document.createElement('div');
        actions.className = 'order-actions';
        const download = document.createElement('button');
        download.className = 'btn';
        download.type = 'button';
        download.textContent = t('download');
        download.addEventListener('click', () => downloadOrder(order, download));
        actions.appendChild(download);
        card.appendChild(actions);
      }
      list.appendChild(card);
    });
  }

  async function loadPurchasedAnswer(order, button, box, text) {
    button.disabled = true;
    button.textContent = t('loadingAnswer');
    try {
      const result = await window.gyxInvokeFunction('get-purchased-answer', {
        order_id: order.id,
        locale: i18n.locale
      });
      if (!result?.answer?.content) throw new Error('PURCHASED_ANSWER_MISSING');
      text.textContent = result.answer.content;
      box.classList.remove('hidden');
      button.textContent = t('answerReady');
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      showMessage('ordersMessage', errorText(error));
      button.textContent = t('viewPurchasedAnswer');
    } finally {
      button.disabled = false;
    }
  }

  async function verifyOrderPayment(order, input, button) {
    const txid = input.value.trim().toUpperCase();
    if (!/^[0-9A-F]{64}$/.test(txid)) {
      showMessage('ordersMessage', t('errorTxid'));
      return;
    }
    clearMessage('ordersMessage');
    button.disabled = true;
    button.textContent = t('checkingPayment');
    try {
      const result = await window.gyxInvokeFunction('submit-payment', {
        order_id: order.id,
        order_no: order.order_no,
        txid
      });
      showMessage('ordersMessage', ['paid', 'delivered'].includes(result?.status) ? t('paymentSuccess') : t('paymentPending'), 'success');
      await loadOrders();
    } catch (error) {
      showMessage('ordersMessage', errorText(error));
    } finally {
      button.disabled = false;
      button.textContent = t('verifyTxid');
    }
  }

  async function downloadOrder(order, button) {
    button.disabled = true;
    button.textContent = t('downloading');
    try {
      const result = await window.gyxInvokeFunction('download-order', { order_id: order.id });
      if (!result?.signed_url) throw new Error('DOWNLOAD_URL_MISSING');
      window.location.assign(result.signed_url);
    } catch (error) {
      showMessage('ordersMessage', errorText(error));
      button.disabled = false;
      button.textContent = t('download');
    }
  }

  async function loadMaterials() {
    const { data, error } = await db
      .from('member_materials')
      .select('id,user_id,title,category,language,content,source_name,created_at,updated_at')
      .order('updated_at', { ascending: false });
    if (error) {
      showMessage('materialMessage', errorText(error));
      return;
    }
    materials = data || [];
    renderMaterials();
  }

  function categoryLabel(category) {
    return t({ work: 'catWork', creation: 'catCreation', business: 'catBusiness', automation: 'catAutomation', other: 'all' }[category] || 'all');
  }

  function renderMaterials() {
    const list = $('materialList');
    const query = $('materialSearch').value.trim().toLowerCase();
    const filtered = materials.filter((item) => !query || `${item.title} ${item.content} ${item.source_name || ''}`.toLowerCase().includes(query));
    list.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = t('noMaterials');
      list.appendChild(empty);
      return;
    }

    filtered.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'material-card';
      const top = document.createElement('div');
      top.className = 'material-top';
      const titleWrap = document.createElement('div');
      const heading = document.createElement('h3');
      heading.className = 'material-title';
      heading.textContent = item.title;
      const meta = document.createElement('p');
      meta.className = 'order-number';
      meta.textContent = `${categoryLabel(item.category)} · ${item.language} · ${formatDate(item.updated_at)}`;
      titleWrap.append(heading, meta);
      const badge = document.createElement('span');
      badge.className = 'status-badge paid';
      badge.textContent = t('privateMaterial');
      top.append(titleWrap, badge);
      const preview = document.createElement('p');
      preview.className = 'material-preview';
      preview.textContent = item.content;
      const actions = document.createElement('div');
      actions.className = 'material-actions';
      const edit = document.createElement('button');
      edit.className = 'btn btn-secondary btn-small';
      edit.type = 'button';
      edit.textContent = t('edit');
      edit.addEventListener('click', () => editMaterial(item.id));
      const remove = document.createElement('button');
      remove.className = 'btn btn-danger btn-small';
      remove.type = 'button';
      remove.textContent = t('delete');
      remove.addEventListener('click', () => deleteMaterial(item.id));
      actions.append(edit, remove);
      card.append(top, preview, actions);
      list.appendChild(card);
    });
  }

  function resetMaterialForm() {
    editingMaterialId = null;
    $('materialForm').reset();
    $('materialCategory').value = 'work';
    $('materialLanguage').value = i18n.locale;
    $('saveMaterialButton').textContent = t('saveMaterial');
    $('materialLength').textContent = '0 / 50,000';
    clearMessage('materialMessage');
  }

  function editMaterial(id) {
    const item = materials.find((row) => row.id === id);
    if (!item) return;
    editingMaterialId = id;
    $('materialTitle').value = item.title;
    $('materialSource').value = item.source_name || '';
    $('materialCategory').value = item.category;
    $('materialLanguage').value = item.language;
    $('materialContent').value = item.content;
    $('materialLength').textContent = `${item.content.length.toLocaleString()} / 50,000`;
    $('saveMaterialButton').textContent = t('updateMaterial');
    $('materialForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function saveMaterial(event) {
    event.preventDefault();
    clearMessage('materialMessage');
    const title = $('materialTitle').value.trim();
    const content = $('materialContent').value.trim();
    if (title.length < 2 || content.length < 10) {
      showMessage('materialMessage', t('errorGeneric'));
      return;
    }
    const payload = {
      title,
      category: $('materialCategory').value,
      language: $('materialLanguage').value,
      content,
      source_name: $('materialSource').value.trim() || null
    };
    const button = $('saveMaterialButton');
    button.disabled = true;
    button.textContent = t('saving');
    let result;
    if (editingMaterialId) {
      result = await db.from('member_materials').update(payload).eq('id', editingMaterialId).select('id').single();
    } else {
      result = await db.from('member_materials').insert({ ...payload, user_id: user.id }).select('id').single();
    }
    button.disabled = false;
    button.textContent = t(editingMaterialId ? 'updateMaterial' : 'saveMaterial');
    if (result.error) {
      showMessage('materialMessage', errorText(result.error));
      return;
    }
    resetMaterialForm();
    showToast(t('saved'));
    await loadMaterials();
  }

  async function deleteMaterial(id) {
    if (!window.confirm(t('confirmDelete'))) return;
    const { error } = await db.from('member_materials').delete().eq('id', id);
    if (error) {
      showMessage('materialMessage', errorText(error));
      return;
    }
    if (editingMaterialId === id) resetMaterialForm();
    await loadMaterials();
  }

  async function logout() {
    await db.auth.signOut({ scope: 'local' });
    location.replace('login.html');
  }

  function bindEvents() {
    $('profileForm').addEventListener('submit', saveProfile);
    document.querySelectorAll('[data-order-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        orderFilter = btn.dataset.orderFilter || 'all';
        document.querySelectorAll('[data-order-filter]').forEach((b) => b.classList.toggle('active', b === btn));
        renderOrders();
      });
    });
    $('refreshOrdersButton').addEventListener('click', loadOrders);
    $('materialForm').addEventListener('submit', saveMaterial);
    $('newMaterialButton').addEventListener('click', () => {
      resetMaterialForm();
      $('materialTitle').focus();
    });
    $('materialContent').addEventListener('input', () => {
      $('materialLength').textContent = `${$('materialContent').value.length.toLocaleString()} / 50,000`;
    });
    $('materialSearch').addEventListener('input', renderMaterials);
    $('logoutButton').addEventListener('click', logout);
  }

  window.addEventListener('gyx:languagechange', () => {
    renderProfile();
    renderFavorites();
    renderOrders();
    renderMaterials();
    $('saveMaterialButton').textContent = t(editingMaterialId ? 'updateMaterial' : 'saveMaterial');
  });

  document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    if (!await requireUser()) return;
    await loadProfile();
    $('materialLanguage').value = i18n.locale;
    await Promise.all([loadFavorites(), loadOrders(), loadMaterials()]);
  });
})();

(() => {
  'use strict';

  const db = window.gyxSupabase;
  const i18n = window.GYXI18N;
  if (!db || !i18n) return;

  const $ = (id) => document.getElementById(id);
  const t = (key, vars) => i18n.t(key, vars);
  let user = null;
  let profile = null;
  let orders = [];
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
      location.replace(`login.html?next=${encodeURIComponent('member.html')}`);
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
      .select('id,order_no,product_id,product_name,product_price,payable_amount,currency,network,wallet_address,status,txid,created_at,updated_at')
      .order('created_at', { ascending: false });
    if (error) {
      showMessage('ordersMessage', errorText(error));
      list.replaceChildren();
      return;
    }
    orders = data || [];
    renderOrders();
  }

  function statusLabel(status) {
    const valid = new Set(['pending', 'checking', 'paid', 'delivered', 'expired', 'failed', 'cancelled']);
    return t(valid.has(status) ? status : 'status');
  }

  function renderOrders() {
    const list = $('orderList');
    list.replaceChildren();
    if (!orders.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = t('noOrders');
      list.appendChild(empty);
      return;
    }

    orders.forEach((order) => {
      const card = document.createElement('article');
      card.className = 'order-card';
      const top = document.createElement('div');
      top.className = 'order-top';
      const titleWrap = document.createElement('div');
      const title = document.createElement('h3');
      title.className = 'order-title';
      title.textContent = order.product_name || order.product_id;
      const number = document.createElement('p');
      number.className = 'order-number';
      number.textContent = order.order_no;
      titleWrap.append(title, number);
      const badge = document.createElement('span');
      badge.className = `status-badge ${order.status}`;
      badge.textContent = statusLabel(order.status);
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

      if (['pending', 'checking'].includes(order.status)) {
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

      if (order.status === 'delivered') {
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
    renderOrders();
    renderMaterials();
    $('saveMaterialButton').textContent = t(editingMaterialId ? 'updateMaterial' : 'saveMaterial');
  });

  document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    if (!await requireUser()) return;
    await loadProfile();
    $('materialLanguage').value = i18n.locale;
    await Promise.all([loadOrders(), loadMaterials()]);
  });
})();

(() => {
  'use strict';

  const db = window.gyxSupabase;
  const i18n = window.GYXI18N;
  const config = window.GYX_CONFIG;
  if (!db || !i18n) return;

  const categoryByPrefix = {
    web: 'business', automation: 'automation', ai: 'work', digital: 'creation'
  };
  const productLabels = {
    en: {
      'web-photo': 'Personal Gallery', 'web-merchant': 'Merchant Showcase', 'web-brand': 'Brand Website',
      'web-enterprise': 'Enterprise System', 'automation-trial': 'Automation Trial',
      'automation-small': 'Small Business Automation', 'automation-team': 'Team Collaboration',
      'automation-enterprise': 'Enterprise Automation', 'ai-trial': 'AI Trial',
      'ai-content': 'Content Marketing', 'ai-office': 'Enterprise Office', 'ai-enterprise': 'Enterprise AI',
      'digital-trial': 'Trial Pack', 'digital-study': 'Study Pack', 'digital-expert': 'Expert Pack',
      'digital-private': 'Private Coaching'
    },
    km: {
      'web-photo': 'វេបសាយអាល់ប៊ុមផ្ទាល់ខ្លួន', 'web-merchant': 'វេបសាយបង្ហាញអាជីវករ',
      'web-brand': 'វេបសាយម៉ាក', 'web-enterprise': 'ប្រព័ន្ធសហគ្រាស',
      'automation-trial': 'សាកល្បងស្វ័យប្រវត្តិកម្ម', 'automation-small': 'ស្វ័យប្រវត្តិកម្មអាជីវកម្មតូច',
      'automation-team': 'សហការក្រុម', 'automation-enterprise': 'ស្វ័យប្រវត្តិកម្មសហគ្រាស',
      'ai-trial': 'សាកល្បង AI', 'ai-content': 'ទីផ្សារមាតិកា', 'ai-office': 'ការិយាល័យសហគ្រាស',
      'ai-enterprise': 'AI សហគ្រាស', 'digital-trial': 'កញ្ចប់សាកល្បង', 'digital-study': 'កញ្ចប់សិក្សា',
      'digital-expert': 'កញ្ចប់ជំនាញ', 'digital-private': 'ការបង្រៀនផ្ទាល់ខ្លួន'
    }
  };

  let products = [];
  let selectedCategory = new URLSearchParams(location.search).get('category') || 'work';
  let currentProduct = null;
  let currentOrder = null;
  let currentUser = null;
  let paymentPoll = null;

  const $ = (id) => document.getElementById(id);
  const t = (key, vars) => i18n.t(key, vars);

  function productCategory(productId) {
    return categoryByPrefix[String(productId).split('-')[0]] || 'work';
  }

  function localizedProductName(product) {
    const locale = i18n.locale;
    if (locale === 'zh-CN') return product.product_name;
    return productLabels[locale]?.[product.id] || product.product_name;
  }

  function localizedDescription(product) {
    if (i18n.locale === 'zh-CN') return product.description || '';
    const category = productCategory(product.id);
    return t({ work: 'catWorkDesc', creation: 'catCreationDesc', business: 'catBusinessDesc', automation: 'catAutomationDesc' }[category]);
  }

  function formatPrice(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) : String(value || '0.00');
  }

  function showToast(message, isError = false) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show${isError ? ' error' : ''}`;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.className = 'toast'; }, 4200);
  }

  function showMessage(id, message, kind = 'error') {
    const element = $(id);
    if (!element) return;
    element.textContent = message;
    element.className = `form-message show ${kind}`;
  }

  function clearMessage(id) {
    const element = $(id);
    if (!element) return;
    element.textContent = '';
    element.className = 'form-message';
  }

  function errorText(error) {
    const code = String(error?.code || error?.message || '').toUpperCase();
    if (code.includes('AUTH') || code.includes('SESSION') || code.includes('JWT')) return t('errorAuth');
    if (code.includes('OPEN_ORDER')) return t('errorOpenOrder');
    if (code.includes('RATE')) return t('errorRate');
    if (code.includes('PAYMENT_DETAILS_MISMATCH')) return t('errorPaymentMismatch');
    if (code.includes('TXID_ALREADY') || code.includes('DIFFERENT_TXID')) return t('errorTxidUsed');
    if (code.includes('FETCH') || code.includes('NETWORK')) return t('errorNetwork');
    return t('errorGeneric');
  }

  async function syncAccount() {
    currentUser = await window.gyxGetVerifiedUser();
    const link = $('accountLink');
    if (!link) return;
    if (currentUser) {
      link.href = 'member.html';
      link.textContent = t('navMember');
    } else {
      link.href = 'login.html';
      link.textContent = t('login');
    }
  }

  async function loadProducts() {
    const { data, error } = await db
      .from('products')
      .select('id,product_name,product_price,currency,description,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      const grid = $('planGrid');
      grid.replaceChildren();
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = t('errorNetwork');
      const retry = document.createElement('button');
      retry.className = 'btn btn-small';
      retry.type = 'button';
      retry.textContent = t('retry');
      retry.addEventListener('click', loadProducts);
      empty.append(document.createElement('br'), document.createElement('br'), retry);
      grid.appendChild(empty);
      return;
    }

    products = data || [];
    updateCategoryCounts();
    selectCategory(selectedCategory, false);

    const requestedProduct = new URLSearchParams(location.search).get('product');
    if (requestedProduct && products.some((item) => item.id === requestedProduct)) {
      selectedCategory = productCategory(requestedProduct);
      selectCategory(selectedCategory, false);
      await openOrder(requestedProduct);
    }
  }

  function updateCategoryCounts() {
    ['work', 'creation', 'business', 'automation'].forEach((category) => {
      const count = products.filter((product) => productCategory(product.id) === category).length;
      const element = document.querySelector(`[data-count-for="${category}"]`);
      if (element) element.textContent = t('planCount', { count });
    });
  }

  function selectCategory(category, scroll = true) {
    if (!['work', 'creation', 'business', 'automation'].includes(category)) category = 'work';
    selectedCategory = category;
    document.querySelectorAll('[data-category]').forEach((button) => {
      button.classList.toggle('active', button.dataset.category === category);
    });
    renderPlans();
    if (scroll) $('plansArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderPlans() {
    const grid = $('planGrid');
    if (!grid) return;
    grid.replaceChildren();
    const rows = products.filter((product) => productCategory(product.id) === selectedCategory);
    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = t('noPlans');
      grid.appendChild(empty);
      return;
    }

    rows.forEach((product, index) => {
      const article = document.createElement('article');
      article.className = 'plan-card';

      const tag = document.createElement('span');
      tag.className = 'plan-tag';
      tag.textContent = `${selectedCategory.toUpperCase()} · ${String(index + 1).padStart(2, '0')}`;

      const heading = document.createElement('h3');
      heading.textContent = localizedProductName(product);

      const description = document.createElement('p');
      description.textContent = localizedDescription(product);

      const price = document.createElement('div');
      price.className = 'price';
      price.append(document.createTextNode(formatPrice(product.product_price)));
      const unit = document.createElement('small');
      unit.textContent = product.currency || 'USDT';
      price.appendChild(unit);

      const button = document.createElement('button');
      button.className = 'btn btn-block';
      button.type = 'button';
      button.textContent = t('choosePlan');
      button.addEventListener('click', () => openOrder(product.id));

      article.append(tag, heading, description, price, button);
      grid.appendChild(article);
    });
  }

  async function openOrder(productId) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    currentUser = await window.gyxGetVerifiedUser();
    if (!currentUser) {
      const next = `shop.html?product=${encodeURIComponent(productId)}`;
      location.href = `login.html?next=${encodeURIComponent(next)}`;
      return;
    }

    currentProduct = product;
    currentOrder = null;
    clearInterval(paymentPoll);
    clearMessage('orderFormMessage');
    clearMessage('paymentMessage');
    $('paymentTxid').value = '';
    $('orderProductName').textContent = localizedProductName(product);
    $('orderProductDescription').textContent = localizedDescription(product);
    $('orderProductPrice').textContent = formatPrice(product.product_price);

    const { data: profile } = await db
      .from('profiles')
      .select('display_name,phone')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    $('orderName').value = profile?.display_name || currentUser.user_metadata?.display_name || '';
    $('orderPhone').value = profile?.phone || '';
    $('orderEmail').value = currentUser.email || '';
    switchModalStep('details');
    $('orderModal').classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeOrder() {
    $('orderModal').classList.remove('show');
    document.body.style.overflow = '';
    clearInterval(paymentPoll);
    paymentPoll = null;
  }

  function switchModalStep(step) {
    const map = {
      details: 'orderStepDetails', payment: 'orderStepPayment', success: 'orderStepSuccess'
    };
    Object.values(map).forEach((id) => $(id)?.classList.remove('active'));
    $(map[step])?.classList.add('active');
  }

  function validateOrderForm() {
    const name = $('orderName').value.trim();
    const email = $('orderEmail').value.trim().toLowerCase();
    const phone = $('orderPhone').value.trim();
    if (!name) throw new Error('FORM_NAME');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('FORM_EMAIL');
    if (phone.length < 6) throw new Error('FORM_PHONE');
    return { name, email, phone };
  }

  function formErrorText(error) {
    if (error.message === 'FORM_NAME') return t('errorName');
    if (error.message === 'FORM_EMAIL') return t('errorEmail');
    if (error.message === 'FORM_PHONE') return t('errorPhone');
    return errorText(error);
  }

  async function createOrder(event) {
    event.preventDefault();
    clearMessage('orderFormMessage');
    let form;
    try {
      form = validateOrderForm();
    } catch (error) {
      showMessage('orderFormMessage', formErrorText(error));
      return;
    }

    const button = $('createOrderButton');
    button.disabled = true;
    button.textContent = t('creatingOrder');
    try {
      const payload = await window.gyxInvokeFunction('create-order', {
        product_id: currentProduct.id,
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone
      });
      currentOrder = payload?.order;
      if (!currentOrder) throw new Error('ORDER_CREATE_FAILED');
      await db.from('profiles').update({
        display_name: form.name,
        phone: form.phone,
        locale: i18n.locale
      }).eq('user_id', currentUser.id);
      showPaymentStep();
    } catch (error) {
      const code = String(error.code || error.message || '');
      if (code.includes('OPEN_ORDER_ALREADY_EXISTS')) {
        const existing = await loadOpenOrder(currentProduct.id);
        if (existing) {
          currentOrder = existing;
          showMessage('paymentMessage', t('errorOpenOrder'), 'success');
          showPaymentStep();
          return;
        }
      }
      showMessage('orderFormMessage', errorText(error));
    } finally {
      button.disabled = false;
      button.textContent = t('createOrder');
    }
  }

  async function loadOpenOrder(productId) {
    const { data } = await db
      .from('orders')
      .select('id,order_no,product_id,product_name,product_price,payable_amount,currency,network,wallet_address,status,txid,created_at')
      .eq('product_id', productId)
      .in('status', ['pending', 'checking'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data || null;
  }

  function showPaymentStep() {
    $('paymentOrderNo').textContent = currentOrder.order_no;
    $('paymentAmount').textContent = formatPrice(currentOrder.payable_amount);
    $('paymentNetwork').textContent = currentOrder.network || config.network;
    $('paymentWallet').textContent = currentOrder.wallet_address || config.wallet;
    $('paymentTxid').value = currentOrder.txid || '';
    switchModalStep('payment');
  }

  async function copyWallet() {
    const value = $('paymentWallet').textContent.trim();
    try {
      await navigator.clipboard.writeText(value);
      $('copyWalletButton').textContent = t('copied');
      setTimeout(() => { $('copyWalletButton').textContent = t('copy'); }, 1700);
    } catch {
      showToast(value);
    }
  }

  async function submitPayment(event) {
    event.preventDefault();
    clearMessage('paymentMessage');
    const txid = $('paymentTxid').value.trim().toUpperCase();
    if (!/^[0-9A-F]{64}$/.test(txid)) {
      showMessage('paymentMessage', t('errorTxid'));
      return;
    }

    const button = $('submitPaymentButton');
    button.disabled = true;
    button.textContent = t('checkingPayment');
    try {
      const result = await window.gyxInvokeFunction('submit-payment', {
        order_id: currentOrder.id,
        order_no: currentOrder.order_no,
        txid
      });
      currentOrder.txid = txid;
      currentOrder.status = result?.status || 'checking';
      if (['paid', 'delivered'].includes(currentOrder.status)) {
        showSuccess();
      } else {
        showMessage('paymentMessage', t('paymentPending'), 'success');
        startPaymentPolling();
      }
    } catch (error) {
      showMessage('paymentMessage', errorText(error));
    } finally {
      button.disabled = false;
      button.textContent = t('submitPayment');
    }
  }

  function startPaymentPolling() {
    clearInterval(paymentPoll);
    let attempts = 0;
    const check = async () => {
      attempts += 1;
      const { data } = await db
        .from('orders')
        .select('status,updated_at')
        .eq('id', currentOrder.id)
        .maybeSingle();
      if (data?.status) currentOrder.status = data.status;
      if (['paid', 'delivered'].includes(currentOrder.status)) {
        clearInterval(paymentPoll);
        showSuccess();
      } else if (['failed', 'expired', 'cancelled'].includes(currentOrder.status) || attempts >= 24) {
        clearInterval(paymentPoll);
      }
    };
    paymentPoll = setInterval(check, 5000);
  }

  function showSuccess() {
    clearInterval(paymentPoll);
    $('successCopy').textContent = `${t('orderNo')}: ${currentOrder.order_no}`;
    switchModalStep('success');
  }

  function setupSearch() {
    $('quickSearchForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = $('quickSearchInput').value.trim();
      location.href = `knowledge.html${query ? `?q=${encodeURIComponent(query)}` : ''}`;
    });
  }

  function setupMusic() {
    const button = $('musicToggle');
    if (!button) return;
    let context = null;
    let gain = null;
    let timer = null;
    let index = 0;
    let playing = false;
    const notes = [261.63, 329.63, 392, 523.25, 392, 349.23, 293.66, 329.63];

    const update = () => {
      button.classList.toggle('playing', playing);
      button.setAttribute('aria-pressed', String(playing));
      button.textContent = t(playing ? 'musicOn' : 'musicOff');
    };
    const tone = () => {
      if (!playing || !context || context.state !== 'running') return;
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = index % 2 ? 'sine' : 'triangle';
      oscillator.frequency.value = notes[index++ % notes.length];
      envelope.gain.setValueAtTime(.0001, now);
      envelope.gain.exponentialRampToValueAtTime(.035, now + .08);
      envelope.gain.exponentialRampToValueAtTime(.0001, now + 1.15);
      oscillator.connect(envelope);
      envelope.connect(gain);
      oscillator.start(now);
      oscillator.stop(now + 1.2);
      timer = setTimeout(tone, 1320);
    };
    const start = async () => {
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      if (!AudioEngine) return;
      if (!context) {
        context = new AudioEngine();
        gain = context.createGain();
        gain.gain.value = .36;
        gain.connect(context.destination);
      }
      await context.resume();
      playing = true;
      localStorage.setItem('gyx_music_enabled', 'on');
      update();
      tone();
    };
    const stop = () => {
      playing = false;
      clearTimeout(timer);
      localStorage.setItem('gyx_music_enabled', 'off');
      if (context?.state === 'running') context.suspend();
      update();
    };
    button.addEventListener('click', async () => { playing ? stop() : await start(); });
    update();
  }

  function bindEvents() {
    document.querySelectorAll('[data-category]').forEach((button) => {
      button.addEventListener('click', () => selectCategory(button.dataset.category));
    });
    $('closeOrderButton')?.addEventListener('click', closeOrder);
    $('cancelOrderButton')?.addEventListener('click', closeOrder);
    $('successCloseButton')?.addEventListener('click', closeOrder);
    $('orderDetailsForm')?.addEventListener('submit', createOrder);
    $('paymentForm')?.addEventListener('submit', submitPayment);
    $('copyWalletButton')?.addEventListener('click', copyWallet);
    $('paymentBackButton')?.addEventListener('click', () => switchModalStep('details'));
    $('orderModal')?.addEventListener('click', (event) => { if (event.target === $('orderModal')) closeOrder(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeOrder(); });
    setupSearch();
    setupMusic();
  }

  window.addEventListener('gyx:languagechange', async (event) => {
    updateCategoryCounts();
    renderPlans();
    await syncAccount();
    if (currentProduct) {
      $('orderProductName').textContent = localizedProductName(currentProduct);
      $('orderProductDescription').textContent = localizedDescription(currentProduct);
    }
    const musicButton = $('musicToggle');
    if (musicButton) musicButton.textContent = t(musicButton.classList.contains('playing') ? 'musicOn' : 'musicOff');
    if (currentUser) {
      db.from('profiles').update({ locale: event.detail.locale }).eq('user_id', currentUser.id).then(() => {});
    }
  });

  document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    await Promise.all([syncAccount(), loadProducts()]);
  });
})();

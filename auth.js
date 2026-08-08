(() => {
  'use strict';
  const db = window.gyxSupabase;
  const i18n = window.GYXI18N;
  if (!db || !i18n) return;

  const $ = (id) => document.getElementById(id);
  const t = (key) => i18n.t(key);
  const requestedMode = new URLSearchParams(location.search).get('mode');
  let mode = requestedMode === 'register' || requestedMode === 'recover' ? requestedMode : 'login';
  let activeUser = null;

  const countries = [
    ['CN','中国','+86'],['KH','柬埔寨','+855'],['US','美国/加拿大','+1'],['GB','英国','+44'],
    ['AU','澳大利亚','+61'],['SG','新加坡','+65'],['MY','马来西亚','+60'],['TH','泰国','+66'],
    ['VN','越南','+84'],['PH','菲律宾','+63'],['ID','印度尼西亚','+62'],['JP','日本','+81'],
    ['KR','韩国','+82'],['IN','印度','+91'],['AE','阿联酋','+971'],['FR','法国','+33'],
    ['DE','德国','+49'],['IT','意大利','+39'],['ES','西班牙','+34'],['BR','巴西','+55'],
    ['MX','墨西哥','+52'],['ZA','南非','+27'],['NG','尼日利亚','+234'],['OTHER','其他国家/地区','']
  ];

  function ensureRegisterContactFields() {
    if ($('registerContactGroup')) return;
    const emailGroup = $('authEmail')?.closest('.form-group');
    if (!emailGroup) return;
    const wrap = document.createElement('div');
    wrap.id = 'registerContactGroup';
    wrap.className = 'hidden';
    const options = countries.map(([code,name,dial]) => `<option value="${code}" data-dial="${dial}">${name}${dial ? ' '+dial : ''}</option>`).join('');
    wrap.innerHTML = `
      <div class="form-group"><label for="registerCountry">国家/地区</label><select id="registerCountry" class="select">${options}</select></div>
      <div class="form-group"><label for="registerPhone">手机号 <span style="color:#e1485d">*</span></label><input id="registerPhone" class="field" type="tel" maxlength="24" autocomplete="tel" inputmode="tel" placeholder="填写本地手机号；其他地区可直接输入 +国际区号" required><span id="registerPhoneHint" class="form-help">将按国际格式保存</span></div>
      <div class="form-row">
        <div class="form-group"><label for="registerWechat">微信（选填）</label><input id="registerWechat" class="field" type="text" maxlength="80" autocomplete="off" placeholder="微信号"></div>
        <div class="form-group"><label for="registerWhatsapp">WhatsApp（选填）</label><input id="registerWhatsapp" class="field" type="text" maxlength="80" autocomplete="off" placeholder="WhatsApp号码/账号"></div>
      </div>`;
    emailGroup.insertAdjacentElement('afterend', wrap);
    $('registerCountry')?.addEventListener('change', updatePhoneHint);
    updatePhoneHint();
  }

  function updatePhoneHint() {
    const select = $('registerCountry');
    const hint = $('registerPhoneHint');
    const input = $('registerPhone');
    if (!select || !hint || !input) return;
    const option = select.selectedOptions[0];
    const dial = option?.dataset?.dial || '';
    if (dial) {
      hint.textContent = `国际区号 ${dial}，只需填写本地手机号`;
      input.placeholder = '填写本地手机号';
    } else {
      hint.textContent = '请直接输入完整国际号码，例如 +85512345678';
      input.placeholder = '+国际区号 手机号';
    }
  }

  function normalizePhone() {
    const raw = String($('registerPhone')?.value || '').trim();
    const select = $('registerCountry');
    const option = select?.selectedOptions?.[0];
    const dial = option?.dataset?.dial || '';
    if (!raw) return '';
    if (!dial) {
      const compact = raw.replace(/[\s()\-]/g, '');
      return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : '';
    }
    const local = raw.replace(/\D/g, '').replace(/^0+/, '');
    const compact = dial + local;
    return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : '';
  }

  function selectedCountry() {
    const option = $('registerCountry')?.selectedOptions?.[0];
    return {
      code: String(option?.value || ''),
      name: String(option?.textContent || '').replace(/\s\+\d.*$/, '').trim(),
      dial: String(option?.dataset?.dial || '')
    };
  }

  function showMessage(message, kind = 'error') {
    const e = $('authMessage');
    e.textContent = message;
    e.className = `form-message show ${kind}`;
  }
  function clearMessage() { $('authMessage').className = 'form-message'; $('authMessage').textContent = ''; }

  function setMode(nextMode) {
    mode = nextMode;
    clearMessage();
    ensureRegisterContactFields();
    const registering = mode === 'register';
    const recovering = mode === 'recover';
    $('displayNameGroup').classList.toggle('hidden', !registering);
    $('confirmPasswordGroup').classList.toggle('hidden', !registering);
    $('registerContactGroup')?.classList.toggle('hidden', !registering);
    if ($('registerPhone')) $('registerPhone').required = registering;
    $('passwordGroup').classList.toggle('hidden', recovering);
    $('authPassword').disabled = recovering;
    $('authPassword').autocomplete = registering ? 'new-password' : 'current-password';
    $('forgotPasswordButton').classList.toggle('hidden', mode !== 'login');
    $('backToLoginButton').classList.toggle('hidden', !recovering);
    $('loginTab').classList.toggle('active', !registering && !recovering);
    $('registerTab').classList.toggle('active', registering);
    $('loginTab').setAttribute('aria-selected', String(!registering && !recovering));
    $('registerTab').setAttribute('aria-selected', String(registering));
    $('authSubmit').textContent = t(recovering ? 'sendResetLink' : registering ? 'signUp' : 'signIn');
  }

  function isValidPassword(password) { return /^[A-Za-z0-9]{8,10}$/.test(password) && /[A-Za-z]/.test(password) && /[0-9]/.test(password); }

  function authErrorText(error) {
    const status = Number(error?.status || error?.statusCode || error?.context?.status || 0);
    const code = String(error?.code || error?.error_code || error?.name || '').toUpperCase();
    const raw = String(error?.message || error?.msg || error || '');
    const message = raw.toLowerCase();
    if (status === 429 || code.includes('OVER_REQUEST_RATE') || code.includes('RATE_LIMIT') || message.includes('rate limit') || message.includes('too many requests') || message.includes('security purposes')) return '尝试次数过多，请等待 1～2 分钟后再试。';
    if (message.includes('email not confirmed') || code.includes('EMAIL_NOT_CONFIRMED')) return '邮箱尚未确认。请先打开注册邮件完成确认，或联系管理员。';
    if (code.includes('ACCOUNT_ALREADY_EXISTS') || message.includes('already registered')) return '该邮箱已注册，请直接登录或使用忘记密码。';
    if (message.includes('user not found') || code.includes('USER_NOT_FOUND')) return '账号不存在，请先注册。';
    if (message.includes('invalid login') || code.includes('INVALID_CREDENTIALS')) return '密码错误。请点“显示”确认没有空格，或使用忘记密码重置。';
    if (code.includes('VALID_EMAIL')) return '邮箱格式不正确。';
    if (code.includes('VALID_PHONE')) return '请输入有效的国际手机号。';
    if (code.includes('VALID_PASSWORD')) return t('errorPasswordLength');
    if (code.includes('VALID_NAME')) return t('errorName');
    if (message.includes('fetch') || message.includes('network')) return t('errorNetwork');
    if (message.includes('redirect')) return '回调地址未配置，请检查 Supabase Redirect URLs';
    return raw || t('errorGeneric');
  }

  function getNext() { return window.gyxSafeNext(new URLSearchParams(location.search).get('next'), 'member.html'); }

  async function applyPendingProfile(user) {
    let pending = null;
    try { pending = JSON.parse(localStorage.getItem('gyx_pending_profile') || 'null'); } catch {}
    if (!pending || pending.email !== user.email) return;
    await db.from('profiles').update({
      display_name: pending.display_name,
      phone: pending.phone,
      phone_country_code: pending.phone_country_code || null,
      phone_country_name: pending.phone_country_name || null,
      wechat: pending.wechat || null,
      whatsapp: pending.whatsapp || null,
      locale: pending.locale
    }).eq('user_id', user.id);
    localStorage.removeItem('gyx_pending_profile');
  }

  async function recordAuthEvent(eventType) { try { await window.gyxInvokeFunction('record-auth-event', { event_type: eventType }); } catch {} }

  async function submitAuth(event) {
    event.preventDefault();
    clearMessage();
    const email = String($('authEmail').value || '').trim().toLowerCase();
    const password = String($('authPassword').value || '').trim();
    const displayName = $('displayName').value.trim();
    const confirm = $('confirmPassword').value;
    const phone = mode === 'register' ? normalizePhone() : '';
    const country = selectedCountry();
    const wechat = String($('registerWechat')?.value || '').trim();
    const whatsapp = String($('registerWhatsapp')?.value || '').trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showMessage(t('errorEmail')); return; }
    if (mode !== 'recover' && !isValidPassword(password)) { showMessage('密码需为 8～10 位，且同时包含数字和字母'); return; }
    if (mode === 'register' && password !== confirm) { showMessage(t('errorPasswordMatch')); return; }
    if (mode === 'register' && !displayName) { showMessage(t('errorName')); return; }
    if (mode === 'register' && !phone) { showMessage('手机号为必填项，请选择国家/地区并输入有效手机号'); $('registerPhone')?.focus(); return; }

    const button = $('authSubmit');
    button.disabled = true;
    button.textContent = t(mode === 'recover' ? 'sendingResetLink' : mode === 'register' ? 'signingUp' : 'signingIn');
    try {
      if (mode === 'recover') {
        const redirectTo = 'https://globalyouxuan-order.pages.dev/reset-password.html';
        const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        showMessage(t('resetEmailSent'), 'success');
      } else if (mode === 'register') {
        const profile = { email, display_name: displayName, phone, phone_country_code: country.code, phone_country_name: country.name, wechat, whatsapp, locale: i18n.locale };
        localStorage.setItem('gyx_pending_profile', JSON.stringify(profile));
        await window.gyxInvokeFunction('register-member', { ...profile, password, website: $('registerWebsite')?.value || '' });
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await applyPendingProfile(data.user);
        await recordAuthEvent('register');
        showMessage(t('registerSuccess'), 'success');
        setTimeout(() => { location.href = getNext(); }, 450);
      } else {
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await applyPendingProfile(data.user);
        await recordAuthEvent('login');
        showMessage(t('authSuccess'), 'success');
        setTimeout(() => { location.href = getNext(); }, 450);
      }
    } catch (error) {
      try { if (error && error.status == null && error.context?.status) error.status = error.context.status; } catch {}
      showMessage(authErrorText(error));
    } finally {
      button.disabled = false;
      button.textContent = t(mode === 'recover' ? 'sendResetLink' : mode === 'register' ? 'signUp' : 'signIn');
    }
  }

  async function inspectSession() {
    if (mode === 'recover') return;
    activeUser = await window.gyxGetVerifiedUser();
    if (!activeUser) return;
    $('activeSession').classList.add('show');
    $('sessionEmail').textContent = activeUser.email || '';
    $('continueButton').href = getNext();
    $('authForm').classList.add('hidden');
  }

  async function switchAccount() {
    await recordAuthEvent('logout');
    await db.auth.signOut({ scope: 'local' });
    activeUser = null;
    $('activeSession').classList.remove('show');
    $('authForm').classList.remove('hidden');
    $('authEmail').focus();
  }

  window.addEventListener('gyx:languagechange', () => setMode(mode));
  document.addEventListener('DOMContentLoaded', async () => {
    ensureRegisterContactFields();
    document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
    $('authForm').addEventListener('submit', submitAuth);
    $('forgotPasswordButton').addEventListener('click', () => setMode('recover'));
    $('backToLoginButton').addEventListener('click', () => setMode('login'));
    $('switchAccountButton').addEventListener('click', switchAccount);
    setMode(mode);
    await inspectSession();
  });
})();
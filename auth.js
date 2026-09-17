(() => {
  'use strict';
  const db = window.gyxSupabase;
  const i18n = window.GYXI18N;
  if (!db || !i18n) return;

  const $ = (id) => document.getElementById(id);
  const t = (key, vars) => i18n.t(key, vars);
  const cleanText = (value, fallback = '') => {
    if (typeof value !== 'string') return fallback;
    const s = value.trim();
    if (!s || s === '{}' || s === '[]' || s === '[object Object]' || s === 'null' || s === 'undefined') return fallback;
    return s;
  };
  const tf = (key, fallback, vars) => {
    try {
      const v = cleanText(t(key, vars), '');
      return (!v || v === key) ? fallback : v;
    } catch {
      return fallback;
    }
  };

  const requestedMode = new URLSearchParams(location.search).get('mode');
  let mode = requestedMode === 'register' || requestedMode === 'recover' ? requestedMode : 'login';
  let activeUser = null;

  const countries = [
    ['CN','+86'],['KH','+855'],['US','+1'],['GB','+44'],['AU','+61'],['SG','+65'],['MY','+60'],['TH','+66'],['VN','+84'],['PH','+63'],['ID','+62'],['JP','+81'],['KR','+82'],['IN','+91'],['AE','+971'],['FR','+33'],['DE','+49'],['IT','+39'],['ES','+34'],['BR','+55'],['MX','+52'],['ZA','+27'],['NG','+234'],['OTHER','']
  ];

  function ensureRegisterContactFields() {
    if ($('registerContactGroup')) return;
    const emailGroup = $('authEmail')?.closest('.form-group');
    if (!emailGroup) return;
    const wrap = document.createElement('div');
    wrap.id = 'registerContactGroup';
    wrap.className = 'hidden';
    const options = countries.map(([code,dial]) => `<option value="${code}" data-dial="${dial}">${tf('country.'+code, code)}${dial ? ' '+dial : ''}</option>`).join('');
    wrap.innerHTML = `<div class="form-group"><label id="registerCountryLabel" for="registerCountry"></label><select id="registerCountry" class="select" required>${options}</select></div><div class="form-group"><label id="registerPhoneLabel" for="registerPhone"></label><input id="registerPhone" class="field" type="tel" maxlength="24" autocomplete="tel" inputmode="tel" required><span id="registerPhoneHint" class="form-help"></span></div>`;
    emailGroup.insertAdjacentElement('afterend', wrap);
    const note = document.createElement('p');
    note.id = 'registerComplianceNotice';
    note.className = 'form-help hidden';
    note.style.margin = '2px 0 0';
    note.style.lineHeight = '1.55';
    $('authSubmit')?.insertAdjacentElement('beforebegin', note);
    $('registerCountry')?.addEventListener('change', updatePhoneHint);
    updateRegisterLabels();
  }

  function updateRegisterLabels() {
    const c = $('registerCountryLabel'), p = $('registerPhoneLabel'), n = document.querySelector('label[for="displayName"]'), ni = $('displayName'), notice = $('registerComplianceNotice');
    if (c) c.textContent = tf('authCopy001', '国家/地区');
    if (p) p.textContent = tf('authCopy002', '手机号');
    if (n) n.textContent = tf('authCopy003', '会员名称');
    if (ni) ni.placeholder = tf('authCopy004', '请输入会员名称');
    if (notice) notice.textContent = tf('authCopy005', '请填写真实有效的联系方式。');
    updatePhoneHint();
  }

  function updatePhoneHint() {
    const s = $('registerCountry'), h = $('registerPhoneHint'), input = $('registerPhone');
    if (!s || !h || !input) return;
    const dial = s.selectedOptions[0]?.dataset?.dial || '';
    h.textContent = dial ? tf('authCopy006', `区号 ${dial}`, { v1: dial }) : tf('authCopy007', '请输入完整国际号码');
    input.placeholder = dial ? tf('authCopy008', '请输入手机号') : tf('authCopy009', '例如 +855…');
  }

  function normalizePhone() {
    const raw = String($('registerPhone')?.value || '').trim();
    const dial = $('registerCountry')?.selectedOptions?.[0]?.dataset?.dial || '';
    if (!raw) return '';
    if (!dial) {
      const x = raw.replace(/[\s()\-]/g,'');
      return /^\+[1-9]\d{6,14}$/.test(x) ? x : '';
    }
    const local = raw.replace(/\D/g,'').replace(/^0+/, '');
    const x = dial + local;
    return /^\+[1-9]\d{6,14}$/.test(x) ? x : '';
  }

  function selectedCountry() {
    const o = $('registerCountry')?.selectedOptions?.[0];
    return { code: String(o?.value || ''), name: String(o?.textContent || '').replace(/\s\+\d.*$/, '').trim() };
  }

  function showMessage(message, kind = 'error') {
    const e = $('authMessage');
    if (!e) return;
    let text = cleanText(message, '');
    if (!text) {
      if (mode === 'recover') text = kind === 'success' ? '找回密码邮件已发送，请查看邮箱。' : '操作失败，请稍后再试。';
      else text = '操作失败，请稍后再试。';
    }
    e.textContent = text;
    e.className = `form-message show ${kind}`;
  }

  function clearMessage() {
    const e = $('authMessage');
    if (!e) return;
    e.textContent = '';
    e.className = 'form-message';
  }

  function bindPasswordToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach((b) => {
      if (b.dataset.passwordBound === '1') return;
      b.dataset.passwordBound = '1';
      b.addEventListener('click', () => {
        const input = $(b.dataset.togglePassword);
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        b.textContent = show ? tf('hidePassword','隐藏密码') : tf('showPassword','显示密码');
        b.setAttribute('aria-pressed', String(show));
      });
    });
  }

  function syncPasswordToggleLabels() {
    document.querySelectorAll('[data-toggle-password]').forEach((b) => {
      const input = $(b.dataset.togglePassword);
      if (!input) return;
      b.textContent = input.type === 'text' ? tf('hidePassword','隐藏密码') : tf('showPassword','显示密码');
    });
  }

  function setMode(nextMode) {
    mode = nextMode;
    clearMessage();
    ensureRegisterContactFields();
    const registering = mode === 'register', recovering = mode === 'recover';
    $('displayNameGroup').classList.toggle('hidden', !registering);
    $('confirmPasswordGroup').classList.toggle('hidden', !registering);
    $('registerContactGroup')?.classList.toggle('hidden', !registering);
    $('registerComplianceNotice')?.classList.toggle('hidden', !registering);
    $('displayName').required = registering;
    $('confirmPassword').required = registering;
    if ($('registerPhone')) $('registerPhone').required = registering;
    if ($('registerCountry')) $('registerCountry').required = registering;
    $('passwordGroup').classList.toggle('hidden', recovering);
    $('authPassword').disabled = recovering;
    $('authPassword').autocomplete = registering ? 'new-password' : 'current-password';
    $('forgotPasswordButton').classList.toggle('hidden', mode !== 'login');
    $('backToLoginButton').classList.toggle('hidden', !recovering);
    $('loginTab').classList.toggle('active', !registering && !recovering);
    $('registerTab').classList.toggle('active', registering);
    $('loginTab').setAttribute('aria-selected', String(!registering && !recovering));
    $('registerTab').setAttribute('aria-selected', String(registering));
    $('forgotPasswordButton').textContent = '忘记密码';
    $('backToLoginButton').textContent = '返回登录';
    $('authSubmit').textContent = recovering ? '发送找回密码邮件' : registering ? tf('signUp','注册') : tf('signIn','登录');
    updateRegisterLabels();
    syncPasswordToggleLabels();
    clearMessage();
  }

  function isValidPassword(password) { return password.length >= 8 && password.length <= 20; }

  function authErrorText(error) {
    const status = Number(error?.status || error?.statusCode || error?.context?.status || 0);
    const code = String(error?.code || error?.error_code || error?.name || '').toUpperCase();
    const rawCandidate = error?.message ?? error?.msg ?? '';
    const raw = cleanText(typeof rawCandidate === 'string' ? rawCandidate : '', '');
    const m = raw.toLowerCase();
    if (status === 429 || code.includes('RATE_LIMIT') || m.includes('rate limit') || m.includes('too many requests')) return '请求过于频繁，请稍后再试。';
    if (code.includes('ACCOUNT_ALREADY_EXISTS') || m.includes('already registered')) return tf('authCopy011','该邮箱已经注册。');
    if (m.includes('email not confirmed') || m.includes('email_not_confirmed')) return tf('authCopy012','请先完成邮箱验证。');
    if (m.includes('invalid login')) return tf('authCopy013','邮箱或密码错误。');
    if (mode === 'recover') return '找回密码邮件发送失败，请稍后再试。';
    return raw || '操作失败，请稍后再试。';
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
      locale: pending.locale
    }).eq('user_id', user.id);
    localStorage.removeItem('gyx_pending_profile');
  }

  async function recordAuthEvent(eventType) {
    try { await window.gyxInvokeFunction('record-auth-event', { event_type: eventType }); } catch {}
  }

  async function submitAuth(event) {
    event.preventDefault();
    clearMessage();
    const email = String($('authEmail').value || '').trim().toLowerCase();
    const password = String($('authPassword').value || '');
    const displayName = $('displayName').value.trim();
    const confirm = $('confirmPassword').value;
    const phone = mode === 'register' ? normalizePhone() : '';
    const country = selectedCountry();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showMessage('请输入正确的邮箱地址'); return; }
    if (mode !== 'recover' && !isValidPassword(password)) { showMessage(tf('authCopy014','密码请输入 8–20 位。')); return; }
    if (mode === 'register' && password !== confirm) { showMessage('两次输入的密码不一致'); return; }
    if (mode === 'register' && !displayName) { showMessage(tf('authCopy015','请输入会员名称')); return; }
    if (mode === 'register' && !phone) { showMessage(tf('authCopy016','请输入正确的手机号')); return; }

    const button = $('authSubmit');
    button.disabled = true;
    try {
      if (mode === 'recover') {
        const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: 'https://globalyouxuan-order.pages.dev/reset-password.html' });
        if (error) throw error;
        showMessage('找回密码邮件已发送，请查看邮箱。', 'success');
      } else if (mode === 'register') {
        const profile = { email, display_name: displayName, phone, phone_country_code: country.code, phone_country_name: country.name, locale: i18n.locale };
        localStorage.removeItem('gyx_pending_profile');
        await window.gyxInvokeFunction('register-member', { ...profile, password, website: $('registerWebsite')?.value || '' });
        $('authPassword').value = '';
        $('confirmPassword').value = '';
        showMessage(tf('authCopy017','注册成功，请查看邮箱完成验证。'), 'success');
      } else {
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await applyPendingProfile(data.user);
        await recordAuthEvent('login');
        showMessage(tf('authCopy018','登录成功。'), 'success');
        setTimeout(() => location.href = getNext(), 450);
      }
    } catch (error) {
      showMessage(authErrorText(error));
    } finally {
      button.disabled = false;
      button.textContent = mode === 'recover' ? '发送找回密码邮件' : mode === 'register' ? tf('signUp','注册') : tf('signIn','登录');
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
    bindPasswordToggles();
    document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
    $('authForm').addEventListener('submit', submitAuth);
    $('forgotPasswordButton').addEventListener('click', () => setMode('recover'));
    $('backToLoginButton').addEventListener('click', () => setMode('login'));
    $('switchAccountButton').addEventListener('click', switchAccount);
    setMode(mode);
    await inspectSession();
  });
})();

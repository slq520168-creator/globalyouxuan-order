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

  function showMessage(message, kind = 'error') {
    const element = $('authMessage');
    element.textContent = message;
    element.className = `form-message show ${kind}`;
  }

  function clearMessage() {
    $('authMessage').className = 'form-message';
    $('authMessage').textContent = '';
  }

  function resetPasswordVisibility() {
    ['authPassword', 'confirmPassword'].forEach((id) => {
      const input = $(id);
      if (input) input.type = 'password';
    });
    document.querySelectorAll('[data-password-toggle]').forEach((button) => {
      button.textContent = '显示';
      button.setAttribute('aria-pressed', 'false');
    });
  }

  function preparePasswordInput(input) {
    if (!input || input.dataset.passwordReady === 'true') return;
    input.dataset.passwordReady = 'true';
    input.setAttribute('autocapitalize', 'none');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('enterkeyhint', 'done');

    const parent = input.parentElement;
    if (!parent) return;
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    parent.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    input.style.paddingRight = '68px';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.textContent = '显示';
    toggle.dataset.passwordToggle = input.id;
    toggle.setAttribute('aria-label', '显示密码');
    toggle.setAttribute('aria-pressed', 'false');
    Object.assign(toggle.style, {
      position: 'absolute',
      right: '10px',
      top: '50%',
      transform: 'translateY(-50%)',
      border: '0',
      background: 'transparent',
      color: 'inherit',
      fontSize: '14px',
      fontWeight: '700',
      padding: '8px',
      cursor: 'pointer',
      zIndex: '2'
    });
    toggle.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      toggle.textContent = showing ? '显示' : '隐藏';
      toggle.setAttribute('aria-label', showing ? '显示密码' : '隐藏密码');
      toggle.setAttribute('aria-pressed', String(!showing));
      input.focus({ preventScroll: true });
      try { input.setSelectionRange(input.value.length, input.value.length); } catch { /* unsupported */ }
    });
    wrapper.appendChild(toggle);
  }

  function initPasswordControls() {
    preparePasswordInput($('authPassword'));
    preparePasswordInput($('confirmPassword'));
  }

  function setMode(nextMode) {
    mode = nextMode;
    clearMessage();
    resetPasswordVisibility();
    const registering = mode === 'register';
    const recovering = mode === 'recover';
    $('displayNameGroup').classList.toggle('hidden', !registering);
    $('confirmPasswordGroup').classList.toggle('hidden', !registering);
    $('passwordGroup').classList.toggle('hidden', recovering);
    $('authPassword').disabled = recovering;
    $('authPassword').autocomplete = registering ? 'new-password' : 'current-password';
    $('confirmPassword').autocomplete = 'new-password';
    $('forgotPasswordButton').classList.toggle('hidden', mode !== 'login');
    $('backToLoginButton').classList.toggle('hidden', !recovering);
    $('loginTab').classList.toggle('active', !registering && !recovering);
    $('registerTab').classList.toggle('active', registering);
    $('loginTab').setAttribute('aria-selected', String(!registering && !recovering));
    $('registerTab').setAttribute('aria-selected', String(registering));
    $('authSubmit').textContent = t(recovering ? 'sendResetLink' : registering ? 'signUp' : 'signIn');
  }

  function authErrorText(error) {
    const code = String(error?.code || '').toLowerCase();
    const raw = String(error?.message || error || '');
    const message = raw.toLowerCase();
    const status = Number(error?.status || 0);

    if (code.includes('account_already_exists') || message.includes('already registered') || message.includes('already been registered')) {
      return t('errorAccountExists');
    }
    if (status === 429 || code.includes('rate_limit') || code.includes('over_email_send_rate_limit') || message.includes('too many') || message.includes('security purposes')) {
      return '操作太频繁，请等待1～2分钟后再试';
    }
    if (code.includes('email_not_confirmed') || message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
      return '邮箱尚未完成验证，请先打开验证邮件确认账号';
    }
    if (code.includes('invalid_credentials') || message.includes('invalid login') || message.includes('invalid credentials')) {
      return '邮箱不存在或密码错误，请点“显示”核对密码后重试';
    }
    if (code.includes('valid_email')) return t('errorEmail');
    if (code.includes('valid_password') || code.includes('weak_password')) return t('errorPasswordLength');
    if (code.includes('valid_name')) return t('errorName');
    if (message.includes('fetch') || message.includes('network')) return t('errorNetwork');
    if (message.includes('redirect')) return '回调地址未配置，请检查Supabase Redirect URLs';
    if (raw) return raw;
    return t('errorGeneric');
  }

  function getNext() {
    return window.gyxSafeNext(new URLSearchParams(location.search).get('next'), 'member.html');
  }

  async function applyPendingProfile(user) {
    let pending = null;
    try { pending = JSON.parse(localStorage.getItem('gyx_pending_profile') || 'null'); } catch { pending = null; }
    if (!pending || pending.email !== user.email) return;
    await db.from('profiles').update({
      display_name: pending.display_name,
      locale: pending.locale
    }).eq('user_id', user.id);
    localStorage.removeItem('gyx_pending_profile');
  }

  async function submitAuth(event) {
    event.preventDefault();
    clearMessage();
    const email = $('authEmail').value.trim().toLowerCase();
    const password = $('authPassword').value;
    const displayName = $('displayName').value.trim();
    const confirm = $('confirmPassword').value;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage(t('errorEmail'));
      return;
    }
    if (mode !== 'recover' && password.length < 8) {
      showMessage(t('errorPasswordLength'));
      return;
    }
    if (mode !== 'recover' && password !== password.trim()) {
      showMessage('密码开头或结尾包含空格，请点“显示”检查后重新输入');
      return;
    }
    if (mode === 'register' && password !== confirm) {
      showMessage(t('errorPasswordMatch'));
      return;
    }
    if (mode === 'register' && !displayName) {
      showMessage(t('errorName'));
      return;
    }

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
        localStorage.setItem('gyx_pending_profile', JSON.stringify({
          email, display_name: displayName, locale: i18n.locale
        }));
        await window.gyxInvokeFunction('register-member', {
          email,
          password,
          display_name: displayName,
          locale: i18n.locale,
          website: $('registerWebsite')?.value || ''
        });
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await applyPendingProfile(data.user);
        showMessage(t('registerSuccess'), 'success');
        setTimeout(() => { location.href = getNext(); }, 450);
      } else {
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await applyPendingProfile(data.user);
        showMessage(t('authSuccess'), 'success');
        setTimeout(() => { location.href = getNext(); }, 450);
      }
    } catch (error) {
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
    await db.auth.signOut({ scope: 'local' });
    activeUser = null;
    $('activeSession').classList.remove('show');
    $('authForm').classList.remove('hidden');
    $('authPassword').value = '';
    $('confirmPassword').value = '';
    resetPasswordVisibility();
    $('authEmail').focus();
  }

  window.addEventListener('gyx:languagechange', () => setMode(mode));
  document.addEventListener('DOMContentLoaded', async () => {
    initPasswordControls();
    document.querySelectorAll('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => setMode(button.dataset.mode));
    });
    $('authForm').addEventListener('submit', submitAuth);
    $('forgotPasswordButton').addEventListener('click', () => setMode('recover'));
    $('backToLoginButton').addEventListener('click', () => setMode('login'));
    $('switchAccountButton').addEventListener('click', switchAccount);
    setMode(mode);
    await inspectSession();
  });
})();

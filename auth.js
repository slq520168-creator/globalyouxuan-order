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

  function setMode(nextMode) {
    mode = nextMode;
    clearMessage();
    const registering = mode === 'register';
    const recovering = mode === 'recover';
    $('displayNameGroup').classList.toggle('hidden', !registering);
    $('confirmPasswordGroup').classList.toggle('hidden', !registering);
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

  function isValidPassword(password) {
    // 8～10 位，必须同时包含字母和数字
    return /^[A-Za-z0-9]{8,10}$/.test(password) && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
  }

  function authErrorText(error) {
    const status = Number(error?.status || error?.statusCode || error?.context?.status || 0);
    const code = String(error?.code || error?.error_code || error?.name || '').toUpperCase();
    const raw = String(error?.message || error?.msg || error || '');
    const message = raw.toLowerCase();

    // 429 / 频率限制（必须单独显示，不能当成密码错误）
    if (
      status === 429 ||
      code.includes('OVER_REQUEST_RATE') ||
      code.includes('RATE_LIMIT') ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('too many') ||
      message.includes('security purposes') ||
      message.includes('over_request_rate')
    ) {
      return '尝试次数过多，请等待 1～2 分钟后再试（不是密码永久失效）。';
    }

    if (message.includes('email not confirmed') || message.includes('not confirmed') || code.includes('EMAIL_NOT_CONFIRMED')) {
      return '邮箱尚未确认。请先打开注册邮件完成确认，或联系管理员。';
    }

    if (code.includes('ACCOUNT_ALREADY_EXISTS') || message.includes('already registered') || message.includes('already been registered')) {
      return '该邮箱已注册，请直接登录或使用忘记密码。';
    }

    if (message.includes('user not found') || message.includes('no user') || code.includes('USER_NOT_FOUND')) {
      return '账号不存在，请先注册。';
    }

    if (message.includes('invalid login') || message.includes('invalid credentials') || code.includes('INVALID_CREDENTIALS')) {
      return '密码错误。请点“显示”确认没有空格，或使用忘记密码重置。';
    }

    if (code.includes('VALID_EMAIL') || message.includes('invalid email')) return '邮箱格式不正确。';
    if (code.includes('VALID_PASSWORD')) return t('errorPasswordLength');
    if (code.includes('VALID_NAME')) return t('errorName');
    if (message.includes('fetch') || message.includes('network') || message.includes('failed to fetch')) return t('errorNetwork');
    if (message.includes('redirect')) return '回调地址未配置，请检查 Supabase Redirect URLs';
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
    const email = String($('authEmail').value || '').trim().toLowerCase();
    const password = String($('authPassword').value || '').trim();
    const displayName = $('displayName').value.trim();
    const confirm = $('confirmPassword').value;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage(t('errorEmail'));
      return;
    }
    if (mode !== 'recover' && !isValidPassword(password)) {
      showMessage('密码需为 8～10 位，且同时包含数字和字母');
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
        // 固定指向正式重置页，避免落到首页
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
      // 补充 status，便于识别 429
      try {
        if (error && error.status == null && error.context && error.context.status) {
          error.status = error.context.status;
        }
      } catch (e) {}
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
    $('authEmail').focus();
  }

  window.addEventListener('gyx:languagechange', () => setMode(mode));
  document.addEventListener('DOMContentLoaded', async () => {
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

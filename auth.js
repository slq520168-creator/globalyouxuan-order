(() => {
  'use strict';

  const db = window.gyxSupabase;
  const i18n = window.GYXI18N;
  if (!db || !i18n) return;

  const $ = (id) => document.getElementById(id);
  const t = (key) => i18n.t(key);
  let mode = new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login';
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
    $('displayNameGroup').classList.toggle('hidden', !registering);
    $('confirmPasswordGroup').classList.toggle('hidden', !registering);
    $('authPassword').autocomplete = registering ? 'new-password' : 'current-password';
    $('loginTab').classList.toggle('active', !registering);
    $('registerTab').classList.toggle('active', registering);
    $('loginTab').setAttribute('aria-selected', String(!registering));
    $('registerTab').setAttribute('aria-selected', String(registering));
    $('authSubmit').textContent = t(registering ? 'signUp' : 'signIn');
  }

  function authErrorText(error) {
    const code = String(error?.code || error?.message || '').toUpperCase();
    const message = String(error?.message || '').toLowerCase();
    if (code.includes('ACCOUNT_ALREADY_EXISTS')) return t('errorAccountExists');
    if (code.includes('REGISTRATION_RATE_LIMITED')) return t('errorRate');
    if (code.includes('VALID_EMAIL')) return t('errorEmail');
    if (code.includes('VALID_PASSWORD')) return t('errorPasswordLength');
    if (code.includes('VALID_NAME')) return t('errorName');
    if (message.includes('invalid login') || message.includes('invalid credentials')) return t('errorEmailPassword');
    if (message.includes('already registered') || message.includes('already been registered')) return t('errorAccountExists');
    if (message.includes('fetch') || message.includes('network')) return t('errorNetwork');
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
    if (password.length < 8) {
      showMessage(t('errorPasswordLength'));
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
    button.textContent = t(mode === 'register' ? 'signingUp' : 'signingIn');
    try {
      if (mode === 'register') {
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
      button.textContent = t(mode === 'register' ? 'signUp' : 'signIn');
    }
  }

  async function inspectSession() {
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
    $('switchAccountButton').addEventListener('click', switchAccount);
    setMode(mode);
    await inspectSession();
  });
})();

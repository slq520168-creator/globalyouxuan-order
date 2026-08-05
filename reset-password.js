(() => {
  'use strict';

  const db = window.gyxSupabase;
  const i18n = window.GYXI18N;
  if (!db || !i18n) return;

  const $ = (id) => document.getElementById(id);
  const t = (key) => i18n.t(key);
  let recoveryReady = false;

  function showMessage(message, kind = 'error') {
    const element = $('resetPasswordMessage');
    if (!element) return;
    element.textContent = message;
    element.className = `form-message show ${kind}`;
  }

  function setReady(ready) {
    recoveryReady = ready;
    const button = $('resetPasswordSubmit');
    if (button) button.disabled = !ready;
    if (ready) showMessage(t('resetLinkReady'), 'success');
  }

  db.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' || session?.user) setReady(true);
  });

  async function inspectRecovery() {
    const { data } = await db.auth.getSession();
    if (data?.session?.user) {
      setReady(true);
      return;
    }
    setTimeout(async () => {
      const retry = await db.auth.getSession();
      if (retry.data?.session?.user) setReady(true);
      else showMessage(t('resetLinkInvalid'));
    }, 900);
  }

  async function submitNewPassword(event) {
    event.preventDefault();
    if (!recoveryReady) {
      showMessage(t('resetLinkInvalid'));
      return;
    }
    const password = $('newPassword').value;
    const confirm = $('confirmNewPassword').value;
    if (password.length < 8) {
      showMessage(t('errorPasswordLength'));
      return;
    }
    if (password !== confirm) {
      showMessage(t('errorPasswordMatch'));
      return;
    }
    const button = $('resetPasswordSubmit');
    button.disabled = true;
    button.textContent = t('savingNewPassword');
    try {
      const { error } = await db.auth.updateUser({ password });
      if (error) throw error;
      showMessage(t('passwordResetSuccess'), 'success');
      await db.auth.signOut({ scope: 'local' });
      setTimeout(() => { location.replace('login.html'); }, 900);
    } catch (error) {
      const message = String(error?.message || '').toLowerCase();
      showMessage(message.includes('password') ? t('errorPasswordLength') : t('errorGeneric'));
      button.disabled = false;
      button.textContent = t('saveNewPassword');
    }
  }

  window.addEventListener('gyx:languagechange', () => {
    if (recoveryReady) showMessage(t('resetLinkReady'), 'success');
  });
  document.addEventListener('DOMContentLoaded', () => {
    $('resetPasswordForm').addEventListener('submit', submitNewPassword);
    inspectRecovery();
  });
})();

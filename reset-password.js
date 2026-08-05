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

  // 监听恢复事件
  db.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' || (session && session.user)) {
      setReady(true);
    }
  });

  async function inspectRecovery() {
    // 1. 先看当前 session
    try {
      const { data } = await db.auth.getSession();
      if (data?.session?.user) {
        setReady(true);
        return;
      }
    } catch (e) {}

    // 2. 处理 URL 中的 hash token（Supabase 常见格式）
    const hash = window.location.hash || '';
    if (hash.includes('access_token') || hash.includes('type=recovery') || hash.includes('refresh_token')) {
      // supabase-js 会自动从 hash 解析，稍等再查
      setTimeout(async () => {
        try {
          const retry = await db.auth.getSession();
          if (retry.data?.session?.user) {
            setReady(true);
            // 清理地址栏 hash，避免刷新重复
            history.replaceState(null, '', window.location.pathname + window.location.search);
            return;
          }
        } catch (e) {}
        showMessage(t('resetLinkInvalid'));
      }, 1200);
      return;
    }

    // 3. 再等一次
    setTimeout(async () => {
      try {
        const retry = await db.auth.getSession();
        if (retry.data?.session?.user) {
          setReady(true);
          return;
        }
      } catch (e) {}
      showMessage(t('resetLinkInvalid'));
    }, 1500);
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

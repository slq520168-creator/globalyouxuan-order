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

    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const code = params.get('code');

    // 2. PKCE：URL 带 ?code= 时交换会话
    if (code) {
      try {
        const { data, error } = await db.auth.exchangeCodeForSession(code);
        if (!error && (data?.session?.user || data?.user)) {
          setReady(true);
          history.replaceState(null, '', window.location.pathname);
          return;
        }
        if (error) {
          showMessage(error.message || t('resetLinkInvalid'));
          return;
        }
      } catch (e) {
        showMessage(String(e?.message || e) || t('resetLinkInvalid'));
        return;
      }
    }

    // 3. hash token（旧格式）
    if (hash.includes('access_token') || hash.includes('type=recovery') || hash.includes('refresh_token')) {
      setTimeout(async () => {
        try {
          const retry = await db.auth.getSession();
          if (retry.data?.session?.user) {
            setReady(true);
            history.replaceState(null, '', window.location.pathname + window.location.search);
            return;
          }
        } catch (e) {}
        showMessage(t('resetLinkInvalid'));
      }, 1200);
      return;
    }

    // 4. 再等 onAuthStateChange / 自动解析
    setTimeout(async () => {
      try {
        const retry = await db.auth.getSession();
        if (retry.data?.session?.user) {
          setReady(true);
          return;
        }
      } catch (e) {}
      showMessage(t('resetLinkInvalid'));
    }, 2000);
  }

  async function submitNewPassword(event) {
    event.preventDefault();
    if (!recoveryReady) {
      showMessage(t('resetLinkInvalid'));
      return;
    }
    const password = String($('newPassword').value || '').trim();
    const confirm = String($('confirmNewPassword').value || '').trim();
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
      const { data, error } = await db.auth.updateUser({ password });
      if (error) throw error;
      showMessage('密码修改成功，正在进入会员中心…', 'success');
      // 重置成功后会话已是登录态，直接进会员中心，避免再输一次密码
      setTimeout(() => {
        location.replace('member.html');
      }, 800);
    } catch (error) {
      const raw = String(error?.message || error || '');
      const lower = raw.toLowerCase();
      let tip = t('errorGeneric');
      if (lower.includes('same') || lower.includes('different')) tip = '新密码不能与旧密码相同，请换一个';
      else if (lower.includes('session') || lower.includes('expired') || lower.includes('token')) tip = t('resetLinkInvalid');
      else if (lower.includes('weak') || lower.includes('strength')) tip = '密码强度不够，请换更复杂的密码';
      else if (lower.includes('at least') || lower.includes('characters') || lower.includes('length')) tip = t('errorPasswordLength');
      else if (raw) tip = raw;
      showMessage(tip);
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

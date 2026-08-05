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
    const finishOk = () => {
      setReady(true);
      try { history.replaceState(null, '', window.location.pathname); } catch (e) {}
    };

    // 已有会话
    try {
      const { data } = await db.auth.getSession();
      if (data?.session?.user) { finishOk(); return; }
    } catch (e) {}

    const search = window.location.search || '';
    const hash = window.location.hash || '';
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    // 有些客户端会把 hash 转进 search，一并解析
    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

    const code = params.get('code') || hashParams.get('code');
    const tokenHash = params.get('token_hash') || hashParams.get('token_hash');
    const type = params.get('type') || hashParams.get('type') || 'recovery';
    const accessToken = hashParams.get('access_token') || params.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || params.get('refresh_token');

    // PKCE code
    if (code) {
      try {
        const { data, error } = await db.auth.exchangeCodeForSession(code);
        if (error) throw error;
        if (data?.session?.user || data?.user) { finishOk(); return; }
      } catch (e) {
        showMessage(String(e?.message || e || t('resetLinkInvalid')));
        return;
      }
    }

    // token_hash + type=recovery
    if (tokenHash) {
      try {
        const { data, error } = await db.auth.verifyOtp({ token_hash: tokenHash, type: type === 'recovery' ? 'recovery' : type });
        if (error) throw error;
        if (data?.session?.user || data?.user) { finishOk(); return; }
      } catch (e) {
        showMessage(String(e?.message || e || t('resetLinkInvalid')));
        return;
      }
    }

    // 旧版 hash access_token
    if (accessToken && refreshToken) {
      try {
        const { data, error } = await db.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) throw error;
        if (data?.session?.user) { finishOk(); return; }
      } catch (e) {
        showMessage(String(e?.message || e || t('resetLinkInvalid')));
        return;
      }
    }

    // 等待 supabase 自动解析
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      try {
        const { data } = await db.auth.getSession();
        if (data?.session?.user) {
          clearInterval(timer);
          finishOk();
        }
      } catch (e) {}
      if (tries >= 8) {
        clearInterval(timer);
        if (!recoveryReady) {
          showMessage('重置链接无效、已过期，或被邮箱客户端截断。请返回登录页重新发送，并用系统浏览器打开链接。');
        }
      }
    }, 500);
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
    // 超时仍未验证成功时给出明确提示
    setTimeout(() => {
      if (!recoveryReady) {
        showMessage('重置链接无效或已过期，请返回登录页重新发送重置邮件。');
        const btn = $('resetPasswordSubmit');
        if (btn) btn.disabled = true;
      }
    }, 5000);
  });
})();

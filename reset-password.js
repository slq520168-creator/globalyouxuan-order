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
    if (ready && recoveryReady) return; // 避免重复触发
    recoveryReady = ready;
    const button = $('resetPasswordSubmit');
    if (button) button.disabled = !ready;
    if (ready) {
      showMessage(t('resetLinkReady'), 'success');
      try { sessionStorage.removeItem('gyx_reset_jump'); } catch (e) {}
    }
  }

  // 监听恢复事件
  db.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' || (session && session.user)) {
      setReady(true);
    }
  });


  function extractRecoveryFromText(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    try {
      // 完整 URL
      let url;
      try { url = new URL(raw); } catch {
        // 可能是不带协议的
        try { url = new URL(raw.replace(/^\/\//, 'https://')); } catch { url = null; }
      }
      if (url) {
        const p = url.searchParams;
        const hashParams = new URLSearchParams((url.hash || '').replace(/^#/, ''));
        const tokenHash = p.get('token_hash') || p.get('token') || hashParams.get('token_hash') || hashParams.get('token');
        const type = (p.get('type') || hashParams.get('type') || 'recovery').toLowerCase();
        const code = p.get('code') || hashParams.get('code');
        const accessToken = hashParams.get('access_token') || p.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || p.get('refresh_token');
        return { tokenHash, type, code, accessToken, refreshToken };
      }
    } catch (e) {}
    // 正则兜底
    const th = raw.match(/token_hash=([^&\s#]+)/) || raw.match(/[?&]token=([^&\s#]+)/);
    const tp = raw.match(/[?&]type=([^&\s#]+)/);
    const cd = raw.match(/[?&]code=([^&\s#]+)/);
    return {
      tokenHash: th ? decodeURIComponent(th[1]) : null,
      type: tp ? decodeURIComponent(tp[1]) : 'recovery',
      code: cd ? decodeURIComponent(cd[1]) : null,
      accessToken: null,
      refreshToken: null
    };
  }

  async function verifyExtracted(parts) {
    if (!parts) {
      showMessage('请粘贴邮件中的完整链接');
      return false;
    }
    const { tokenHash, type, code, accessToken, refreshToken } = parts;
    try {
      if (tokenHash) {
        const otpType = (type === 'recovery' || type === 'email') ? type : 'recovery';
        const { data, error } = await db.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
        if (error) throw error;
        if (data?.session?.user || data?.user) { setReady(true); return true; }
      }
      if (accessToken && refreshToken) {
        const { data, error } = await db.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) throw error;
        if (data?.session?.user) { setReady(true); return true; }
      }
      if (code) {
        const { data, error } = await db.auth.exchangeCodeForSession(code);
        if (error) throw error;
        if (data?.session?.user || data?.user) { setReady(true); return true; }
      }
      showMessage('链接里没有有效的重置参数，请重新复制完整链接');
      return false;
    } catch (e) {
      const msg = String(e?.message || e || '');
      if (/code verifier|pkce/i.test(msg)) {
        showMessage('该链接需要同浏览器打开。请改用：长按邮件链接复制，粘贴到本页验证。');
      } else {
        showMessage(msg || t('resetLinkInvalid'));
      }
      return false;
    }
  }

  async function inspectRecovery() {
    const finishOk = () => setReady(true);

    const trySession = async () => {
      try {
        const { data } = await db.auth.getSession();
        return data?.session?.user || null;
      } catch (e) {
        return null;
      }
    };

    if (await trySession()) { finishOk(); return; }

    const search = window.location.search || '';
    const hash = window.location.hash || '';
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

    const tokenHash = params.get('token_hash') || hashParams.get('token_hash');
    const type = (params.get('type') || hashParams.get('type') || 'recovery').toLowerCase();
    const code = params.get('code') || hashParams.get('code');
    const accessToken = hashParams.get('access_token') || params.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || params.get('refresh_token');

    // token_hash（若以后开了自定义模板）
    if (tokenHash) {
      try {
        const otpType = (type === 'recovery' || type === 'email') ? type : 'recovery';
        const { data, error } = await db.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
        if (error) throw error;
        if (data?.session?.user || data?.user) { finishOk(); return; }
      } catch (e) {
        showMessage(String(e?.message || e || t('resetLinkInvalid')));
        return;
      }
    }

    // implicit：hash 中的 token
    if (accessToken && refreshToken) {
      try {
        const { data, error } = await db.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (error) throw error;
        if (data?.session?.user) { finishOk(); return; }
      } catch (e) {
        showMessage(String(e?.message || e || t('resetLinkInvalid')));
        return;
      }
    }

    // 给 detectSessionInUrl 时间解析 hash
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      if (await trySession()) {
        clearInterval(timer);
        finishOk();
        return;
      }
      if (tries >= 10) {
        clearInterval(timer);
        if (!recoveryReady) {
          if (code) {
            showMessage('当前邮件链接需要在申请重置的同一浏览器中打开。请用 Safari 打开邮件链接，或稍后再试。');
          } else {
            showMessage(t('resetLinkInvalid'));
          }
        }
      }
    }, 400);
  }

  async function submitNewPassword(event) {
    event.preventDefault();
    if (!recoveryReady) {
      showMessage(t('resetLinkInvalid'));
      return;
    }
    const password = String($('newPassword').value || '').trim();
    const confirm = String($('confirmNewPassword').value || '').trim();
    if (!/^[A-Za-z0-9]{8,10}$/.test(password) || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      showMessage('密码需为 8～10 位，且同时包含数字和字母');
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
    document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        const id = btn.getAttribute('data-toggle-password');
        const input = document.getElementById(id);
        if (!input) return;
        const willShow = input.type === 'password';
        input.type = willShow ? 'text' : 'password';
        btn.textContent = willShow ? '隐藏' : '显示';
      });
    });
    $('resetPasswordForm').addEventListener('submit', submitNewPassword);
    const pasteBtn = $('pasteLinkButton');
    if (pasteBtn) {
      pasteBtn.addEventListener('click', async () => {
        pasteBtn.disabled = true;
        pasteBtn.textContent = '正在验证…';
        const text = ($('pasteResetLink') && $('pasteResetLink').value) || '';
        const ok = await verifyExtracted(extractRecoveryFromText(text));
        pasteBtn.disabled = false;
        pasteBtn.textContent = '验证粘贴的链接';
        if (ok) showMessage(t('resetLinkReady'), 'success');
      });
    }
    inspectRecovery();
    // 超时仍未成功：引导粘贴，不强制禁用（用户还可粘贴验证）
    setTimeout(() => {
      if (!recoveryReady) {
        showMessage('自动验证未成功。请长按邮件中的链接 → 复制 → 粘贴到下方框内 → 点验证。');
      }
    }, 4000);
  });
})();

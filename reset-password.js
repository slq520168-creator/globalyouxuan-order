(()=>{
'use strict';
const db=window.gyxSupabase,I=window.GYXI18N;if(!db||!I)return;
const $=id=>document.getElementById(id);
const tr=(key,fallback)=>{try{const v=I.t(key);return(!v||v===key)?fallback:v}catch{return fallback}};
let recoveryReady=false;
function showMessage(message,kind='error'){const e=$('resetPasswordMessage');if(!e)return;e.textContent=message;e.className=`form-message show ${kind}`}
function setReady(ready){recoveryReady=!!ready;const b=$('resetPasswordSubmit');if(b)b.disabled=!recoveryReady;if(recoveryReady)showMessage(tr('resetLinkReady','链接验证成功，请设置新密码。'),'success')}
async function currentSession(){try{const{data}=await db.auth.getSession();return data?.session||null}catch{return null}}
async function establishRecoverySession(){
  if(await currentSession()){setReady(true);return true}
  const p=new URLSearchParams(location.search||''),h=new URLSearchParams((location.hash||'').replace(/^#/,''));
  const tokenHash=p.get('token_hash')||h.get('token_hash');
  const type=(p.get('type')||h.get('type')||'recovery').toLowerCase();
  const code=p.get('code')||h.get('code');
  const accessToken=h.get('access_token')||p.get('access_token');
  const refreshToken=h.get('refresh_token')||p.get('refresh_token');
  try{
    if(code){const{error}=await db.auth.exchangeCodeForSession(code);if(error)throw error}
    else if(tokenHash){const{error}=await db.auth.verifyOtp({token_hash:tokenHash,type:type==='email'?'email':'recovery'});if(error)throw error}
    else if(accessToken&&refreshToken){const{error}=await db.auth.setSession({access_token:accessToken,refresh_token:refreshToken});if(error)throw error}
    else{showMessage('找回密码链接无效或已过期，请重新发送邮件。');return false}
    if(await currentSession()){setReady(true);try{history.replaceState(null,'',location.pathname)}catch{}return true}
  }catch(e){console.error('PASSWORD_RECOVERY_FAILED',e)}
  showMessage('找回密码链接无效或已过期，请重新发送邮件。');
  return false
}
async function submitNewPassword(event){
  event.preventDefault();
  if(!recoveryReady){showMessage('请重新打开找回密码邮件里的链接。');return}
  const password=String($('newPassword')?.value||''),confirm=String($('confirmNewPassword')?.value||'');
  if(password.length<8||password.length>20){showMessage('新密码请输入 8–20 位。');return}
  if(password!==confirm){showMessage('两次输入的密码不一致。');return}
  const b=$('resetPasswordSubmit');b.disabled=true;b.textContent='正在保存…';
  try{
    const{error}=await db.auth.updateUser({password});if(error)throw error;
    showMessage('密码已修改，请重新登录。','success');
    setTimeout(async()=>{try{await db.auth.signOut({scope:'local'})}catch{}location.replace('login.html')},700)
  }catch(error){
    console.error('PASSWORD_UPDATE_FAILED',error);
    showMessage('密码修改失败，请重新打开找回密码邮件里的链接。');
    b.disabled=false;b.textContent='保存新密码'
  }
}
function init(){
  document.querySelectorAll('[data-toggle-password]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();const input=$(btn.getAttribute('data-toggle-password'));if(!input)return;const show=input.type==='password';input.type=show?'text':'password';btn.textContent=show?tr('hidePassword','隐藏密码'):tr('showPassword','显示密码')}));
  $('resetPasswordForm')?.addEventListener('submit',submitNewPassword);
  const b=$('resetPasswordSubmit');if(b)b.textContent='保存新密码';
  establishRecoverySession();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
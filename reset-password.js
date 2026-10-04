(()=>{
'use strict';
const db=window.gyxSupabase,I=window.GYXI18N;if(!db||!I)return;
const $=id=>document.getElementById(id);
const tr=(key,fallback)=>{try{const v=I.t(key);return(!v||v===key)?fallback:v}catch{return fallback}};
let recoveryReady=false;
function showMessage(message,kind='error'){const e=$('resetPasswordMessage');if(!e)return;e.textContent=message;e.className=`form-message show ${kind}`}
function setReady(ready){recoveryReady=!!ready;const b=$('resetPasswordSubmit');if(b)b.disabled=!recoveryReady;if(recoveryReady)showMessage(tr('resetLinkReady',''),'success')}
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
    else{showMessage(tr('resetLinkInvalid',''));return false}
    if(await currentSession()){setReady(true);try{history.replaceState(null,'',location.pathname)}catch{}return true}
  }catch(e){console.error('PASSWORD_RECOVERY_FAILED',e)}
  showMessage(tr('resetLinkInvalid',''));
  return false
}
async function submitNewPassword(event){
  event.preventDefault();
  if(!recoveryReady){showMessage(tr('resetReopenLink',''));return}
  const password=String($('newPassword')?.value||''),confirm=String($('confirmNewPassword')?.value||'');
  if(password.length<8||password.length>20){showMessage(tr('authCopy014',''));return}
  if(password!==confirm){showMessage(tr('authPasswordMismatch',''));return}
  const b=$('resetPasswordSubmit');b.disabled=true;b.textContent=tr('resetSaving','');
  try{
    const{error}=await db.auth.updateUser({password});if(error)throw error;
    showMessage(tr('resetDone',''),'success');
    setTimeout(async()=>{try{await db.auth.signOut({scope:'local'})}catch{}location.replace('login.html')},700)
  }catch(error){
    console.error('PASSWORD_UPDATE_FAILED',error);
    showMessage(tr('resetUpdateFailed',''));
    b.disabled=false;b.textContent=tr('resetSaveNew','')
  }
}
function init(){
  document.querySelectorAll('[data-toggle-password]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();const input=$(btn.getAttribute('data-toggle-password'));if(!input)return;const show=input.type==='password';input.type=show?'text':'password';btn.textContent=show?tr('hidePassword',''):tr('showPassword','')}));
  $('resetPasswordForm')?.addEventListener('submit',submitNewPassword);
  const b=$('resetPasswordSubmit');if(b)b.textContent=tr('resetSaveNew','');
  const m=$('resetPasswordMessage');if(m&&!m.textContent.trim())m.textContent=tr('checkingResetLink','');
  establishRecoverySession();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
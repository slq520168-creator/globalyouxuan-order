(()=>{
'use strict';
if(window.__GYX_MEMBER_PWA__)return;
window.__GYX_MEMBER_PWA__=1;

let deferredInstall=null;
let swRegistration=null;
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;

function ensureHead(){
  if(!document.querySelector('link[rel="manifest"]')){
    const m=document.createElement('link');m.rel='manifest';m.href='manifest.webmanifest';document.head.appendChild(m);
  }
  if(!document.querySelector('link[rel="apple-touch-icon"]')){
    const i=document.createElement('link');i.rel='apple-touch-icon';i.href='assets/member-logo.webp';document.head.appendChild(i);
  }
  if(!document.querySelector('meta[name="apple-mobile-web-app-capable"]')){
    const a=document.createElement('meta');a.name='apple-mobile-web-app-capable';a.content='yes';document.head.appendChild(a);
  }
  if(!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')){
    const s=document.createElement('meta');s.name='apple-mobile-web-app-status-bar-style';s.content='default';document.head.appendChild(s);
  }
}

async function registerSW(){
  if(!('serviceWorker' in navigator))return null;
  try{swRegistration=await navigator.serviceWorker.register('sw.js',{scope:'./'});return swRegistration}catch(e){console.error('GYX_SW_REGISTER_FAILED',e);return null}
}

function addStyle(){
  if(document.getElementById('gyx-member-pwa-style'))return;
  const s=document.createElement('style');
  s.id='gyx-member-pwa-style';
  s.textContent=`.gyx-pwa-card{display:grid;gap:14px}.gyx-pwa-head{display:flex;align-items:center;gap:12px}.gyx-pwa-logo{width:54px;height:54px;object-fit:cover;border-radius:14px;border:1px solid var(--border,#dfe6f0);background:#fff}.gyx-pwa-copy{min-width:0}.gyx-pwa-copy strong{display:block;font-size:17px}.gyx-pwa-copy small{display:block;margin-top:4px;color:var(--muted,#667085);line-height:1.45}.gyx-pwa-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.gyx-pwa-actions .btn{width:100%;min-height:46px}.gyx-pwa-status{font-size:12px;color:var(--muted,#667085);min-height:18px}@media(max-width:520px){.gyx-pwa-actions{grid-template-columns:1fr}.gyx-pwa-logo{width:50px;height:50px}}`;
  document.head.appendChild(s);
}

function setStatus(text){const el=document.getElementById('gyxPwaStatus');if(el)el.textContent=text||''}

function buildPanel(){
  if(document.getElementById('gyxPwaPanel'))return;
  const main=document.querySelector('.dashboard-main');
  if(!main)return;
  const section=document.createElement('section');
  section.id='gyxPwaPanel';
  section.className='panel';
  section.dataset.foldReady='1';
  section.innerHTML=`<div class="panel-head"><div><h2>手机APP</h2></div></div><div class="gyx-pwa-card"><div class="gyx-pwa-head"><img class="gyx-pwa-logo" src="assets/member-logo.webp" alt="GlobalYouXuan"><div class="gyx-pwa-copy"><strong>GlobalYouXuan</strong><small>添加到手机桌面，打开更方便；开启通知后可接收平台提醒。</small></div></div><div class="gyx-pwa-actions"><button id="gyxInstallApp" class="btn btn-secondary" type="button">添加APP到桌面</button><button id="gyxEnableNotify" class="btn btn-secondary" type="button">开启桌面通知</button></div><div id="gyxPwaStatus" class="gyx-pwa-status"></div></div>`;
  main.appendChild(section);

  document.getElementById('gyxInstallApp')?.addEventListener('click',installApp);
  document.getElementById('gyxEnableNotify')?.addEventListener('click',enableNotify);
  refreshState();
}

function refreshState(){
  const install=document.getElementById('gyxInstallApp');
  const notify=document.getElementById('gyxEnableNotify');
  if(install&&isStandalone()){install.textContent='已添加到桌面';install.disabled=true}
  if(notify&&'Notification' in window&&Notification.permission==='granted')notify.textContent='桌面通知已开启';
}

async function installApp(){
  if(isStandalone()){setStatus('已经从手机桌面打开，无需重复添加。');return}
  if(deferredInstall){
    deferredInstall.prompt();
    const choice=await deferredInstall.userChoice.catch(()=>null);
    deferredInstall=null;
    if(choice?.outcome==='accepted')setStatus('APP 已添加到手机桌面。');
    else setStatus('未完成添加，可稍后再试。');
    return;
  }
  if(isIOS){
    alert('iPhone 添加方法：请用 Safari 打开本站 → 点“分享” → 选择“添加到主屏幕”。添加后桌面会显示 GlobalYouXuan Logo。');
    setStatus('iPhone 需要从 Safari 的“分享 → 添加到主屏幕”完成。');
    return;
  }
  alert('请打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。');
}

async function enableNotify(){
  if(!('Notification' in window)){setStatus('当前浏览器不支持桌面通知。');return}
  if(isIOS&&!isStandalone()){
    alert('iPhone 需要先“添加到主屏幕”，再从桌面打开 GlobalYouXuan，之后才能开启网站通知。');
    setStatus('请先添加APP到手机桌面，再从桌面打开后开启通知。');
    return;
  }
  let permission=Notification.permission;
  if(permission!=='granted')permission=await Notification.requestPermission();
  if(permission!=='granted'){setStatus(permission==='denied'?'通知权限已被拒绝，可到手机设置里重新允许。':'没有开启通知权限。');return}
  const reg=swRegistration||await registerSW();
  try{
    if(reg)await reg.showNotification('GlobalYouXuan',{body:'桌面通知已开启',icon:'assets/member-logo.webp',badge:'assets/member-logo.webp',data:{url:'member.html'}});
    setStatus('桌面通知已开启。');
    refreshState();
  }catch(e){console.error('GYX_NOTIFY_TEST_FAILED',e);setStatus('通知权限已开启。')}
}

window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event;setStatus('当前设备支持直接添加APP到桌面。')});
window.addEventListener('appinstalled',()=>{deferredInstall=null;setStatus('APP 已添加到手机桌面。');refreshState()});

ensureHead();
addStyle();
registerSW();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildPanel,{once:true});else buildPanel();

window.GYXPWA={
  register:registerSW,
  notify:async(title,body='',url='member.html')=>{
    if(!('Notification' in window)||Notification.permission!=='granted')return false;
    const reg=swRegistration||await registerSW();
    if(!reg)return false;
    await reg.showNotification(title||'GlobalYouXuan',{body,icon:'assets/member-logo.webp',badge:'assets/member-logo.webp',data:{url}});
    return true;
  }
};
})();

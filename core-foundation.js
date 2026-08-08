(()=>{
'use strict';
if(window.GYXFoundation)return;
const root=document.documentElement;
const state={keyboardTimer:null};
function ensureStyle(){
 if(document.getElementById('gyx-core-foundation'))return;
 const s=document.createElement('style');s.id='gyx-core-foundation';s.textContent=`
 html{-webkit-text-size-adjust:100%;text-size-adjust:100%;max-width:100%;overflow-x:hidden}
 body{max-width:100vw;overflow-x:hidden}
 input,textarea,select{box-sizing:border-box;max-width:100%;min-width:0}
 @media(max-width:960px){
   input,textarea,select{font-size:16px!important;transform:none!important}
   body{padding-bottom:calc(98px + env(safe-area-inset-bottom,0px))!important}
   .mobile-bottom-nav{position:fixed!important;left:10px!important;right:10px!important;bottom:calc(8px + env(safe-area-inset-bottom,0px))!important;top:auto!important;width:auto!important;height:64px!important;min-height:64px!important;max-height:64px!important;margin:0!important;padding:4px 6px!important;transform:none!important;display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;z-index:100000!important;overflow:hidden!important;isolation:isolate!important}
   .mobile-bottom-nav>a{height:56px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;padding:3px 2px!important;white-space:nowrap!important}
   .mobile-bottom-nav>a>span{height:22px!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:19px!important}
   .mobile-bottom-nav>a>b{font-size:10px!important;line-height:1.1!important}
 }
 `;document.head.appendChild(s);
}
function editable(el){return !!el&&el.matches?.('input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable="true"]')}
function keyboard(){
 document.addEventListener('input',e=>{if(!editable(e.target))return;clearTimeout(state.keyboardTimer);const el=e.target;state.keyboardTimer=setTimeout(()=>{if(document.activeElement===el){try{el.blur()}catch{}}},4000)},true);
 document.addEventListener('focusin',e=>{if(editable(e.target))clearTimeout(state.keyboardTimer)},true);
}
function nav(){
 const tg='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.8 3.7 18.7 19c-.23 1.08-.84 1.34-1.7.84l-4.73-3.49-2.28 2.2c-.25.25-.46.46-.94.46l.34-4.82 8.77-7.93c.38-.34-.08-.53-.59-.19L6.73 12.9l-4.66-1.46c-1.01-.32-1.03-1.01.21-1.5L20.5 2.92c.84-.31 1.58.19 1.3.78Z"/></svg>';
 const mail='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm9 7.1L20.2 7H3.8L12 12.1Zm0 2.3L3 8.8V17h18V8.8l-9 5.6Z"/></svg>';
 document.querySelectorAll('.mobile-bottom-nav').forEach(n=>{n.innerHTML=`<a href="https://t.me/qqyousubot" target="_blank" rel="noopener"><span class="nav-svg">${tg}</span><b>技术指导</b></a><a href="mailto:slq520168@gmail.com"><span class="nav-svg">${mail}</span><b>留言邮箱</b></a><a href="shop.html" class="nav-home"><span>⌂</span><b>首页</b></a><a href="member.html#orders" class="nav-orders"><span>▤</span><b>我的订单</b></a><a href="member.html" class="nav-member"><span>◉</span><b>会员中心</b></a>`;const p=(location.pathname||'').toLowerCase(),h=location.hash||'';if(p.includes('member'))(h==='#orders'?n.querySelector('.nav-orders'):n.querySelector('.nav-member'))?.setAttribute('aria-current','page');else if(p.includes('shop')||p.endsWith('/'))n.querySelector('.nav-home')?.setAttribute('aria-current','page')});
}
function init(){ensureStyle();keyboard();nav();window.addEventListener('hashchange',nav)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.GYXFoundation={nav,refresh:()=>{ensureStyle();nav()}};
})();
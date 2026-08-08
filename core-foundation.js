(()=>{
'use strict';
if(window.GYXFoundation)return;
const state={keyboardTimer:null,raf:0};
const isIOS=(()=>{const ua=navigator.userAgent||'';return /iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)})();
function ensureStyle(){
 if(document.getElementById('gyx-core-foundation'))return;
 const s=document.createElement('style');s.id='gyx-core-foundation';s.textContent=`
 html{-webkit-text-size-adjust:100%;text-size-adjust:100%;max-width:100%;overflow-x:hidden;scroll-behavior:auto!important}
 body{max-width:100vw;overflow-x:hidden}
 input,textarea,select{box-sizing:border-box;max-width:100%;min-width:0}
 .nav-svg svg{width:21px;height:21px;display:block}
 @media(max-width:960px){
   input,textarea,select{font-size:16px!important;transform:none!important}
   body{padding-bottom:calc(92px + env(safe-area-inset-bottom,0px))!important}
   .site-header,.panel,.hero-card,.auth-card,.mobile-bottom-nav,.support-panel{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
   .btn,.module-card,.quiz-option,.order-card,.favorite-card,.mobile-bottom-nav>a{transition:none!important}
   .btn:hover,.module-card:hover,.quiz-option:hover{transform:none!important;filter:none!important}
   .mobile-bottom-nav{position:fixed!important;left:8px!important;right:8px!important;top:auto!important;bottom:calc(8px + env(safe-area-inset-bottom,0px))!important;width:auto!important;height:62px!important;min-height:62px!important;max-height:62px!important;margin:0!important;padding:3px 5px!important;display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;z-index:2147483640!important;overflow:hidden!important;isolation:isolate!important;contain:none!important;will-change:auto!important;transform:none!important}
   .mobile-bottom-nav>a{height:56px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;padding:3px 1px!important;white-space:nowrap!important}
   .mobile-bottom-nav>a>span{height:22px!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:19px!important}
   .mobile-bottom-nav>a>b{font-size:10px!important;line-height:1.1!important}
   .support-fab{bottom:calc(82px + env(safe-area-inset-bottom,0px))!important}
   .music-toggle{bottom:calc(82px + env(safe-area-inset-bottom,0px))!important}
   html.gyx-ios .mobile-bottom-nav{position:absolute!important;bottom:auto!important;transform:none!important;-webkit-transform:none!important}
 }
 `;document.head.appendChild(s);
}
function editable(el){return !!el&&el.matches?.('input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable="true"]')}
function keyboard(){
 document.addEventListener('input',e=>{if(!editable(e.target))return;clearTimeout(state.keyboardTimer);const el=e.target;state.keyboardTimer=setTimeout(()=>{if(document.activeElement===el){try{el.blur()}catch{}}},2000)},true);
 document.addEventListener('focusin',e=>{if(editable(e.target))clearTimeout(state.keyboardTimer)},true);
}
function pinIOSNav(){
 if(!isIOS||innerWidth>960)return;
 cancelAnimationFrame(state.raf);
 state.raf=requestAnimationFrame(()=>{
   document.documentElement.classList.add('gyx-ios');
   const vv=window.visualViewport;
   const viewportTop=window.scrollY+(vv?.offsetTop||0);
   const viewportHeight=vv?.height||window.innerHeight;
   const top=Math.max(0,viewportTop+viewportHeight-70);
   document.querySelectorAll('.mobile-bottom-nav').forEach(n=>{
     if(n.parentElement!==document.body)document.body.appendChild(n);
     n.style.setProperty('position','absolute','important');
     n.style.setProperty('left','8px','important');
     n.style.setProperty('right','8px','important');
     n.style.setProperty('top',top+'px','important');
     n.style.setProperty('bottom','auto','important');
     n.style.setProperty('transform','none','important');
     n.style.setProperty('-webkit-transform','none','important');
     n.style.setProperty('z-index','2147483640','important');
   });
 });
}
function nav(){
 const tg='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.8 3.7 18.7 19c-.23 1.08-.84 1.34-1.7.84l-4.73-3.49-2.28 2.2c-.25.25-.46.46-.94.46l.34-4.82 8.77-7.93c.38-.34-.08-.53-.59-.19L6.73 12.9l-4.66-1.46c-1.01-.32-1.03-1.01.21-1.5L20.5 2.92c.84-.31 1.58.19 1.3.78Z"/></svg>';
 const mail='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm9 7.1L20.2 7H3.8L12 12.1Zm0 2.3L3 8.8V17h18V8.8l-9 5.6Z"/></svg>';
 document.querySelectorAll('.mobile-bottom-nav').forEach(n=>{n.innerHTML=`<a href="https://t.me/qqyousubot" target="_blank" rel="noopener"><span class="nav-svg">${tg}</span><b>技术指导</b></a><a href="mailto:slq520168@gmail.com"><span class="nav-svg">${mail}</span><b>留言邮箱</b></a><a href="shop.html" class="nav-home"><span>⌂</span><b>首页</b></a><a href="member.html#orders" class="nav-orders"><span>▤</span><b>我的订单</b></a><a href="member.html" class="nav-member"><span>◉</span><b>会员中心</b></a>`;const p=(location.pathname||'').toLowerCase(),h=location.hash||'';if(p.includes('member'))(h==='#orders'?n.querySelector('.nav-orders'):n.querySelector('.nav-member'))?.setAttribute('aria-current','page');else if(p.includes('shop')||p.endsWith('/'))n.querySelector('.nav-home')?.setAttribute('aria-current','page')});
 if(isIOS)pinIOSNav();
}
function bindIOSViewport(){
 if(!isIOS)return;
 const update=()=>pinIOSNav();
 window.addEventListener('scroll',update,{passive:true});
 window.addEventListener('resize',update,{passive:true});
 window.addEventListener('orientationchange',update,{passive:true});
 window.addEventListener('pageshow',update,{passive:true});
 if(window.visualViewport){visualViewport.addEventListener('resize',update,{passive:true});visualViewport.addEventListener('scroll',update,{passive:true})}
}
function init(){ensureStyle();const search=document.getElementById('problemInput');if(search)search.minLength=1;keyboard();nav();bindIOSViewport();window.addEventListener('hashchange',()=>{nav();if(isIOS)pinIOSNav()},{passive:true});if(isIOS){setTimeout(pinIOSNav,50);setTimeout(pinIOSNav,300);setTimeout(pinIOSNav,800)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.GYXFoundation={nav,pinNav:pinIOSNav,refresh:()=>{ensureStyle();nav();if(isIOS)pinIOSNav()}};
})();
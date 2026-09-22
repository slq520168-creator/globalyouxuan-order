(()=>{"use strict";
if(window.__GYX_SPEED__)return;window.__GYX_SPEED__=1;
const prefetched=new Set();

function prefetchURL(href,as){try{const u=new URL(href,location.href);if(u.origin!==location.origin)return;if(u.pathname.startsWith('/cdn-cgi/'))return;const key=u.pathname+u.search;if(prefetched.has(key))return;prefetched.add(key);
if(as==='document'){fetch(u,{priority:'low',credentials:'same-origin'}).catch(()=>{})}
else{const l=document.createElement('link');l.rel='prefetch';l.href=u.pathname+u.search;l.as=as||'script';document.head.appendChild(l)}}catch{}}

function warmPage(href){prefetchURL(href,'document')}

function initNavPrefetch(){
  document.querySelectorAll('a[href]').forEach(a=>{
    const href=a.getAttribute('href')||'';
    if(!/^(shop|member|community|free-zone|login)\.html/.test(href))return;
    const fire=()=>warmPage(href);
    a.addEventListener('pointerenter',fire,{passive:true});
    a.addEventListener('touchstart',fire,{passive:true,once:true});
    a.addEventListener('mousedown',fire,{passive:true});
  });
}

function registerSW(){
  if(!('serviceWorker' in navigator))return;
  if(location.protocol!=='https:'&&location.hostname!=='localhost')return;
  navigator.serviceWorker.register('sw.js',{scope:'./'}).catch(e=>console.warn('SW register skipped',e));
}

function warmNextPage(){
  const here=location.pathname.split("/").pop()||"shop.html";
  const order=["shop.html","member.html","community.html","free-zone.html"].filter(p=>p!==here);
  order.forEach(p=>warmPage(p));
  if(here!=="member.html"){
    ["member-accordion.js?v=20260819-unified-copy-1","member.js?v=20260818-single-order-entry-1","member-payment.js?v=20260822-payment-fresh-1","member-bootstrap.js?v=20260917-web-push-1","member-points.js?v=20260819-delivery-i18n-1","member-checkout.js?v=20260917-member-order-unblock-1"].forEach(u=>prefetchURL(u,"script"));
  }
}

function init(){
  initNavPrefetch();
  registerSW();
  const idle=window.requestIdleCallback||(f=>setTimeout(f,300));
  idle(()=>{warmNextPage();initNavPrefetch()},{timeout:2500});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();

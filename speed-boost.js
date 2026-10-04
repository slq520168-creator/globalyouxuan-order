(()=>{"use strict";
// Instant page switching: the service worker (sw.js) precaches every page + hashed asset and serves
// pages stale-while-revalidate. Until it controls the page (first visit), warm the next page on touch.
if(window.__GYX_SPEED__)return;window.__GYX_SPEED__=1;
const PAGES=/^(?:\.\/)?(shop|member|community|free-zone|login|face-translate)(?:\.html)?(?:[?#].*)?$/;
const warmed=new Set();
function warm(href){
  if(navigator.serviceWorker&&navigator.serviceWorker.controller)return; // already served from cache
  const m=PAGES.exec(href||'');if(!m)return;
  const url='/'+m[1]; // pretty URL: avoids the Pages .html -> pretty 308 hop
  if(warmed.has(url))return;warmed.add(url);
  const l=document.createElement('link');l.rel='prefetch';l.href=url;l.as='document';document.head.appendChild(l);
}
function onIntent(e){const a=e.target&&e.target.closest&&e.target.closest('a[href]');if(a)warm(a.getAttribute('href'))}
document.addEventListener('pointerdown',onIntent,{passive:true,capture:true});
document.addEventListener('touchstart',onIntent,{passive:true,capture:true});
document.addEventListener('mouseover',onIntent,{passive:true,capture:true});
function registerSW(){
  if(!('serviceWorker' in navigator))return;
  if(location.protocol!=='https:'&&location.hostname!=='localhost')return;
  navigator.serviceWorker.register('sw.js',{scope:'./'}).catch(e=>console.warn('SW register skipped',e));
}
if(document.readyState==='complete')registerSW();else window.addEventListener('load',registerSW,{once:true});
})();

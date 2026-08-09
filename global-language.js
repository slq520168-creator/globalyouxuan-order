(()=>{
'use strict';
const STORAGE_KEY='gyx_language';
const LEGACY_KEYS=['gyx_locale','language','locale'];
const SUPPORTED=new Set(['zh-CN','en','km']);
let applying=false;
function normalize(v){v=String(v||'').trim();if(v==='zh'||v==='zh_CN'||v==='zh-CN')return'zh-CN';if(v==='en'||v.startsWith('en-'))return'en';if(v==='km'||v.startsWith('km-'))return'km';return'zh-CN'}
function saved(){try{let v=localStorage.getItem(STORAGE_KEY);if(!v){for(const k of LEGACY_KEYS){v=localStorage.getItem(k);if(v)break}}return normalize(v)}catch{return'zh-CN'}}
function persist(v){try{localStorage.setItem(STORAGE_KEY,v);localStorage.setItem('gyx_locale',v)}catch{}}
function i18n(){return window.GYXI18N||null}
function text(key,vars){try{return i18n()?.t?.(key,vars)||''}catch{return''}}
function current(){return normalize(i18n()?.locale||saved())}
function syncSelects(locale){document.querySelectorAll('[data-language-select],select.language-select').forEach(el=>{if(el.value!==locale)el.value=locale})}
function translate(root=document){const api=i18n();if(!api||!root)return;const nodes=[];if(root.nodeType===1&&root.matches?.('[data-i18n],[data-i18n-placeholder],[data-i18n-title],[data-i18n-aria-label]'))nodes.push(root);if(root.querySelectorAll)nodes.push(...root.querySelectorAll('[data-i18n],[data-i18n-placeholder],[data-i18n-title],[data-i18n-aria-label]'));for(const el of nodes){const k=el.getAttribute('data-i18n');if(k){const v=text(k);if(v&&el.textContent!==v)el.textContent=v}const p=el.getAttribute('data-i18n-placeholder');if(p){const v=text(p);if(v&&el.getAttribute('placeholder')!==v)el.setAttribute('placeholder',v)}const ti=el.getAttribute('data-i18n-title');if(ti){const v=text(ti);if(v&&el.getAttribute('title')!==v)el.setAttribute('title',v)}const ar=el.getAttribute('data-i18n-aria-label');if(ar){const v=text(ar);if(v&&el.getAttribute('aria-label')!==v)el.setAttribute('aria-label',v)}}}
function pick(row,base,locale=current()){if(!row)return'';const l=normalize(locale);if(l==='en')return row[base+'_en']||row[base]||'';if(l==='km')return row[base+'_km']||row[base]||'';return row[base]||''}
function emit(locale){window.dispatchEvent(new CustomEvent('gyx:languagechange',{detail:{locale,pick:(row,base)=>pick(row,base,locale)}}))}
function apply(locale,opts={}){if(applying)return;applying=true;locale=normalize(locale);persist(locale);document.documentElement.lang=locale==='km'?'km':locale==='en'?'en':'zh-CN';try{const api=i18n();if(api?.setLanguage&&api.locale!==locale)api.setLanguage(locale)}catch{}syncSelects(locale);translate(document);applying=false;if(opts.emit!==false)emit(locale)}
function change(locale){apply(locale)}
function bind(){document.addEventListener('change',e=>{const el=e.target?.closest?.('[data-language-select],select.language-select');if(el)change(el.value)},true);document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-language],[data-set-lang]');if(!b)return;const v=b.getAttribute('data-language')||b.getAttribute('data-set-lang');if(SUPPORTED.has(normalize(v)))change(v)},true)}
function init(){bind();apply(saved(),{emit:false});setTimeout(()=>emit(current()),0)}
window.GYXLanguage={current,change,apply,pick,translate};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
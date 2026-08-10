(()=>{
'use strict';
const STORAGE='gyx_locale';
const VALID=new Set(['zh-CN','en','km']);
function get(){try{const v=localStorage.getItem(STORAGE);return VALID.has(v)?v:'zh-CN'}catch{return'zh-CN'}}
function set(lang){if(!VALID.has(lang))return;try{localStorage.setItem(STORAGE,lang)}catch{}document.documentElement.lang=lang;window.dispatchEvent(new CustomEvent('gyx:localechange',{detail:{locale:lang}}));window.dispatchEvent(new CustomEvent('gyx:languagechange',{detail:{locale:lang}}))}
function apply(){document.documentElement.lang=get()}
function translate(text){return String(text??'')}
window.GYXLocale={get,set,apply,translate,refresh:apply};
apply();
})();
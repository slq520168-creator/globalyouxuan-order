(()=>{'use strict';
let bypass=false;
const protectedSelector='#saveSearchButton,#favoriteButton,#orderAnswerButton,#fixedDetailFavorite,#fixedDetailOrder,#homeRegisterSupportAction,.gyx-extra-strip,a[href^="member.html"]';
async function user(){try{return await window.gyxGetVerifiedUser?.()||null}catch{return null}}
function knownMember(){try{return localStorage.getItem('gyx_known_member')==='1'}catch{return false}}
function authUrl(next='shop.html'){if(typeof window.gyxAuthEntryUrl==='function')return window.gyxAuthEntryUrl(next);return `login.html?mode=${knownMember()?'login':'register'}&next=${encodeURIComponent(next)}`}
async function openGuestRegister(){if(typeof window.GYX_OPEN_REGISTER_INLINE==='function'){await window.GYX_OPEN_REGISTER_INLINE();return true}if(typeof window.GYX_ENTRY_AUTH?.open==='function'){window.GYX_ENTRY_AUTH.open('register');return true}return false}
function isHome(href){return !href||href==='#'||/^shop\.html(?:[?#].*)?$/i.test(href)}
function isPublicBrowse(href){return /^(community|free-zone)\.html(?:[?#].*)?$/i.test(href)}
document.addEventListener('click',async e=>{
 const target=e.target.closest?.(protectedSelector);if(!target||bypass)return;
 const href=target.getAttribute?.('href')||'';
 const next=href&&/^member\.html/i.test(href)?href:'shop.html';
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 const u=await user();
 if(!u){
   if(await openGuestRegister())return;
   location.href=authUrl(next);return;
 }
 bypass=true;try{if(target.tagName==='A'&&href&&!href.startsWith('#'))location.href=href;else target.click()}finally{setTimeout(()=>{bypass=false},0)}
},true);
// Visitor landing rule: before registration/login, only Home and the controls inside the
// registration/login overlay may operate. Protected bottom-nav destinations never switch
// the underlying page first; the auth overlay opens on the current home page.
document.addEventListener('click',async e=>{
 const a=e.target.closest?.('.mobile-bottom-nav a');if(!a||bypass)return;
 const href=a.getAttribute('href')||'';
 if(isHome(href)||isPublicBrowse(href))return;
 const u=await user();if(u)return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 if(await openGuestRegister())return;
 location.href=authUrl('shop.html');
},true);
})();

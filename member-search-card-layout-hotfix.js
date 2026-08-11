(()=>{"use strict";
const STYLE_ID="gyx-member-search-card-layout-hotfix";
function ensureStyle(){if(document.getElementById(STYLE_ID))return;const s=document.createElement("style");s.id=STYLE_ID;s.textContent=`
.member-page #searchHistoryList .search-history-card{position:relative!important;padding-top:54px!important}
.member-page #searchHistoryList .search-history-head{display:grid!important;grid-template-columns:1fr!important;gap:5px!important;position:static!important}
.member-page #searchHistoryList .search-history-controls{display:contents!important}
.member-page #searchHistoryList .history-order-btn{position:absolute!important;left:11px!important;top:11px!important;margin:0!important;z-index:2!important}
.member-page #searchHistoryList .history-delete-btn{position:absolute!important;right:11px!important;top:11px!important;margin:0!important;z-index:2!important}
.member-page #searchHistoryList .member-search-pick{order:2!important;margin:1px 0 0!important}
.member-page #searchHistoryList .search-history-head>div:not(.search-history-controls){order:1!important;min-width:0!important;text-align:left!important}
.member-page #searchHistoryList .search-history-head>div:not(.search-history-controls)>strong{display:block!important;margin:0!important;line-height:1.35!important}
.member-page #searchHistoryList .search-history-head>div:not(.search-history-controls)>.muted{margin:5px 0 0!important;line-height:1.35!important}
.member-page #searchHistoryList .search-final{margin-top:7px!important}
@media(max-width:430px){.member-page #searchHistoryList .search-history-card{padding-top:51px!important}.member-page #searchHistoryList .history-order-btn,.member-page #searchHistoryList .history-delete-btn{top:10px!important}}
`;
document.head.appendChild(s)}
function cleanPunctuation(root=document){root.querySelectorAll?.("#searchHistoryList .search-final p").forEach(p=>{for(const n of p.childNodes){if(n.nodeType!==Node.TEXT_NODE)continue;const old=n.nodeValue||"";const next=old.replace(/。\s*、+/g,"。").replace(/、+\s*。/g,"。").replace(/，\s*、+/g,"，").replace(/、{2,}/g,"、");if(next!==old)n.nodeValue=next}})}
function apply(){ensureStyle();cleanPunctuation(document)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
const target=document.getElementById("searchHistoryList")||document.body;new MutationObserver(m=>{for(const x of m){for(const n of x.addedNodes){if(n.nodeType===1)cleanPunctuation(n.parentElement||document)}}}).observe(target,{childList:true,subtree:true});
})();
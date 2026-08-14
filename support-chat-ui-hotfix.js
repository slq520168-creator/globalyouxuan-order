(()=>{'use strict';function apply(){const p=document.getElementById('supportPanel');if(!p)return;if(!document.getElementById('gyx-support-chat-ui-hotfix-style')){const s=document.createElement('style');s.id='gyx-support-chat-ui-hotfix-style';s.textContent=`
#supportPanel.support-panel{height:min(78dvh,760px)!important;max-height:calc(100dvh - 150px)!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;padding:18px 16px 14px!important}
#supportPanel .eyebrow{margin:0 0 4px!important;font-size:12px!important;line-height:1.25!important}
#supportPanel h2{margin:0 42px 10px 0!important;font-size:20px!important;line-height:1.25!important}
#supportPanel .support-ai-list{flex:1 1 auto!important;min-height:0!important;max-height:none!important;overflow-y:auto!important;overflow-x:hidden!important;display:flex!important;flex-direction:column!important;gap:10px!important;padding:6px 2px 10px!important;scroll-behavior:smooth!important}
#supportPanel .support-ai-msg{position:relative!important;display:block!important;flex:0 0 auto!important;width:auto!important;max-width:88%!important;min-height:44px!important;height:auto!important;overflow:visible!important;box-sizing:border-box!important;margin:0!important;padding:9px 12px 20px 42px!important;border-radius:14px!important;font-size:14px!important;line-height:1.48!important;white-space:normal!important;word-break:break-word!important;overflow-wrap:anywhere!important}
#supportPanel .support-ai-msg.user{align-self:flex-end!important;margin-left:auto!important;padding:9px 42px 20px 12px!important}
#supportPanel .support-ai-msg.assistant{align-self:flex-start!important;margin-right:auto!important}
#supportPanel .support-ai-msg>b{display:block!important;margin:0 0 3px!important;font-size:11px!important;line-height:1.2!important;opacity:.62!important}
#supportPanel .support-ai-msg>div:not(.support-avatar):not(.support-time){display:block!important;position:static!important;height:auto!important;min-height:0!important;max-height:none!important;margin:0!important;padding:0!important;line-height:1.48!important;white-space:pre-wrap!important;word-break:break-word!important;overflow:visible!important}
#supportPanel .support-avatar{position:absolute!important;top:9px!important;left:8px!important;width:26px!important;height:26px!important;border-radius:50%!important;overflow:hidden!important;display:grid!important;place-items:center!important;font-size:10px!important;z-index:1!important}
#supportPanel .support-ai-msg.user .support-avatar{left:auto!important;right:8px!important}
#supportPanel .support-avatar img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important}
#supportPanel .support-time{display:none!important}
#supportPanel .support-msg-time{display:block!important;position:absolute!important;left:42px!important;bottom:5px!important;margin:0!important;font-size:10px!important;line-height:1!important;opacity:.52!important;white-space:nowrap!important}
#supportPanel .support-ai-msg.user .support-msg-time{left:auto!important;right:42px!important;text-align:right!important}
#supportPanel .support-ai-form{flex:0 0 auto!important;display:flex!important;gap:8px!important;align-items:flex-end!important;margin:0!important;padding-top:8px!important;background:inherit!important}
#supportPanel .support-ai-input{min-height:52px!important;max-height:82px!important;font-size:14px!important;line-height:1.4!important;padding:10px 12px!important;resize:none!important}
#supportPanel .support-ai-send{height:44px!important;min-width:70px!important;font-size:14px!important}
@media(max-width:430px){#supportPanel.support-panel{height:80dvh!important;max-height:calc(100dvh - 120px)!important;left:14px!important;right:14px!important;width:auto!important}#supportPanel .support-ai-msg{max-width:90%!important;font-size:13.5px!important}}
`;document.head.appendChild(s)}
const list=document.getElementById('supportAiList');if(list){const fix=()=>{list.querySelectorAll('.support-ai-msg').forEach(m=>{m.style.height='auto';m.style.minHeight='44px';m.style.overflow='visible';const old=[...m.querySelectorAll('.support-time')];old.forEach(x=>x.remove());const keep=[...m.querySelectorAll('.support-msg-time')];if(keep.length>1)keep.slice(1).forEach(x=>x.remove())});list.scrollTop=list.scrollHeight};fix();new MutationObserver(()=>requestAnimationFrame(fix)).observe(list,{childList:true,subtree:true,characterData:true})}
if(!window.__gyxProfileFinalLoaded){window.__gyxProfileFinalLoaded=true;const sc=document.createElement('script');sc.src='support-profile-final.js?v=20260811-final-1';sc.async=false;document.body.appendChild(sc)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();})();

(()=>{
  if(window.__GYX_SUPPORT_VISUAL_VIEWPORT_FIX__||!window.visualViewport)return;
  window.__GYX_SUPPORT_VISUAL_VIEWPORT_FIX__=true;
  const panel=document.getElementById('supportPanel');
  if(!panel)return;
  const props=['height','max-height','top','bottom'];
  const original={};
  props.forEach(name=>{original[name]={value:panel.style.getPropertyValue(name),priority:panel.style.getPropertyPriority(name)}});
  const isInputFocused=()=>document.activeElement?.matches?.('#homeRegisterSupportInput, .support-ai-input');
  const isPanelOpen=()=>panel.classList.contains('show')||panel.classList.contains('open');
  const restore=()=>{
    props.forEach(name=>{
      const x=original[name];
      if(x.value)panel.style.setProperty(name,x.value,x.priority||'');
      else panel.style.removeProperty(name);
    });
  };
  const adjust=()=>{
    if(!isPanelOpen()||!isInputFocused()){restore();return;}
    const vv=window.visualViewport;
    const h=Math.max(280,vv.height-20);
    panel.style.setProperty('height',h+'px','important');
    panel.style.setProperty('max-height',h+'px','important');
    panel.style.setProperty('top',(vv.offsetTop+10)+'px','important');
    panel.style.setProperty('bottom','auto','important');
    const list=document.getElementById('supportAiList');
    if(list)list.scrollTop=list.scrollHeight;
  };
  window.visualViewport.addEventListener('resize',adjust,{passive:true});
  window.visualViewport.addEventListener('scroll',adjust,{passive:true});
  document.addEventListener('focusin',e=>{
    if(e.target?.matches?.('#homeRegisterSupportInput, .support-ai-input')){
      setTimeout(adjust,50);
      setTimeout(adjust,300);
    }
  },true);
  document.addEventListener('focusout',e=>{
    if(e.target?.matches?.('#homeRegisterSupportInput, .support-ai-input'))setTimeout(restore,80);
  },true);
  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-support-close]'))setTimeout(restore,0);
  },true);
})();
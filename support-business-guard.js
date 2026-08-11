(()=>{'use strict';
if(window.__gyxSupportBootstrapLoaded)return;
window.__gyxSupportBootstrapLoaded=true;
window.GYX_SUPPORT_MASTER_ACTIVE=true;

function loadOnce(id,src){
  if(document.getElementById(id))return;
  const s=document.createElement('script');
  s.id=id;
  s.src=src;
  s.async=false;
  s.onerror=()=>console.error(id+' load failed');
  document.body.appendChild(s);
}

loadOnce('gyx-support-master-v4-script','support-master-v4.js?v=20260812-single-controller-1');
// 审核结果监听由 shop.html 唯一加载；这里不再重复加载。
})();
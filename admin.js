(()=>{
'use strict';
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));

function showPanel(name){
  $$('.admin-panel-v2').forEach(p=>p.classList.add('hidden'));
  const target=$('#'+name+'Panel');
  if(target)target.classList.remove('hidden');
  $$('.admin-nav-v2 [data-panel]').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));
  try{history.replaceState(null,'','#'+name)}catch{}
}

function bindNavigation(){
  $$('.admin-nav-v2 [data-panel]').forEach(btn=>btn.addEventListener('click',()=>showPanel(btn.dataset.panel)));
  const initial=(location.hash||'#dashboard').slice(1);
  const allowed=new Set($$('.admin-nav-v2 [data-panel]').map(b=>b.dataset.panel));
  showPanel(allowed.has(initial)?initial:'dashboard');
  window.addEventListener('hashchange',()=>{
    const name=(location.hash||'#dashboard').slice(1);
    if(allowed.has(name))showPanel(name);
  });
}

async function checkSupabase(){
  const el=document.querySelector('[data-service="supabase"]');
  if(!el)return;
  if(!window.gyxSupabase){el.textContent='客户端未加载';return;}
  try{
    const {error}=await window.gyxSupabase.from('products').select('id',{head:true,count:'exact'}).limit(1);
    if(error)throw error;
    el.textContent='连接正常';
  }catch(err){
    el.textContent='已加载客户端，数据权限/连接待检查';
  }
}

function exposeArchitecture(){
  window.GYXAdmin=Object.freeze({
    version:'control-center-v1',
    responsibilities:Object.freeze({
      core:['auth','navigation','input','modal','mobile'],
      business:['ai-search','fixed-modules','favorites','member-orders','messages'],
      admin:['members','orders','products','answers','fixed-modules','messages','delivery','settings','services'],
      services:['supabase','payment-verification','worker','telegram','delivery']
    }),
    showPanel
  });
}

function init(){bindNavigation();exposeArchitecture();checkSupabase();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

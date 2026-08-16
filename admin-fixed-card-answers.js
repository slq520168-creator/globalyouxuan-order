(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const CARD_DEFS=[
  {key:'web',name:'网站建设',lead:'扩大影响 · 提升赚钱能力',prefix:'web-'},
  {key:'automation',name:'智控未来',lead:'自动执行 · 提升工作效率',prefix:'automation-'},
  {key:'ai',name:'量化感知',lead:'数据分析 · 提升决策能力',prefix:'ai-'},
  {key:'digital',name:'数字学院',lead:'掌握技能 · 提升赚钱能力',prefix:'digital-'}
];
let answers=[];
let editing=null;
async function api(body){
  const {data}=await window.gyxSupabase.auth.getSession();
  const s=data?.session;
  if(!s){location.replace('admin-login.html');throw new Error('请先登录管理员账号');}
  const r=await fetch('https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/admin-api',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.access_token},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error)throw new Error(j.message||j.error||'后台接口请求失败');
  return j;
}
function style(){
  if($('#fixedCardAdminStyle'))return;
  const s=document.createElement('style');s.id='fixedCardAdminStyle';s.textContent=`
  .fixed-card-admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.fixed-card-admin{border:1px solid #dfe6f0;border-radius:18px;background:#fff;overflow:hidden}.fixed-card-admin-head{padding:16px;background:#f8fbff;border-bottom:1px solid #e4ebf4}.fixed-card-admin-head h3{margin:0;color:#c8242f;font-size:22px}.fixed-card-admin-head p{margin:5px 0 0;color:#475467;font-size:13px}.fixed-card-answer-list{display:grid;gap:10px;padding:12px}.fixed-card-answer{border:1px solid #e5eaf0;border-radius:13px;padding:12px;background:#fff}.fixed-card-answer h4{margin:0 0 6px;font-size:14px;color:#172033}.fixed-card-answer p{margin:0 0 8px;color:#667085;font-size:12px;line-height:1.55}.fixed-card-answer-meta{display:flex;gap:7px;flex-wrap:wrap;align-items:center;font-size:11px;color:#667085}.fixed-card-answer-meta b{color:#344054}.fixed-card-answer-actions{display:flex;gap:7px;margin-top:10px;flex-wrap:wrap}.fixed-card-empty{padding:18px;color:#98a2b3;text-align:center;font-size:13px}.fixed-answer-modal{position:fixed;inset:0;z-index:5000;background:rgba(16,24,40,.52);display:flex;align-items:flex-end;justify-content:center}.fixed-answer-modal.hidden{display:none!important}.fixed-answer-card{width:min(820px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:22px 22px 0 0;padding:16px;box-sizing:border-box}.fixed-answer-card h3{margin:0}.fixed-answer-form{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.fixed-answer-field{display:flex;flex-direction:column;gap:5px}.fixed-answer-field.full{grid-column:1/-1}.fixed-answer-field label{font-size:12px;color:#667085;font-weight:700}.fixed-answer-field input,.fixed-answer-field textarea,.fixed-answer-field select{border:1px solid #d9e1ec;border-radius:10px;padding:10px;font:inherit;color:#172033;background:#fff;box-sizing:border-box;width:100%}.fixed-answer-field textarea[name="answer_detail_zh"]{min-height:44vh;line-height:1.6}.fixed-answer-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px;position:sticky;bottom:0;background:#fff;padding:10px 0 2px}.fixed-card-toolbar{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}.fixed-card-toolbar p{margin:0;color:#667085;font-size:13px}@media(max-width:780px){.fixed-card-admin-grid{grid-template-columns:1fr}.fixed-answer-form{grid-template-columns:1fr}.fixed-answer-field.full{grid-column:auto}.fixed-card-admin-head h3{font-size:20px}}
  `;document.head.appendChild(s);
}
function ensureModal(){
  let m=$('#fixedAnswerModal');if(m)return m;
  m=document.createElement('div');m.id='fixedAnswerModal';m.className='fixed-answer-modal hidden';m.innerHTML=`<div class="fixed-answer-card"><div class="modal-head"><h3 id="fixedAnswerTitle">编辑答案</h3><button type="button" class="refresh-btn" data-fixed-close>关闭</button></div><form id="fixedAnswerForm" class="fixed-answer-form"><div class="fixed-answer-field full"><label>标题</label><input name="title"></div><div class="fixed-answer-field full"><label>摘要</label><textarea name="answer_summary" rows="3"></textarea></div><div class="fixed-answer-field"><label>产品ID</label><input name="product_id"></div><div class="fixed-answer-field"><label>优先级</label><input name="priority" type="number"></div><div class="fixed-answer-field full"><label>关键词（逗号分隔）</label><textarea name="keywords" rows="2"></textarea></div><div class="fixed-answer-field full"><label>中文完整交付内容</label><textarea name="answer_detail_zh"></textarea></div><div class="fixed-answer-field"><label>启用</label><select name="is_active"><option value="true">是</option><option value="false">否</option></select></div><div class="fixed-answer-field"><label>内容版本</label><input name="content_version" type="number"></div></form><div class="fixed-answer-actions"><button type="button" class="refresh-btn" data-fixed-close>取消</button><button type="button" class="primary-btn" id="fixedAnswerSave">保存修改</button></div></div>`;
  document.body.appendChild(m);
  m.querySelectorAll('[data-fixed-close]').forEach(b=>b.onclick=()=>m.classList.add('hidden'));
  $('#fixedAnswerSave').onclick=save;
  return m;
}
function openEditor(row){
  editing=row;const m=ensureModal(),f=$('#fixedAnswerForm');
  $('#fixedAnswerTitle').textContent='编辑答案 · '+(row.title||'未命名');
  ['title','answer_summary','product_id','priority','answer_detail_zh','is_active','content_version'].forEach(k=>{const el=f.elements[k];if(el)el.value=k==='is_active'?String(row[k]!==false):(row[k]??'');});
  f.elements.keywords.value=Array.isArray(row.keywords)?row.keywords.join('，'):(row.keywords||'');
  m.classList.remove('hidden');
}
async function save(){
  if(!editing)return;const f=$('#fixedAnswerForm'),btn=$('#fixedAnswerSave');btn.disabled=true;btn.textContent='保存中…';
  try{
    const data={...editing,title:f.elements.title.value.trim(),answer_summary:f.elements.answer_summary.value.trim(),product_id:f.elements.product_id.value.trim(),priority:Number(f.elements.priority.value)||0,keywords:f.elements.keywords.value.split(/[，,]/).map(x=>x.trim()).filter(Boolean),answer_detail_zh:f.elements.answer_detail_zh.value,is_active:f.elements.is_active.value==='true',content_version:Number(f.elements.content_version.value)||1};
    delete data.created_at;delete data.updated_at;
    await api({action:'save',resource:'answers',data,original_pk:editing.id});
    $('#fixedAnswerModal').classList.add('hidden');
    await loadCards();
  }catch(e){alert('保存失败：'+e.message)}finally{btn.disabled=false;btn.textContent='保存修改';}
}
function answerHtml(r){
  const len=(r.answer_detail_zh||'').length;
  return `<article class="fixed-card-answer"><h4>${esc(r.title||'未命名答案')}</h4><p>${esc(r.answer_summary||'暂无摘要')}</p><div class="fixed-card-answer-meta"><span>产品：<b>${esc(r.product_id||'—')}</b></span><span>正文：<b>${len} 字符</b></span><span>优先级：<b>${esc(r.priority)}</b></span><span>${r.is_active===false?'已停用':'已启用'}</span></div><div class="fixed-card-answer-actions"><button type="button" class="edit-btn" data-fixed-answer-id="${esc(r.id)}">编辑答案</button></div></article>`;
}
function render(){
  const box=$('[data-table="fixed"]');if(!box)return;
  box.className='';
  box.innerHTML=`<div class="fixed-card-toolbar"><p>这里直接管理首页四张固定卡片对应的答案。点“编辑答案”即可修改完整交付内容。</p><button type="button" class="refresh-btn" id="fixedCardRefresh">刷新</button></div><div class="fixed-card-admin-grid">${CARD_DEFS.map(c=>{const rows=answers.filter(r=>String(r.product_id||'').startsWith(c.prefix)).sort((a,b)=>(b.priority||0)-(a.priority||0));return `<section class="fixed-card-admin"><header class="fixed-card-admin-head"><h3>${esc(c.name)}</h3><p>${esc(c.lead)} · ${rows.length} 条答案</p></header><div class="fixed-card-answer-list">${rows.length?rows.map(answerHtml).join(''):`<div class="fixed-card-empty">当前还没有绑定到这张卡片的答案</div>`}</div></section>`}).join('')}</div>`;
  $('#fixedCardRefresh').onclick=loadCards;
  box.querySelectorAll('[data-fixed-answer-id]').forEach(b=>b.onclick=()=>{const r=answers.find(x=>String(x.id)===String(b.dataset.fixedAnswerId));if(r)openEditor(r)});
}
async function loadCards(){
  const box=$('[data-table="fixed"]');if(!box)return;box.innerHTML='<div class="loading">正在读取四张卡片答案…</div>';
  try{const j=await api({action:'list',resource:'answers',limit:1000});answers=j.data||[];render()}catch(e){box.innerHTML='<div class="empty">'+esc(e.message)+'</div>'}
}
function activate(){
  const panel=$('#fixedPanel'),btn=$('.admin-nav-v2 [data-panel="fixed"]');if(!panel||!btn)return;
  panel.querySelector('.admin-section-title h2').textContent='固定模块 · 四卡片答案管理';
  panel.querySelector('.admin-section-title').insertAdjacentHTML('beforeend','<p>四张卡片与前台一一对应，答案直接在这里查看和编辑。</p>');
  const strip=panel.querySelector('.manage-strip');if(strip)strip.style.display='none';
  const old=btn.onclick;
  btn.onclick=async e=>{if(old)old.call(btn,e);setTimeout(loadCards,0)};
  if(location.hash==='#fixed')setTimeout(loadCards,0);
}
function init(){style();ensureModal();activate()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
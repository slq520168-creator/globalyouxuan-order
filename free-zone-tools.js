(()=>{
'use strict';
const DATA=[
  {cat:'AI',region:'国内',name:'豆包',url:'https://www.doubao.com',desc:'多功能智能对话与写作助手'},
  {cat:'AI',region:'国外',name:'ChatGPT',url:'https://chatgpt.com',desc:'领先的AI大语言与推理模型'},
  {cat:'AI视频',region:'国内',name:'可灵AI',url:'https://klingai.kuaishou.com',desc:'文本与图片生成高清视频'},
  {cat:'AI视频',region:'国外',name:'Runway',url:'https://runwayml.com',desc:'领先的AI视频生成与编辑'},
  {cat:'作图软件',region:'国内',name:'稿定设计',url:'https://www.gaoding.com',desc:'在线平面设计与海报模板工具'},
  {cat:'作图软件',region:'国外',name:'Photopea',url:'https://www.photopea.com',desc:'网页版免费PS修图软件'},
  {cat:'VPN',region:'国内',name:'闪电加速器',url:'https://shandiandown.com',desc:'网络加速与游戏优化工具'},
  {cat:'VPN',region:'国外',name:'Proton VPN',url:'https://protonvpn.com',desc:'无限流量的安全开源VPN'},
  {cat:'做歌',region:'国内',name:'网易BeatSoul',url:'https://beats.music.163.com',desc:'音乐创作与编曲辅助平台'},
  {cat:'做歌',region:'国外',name:'Suno AI',url:'https://suno.com',desc:'输入描述一键生成完整歌曲'},
  {cat:'视频',region:'国内',name:'剪映',url:'https://www.jianying.com',desc:'智能剪辑与视频特效创作'},
  {cat:'视频',region:'国外',name:'CapCut',url:'https://www.capcut.com',desc:'海外版全功能视频剪辑工具'}
];
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function ensureStyle(){if(document.getElementById('free-zone-tools-style'))return;const s=document.createElement('style');s.id='free-zone-tools-style';s.textContent=`.free-tools-wrap{display:grid;gap:14px}.free-tools-group{display:grid;gap:9px}.free-tools-title{margin:0;font-size:16px;font-weight:900;color:var(--member-text,var(--text))}.free-tools-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.free-tool-card{display:grid;gap:7px;padding:12px;border:1px solid var(--member-border,var(--line));border-radius:14px;background:var(--member-card,var(--panel-strong));min-width:0}.free-tool-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.free-tool-name{font-size:15px;font-weight:900;line-height:1.25}.free-tool-region{flex:0 0 auto;padding:3px 7px;border-radius:999px;background:var(--member-soft,#eef5ff);color:var(--member-accent,#1478ff);font-size:10px;font-weight:800}.free-tool-desc{margin:0;color:var(--member-muted,var(--muted));font-size:12px;line-height:1.45}.free-tool-link{display:inline-flex;align-items:center;justify-content:center;min-height:36px;margin-top:2px;padding:0 11px;border-radius:10px;background:var(--member-accent,#1478ff);color:#fff!important;font-size:12px;font-weight:850;text-decoration:none!important}@media(max-width:600px){.free-tools-grid{grid-template-columns:1fr}.free-tool-card{padding:11px}.free-tools-wrap{gap:13px}}`;document.head.appendChild(s)}
function updateCount(){const section=document.getElementById('freeZone');if(!section)return;const existingBase=20;const total=existingBase+DATA.length;const badge=section.querySelector(':scope > .member-fold-head .member-count-badge');if(badge)badge.textContent=String(total);const brief=section.querySelector(':scope > .member-fold-head .member-fold-brief');if(brief)brief.textContent=`共${total}条`}
function render(){const host=document.getElementById('freeZoneList');if(!host||host.querySelector('[data-free-tools-batch="20260813"]'))return;ensureStyle();const wrap=document.createElement('div');wrap.className='free-tools-wrap';wrap.dataset.freeToolsBatch='20260813';const cats=[...new Set(DATA.map(x=>x.cat))];for(const cat of cats){const group=document.createElement('section');group.className='free-tools-group';const h=document.createElement('h3');h.className='free-tools-title';h.textContent=cat;const grid=document.createElement('div');grid.className='free-tools-grid';for(const item of DATA.filter(x=>x.cat===cat)){const card=document.createElement('article');card.className='free-tool-card';card.innerHTML=`<div class="free-tool-top"><strong class="free-tool-name">${esc(item.name)}</strong><span class="free-tool-region">${esc(item.region)}</span></div><p class="free-tool-desc">${esc(item.desc)}</p><a class="free-tool-link" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">打开网站</a>`;grid.appendChild(card)}group.append(h,grid);wrap.appendChild(group)}host.appendChild(wrap);updateCount()}
function init(){render();setTimeout(render,300);setTimeout(updateCount,500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
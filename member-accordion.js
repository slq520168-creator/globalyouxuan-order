(()=>{
'use strict';

function q(s,r=document){return r.querySelector(s)}
function qa(s,r=document){return [...r.querySelectorAll(s)]}

function makeChevron(){const s=document.createElement('span');s.className='member-fold-chevron';s.textContent='⌄';return s}

function setupProfile(){
 const card=q('.profile-card');
 if(!card||card.dataset.foldReady==='1')return;
 card.dataset.foldReady='1';
 const children=[...card.children];
 const body=document.createElement('div');
 body.className='member-fold-body profile-fold-body';
 children.forEach(n=>body.appendChild(n));
 const header=document.createElement('button');
 header.type='button';header.className='member-fold-head profile-fold-head';header.setAttribute('aria-expanded','false');
 const title=document.createElement('span');title.className='member-fold-title';title.textContent='我的资料';
 const brief=document.createElement('span');brief.className='member-fold-brief';brief.textContent='账号、会员编号、联系方式';
 const left=document.createElement('span');left.className='member-fold-labels';left.append(title,brief);
 header.append(left,makeChevron());
 card.append(header,body);
 body.hidden=true;

 const form=q('#profileForm',body);
 if(form){
   form.classList.add('member-profile-edit');
   form.hidden=true;
   const edit=document.createElement('button');
   edit.type='button';edit.className='btn btn-secondary btn-small member-edit-toggle';edit.textContent='修改资料';edit.setAttribute('aria-expanded','false');
   const meta=q('.profile-meta',body);
   (meta||q('.profile-name',body)||body).insertAdjacentElement('afterend',edit);
   edit.addEventListener('click',e=>{
     e.stopPropagation();
     const open=form.hidden;
     form.hidden=!open;edit.setAttribute('aria-expanded',String(open));edit.textContent=open?'收起修改':'修改资料';
     if(open) setTimeout(()=>q('#profileName')?.focus(),80);
   });
 }
 header.addEventListener('click',()=>toggle(header,body));
}

function sectionTitle(section){
 const h=q('.panel-head h2',section)||q('h2',section);
 return (h?.textContent||'').trim()||'内容';
}
function sectionBrief(section){
 if(section.id==='favorites')return '收藏的方案';
 if(section.id==='orders')return '订单与付款状态';
 if(section.id==='downloads')return '已付款交付内容';
 if(section.id==='materials')return '个人资料与长文本';
 return '点击展开';
}
function setupSection(section){
 if(!section||section.dataset.foldReady==='1')return;
 section.dataset.foldReady='1';
 const children=[...section.children];
 const body=document.createElement('div');body.className='member-fold-body';children.forEach(n=>body.appendChild(n));
 const header=document.createElement('button');header.type='button';header.className='member-fold-head';header.setAttribute('aria-expanded','false');
 const left=document.createElement('span');left.className='member-fold-labels';
 const title=document.createElement('span');title.className='member-fold-title';title.textContent=sectionTitle(section);
 const brief=document.createElement('span');brief.className='member-fold-brief';brief.textContent=sectionBrief(section);
 left.append(title,brief);header.append(left,makeChevron());section.append(header,body);body.hidden=true;
 header.addEventListener('click',()=>toggle(header,body));
}
function toggle(header,body,force){
 const open=typeof force==='boolean'?force:body.hidden;
 body.hidden=!open;header.setAttribute('aria-expanded',String(open));
 if(open) body.dispatchEvent(new CustomEvent('member:opened',{bubbles:true}));
}
function openHash(){
 const id=(location.hash||'').replace('#','');if(!id)return;
 const section=document.getElementById(id);if(!section)return;
 const head=q(':scope > .member-fold-head',section),body=q(':scope > .member-fold-body',section);
 if(head&&body){toggle(head,body,true);setTimeout(()=>section.scrollIntoView({behavior:'smooth',block:'start'}),60)}
}
function wireOverview(){
 const overview=q('#memberOverview');if(!overview)return;
 overview.style.display='none';
}
function cleanHero(){
 const shortcuts=q('.member-shortcuts');if(shortcuts)shortcuts.style.display='none';
 const hero=q('.page-hero');if(hero)hero.classList.add('member-hero-compact');
}
function init(){
 cleanHero();setupProfile();['favorites','orders','downloads','materials'].forEach(id=>setupSection(document.getElementById(id)));wireOverview();openHash();
 window.addEventListener('hashchange',openHash);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

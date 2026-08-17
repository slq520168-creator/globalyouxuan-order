(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),I=window.GYXI18N;
const L=(zh,en,km)=>I?.locale==='en'?en:I?.locale==='km'?km:zh;
const gate=[
 {q:'你目前最接近哪种状态？',opts:['有正常工作，想利用零碎时间提升自己','暂时没有固定工作，时间比较自由','在家照顾家庭，希望利用空闲时间','已经退休 / 半退休，希望找点适合自己的事情','其他普通生活状态']},
 {q:'你每天真正能稳定拿出来的时间大约有多少？',opts:['15分钟以内','15–30分钟','30–60分钟','1–2小时','2小时以上']},
 {q:'你现在主要使用什么设备？',opts:['只有手机','手机 + 平板','手机 + 电脑','设备都有，但不太熟悉','设备不是问题']},
 {q:'你是否愿意按照每天的小计划实际去做，并反馈真实完成情况？',opts:['愿意执行并反馈','可以执行，但时间不固定','想先试几天看看','目前做不到'],reject:'目前做不到'},
 {q:'这是一套需要持续实践、逐步调整的养成计划，不是“一次看完就结束”的资料。你是否愿意继续了解自己的专属方案？',opts:['我了解并愿意继续','暂不接受'],reject:'暂不接受'}
];
const steps=[
 {title:'个人情况',fields:[
  {k:'age',label:'年龄',opts:['18–30','31–45','46–60','60以上']},
  {k:'free_time',label:'你目前每天最容易空出来的时间段？',opts:['早上','中午','晚上','时间不固定']},
  {k:'digital',label:'你对手机和线上工具的熟悉程度？',opts:['不太熟悉','基本会用','比较熟悉','非常熟悉']},
  {k:'start_direction',label:'你更希望从哪一类事情开始？',opts:['学一个实用技能','做简单内容 / 图片 / 视频','学会使用AI工具','整理资料 / 文档 / 表格','找适合自己的居家实践方向','目前还不清楚']}
 ]},
 {title:'当前限制',fields:[
  {k:'limits',label:'你目前最大的限制是什么？',opts:['时间太碎','不知道从哪里开始','年龄 / 学习速度顾虑','只有手机','容易坚持几天就停','不知道自己适合什么']},
  {k:'daily_time',label:'你每天真正能用于实践的时间？',opts:['15分钟以内','15–30分钟','30–60分钟','1–2小时','2小时以上']}
 ]},
 {title:'希望变化',fields:[
  {k:'goal',label:'你最希望先得到什么变化？',opts:['每天不再浪费零碎时间','学会一个真正能用的技能','做出自己的第一个成果','逐渐形成稳定习惯','找到适合长期坚持的方向','为以后增加收入能力做准备']},
  {k:'priority',label:'如果只能先完成一件事，你最想先做到哪一项？',opts:['先养成每天行动','先学会一个工具','先做出一个作品','先找到适合方向','先提高效率','先建立长期计划']}
 ]},
 {title:'过去经历',fields:[
  {k:'experience',label:'你以前有没有尝试过类似学习或实践？',opts:['完全没有','试过，但没有坚持下来','学过一些，但比较零散','已经有一点基础','做过不少，只是没有形成体系']},
  {k:'stuck',label:'以前最容易卡在哪一步？',opts:['不知道学什么','开始很积极，后来停了','教程看很多，实际做得少','工具太复杂','没有人告诉我下一步','做了但看不到成果']}
 ]},
 {title:'执行方式',fields:[
  {k:'habit_style',label:'哪一种方式你最容易坚持？',opts:['每天一个很小的任务','每天固定30分钟','有时间就多做一点','每周集中做几次','需要有人给我明确步骤']},
  {k:'feedback',label:'如果每天给你一个明确小任务，你愿意记录真实完成情况吗？',opts:['愿意每天记录','可以每几天记录一次','只记录重要成果','需要先适应几天']}
 ]},
 {title:'计划方向',fields:[
  {k:'plan_type',label:'你希望计划更偏向哪一种？',opts:['非常简单，先养成习惯','边学边做，马上有成果','实用技能优先','以后可以继续升级','最终形成能长期使用的能力']},
  {k:'home_preference',label:'你更希望居家实践的内容是什么形式？',opts:['手机就能完成','尽量不需要额外设备','步骤清楚照着做','每次时间不要太长','做完能留下作品或成果','都可以，根据实际情况安排']}
 ]},
 {title:'持续时间',fields:[
  {k:'period',label:'如果每天只给你一个明确的小任务，你愿意连续实践多久再判断有没有效果？',opts:['7天','14天','30天','只要适合我，可以长期坚持']},
  {k:'final_confirm',label:'最后确认：你希望得到的是哪一种结果？',opts:['养成稳定习惯','找到适合自己的长期方向','逐步掌握一项实用能力','做出可展示的真实成果','先从零碎时间开始慢慢改善']}
 ],confirm:true}
];
let gi=0,gateAnswers=[],si=0,profile={};
function screen(){return $('[data-gyx-screen="home"]')}
function host(){const s=screen();if(!s)return null;const m=$('main',s);let h=$('.gyx-home-plan-host',m);if(!h){m.replaceChildren();h=document.createElement('div');h.className='gyx-gate gyx-home-plan-host';m.appendChild(h)}return h}
function close(){screen()?.querySelector('.gyx-full-close')?.click()}
function fail(){const h=host();if(!h)return;h.innerHTML=`<div class="gyx-gate-card"><h2 class="gyx-gate-title">${L('目前先不进入计划','Not entering the plan yet','មិនទាន់ចូលផែនការឥឡូវនេះ')}</h2><div class="gyx-gate-note">${L('等你准备好稳定实践时，可以随时回来重新填写。','Come back anytime when you are ready for consistent practice.','អាចត្រឡប់មកវិញពេលអ្នកត្រៀមខ្លួនអនុវត្តជាប្រចាំ។')}</div><button class="gyx-gate-home">${L('返回首页','Back to home','ត្រឡប់ទៅទំព័រដើម')}</button></div>`;$('.gyx-gate-home',h).onclick=close}
function renderGate(){gi=0;gateAnswers=[];drawGate()}
function drawGate(){const h=host();if(!h)return;const x=gate[gi];h.innerHTML=`<div class="gyx-gate-card"><div class="gyx-gate-progress">${L('资格确认','Eligibility check','ការបញ្ជាក់លក្ខខណ្ឌ')} ${gi+1} / ${gate.length}</div><h2 class="gyx-gate-title">${x.q}</h2><div class="gyx-gate-options">${x.opts.map(v=>`<button type="button" class="gyx-gate-option" data-value="${v.replace(/"/g,'&quot;')}">${v}</button>`).join('')}</div><button class="gyx-gate-next" disabled>${L('下一步','Next','បន្ទាប់')}</button><div class="gyx-gate-note">${L('请选择符合你真实情况的选项','Choose the option that matches your real situation','សូមជ្រើសរើសតាមស្ថានភាពពិត')}</div></div>`;let selected='';h.querySelectorAll('[data-value]').forEach(b=>b.onclick=()=>{selected=b.dataset.value;h.querySelectorAll('[data-value]').forEach(z=>z.classList.toggle('is-selected',z===b));$('.gyx-gate-next',h).disabled=false});$('.gyx-gate-next',h).onclick=()=>{if(!selected)return;if(x.reject&&selected===x.reject)return fail();gateAnswers.push({question:x.q,answer:selected});gi++;if(gi<gate.length)drawGate();else pass()}}
function pass(){const h=host();if(!h)return;const rec={project:'spare-time-plan',passed:true,answers:gateAnswers,passed_at:new Date().toISOString()};try{localStorage.setItem('gyx_spare_time_gate',JSON.stringify(rec))}catch{}h.innerHTML=`<div class="gyx-gate-card"><h2 class="gyx-gate-title">${L('资格确认完成','Eligibility check complete','បញ្ចប់ការបញ្ជាក់លក្ខខណ្ឌ')}</h2><div class="gyx-profile-alert">${L('接下来按你的真实生活情况填写。没有标准答案，只用于把计划做得更适合你。','Now fill in your real situation. There are no standard answers; this is only to tailor the plan.','បំពេញតាមស្ថានភាពពិតរបស់អ្នក។ គ្មានចម្លើយស្តង់ដារ។')}</div><button class="gyx-profile-next">${L('开始填写个人情况','Start personal profile','ចាប់ផ្តើមបំពេញព័ត៌មានផ្ទាល់ខ្លួន')}</button></div>`;$('.gyx-profile-next',h).onclick=()=>{si=0;profile={gate:rec};drawStep()}}
function field(f){return `<div class="gyx-field"><label>${f.label}</label><div class="gyx-choice-grid ${f.opts.length<=6?'three':''}">${f.opts.map(v=>`<button type="button" class="gyx-choice" data-key="${f.k}" data-value="${v.replace(/"/g,'&quot;')}">${v}</button>`).join('')}</div></div>`}
function drawStep(){const h=host(),s=steps[si];if(!h||!s)return;h.innerHTML=`<div class="gyx-profile"><div class="gyx-profile-card"><div class="gyx-profile-alert">${L('请按真实情况选择。这个计划面向普通人，重点看你的时间、设备、基础、目标和能否持续。','Choose based on your real situation. This plan focuses on your time, devices, experience, goals and consistency.','សូមជ្រើសតាមស្ថានភាពពិតរបស់អ្នក។')}</div><div class="gyx-profile-step">${L('个人情况','Personal profile','ព័ត៌មានផ្ទាល់ខ្លួន')} ${si+1} / ${steps.length}</div><h2 class="gyx-profile-title">${s.title}</h2>${s.fields.map(field).join('')}${s.confirm?`<div class="gyx-finish-note">${L('这些信息只用于形成更适合你的居家实践节奏。先从能做到的小任务开始，再根据真实完成情况调整。','These answers are used to shape a practical at-home pace. Start small and adjust from real completion.','ព័ត៌មានទាំងនេះប្រើសម្រាប់រៀបចំផែនការអនុវត្តនៅផ្ទះឱ្យសមស្រប។')}</div>`:''}<div class="gyx-profile-actions">${si?`<button class="gyx-profile-back">${L('上一步','Back','ថយក្រោយ')}</button>`:'<span></span>'}${s.confirm?`<button class="gyx-profile-submit">${L('完成填写','Finish','បញ្ចប់')}</button>`:`<button class="gyx-profile-next">${L('下一步','Next','បន្ទាប់')}</button>`}</div></div></div>`;bindStep()}
function bindStep(){const h=host(),s=steps[si];h.querySelectorAll('.gyx-choice').forEach(b=>b.onclick=()=>{profile[b.dataset.key]=b.dataset.value;h.querySelectorAll(`.gyx-choice[data-key="${b.dataset.key}"]`).forEach(z=>z.classList.toggle('is-selected',z===b))});const back=$('.gyx-profile-back',h);if(back)back.onclick=()=>{si--;drawStep()};const next=$('.gyx-profile-next',h);if(next)next.onclick=()=>{if(s.fields.some(f=>!profile[f.k]))return alert(L('请先完成本页选择','Please complete this page first','សូមបំពេញជម្រើសក្នុងទំព័រនេះសិន'));try{localStorage.setItem('gyx_spare_time_profile_draft',JSON.stringify(profile))}catch{}si++;drawStep();screen().scrollTop=0};const sub=$('.gyx-profile-submit',h);if(sub)sub.onclick=()=>{if(s.fields.some(f=>!profile[f.k]))return alert(L('请先完成本页选择','Please complete this page first','សូមបំពេញជម្រើសក្នុងទំព័រនេះសិន'));profile.completed_at=new Date().toISOString();try{localStorage.setItem('gyx_spare_time_profile',JSON.stringify(profile))}catch{}h.innerHTML=`<div class="gyx-profile"><div class="gyx-profile-card"><h2 class="gyx-profile-title">${L('个人情况填写完成','Profile completed','បានបំពេញព័ត៌មាន')}</h2><div class="gyx-finish-note">${L('已经记录你的时间、设备、基础、目标和执行习惯。下一步应根据这些真实情况生成你的零碎时间居家实践计划。','Your time, devices, experience, goals and execution habits are recorded. The next step is to build your personal spare-time at-home plan.','បានកត់ត្រាពេលវេលា ឧបករណ៍ បទពិសោធន៍ គោលដៅ និងទម្លាប់អនុវត្តរបស់អ្នក។')}</div></div></div>`}}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-gyx-full="home"]');if(!b)return;setTimeout(renderGate,0)},true);
window.addEventListener('gyx:languagechange',()=>{if(screen()?.classList.contains('is-open'))renderGate()});
})();
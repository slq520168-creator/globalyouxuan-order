(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),I=window.GYXI18N;
const L=(zh,en,km)=>I?.locale==='en'?en:I?.locale==='km'?km:zh;
const gate=[
 {q:'你目前最接近哪种状态？',opts:['有正常工作，想利用零碎时间提升自己','暂时没有固定工作，时间比较自由','在家照顾家庭，希望利用空闲时间','已经退休 / 半退休，希望找点适合自己的事情','学生 / 正在学习，希望提前积累能力','其他普通生活状态']},
 {q:'你每天真正能稳定拿出来的时间大约有多少？',opts:['15分钟以内','15–30分钟','30–60分钟','1–2小时','2小时以上','每天不固定，但每周能安排时间']},
 {q:'你现在主要使用什么设备？',opts:['只有手机','手机 + 平板','手机 + 电脑','设备都有，但不太熟悉','设备不是问题']},
 {q:'你是否愿意按照每天的小计划实际去做，并反馈真实完成情况？',opts:['愿意执行并反馈','可以执行，但时间不固定','想先试几天看看','目前做不到'],reject:'目前做不到'},
 {q:'这是一套需要持续实践、逐步调整的养成计划，不是“一次看完就结束”的资料。你是否愿意继续了解自己的专属方案？',opts:['我了解并愿意继续','暂不接受'],reject:'暂不接受'}
];
const steps=[
 {title:'个人基础画像',fields:[
  {k:'age',label:'年龄',opts:['18–30','31–45','46–60','60以上']},
  {k:'life_state',label:'你目前的主要生活状态？',opts:['正常上班','自由职业 / 零工','在家照顾家庭','暂时待业','学生 / 学习阶段','退休 / 半退休','其他']},
  {k:'education_style',label:'你平时更习惯哪种学习方式？',opts:['看文字步骤','看短视频演示','边做边学','有人告诉我一步一步做','先看完整逻辑再动手','没有固定习惯']},
  {k:'digital',label:'你对手机和线上工具的熟悉程度？',opts:['不太熟悉','基本会用','比较熟悉','非常熟悉']},
  {k:'reading',label:'遇到稍长一点的教程，你通常能接受到什么程度？',opts:['只看最短步骤','可以看5分钟左右','可以认真看10–20分钟','只要有用，长一点也能看','更喜欢直接实践']}
 ]},
 {title:'真实时间结构',fields:[
  {k:'daily_time',label:'你每天真正能用于实践的时间？',opts:['15分钟以内','15–30分钟','30–60分钟','1–2小时','2小时以上']},
  {k:'free_time',label:'你目前每天最容易空出来的时间段？',opts:['早上','中午','下午','晚上','深夜','时间不固定']},
  {k:'continuous_time',label:'你一次通常能连续不被打断多久？',opts:['5–10分钟','10–20分钟','20–40分钟','40–60分钟','1小时以上']},
  {k:'weekly_days',label:'一周大约能认真执行几天？',opts:['1–2天','3–4天','5天左右','6天','每天']},
  {k:'weekend',label:'周末或休息日是否能多安排一点时间？',opts:['基本不能','偶尔可以','可以多30分钟','可以多1–2小时','休息日时间比较自由']}
 ]},
 {title:'设备与居家条件',fields:[
  {k:'device',label:'你实际能长期使用的设备？',opts:['只有手机','手机 + 平板','手机 + 电脑','只有电脑','设备比较齐全']},
  {k:'phone_level',label:'手机目前的使用情况最接近哪一种？',opts:['只会基本聊天和刷视频','会安装软件和传文件','会剪视频 / 做图 / 用AI工具','会处理文档表格和云盘','手机操作非常熟练']},
  {k:'network',label:'你居家网络情况怎么样？',opts:['经常不稳定','手机流量为主','普通Wi‑Fi够用','网络比较稳定','网络条件很好']},
  {k:'space',label:'在家实践时，你通常有没有相对安静的位置？',opts:['基本没有','偶尔有','每天有一小段安静时间','有固定位置','环境不是问题']},
  {k:'extra_device',label:'如果某个方向必须额外购买设备，你更倾向？',opts:['尽量完全不买','先用现有设备验证','只有真正需要才考虑','设备不是主要限制']}
 ]},
 {title:'当前能力盘点',fields:[
  {k:'writing',label:'你对文字表达、写介绍、整理内容的能力？',opts:['基本不会','能写简单内容','一般水平','比较擅长','非常擅长']},
  {k:'image',label:'你对图片、海报、封面这类内容的熟悉程度？',opts:['完全没做过','只会简单修图','做过一些模板','比较熟悉','有稳定作品']},
  {k:'video',label:'你对短视频剪辑的熟悉程度？',opts:['完全没做过','会简单剪切','会字幕配乐和基础剪辑','能独立完成短视频','比较熟练']},
  {k:'office',label:'你对文档、表格、资料整理的熟悉程度？',opts:['不熟悉','只会基础操作','能完成日常使用','比较熟练','很擅长整理和结构化']},
  {k:'ai_level',label:'你目前使用AI工具到什么程度？',opts:['几乎没用过','偶尔聊天问问题','会让AI写文案 / 总结','会用AI做图 / 视频 / 工作流','已经经常用AI完成实际任务']}
 ]},
 {title:'兴趣与可持续方向',fields:[
  {k:'start_direction',label:'你更希望从哪一类事情开始？',opts:['学一个实用技能','做简单内容 / 图片 / 视频','学会使用AI工具','整理资料 / 文档 / 表格','做居家线上小项目','找适合自己的长期方向','目前还不清楚']},
  {k:'interest',label:'下面哪类事情你做起来最不容易烦？',opts:['写东西 / 整理资料','做图片 / 视觉内容','剪视频 / 做内容','研究工具和新方法','和人沟通 / 回答问题','整理数据 / 表格','都不确定']},
  {k:'strength',label:'别人以前最常夸你哪方面？',opts:['做事细心','表达清楚','审美不错','学习新东西快','耐心好','动手能力强','解决问题能力强','暂时想不到']},
  {k:'dislike',label:'你最不愿意长期做哪种事情？',opts:['大量写字','露脸拍摄','和陌生人沟通','反复做表格','学习复杂工具','长时间坐着操作','暂时没有明显排斥']},
  {k:'result_form',label:'哪种成果最能让你有继续做下去的动力？',opts:['看见一个完整作品','掌握一个新工具','每天完成打卡','别人认可或使用我的成果','效率明显提高','未来有机会增加收入']}
 ]},
 {title:'家庭与现实限制',fields:[
  {k:'interrupt',label:'你在家做事时最常被什么打断？',opts:['工作消息','孩子 / 家务','家人事务','手机娱乐','身体容易疲劳','没有明显打断']},
  {k:'family_support',label:'家人对你每天留一点时间学习或实践的态度？',opts:['很支持','基本支持','不太关注','偶尔会影响','很难配合','不适用']},
  {k:'energy',label:'你通常什么时候精神状态最好？',opts:['早上','上午','中午','下午','晚上','深夜','不固定']},
  {k:'health_limit',label:'有没有需要计划特别照顾的身体或精力限制？',opts:['没有','不能久坐','眼睛容易疲劳','睡眠不规律','容易疲劳','只能安排很短时间','其他']},
  {k:'stress',label:'你目前整体压力水平更接近哪一种？',opts:['比较轻松','有一点压力','压力一般','压力比较大','最近非常忙 / 很累']}
 ]},
 {title:'过去尝试与失败原因',fields:[
  {k:'experience',label:'你以前有没有尝试过类似学习或实践？',opts:['完全没有','试过，但没有坚持下来','学过一些，但比较零散','已经有一点基础','做过不少，只是没有形成体系']},
  {k:'tried_type',label:'以前主要尝试过什么？',opts:['看教程学技能','做短视频 / 内容','学AI工具','学设计 / 剪辑','学办公 / 表格','尝试副业 / 接单','买过课程但没学完','没有尝试过']},
  {k:'stuck',label:'以前最容易卡在哪一步？',opts:['不知道学什么','开始很积极，后来停了','教程看很多，实际做得少','工具太复杂','没有人告诉我下一步','做了但看不到成果','任务太大没有时间']},
  {k:'quit_reason',label:'如果以前中断过，最主要原因是什么？',opts:['没时间','太难','没有反馈','没有看到结果','方向太多太乱','没人监督','生活突然有事','没有中断过']},
  {k:'past_gain',label:'过去尝试里有没有留下真正能继续用的东西？',opts:['基本没有','留下了一些笔记','有几个作品','有一些模板 / 工具','已经形成部分习惯','有一项比较稳定的能力']}
 ]},
 {title:'执行习惯与拖延点',fields:[
  {k:'habit_style',label:'哪一种方式你最容易坚持？',opts:['每天一个很小的任务','每天固定30分钟','有时间就多做一点','每周集中做几次','需要有人给我明确步骤']},
  {k:'start_problem',label:'你最难的是哪一步？',opts:['开始行动','持续坚持','遇到问题继续','把作品做完整','复盘和改进','不知道今天该做什么']},
  {k:'task_size',label:'每天任务做到什么大小你最容易接受？',opts:['5–10分钟就能完成','15–20分钟','30分钟左右','45–60分钟','只要有明确成果，时间不是问题']},
  {k:'reminder',label:'哪种提醒方式最适合你？',opts:['固定时间提醒','当天任何时间完成即可','连续打卡提醒','完成后再给下一步','每周汇总一次','不需要提醒']},
  {k:'feedback',label:'你愿意怎样记录真实完成情况？',opts:['愿意每天记录','每2–3天记录一次','每周记录一次','只记录成果和问题','需要先适应几天']}
 ]},
 {title:'目标优先级',fields:[
  {k:'goal',label:'你最希望先得到什么变化？',opts:['每天不再浪费零碎时间','学会一个真正能用的技能','做出自己的第一个成果','逐渐形成稳定习惯','找到适合长期坚持的方向','为以后增加收入能力做准备']},
  {k:'priority',label:'如果只能先完成一件事，你最想先做到哪一项？',opts:['先养成每天行动','先学会一个工具','先做出一个作品','先找到适合方向','先提高效率','先建立长期计划']},
  {k:'income_goal',label:'你是否希望这项能力以后有机会带来收入？',opts:['暂时不考虑收入','有机会最好','希望以后能做小额副业','希望逐渐形成稳定副业能力','主要目标就是提升收入能力']},
  {k:'speed',label:'你希望多久开始看到第一批可见变化？',opts:['7天左右','14天左右','30天左右','1–3个月','不追求快，稳定最重要']},
  {k:'success_mark',label:'对你来说，什么才算这套计划有效？',opts:['能连续坚持下来','学会一个实际工具','做出几个完整成果','生活时间利用更好','找到明确长期方向','以后能独立完成实际任务']}
 ]},
 {title:'居家实践方式',fields:[
  {k:'plan_type',label:'你希望计划更偏向哪一种？',opts:['非常简单，先养成习惯','边学边做，马上有成果','实用技能优先','以后可以继续升级','最终形成能长期使用的能力']},
  {k:'home_preference',label:'你更希望居家实践的内容是什么形式？',opts:['手机就能完成','尽量不需要额外设备','步骤清楚照着做','每次时间不要太长','做完能留下作品或成果','都可以，根据实际情况安排']},
  {k:'practice_ratio',label:'你更能接受哪种学习与实践比例？',opts:['少讲理论，直接做','20%学习 + 80%实践','一半学习一半实践','先学清楚再做','根据任务决定']},
  {k:'difficulty',label:'第一阶段你希望任务难度怎样安排？',opts:['越简单越好','稍微有一点挑战','从简单逐渐增加','可以直接做真实任务','根据我的完成情况动态调整']},
  {k:'output',label:'你希望每周至少留下什么？',opts:['1个完整成果','2–3个小成果','一套模板 / 清单','一项新技能记录','一份周复盘','根据实际任务决定']}
 ]},
 {title:'反馈与调整机制',fields:[
  {k:'period',label:'你愿意连续实践多久再判断有没有效果？',opts:['7天','14天','30天','1–3个月','只要适合我，可以长期坚持']},
  {k:'review',label:'你愿意多久做一次真实复盘？',opts:['每天简单复盘','每3天一次','每周一次','两周一次','只在遇到问题时复盘']},
  {k:'adjust',label:'如果计划执行后发现不适合，你能接受哪种调整？',opts:['减少任务量','更换工具','换一种实践方式','调整目标顺序','必要时换方向','都可以，以实际效果为准']},
  {k:'failure_view',label:'某一天没有完成任务，你更希望怎么处理？',opts:['第二天继续，不补作业','第二天补完','把任务缩小后继续','重新安排本周计划','根据原因决定']},
  {k:'proof',label:'你愿意用什么作为真实进度证明？',opts:['完成记录','作品 / 文件','前后对比','学习笔记','每周总结','多种方式都可以']}
 ]},
 {title:'边界与最终确认',fields:[
  {k:'avoid',label:'下面哪种情况你明确不希望出现？',opts:['要求频繁外出','需要大量前期投入','必须购买昂贵软件','每天任务太长','强迫露脸或直播','复杂到普通人很难操作','都希望尽量避免']},
  {k:'cost',label:'如果实践中出现付费工具，你希望怎么处理？',opts:['优先全部使用免费工具','先找免费替代','只有确实必要才考虑','暂时完全不接受付费']},
  {k:'privacy',label:'涉及个人资料、照片或账号时，你更看重什么？',opts:['尽量不公开个人信息','只在自己设备保存','需要我自己决定是否上传','正常使用即可，但要说明用途','没有特别要求']},
  {k:'final_confirm',label:'最后确认：你希望最终得到哪一种结果？',opts:['养成稳定习惯','找到适合自己的长期方向','逐步掌握一项实用能力','做出可展示的真实成果','建立可长期复用的工作方法','为以后增加收入能力打基础']},
  {k:'commitment',label:'你是否愿意从适合自己的小任务开始，按真实完成情况持续调整？',opts:['愿意，从小任务开始','愿意，但需要节奏慢一点','愿意先执行7天再判断','暂时只想了解，不准备执行']}
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
function drawStep(){const h=host(),s=steps[si];if(!h||!s)return;h.innerHTML=`<div class="gyx-profile"><div class="gyx-profile-card"><div class="gyx-profile-alert">${L('请按真实情况选择。这个计划面向普通人，会综合你的时间、设备、能力、生活限制、过往经历、目标和执行习惯。','Choose based on your real situation. This plan considers your time, devices, skills, limits, experience, goals and consistency.','សូមជ្រើសតាមស្ថានភាពពិតរបស់អ្នក។')}</div><div class="gyx-profile-step">${L('个人情况','Personal profile','ព័ត៌មានផ្ទាល់ខ្លួន')} ${si+1} / ${steps.length}</div><h2 class="gyx-profile-title">${s.title}</h2>${s.fields.map(field).join('')}${s.confirm?`<div class="gyx-finish-note">${L('这些信息只用于形成更适合你的居家实践节奏。先从真正做得到的小任务开始，再根据真实完成情况持续调整。','These answers are used to shape a practical at-home pace. Start small and adjust from real completion.','ព័ត៌មានទាំងនេះប្រើសម្រាប់រៀបចំផែនការអនុវត្តនៅផ្ទះឱ្យសមស្រប។')}</div>`:''}<div class="gyx-profile-actions">${si?`<button class="gyx-profile-back">${L('上一步','Back','ថយក្រោយ')}</button>`:'<span></span>'}${s.confirm?`<button class="gyx-profile-submit">${L('完成填写','Finish','បញ្ចប់')}</button>`:`<button class="gyx-profile-next">${L('下一步','Next','បន្ទាប់')}</button>`}</div></div></div>`;bindStep()}
function bindStep(){const h=host(),s=steps[si];h.querySelectorAll('.gyx-choice').forEach(b=>b.onclick=()=>{profile[b.dataset.key]=b.dataset.value;h.querySelectorAll(`.gyx-choice[data-key="${b.dataset.key}"]`).forEach(z=>z.classList.toggle('is-selected',z===b))});const back=$('.gyx-profile-back',h);if(back)back.onclick=()=>{si--;drawStep()};const next=$('.gyx-profile-next',h);if(next)next.onclick=()=>{if(s.fields.some(f=>!profile[f.k]))return alert(L('请先完成本页选择','Please complete this page first','សូមបំពេញជម្រើសក្នុងទំព័រនេះសិន'));try{localStorage.setItem('gyx_spare_time_profile_draft',JSON.stringify(profile))}catch{}si++;drawStep();screen().scrollTop=0};const sub=$('.gyx-profile-submit',h);if(sub)sub.onclick=()=>{if(s.fields.some(f=>!profile[f.k]))return alert(L('请先完成本页选择','Please complete this page first','សូមបំពេញជម្រើសក្នុងទំព័រនេះសិន'));profile.completed_at=new Date().toISOString();try{localStorage.setItem('gyx_spare_time_profile',JSON.stringify(profile))}catch{}h.innerHTML=`<div class="gyx-profile"><div class="gyx-profile-card"><h2 class="gyx-profile-title">${L('个人情况填写完成','Profile completed','បានបំពេញព័ត៌មាន')}</h2><div class="gyx-finish-note">${L('已经记录你的时间、设备、能力基础、生活限制、目标、过往经历和执行习惯。下一步应根据这些真实情况生成你的零碎时间居家实践计划。','Your time, devices, skills, limits, goals, experience and execution habits are recorded. The next step is to build your personal spare-time at-home plan.','បានកត់ត្រាព័ត៌មានសំខាន់ៗរបស់អ្នក។')}</div></div></div>`}}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-gyx-full="home"]');if(!b)return;setTimeout(renderGate,0)},true);
window.addEventListener('gyx:languagechange',()=>{if(screen()?.classList.contains('is-open'))renderGate()});
})();
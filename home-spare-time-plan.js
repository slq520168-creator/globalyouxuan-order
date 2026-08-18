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
 {title:'基础情况',fields:[
  {k:'age',label:'你的年龄？',opts:['18–25','26–35','36–45','46–60','60以上']},
  {k:'region',label:'你目前主要生活在哪个地区？',opts:['中国大陆','港澳台','东南亚','欧洲','北美','南美','中东','非洲','其他地区']},
  {k:'life_state',label:'你目前的主要生活状态？',opts:['正常上班','自由职业 / 零工','在家照顾家庭','暂时待业','学生 / 学习阶段','退休 / 半退休','其他']}
 ]},
 {title:'真实时间结构',fields:[
  {k:'daily_time',label:'你每天真正能用于实践的时间？',opts:['15分钟以内','15–30分钟','30–60分钟','1–2小时','2小时以上']},
  {k:'free_time',label:'你最容易空出来的时间段？',opts:['早上','中午','下午','晚上','深夜','时间不固定']},
  {k:'weekly_days',label:'一周大约能认真执行几天？',opts:['1–2天','3–4天','5天左右','6天','每天']}
 ]},
 {title:'设备与网络',fields:[
  {k:'device',label:'你实际能长期使用的设备？',opts:['只有手机','手机 + 平板','手机 + 电脑','只有电脑','设备比较齐全']},
  {k:'phone_level',label:'你对手机操作熟悉到什么程度？',opts:['只会聊天和刷视频','会安装软件和传文件','会剪视频 / 做图 / 用AI','会处理文档表格和云盘','手机操作非常熟练']},
  {k:'network',label:'你平时的网络条件？',opts:['经常不稳定','手机流量为主','普通Wi‑Fi够用','网络比较稳定','网络条件很好']}
 ]},
 {title:'你平时真正会用什么',fields:[
  {k:'video_app',label:'你平时最喜欢或最常使用哪个视频软件？',opts:['抖音','TikTok','快手','小红书','YouTube','Facebook / Reels','Instagram / Reels','B站','基本不看短视频','其他']},
  {k:'editing_app',label:'你现在用过哪些剪辑或内容工具？',opts:['剪映 / CapCut','Canva','VN','Premiere / PR','其他剪辑软件','只看过没做过','完全没用过']},
  {k:'ai_level',label:'你目前使用AI工具到什么程度？',opts:['几乎没用过','偶尔聊天问问题','会让AI写文案 / 总结','会用AI做图 / 视频','已经经常用AI完成实际任务']}
 ]},
 {title:'目前的经济情况',fields:[
  {k:'economic_status',label:'你目前的经济状况更接近哪一种？',opts:['收入稳定，压力较小','收入稳定，但支出压力较大','收入一般，希望增加收入','收入不稳定','暂时没有固定收入','不方便说明']},
  {k:'income_urgency',label:'你现在增加收入的紧迫程度？',opts:['暂时不急','希望慢慢增加','希望3个月内看到变化','希望1个月内开始尝试','目前非常需要增加收入']},
  {k:'cost_limit',label:'开始实践时，你更能接受哪种投入方式？',opts:['尽量零投入','只用现有设备和免费工具','先验证有效再考虑投入','小额必要投入可以接受','投入不是主要限制']}
 ]},
 {title:'当前能力盘点',fields:[
  {k:'writing',label:'你的文字表达和整理能力？',opts:['基本不会','能写简单内容','一般水平','比较擅长','非常擅长']},
  {k:'image',label:'图片、海报、封面这类内容你做到什么程度？',opts:['完全没做过','只会简单修图','会套模板','能独立做一些设计','比较熟练']},
  {k:'video',label:'短视频制作你做到什么程度？',opts:['完全没做过','会简单剪切','会字幕配乐和基础剪辑','能独立完成短视频','比较熟练']}
 ]},
 {title:'兴趣与方向',fields:[
  {k:'start_direction',label:'你更希望从哪一类事情开始？',opts:['学一个实用技能','做图片 / 视频 / 内容','学会使用AI工具','整理资料 / 文档 / 表格','做居家线上小项目','找适合自己的长期方向','目前还不清楚']},
  {k:'interest',label:'下面哪类事情你做起来最不容易烦？',opts:['写东西 / 整理资料','做图片 / 视觉内容','剪视频 / 做内容','研究工具和新方法','和人沟通 / 回答问题','整理数据 / 表格','都不确定']},
  {k:'dislike',label:'你最不愿意长期做哪种事情？',opts:['大量写字','露脸拍摄','和陌生人沟通','反复做表格','学习复杂工具','长时间坐着操作','暂时没有明显排斥']}
 ]},
 {title:'家庭与现实限制',fields:[
  {k:'interrupt',label:'你在家做事时最常被什么打断？',opts:['工作消息','孩子 / 家务','家人事务','手机娱乐','身体容易疲劳','没有明显打断']},
  {k:'family_support',label:'家人对你每天留时间学习或实践的态度？',opts:['很支持','基本支持','不太关注','偶尔会影响','很难配合','不适用']},
  {k:'energy',label:'你通常什么时候精神状态最好？',opts:['早上','上午','中午','下午','晚上','深夜','不固定']}
 ]},
 {title:'过去尝试过什么',fields:[
  {k:'experience',label:'以前有没有认真尝试过类似学习或副业实践？',opts:['完全没有','试过但没有坚持','学过一些但比较零散','已经有一点基础','做过不少但没有形成体系']},
  {k:'tried_type',label:'以前主要尝试过什么？',opts:['看教程学技能','做短视频 / 内容','学AI工具','学设计 / 剪辑','办公 / 表格','尝试副业 / 接单','买过课程但没学完','没有尝试过']},
  {k:'quit_reason',label:'以前最容易为什么停下来？',opts:['没时间','太难','看不到结果','方向太多太乱','没人告诉我下一步','没人监督','生活突然有事','没有中断过']}
 ]},
 {title:'执行习惯',fields:[
  {k:'habit_style',label:'哪一种方式你最容易坚持？',opts:['每天一个很小的任务','每天固定30分钟','有时间就多做一点','每周集中做几次','需要明确步骤带着做']},
  {k:'start_problem',label:'你最难的是哪一步？',opts:['开始行动','持续坚持','遇到问题继续','把作品做完整','复盘和改进','不知道今天该做什么']},
  {k:'task_size',label:'每天任务做到什么大小你最容易接受？',opts:['5–10分钟','15–20分钟','30分钟左右','45–60分钟','只要结果明确，时间不是问题']}
 ]},
 {title:'你真正想得到什么',fields:[
  {k:'goal',label:'你最希望先得到什么变化？',opts:['不再浪费零碎时间','学会一个真正能用的技能','做出自己的第一个成果','形成稳定习惯','找到长期方向','为以后增加收入能力做准备']},
  {k:'priority',label:'如果只能先完成一件事，你最想先做到什么？',opts:['养成每天行动','学会一个工具','做出一个作品','找到适合方向','提高效率','开始建立收入能力']},
  {k:'speed',label:'你希望多久开始看到第一批明显变化？',opts:['7天左右','14天左右','30天左右','1–3个月','不追求快，稳定最重要']}
 ]},
 {title:'收入方向判断',fields:[
  {k:'income_goal',label:'你希望未来通过哪种方式增加收入？',opts:['暂时不考虑收入','线上兼职 / 小任务','技能接单','内容创作','给商家 / 公司提供服务','做自己的长期项目','还不知道']},
  {k:'customer_contact',label:'如果需要和客户沟通，你目前能接受到什么程度？',opts:['不想接触客户','只接受文字沟通','可以语音沟通','可以正常谈需求和报价','沟通不是问题']},
  {k:'show_face',label:'如果一个方向需要出镜，你的接受程度？',opts:['完全不接受露脸','只接受声音不露脸','偶尔可以','如果确实有价值可以','出镜不是问题']}
 ]},
 {title:'居家实践方式',fields:[
  {k:'plan_type',label:'你希望计划更偏向哪一种？',opts:['非常简单，先养成习惯','边学边做，马上有成果','实用技能优先','收入能力优先','最终形成长期可用能力']},
  {k:'practice_ratio',label:'你更能接受哪种学习与实践比例？',opts:['少讲理论，直接做','20%学习 + 80%实践','一半学习一半实践','先学清楚再做','根据任务决定']},
  {k:'output',label:'你希望每周至少留下什么？',opts:['1个完整成果','2–3个小成果','一套模板 / 清单','一项新技能记录','一份周复盘','根据实际任务决定']}
 ]},
 {title:'反馈与调整',fields:[
  {k:'period',label:'你愿意连续实践多久再判断有没有效果？',opts:['7天','14天','30天','1–3个月','只要适合我，可以长期坚持']},
  {k:'review',label:'你愿意多久做一次真实复盘？',opts:['每天简单复盘','每3天一次','每周一次','两周一次','只在遇到问题时复盘']},
  {k:'adjust',label:'如果计划执行后发现不适合，你能接受怎么调整？',opts:['减少任务量','更换工具','换一种实践方式','调整目标顺序','必要时换方向','都可以，以实际效果为准']}
 ]},
 {title:'最后确认',fields:[
  {k:'avoid',label:'下面哪种情况你最不希望出现？',opts:['频繁外出','大量前期投入','必须买昂贵软件','每天任务太长','强迫露脸或直播','操作过于复杂','都希望尽量避免']},
  {k:'final_confirm',label:'你最终最希望得到哪一种结果？',opts:['养成稳定习惯','找到长期方向','掌握一项实用能力','做出可展示成果','建立可复用工作方法','形成可持续增加收入的能力']},
  {k:'commitment',label:'如果每天只给你一个明确的小任务，你愿意怎么开始？',opts:['从今天开始执行','先执行7天看看','节奏慢一点但会坚持','需要非常明确的步骤','先了解清楚再决定']}
 ]}
];
const cases=[
 {who:'每天固定时间投稿的音乐创作者',before:'他一开始会做歌，但最大的错误是只顾着做作品，做完以后没有固定投稿节奏。作品躺在文件夹里，偶尔想到才发一次，客户根本没有持续看到他。',tools:'手机或电脑做基础制作；AI辅助歌词、主题和Demo方向；BandLab / Audacity一类工具做简单整理；表格记录歌曲名称、投稿时间、投给谁、有没有回复、有没有成交。',do:'后来把每天流程拆成两段：零碎时间只做创作和修改，晚上固定一个投稿时间。每首歌准备30秒试听片段、完整试听文件、适用场景和一句报价说明；同一首歌分批发给不同音乐需求方、短视频团队、商用配乐需求和定制歌曲客户。投稿结束后记录已发、已读、询价、修改、成交，第二天优先跟进已经有反馈的人。',gain:'真正让他开始稳定成交的是作品生产和客户触达同时固定下来。每天都有新作品进入市场、旧作品继续被看见、昨天有反馈的人继续跟进，成交才从偶发逐渐变成连续。'},
 {who:'从零碎时间做到月收入约5万的视频创作者',before:'他早期会剪视频，但一直停留在等客户找我。作品没有分类、报价没有标准、每一单都从零开始做，所以即使技术不差，也很难把收入做大。',tools:'剪映 / CapCut做剪辑字幕；Canva做封面和提案图；AI做脚本初稿、标题、镜头清单和文案改写；云盘存素材模板；表格记录客户、报价、交付日期和复购。',do:'先把需求缩成门店宣传、产品短视频、社交媒体短内容3类，每类做3条可直接给客户看的样片。之后每天固定更新样片或模板、主动联系真实需求、当天回复询价。接单后把字幕、片头、转场、BGM、尺寸、交付话术全部模板化，同类客户直接复用。老客户交付后主动问下一批排期，把一次订单逐渐变成按周、按月重复需求。',gain:'做到月收入约5万时，靠的不是单个视频卖很贵，而是稳定样片获客、持续触达、明确报价、快速交付和老客户复购。这个数字属于这段经历，不代表所有人都会达到。'},
 {who:'一个女孩用AI承接多家公司设计',before:'她最开始不是设计公司，也没有团队。真正限制她的是时间：如果每张海报都从零找灵感、找素材、排版，一个人很难同时服务多家公司。',tools:'ChatGPT / Gemini整理客户需求、品牌关键词和文案方向；AI图像工具快速出视觉草稿；Canva / Adobe Express完成版式；云盘给每家公司保存Logo、字体、品牌色、常用尺寸和历史文件。',do:'每次先做需求卡：品牌、受众、用途、尺寸、必须出现的文字、不能出现的元素、截止时间。然后让AI一次给出多个视觉方向，只筛选最合适的2到3个进入人工调整。每家公司建立自己的品牌模板库，客户修改意见分类保存，下一次直接沿用。后来把沟通、初稿、修改、终稿、归档全部标准化。',gain:'她能同时承接多家公司，不是因为AI替她完成全部工作，而是AI把找方向、出初稿、多版本尝试压缩掉，她自己只盯需求理解、筛选、排版、品牌一致性和最终质量，一个人的有效产能因此被放大。'}
];
const offers=[
 {id:'spare-time-99-start',name:'轻量起步版',price:99,desc:'先把第一套行动节奏跑起来'},
 {id:'spare-time-199-habit',name:'稳定养成版',price:199,desc:'建立连续执行、记录与复盘'},
 {id:'spare-time-299-skill',name:'技能实践版',price:299,desc:'按设备与基础匹配实践方向'},
 {id:'spare-time-399-output',name:'成果推进版',price:399,desc:'把练习推进到真实可见成果'},
 {id:'spare-time-499-7day',name:'7天落地版',price:499,desc:'7天每日任务 + 反馈 + 调整'},
 {id:'spare-time-1999-private15',name:'15天私人订制',price:1999,desc:'按个人真实情况持续跟进与订制'}
];
let gi=0,gateAnswers=[],si=0,profile={};
function screen(){return $('[data-gyx-screen="home"]')}
function host(){const s=screen();if(!s)return null;const m=$('main',s);let h=$('.gyx-home-plan-host',m);if(!h){m.replaceChildren();h=document.createElement('div');h.className='gyx-gate gyx-home-plan-host';m.appendChild(h)}return h}
function close(){screen()?.querySelector('.gyx-full-close')?.click()}
function fail(){const h=host();if(!h)return;h.innerHTML=`<div class="gyx-gate-card"><h2 class="gyx-gate-title">目前先不进入计划</h2><div class="gyx-gate-note">等你准备好稳定实践时，可以随时回来重新填写。</div><button class="gyx-gate-home">返回首页</button></div>`;$('.gyx-gate-home',h).onclick=close}
function renderGate(){gi=0;gateAnswers=[];drawGate()}
function drawGate(){const h=host();if(!h)return;const x=gate[gi];h.innerHTML=`<div class="gyx-gate-card"><div class="gyx-gate-progress">资格确认 ${gi+1} / ${gate.length}</div><h2 class="gyx-gate-title">${x.q}</h2><div class="gyx-gate-options">${x.opts.map(v=>`<button type="button" class="gyx-gate-option" data-value="${v.replace(/"/g,'&quot;')}">${v}</button>`).join('')}</div><button class="gyx-gate-next" disabled>下一步</button><div class="gyx-gate-note">请选择符合你真实情况的选项</div></div>`;let selected='';h.querySelectorAll('[data-value]').forEach(b=>b.onclick=()=>{selected=b.dataset.value;h.querySelectorAll('[data-value]').forEach(z=>z.classList.toggle('is-selected',z===b));$('.gyx-gate-next',h).disabled=false});$('.gyx-gate-next',h).onclick=()=>{if(!selected)return;if(x.reject&&selected===x.reject)return fail();gateAnswers.push({question:x.q,answer:selected});gi++;if(gi<gate.length)drawGate();else pass()}}
function pass(){const h=host();if(!h)return;const rec={project:'spare-time-plan',passed:true,answers:gateAnswers,passed_at:new Date().toISOString()};try{localStorage.setItem('gyx_spare_time_gate',JSON.stringify(rec))}catch{}h.innerHTML=`<div class="gyx-gate-card"><h2 class="gyx-gate-title">资格确认完成</h2><div class="gyx-profile-alert">接下来继续了解你的真实生活情况。了解得越细，后面的方案才能越贴近你。</div><button class="gyx-profile-next">下一步</button></div>`;$('.gyx-profile-next',h).onclick=()=>{si=0;profile={gate:rec};drawStep()}}
function field(f){return `<div class="gyx-field"><label>${f.label}</label><div class="gyx-choice-grid three">${f.opts.map(v=>`<button type="button" class="gyx-choice" data-key="${f.k}" data-value="${v.replace(/"/g,'&quot;')}">${v}</button>`).join('')}</div></div>`}
function drawStep(){const h=host(),s=steps[si];if(!h||!s)return;h.innerHTML=`<div class="gyx-profile"><div class="gyx-profile-card"><div class="gyx-profile-alert">请按真实情况选择。问题越完整，后面的方向、节奏和方案才会越具体。</div><div class="gyx-profile-step">个人情况 ${si+1} / ${steps.length}</div><h2 class="gyx-profile-title">${s.title}</h2>${s.fields.map(field).join('')}<div class="gyx-profile-actions">${si?'<button class="gyx-profile-back">上一步</button>':'<span></span>'}<button class="gyx-profile-next">下一步</button></div></div></div>`;bindStep()}
function bindStep(){const h=host(),s=steps[si];h.querySelectorAll('.gyx-choice').forEach(b=>b.onclick=()=>{profile[b.dataset.key]=b.dataset.value;h.querySelectorAll(`.gyx-choice[data-key="${b.dataset.key}"]`).forEach(z=>z.classList.toggle('is-selected',z===b))});const back=$('.gyx-profile-back',h);if(back)back.onclick=()=>{si--;drawStep();screen().scrollTop=0};const next=$('.gyx-profile-next',h);if(next)next.onclick=()=>{if(s.fields.some(f=>!profile[f.k]))return alert('请先完成本页3个问题');try{localStorage.setItem('gyx_spare_time_profile_draft',JSON.stringify(profile))}catch{}if(si<steps.length-1){si++;drawStep();screen().scrollTop=0;return}profile.completed_at=new Date().toISOString();try{localStorage.setItem('gyx_spare_time_profile',JSON.stringify(profile))}catch{}renderCases()}}
function renderCases(){const h=host();if(!h)return;h.innerHTML=`<div class="gyx-profile gyx-spare-cases"><div class="gyx-profile-card"><div class="gyx-profile-step">他们只是把零碎时间用对了</div><h2 class="gyx-profile-title">看清楚他们到底用什么、每天做什么、为什么最后能跑通</h2><div class="gyx-case-list">${cases.map(c=>`<article class="gyx-case"><b>${c.who}</b><p><strong>一开始：</strong>${c.before}</p><p><strong>用什么：</strong>${c.tools}</p><p><strong>具体怎么做：</strong>${c.do}</p><p><strong>为什么最后能成功：</strong>${c.gain}</p></article>`).join('')}</div><div class="gyx-finish-note">收入和成交数字只属于对应经历，不代表所有人都会得到相同结果。真正值得看的，是他们怎样把工具、固定动作、客户触达和持续交付连成一条完整路径。</div><button type="button" class="gyx-see-offers">下一步</button></div></div>`;$('.gyx-see-offers',h).onclick=renderOffers;screen().scrollTop=0}
function renderOffers(){const h=host();if(!h)return;h.innerHTML=`<div class="gyx-profile gyx-spare-offers"><div class="gyx-profile-card"><section class="gyx-emotion"><span>你已经认真回答了前面的每一个问题</span><h2>很多人真正缺的，不是时间，而是一条有人帮你拆清楚、今天就能开始走的路。</h2><p>我们不要求你一下变得多厉害，也不要求你每天拿出几个小时。你有15分钟，就从15分钟开始；只有手机，就先把手机能做的事情做好。生活已经够忙了，这个计划存在的意义，就是让普通人不用东奔西走，也能在自己的时间里，一点一点把能力留下来。</p><p>你不需要证明给谁看。只要一个月后的你，比今天多会一件事、多留下几个成果、多一点选择，这些零碎时间就没有白过。</p></section><section class="gyx-price-area"><div class="gyx-profile-step">选择适合自己的节奏</div><div class="gyx-price-grid">${offers.slice(0,5).map(o=>`<button type="button" class="gyx-price-card" data-product="${o.id}"><span>${o.name}</span><strong>${o.price}</strong><small>USDT</small><em>${o.desc}</em></button>`).join('')}</div><button type="button" class="gyx-private-card" data-product="${offers[5].id}"><span><b>${offers[5].name}</b><small>${offers[5].desc}</small></span><strong>${offers[5].price} USDT</strong></button></section></div></div>`;h.querySelectorAll('[data-product]').forEach(b=>b.onclick=async()=>{const id=b.dataset.product;if(!window.GYX_MEMBER_CHECKOUT?.open)return alert('订单功能正在加载，请稍后再点一次');await window.GYX_MEMBER_CHECKOUT.open(id,{question:'零碎时间养成计划',selections:Object.entries(profile).filter(([k])=>k!=='gate').map(([k,v])=>`${k}: ${v}`),tier:id})});screen().scrollTop=0}
const st=document.createElement('style');st.textContent=`.gyx-case-list{display:grid;gap:12px}.gyx-case{padding:16px;border:1px solid rgba(70,110,160,.14);border-radius:16px;background:#f8fafc;color:#182230}.gyx-case>b{display:block;font-size:16px;margin-bottom:8px}.gyx-case p{margin:7px 0;line-height:1.65;font-size:14px}.gyx-see-offers{width:100%;min-height:54px;border:0;border-radius:14px;background:#182230;color:#fff;font-size:17px;font-weight:850;margin-top:16px}.gyx-emotion{min-height:44vh;display:flex;flex-direction:column;justify-content:center;text-align:center;padding:18px 6px 28px}.gyx-emotion>span{font-size:13px;font-weight:850;color:#69768a}.gyx-emotion h2{font-size:24px;line-height:1.45;color:#182230;margin:14px 0}.gyx-emotion p{font-size:14px;line-height:1.8;color:#56657a;margin:6px 0}.gyx-price-area{border-top:1px solid rgba(70,110,160,.12);padding-top:20px}.gyx-price-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.gyx-price-card{border:1px solid rgba(70,110,160,.18);border-radius:15px;background:#fff;color:#182230;min-height:132px;padding:13px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center}.gyx-price-card span{font-size:13px;font-weight:850}.gyx-price-card strong{font-size:30px;line-height:1.1;margin-top:7px}.gyx-price-card small{font-size:11px;color:#69768a}.gyx-price-card em{font-style:normal;font-size:11px;line-height:1.4;color:#69768a;margin-top:7px}.gyx-price-card:nth-child(5){grid-column:1/-1;background:#182230;color:#fff}.gyx-private-card{width:100%;margin-top:10px;min-height:76px;border:0;border-radius:16px;background:linear-gradient(135deg,#5b37ff,#7a4cff);color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;text-align:left}.gyx-private-card span{display:grid;gap:4px}.gyx-private-card b{font-size:17px}.gyx-private-card small{font-size:11px;opacity:.85}.gyx-private-card strong{font-size:20px;white-space:nowrap}html[data-theme="dark"] .gyx-case,html[data-theme="dark"] .gyx-price-card{background:#101f35;color:#f8fafc;border-color:#26364c}`;document.head.appendChild(st);
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-gyx-full="home"]');if(!b)return;setTimeout(renderGate,0)},true);
window.addEventListener('gyx:languagechange',()=>{if(screen()?.classList.contains('is-open'))renderGate()});
})();
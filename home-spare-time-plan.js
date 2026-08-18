(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),I=window.GYXI18N;
const L=(zh,en,km)=>I?.locale==='en'?en:I?.locale==='km'?km:zh;
const gate=[
 {q:'你现在是否真的有可以利用的零碎时间？',opts:['每天都有一点','工作日有一些','周末或休息日有','时间不固定但能安排','目前几乎没有'],reject:'目前几乎没有'},
 {q:'你是否愿意每天拿出固定时间实际执行？',opts:['愿意每天执行','大部分时间可以','一周能执行3–5天','想先试7天','目前做不到'],reject:'目前做不到'},
 {q:'你是否愿意按真实情况回答后续问题？',opts:['愿意按真实情况回答','可以，大部分都能回答','涉及隐私的部分希望可以跳过','不愿意'],reject:'不愿意'},
 {q:'你是否接受根据个人情况安排不同路径，而不是所有人使用同一套方法？',opts:['接受，按实际情况安排','可以，但希望步骤简单','可以，先从最容易执行的开始','只想要固定模板'],reject:'只想要固定模板'},
 {q:'如果最后有适合你的付费方案，你能接受继续了解吗？',opts:['可以接受合适的付费方案','先看清楚内容和价格再决定','只接受自己能负担的方案','完全不接受任何付费方案'],reject:'完全不接受任何付费方案'}
];
const steps=[
 {title:'基础情况',fields:[
  {k:'age',label:'你的年龄？',opts:['18–25','26–35','36–45','46–60','60以上']},
  {k:'region',label:'你目前主要生活在哪个地区？',opts:['中国大陆','港澳台','东南亚','欧洲','北美','南美','中东','非洲','其他地区']},
  {k:'life_state',label:'你目前的主要生活状态？',opts:['正常上班','自由职业 / 零工','在家照顾家庭','暂时待业','学生 / 学习阶段','退休 / 半退休','其他']}
 ]},
 {title:'真实时间',fields:[
  {k:'daily_time',label:'你每天真正能用于实践的时间？',opts:['15分钟以内','15–30分钟','30–60分钟','1–2小时','2小时以上']},
  {k:'free_time',label:'你最容易空出来的时间段？',opts:['早上','中午','下午','晚上','深夜','时间不固定']},
  {k:'weekly_days',label:'一周大约能认真执行几天？',opts:['1–2天','3–4天','5天左右','6天','每天']}
 ]},
 {title:'设备与使用习惯',fields:[
  {k:'device',label:'你实际能长期使用的设备？',opts:['只有手机','手机 + 平板','手机 + 电脑','只有电脑','设备比较齐全']},
  {k:'phone_level',label:'你对手机操作熟悉到什么程度？',opts:['只会聊天和刷视频','会安装软件和传文件','会剪视频 / 做图 / 用AI','会处理文档表格和云盘','手机操作非常熟练']},
  {k:'video_app',label:'你平时最常用的视频或内容平台？',opts:['抖音','TikTok','快手','小红书','YouTube','Facebook / Reels','Instagram / Reels','B站','基本不用','其他']}
 ]},
 {title:'目前经济情况',fields:[
  {k:'economic_status',label:'你目前的经济状况更接近哪一种？',opts:['收入稳定，压力较小','收入稳定，但支出压力较大','收入一般，希望增加收入','收入不稳定','暂时没有固定收入','不方便说明']},
  {k:'income_urgency',label:'你现在增加收入的紧迫程度？',opts:['暂时不急','希望慢慢增加','希望3个月内看到变化','希望1个月内开始尝试','目前非常需要增加收入']},
  {k:'cost_limit',label:'开始实践时，你更能接受哪种投入方式？',opts:['尽量零投入','只用现有设备和免费工具','先验证有效再考虑投入','小额必要投入可以接受','投入不是主要限制']}
 ]},
 {title:'方向偏好',fields:[
  {k:'start_direction',label:'你更希望从哪一类事情开始？',opts:['学一个实用技能','做图片 / 视频 / 内容','学AI工具','给个人或商户提供服务','做本地小项目','做线上项目','目前还不清楚']},
  {k:'interest',label:'下面哪类事情你做起来最不容易烦？',opts:['写东西 / 整理资料','图片 / 视觉内容','视频 / 内容制作','研究工具和AI','和人沟通 / 服务别人','本地跑动 / 做实际项目','都不确定']},
  {k:'income_goal',label:'你希望未来主要通过什么方式增加收入？',opts:['暂时不考虑收入','线上兼职 / 小任务','技能接单','内容创作','给商家 / 公司提供服务','本地便民小项目','做自己的长期项目','还不知道']}
 ]},
 {title:'线上与线下接受度',fields:[
  {k:'work_mode',label:'你更能接受哪种实践方式？',opts:['只做线上','线上为主，偶尔线下','线上线下都可以','线下为主，也可以线上','只做线下','还不确定']},
  {k:'customer_contact',label:'如果需要和客户或商户沟通，你能接受到什么程度？',opts:['不想接触客户','只接受文字沟通','可以语音沟通','可以当面沟通','可以谈需求和报价','沟通不是问题']},
  {k:'local_mobility',label:'如果项目需要到附近社区、夜市或商户现场，你能接受吗？',opts:['完全不能外出','只接受家附近','偶尔可以外出','每天可以安排短时间','外出不是问题','看项目再决定']}
 ]}
];
const deepFields=[
 {k:'gender',label:'性别',opts:['男','女','不方便说明']},
 {k:'occupation',label:'你目前最接近哪种职业状态？',opts:['企业 / 公司上班','机关 / 事业单位','个体经营','自由职业','灵活就业 / 零工','全职照顾家庭','学生','退休','暂时待业','其他']},
 {k:'education',label:'你的教育程度？',opts:['初中及以下','高中 / 中专','大专','本科','研究生及以上','不方便说明']},
 {k:'editing_app',label:'你实际用过哪些剪辑或内容工具？',opts:['剪映 / CapCut','Canva','VN','Premiere / PR','其他工具','只看过没做过','完全没用过']},
 {k:'ai_level',label:'你目前使用AI到什么程度？',opts:['几乎没用过','偶尔聊天问问题','会写文案 / 总结','会做图 / 视频','会用AI完成实际任务','已经形成自己的工作流']},
 {k:'writing',label:'你的文字表达和资料整理能力？',opts:['基本不会','能写简单内容','一般','比较擅长','非常擅长']},
 {k:'image',label:'图片、海报、菜单、封面这类内容你做到什么程度？',opts:['完全没做过','只会简单修图','会套模板','能独立完成','比较熟练']},
 {k:'video',label:'短视频制作你做到什么程度？',opts:['完全没做过','会简单剪切','会字幕配乐','能独立完成短视频','比较熟练']},
 {k:'printer_access',label:'你身边是否容易接触打印、照片打印或简单制作设备？',opts:['完全没有','附近有打印店','家里有普通打印机','可以低成本使用设备','已经有相关设备','不清楚']},
 {k:'merchant_access',label:'你平时接触附近商户、摊主、社区门店方便吗？',opts:['几乎接触不到','家附近有一些','经常经过商业街 / 夜市','认识一些商户','自己就有商户资源','愿意主动去找']},
 {k:'community_access',label:'你是否使用本地微信群、Telegram群、Facebook群或社区群组？',opts:['基本不用','只看消息','偶尔发信息','经常使用','自己管理群组','愿意尝试建立或运营群组']},
 {k:'service_interest',label:'下面哪些实际服务你更愿意尝试？',opts:['照片打印 / 简单纪念品','3分钟商户短视频','电子菜单 / 海报','群组便民信息','AI图片 / 设计','线上资料整理','都可以先试','都不确定']},
 {k:'show_face',label:'如果一个方向需要露脸或当面服务，你的接受程度？',opts:['完全不接受','只接受声音不露脸','偶尔可以','线下服务可以但不拍自己','如果有价值可以','没有限制']},
 {k:'sales_comfort',label:'你对主动介绍自己的服务是什么感觉？',opts:['非常排斥','有点紧张但可以练','只愿意发文字介绍','熟悉以后可以','可以主动介绍和报价','比较擅长']},
 {k:'past_attempt',label:'以前有没有认真尝试过副业、接单或小项目？',opts:['完全没有','试过但没坚持','做过一些但没成交','有过少量成交','有稳定客户经验','做过多个项目']},
 {k:'biggest_block',label:'你过去最容易卡在哪一步？',opts:['不知道做什么','不会开始','学很多但不执行','不敢找客户','做了没人买','坚持不了','时间不够','工具太复杂']},
 {k:'habit_style',label:'哪种方式你最容易坚持？',opts:['每天一个小任务','每天固定30分钟','有时间就多做','每周集中做几次','需要非常明确的步骤','需要反馈后再给下一步']},
 {k:'result_speed',label:'你希望多久看到第一批真实变化？',opts:['7天左右','14天左右','30天左右','1–3个月','不追求快，稳定最重要']},
 {k:'first_goal',label:'第一阶段你最想先得到什么？',opts:['养成稳定执行','学会一个实用工具','做出第一个作品','完成第一次真实服务','拿到第一笔小订单','找到适合自己的方向','建立长期收入能力']},
 {k:'commitment',label:'遇到前几次没有结果时，你愿意怎么做？',opts:['继续按计划执行','复盘后调整再试','降低任务难度继续','换一个更适合的方向','需要有人帮我判断问题','很可能会停下来']}
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
function fail(){const h=host();if(!h)return;h.innerHTML=`<div class="gyx-gate-card"><h2 class="gyx-gate-title">目前先不进入计划</h2><div class="gyx-gate-note">等你准备好并愿意继续了解适合自己的方案时，可以随时回来。</div><button class="gyx-gate-home">返回首页</button></div>`;$('.gyx-gate-home',h).onclick=close}
function renderGate(){gi=0;gateAnswers=[];drawGate()}
function drawGate(){const h=host(),x=gate[gi];if(!h||!x)return;h.innerHTML=`<div class="gyx-gate-card"><div class="gyx-gate-progress">资格确认 ${gi+1} / ${gate.length}</div><h2 class="gyx-gate-title">${x.q}</h2><div class="gyx-gate-options">${x.opts.map(v=>`<button type="button" class="gyx-gate-option" data-value="${v.replace(/"/g,'&quot;')}">${v}</button>`).join('')}</div><button class="gyx-gate-next" disabled>下一步</button></div>`;let selected='';h.querySelectorAll('[data-value]').forEach(b=>b.onclick=()=>{selected=b.dataset.value;h.querySelectorAll('[data-value]').forEach(z=>z.classList.toggle('is-selected',z===b));$('.gyx-gate-next',h).disabled=false});$('.gyx-gate-next',h).onclick=()=>{if(!selected)return;if(x.reject&&selected===x.reject)return fail();gateAnswers.push({question:x.q,answer:selected});gi++;if(gi<gate.length)drawGate();else pass()}}
function pass(){const h=host();if(!h)return;const rec={project:'spare-time-plan',passed:true,answers:gateAnswers,passed_at:new Date().toISOString()};try{localStorage.setItem('gyx_spare_time_gate',JSON.stringify(rec))}catch{}h.innerHTML=`<div class="gyx-gate-card"><h2 class="gyx-gate-title">继续了解你的实际情况</h2><div class="gyx-profile-alert">接下来每页3个问题，后面还有一张更完整的实际情况页。全部都只为让最终方向更贴近你真正能做的事情。</div><button class="gyx-profile-next">下一步</button></div>`;$('.gyx-profile-next',h).onclick=()=>{si=0;profile={gate:rec};drawStep()}}
function field(f){return `<div class="gyx-field"><label>${f.label}</label><div class="gyx-choice-grid three">${f.opts.map(v=>`<button type="button" class="gyx-choice" data-key="${f.k}" data-value="${v.replace(/"/g,'&quot;')}">${v}</button>`).join('')}</div></div>`}
function bindChoices(h){h.querySelectorAll('.gyx-choice').forEach(b=>b.onclick=()=>{profile[b.dataset.key]=b.dataset.value;h.querySelectorAll(`.gyx-choice[data-key="${b.dataset.key}"]`).forEach(z=>z.classList.toggle('is-selected',z===b))})}
function drawStep(){const h=host(),s=steps[si];if(!h||!s)return;h.innerHTML=`<div class="gyx-profile"><div class="gyx-profile-card"><div class="gyx-profile-step">基础了解 ${si+1} / ${steps.length}</div><h2 class="gyx-profile-title">${s.title}</h2>${s.fields.map(field).join('')}<div class="gyx-profile-actions">${si?'<button class="gyx-profile-back">上一步</button>':'<span></span>'}<button class="gyx-profile-next">下一步</button></div></div></div>`;bindChoices(h);const back=$('.gyx-profile-back',h);if(back)back.onclick=()=>{si--;drawStep();screen().scrollTop=0};$('.gyx-profile-next',h).onclick=()=>{if(s.fields.some(f=>!profile[f.k]))return alert('请先完成本页3个问题');try{localStorage.setItem('gyx_spare_time_profile_draft',JSON.stringify(profile))}catch{}if(si<steps.length-1){si++;drawStep();screen().scrollTop=0}else renderDeep()}}
function renderDeep(){const h=host();if(!h)return;h.innerHTML=`<div class="gyx-profile gyx-deep-profile"><div class="gyx-profile-card"><div class="gyx-profile-step">实际情况</div><h2 class="gyx-profile-title">把真正影响你后面方向的情况一次问清楚</h2><div class="gyx-profile-alert">这张会比前面长。按真实情况选择即可，不需要把自己包装得更好。</div>${deepFields.map(field).join('')}<div class="gyx-profile-actions"><button class="gyx-deep-back">上一步</button><button class="gyx-deep-next">下一步</button></div></div></div>`;bindChoices(h);$('.gyx-deep-back',h).onclick=()=>{si=steps.length-1;drawStep();screen().scrollTop=0};$('.gyx-deep-next',h).onclick=()=>{if(deepFields.some(f=>!profile[f.k]))return alert('请先完成这张实际情况页');profile.completed_at=new Date().toISOString();try{localStorage.setItem('gyx_spare_time_profile',JSON.stringify(profile))}catch{}renderCases()};screen().scrollTop=0}
function renderCases(){const h=host();if(!h)return;h.innerHTML=`<div class="gyx-profile gyx-spare-cases"><div class="gyx-profile-card"><div class="gyx-profile-step">他们只是把零碎时间用对了</div><h2 class="gyx-profile-title">看清楚他们到底用什么、每天做什么、为什么最后能跑通</h2><div class="gyx-case-list">${cases.map(c=>`<article class="gyx-case"><b>${c.who}</b><p><strong>一开始：</strong>${c.before}</p><p><strong>用什么：</strong>${c.tools}</p><p><strong>具体怎么做：</strong>${c.do}</p><p><strong>为什么最后能成功：</strong>${c.gain}</p></article>`).join('')}</div><button type="button" class="gyx-see-offers">下一步</button></div></div>`;$('.gyx-see-offers',h).onclick=renderOffers;screen().scrollTop=0}
function buildEmotion(){const t=profile.daily_time||'你现在能拿出来的时间';const mode=profile.work_mode||'你能接受的方式';const econ=profile.economic_status||'你目前的实际状态';const start=profile.start_direction||'你想开始的方向';let p1=`你现在每天真正能拿出来的是“${t}”，适合你的路就不应该建立在每天连续几个小时的假设上。`;let p2=`你选择的是“${mode}”，所以后面的方向不必只盯着电脑或手机。能线上完成的，就尽量在线上做；如果你也能接受线下，本地商户、社区、夜市和身边真实需求同样可以成为起点。`;let p3=`你目前更接近“${econ}”，而你想从“${start}”开始。真正重要的不是一下做得多大，而是先选一个你负担得起、做得了、能够持续重复的动作。前几次没有结果很正常，能不能复盘、调整、继续做，才会决定它最后只是一次尝试，还是慢慢变成你的能力。`;return[p1,p2,p3]}
function renderOffers(){const h=host();if(!h)return;const e=buildEmotion();h.innerHTML=`<div class="gyx-profile gyx-spare-offers"><div class="gyx-profile-card"><section class="gyx-emotion"><h2>按你现在的实际情况，先选一条真正能坚持的路。</h2>${e.map(x=>`<p>${x}</p>`).join('')}</section><section class="gyx-price-area"><div class="gyx-profile-step">选择适合自己的节奏</div><div class="gyx-price-grid">${offers.slice(0,5).map(o=>`<button type="button" class="gyx-price-card" data-product="${o.id}"><span>${o.name}</span><strong>${o.price}</strong><small>USDT</small><em>${o.desc}</em></button>`).join('')}</div><button type="button" class="gyx-private-card" data-product="${offers[5].id}"><span><b>${offers[5].name}</b><small>${offers[5].desc}</small></span><strong>${offers[5].price} USDT</strong></button></section></div></div>`;h.querySelectorAll('[data-product]').forEach(b=>b.onclick=async()=>{const id=b.dataset.product;if(!window.GYX_MEMBER_CHECKOUT?.open)return alert('订单功能正在加载，请稍后再点一次');await window.GYX_MEMBER_CHECKOUT.open(id,{question:'零碎时间养成计划',selections:Object.entries(profile).filter(([k])=>k!=='gate').map(([k,v])=>`${k}: ${v}`),tier:id})});screen().scrollTop=0}
const st=document.createElement('style');st.textContent=`.gyx-case-list{display:grid;gap:12px}.gyx-case{padding:16px;border:1px solid rgba(70,110,160,.14);border-radius:16px;background:#f8fafc;color:#182230}.gyx-case>b{display:block;font-size:16px;margin-bottom:8px}.gyx-case p{margin:7px 0;line-height:1.65;font-size:14px}.gyx-see-offers,.gyx-deep-next,.gyx-deep-back{min-height:52px;border:0;border-radius:14px;font-size:16px;font-weight:850}.gyx-see-offers{width:100%;background:#182230;color:#fff;margin-top:16px}.gyx-deep-profile .gyx-field{margin-bottom:18px}.gyx-emotion{min-height:44vh;display:flex;flex-direction:column;justify-content:center;text-align:left;padding:18px 6px 28px}.gyx-emotion h2{font-size:24px;line-height:1.45;color:#182230;margin:14px 0}.gyx-emotion p{font-size:14px;line-height:1.85;color:#56657a;margin:7px 0}.gyx-price-area{border-top:1px solid rgba(70,110,160,.12);padding-top:20px}.gyx-price-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.gyx-price-card{border:1px solid rgba(70,110,160,.18);border-radius:15px;background:#fff;color:#182230;min-height:132px;padding:13px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center}.gyx-price-card span{font-size:13px;font-weight:850}.gyx-price-card strong{font-size:30px;line-height:1.1;margin-top:7px}.gyx-price-card small{font-size:11px;color:#69768a}.gyx-price-card em{font-style:normal;font-size:11px;line-height:1.4;color:#69768a;margin-top:7px}.gyx-price-card:nth-child(5){grid-column:1/-1;background:#182230;color:#fff}.gyx-private-card{width:100%;margin-top:10px;min-height:76px;border:0;border-radius:16px;background:linear-gradient(135deg,#5b37ff,#7a4cff);color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;text-align:left}.gyx-private-card span{display:grid;gap:4px}.gyx-private-card b{font-size:17px}.gyx-private-card small{font-size:11px;opacity:.85}.gyx-private-card strong{font-size:20px;white-space:nowrap}html[data-theme="dark"] .gyx-case,html[data-theme="dark"] .gyx-price-card{background:#101f35;color:#f8fafc;border-color:#26364c}html[data-theme="dark"] .gyx-emotion h2{color:#f8fafc}html[data-theme="dark"] .gyx-emotion p{color:#c6d0df}`;document.head.appendChild(st);
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-gyx-full="home"]');if(!b)return;setTimeout(renderGate,0)},true);
window.addEventListener('gyx:languagechange',()=>{if(screen()?.classList.contains('is-open'))renderGate()});
})();
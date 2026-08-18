(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s);
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
 {k:'merchant_access',label:'你平时接触附近商户、摊主、社区门店方便吗？',opts:['几乎接触不到','家附近有一些','经常经过商业街 / 夜市','认识一些商户','自己就有商户资源','愿意主动去找']},
 {k:'community_access',label:'你是否使用本地微信群、Telegram群、Facebook群或社区群组？',opts:['基本不用','只看消息','偶尔发信息','经常使用','自己管理群组','愿意尝试建立或运营群组']},
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
 {who:'每天固定时间投稿的音乐创作者',story:'他开始时没有稳定客户，也没有稳定收入，只是喜欢音乐，利用空闲时间一点点做。最初很多作品没有回应，他也怀疑过自己，但没有因为几次没结果就停下来。后来作品越来越多，也越来越知道什么样的作品有人需要，成交才从偶尔出现变成持续发生。真正值得看的不是他后来成交了多少，而是他的起点和大多数普通人一样：时间有限、资源有限、先从自己会的一点东西开始。'},
 {who:'从零碎时间做到月收入约5万的视频创作者',story:'他最开始只是会一点剪辑，没有团队，也没有现成客户。最早做出来的东西并不突出，收入也很不稳定。后来他没有不停换方向，而是一直把同一件事做得更熟、更快、更可靠。作品多起来以后，客户开始介绍客户，做过一次的人也愿意回来。后来他的月收入曾做到约5万元。这个数字不是承诺，真正让普通人有参考价值的是：他不是从专业公司起步，而是从会一点、做一点、坚持一点慢慢走出来的。'},
 {who:'一个女孩用AI承接多家公司设计',story:'她开始时也是一个人，没有设计团队，也没有特别资源。刚接触AI时，她只是发现原来很多以前很耗时间的工作可以更快完成，于是从简单任务开始练。做得多了以后，她越来越懂客户真正想要什么，也越来越敢接真实需求。后来一个人也能同时服务多家公司。她的经历说明，普通人不一定先具备很高水平才开始，很多能力本来就是在一次次真实完成事情的过程中长出来的。'}
];
const offers=[
 {id:'spare-time-99-start',name:'轻量起步版',price:29,desc:'先把第一套行动节奏跑起来'},
 {id:'spare-time-199-habit',name:'稳定养成版',price:49,desc:'建立连续执行、记录与复盘'},
 {id:'spare-time-299-skill',name:'技能实践版',price:69,desc:'按设备与基础匹配实践方向'},
 {id:'spare-time-399-output',name:'成果推进版',price:99,desc:'把练习推进到真实可见成果'},
 {id:'spare-time-499-7day',name:'7天落地版',price:199,desc:'7天每日任务 + 反馈 + 调整'}
];
let gi=0,gateAnswers=[],si=0,profile={};
function screen(){return $('[data-gyx-screen="home"]')}
function host(){const s=screen();if(!s)return null;const m=$('main',s);let h=$('.gyx-home-plan-host',m);if(!h){m.replaceChildren();h=document.createElement('div');h.className='gyx-gate gyx-home-plan-host';m.appendChild(h)}return h}
function close(){screen()?.querySelector('.gyx-full-close')?.click()}
function fail(){const h=host();if(!h)return;h.innerHTML=`<div class="gyx-gate-card"><h2 class="gyx-gate-title">目前先不进入计划</h2><div class="gyx-gate-note">等你准备好并愿意继续了解适合自己的方案时，可以随时回来。</div><div class="gyx-profile-actions"><button class="gyx-gate-back">上一步</button><button class="gyx-gate-home">返回首页</button></div></div>`;$('.gyx-gate-back',h).onclick=drawGate;$('.gyx-gate-home',h).onclick=close}
function renderGate(){gi=0;gateAnswers=[];drawGate()}
function drawGate(){const h=host(),x=gate[gi];if(!h||!x)return;const saved=gateAnswers[gi]?.answer||'';h.innerHTML=`<div class="gyx-gate-card"><h2 class="gyx-gate-title">${x.q}</h2><div class="gyx-gate-options">${x.opts.map(v=>`<button type="button" class="gyx-gate-option ${saved===v?'is-selected':''}" data-value="${v.replace(/"/g,'&quot;')}">${v}</button>`).join('')}</div><div class="gyx-profile-actions"><button class="gyx-gate-back">上一步</button><button class="gyx-gate-next" ${saved?'':'disabled'}>下一步</button></div></div>`;let selected=saved;h.querySelectorAll('[data-value]').forEach(b=>b.onclick=()=>{selected=b.dataset.value;h.querySelectorAll('[data-value]').forEach(z=>z.classList.toggle('is-selected',z===b));$('.gyx-gate-next',h).disabled=false});$('.gyx-gate-back',h).onclick=()=>{if(gi===0){close();return}gi--;drawGate();screen().scrollTop=0};$('.gyx-gate-next',h).onclick=()=>{if(!selected)return;gateAnswers[gi]={question:x.q,answer:selected};if(x.reject&&selected===x.reject)return fail();gi++;if(gi<gate.length){drawGate();screen().scrollTop=0}else pass()}}
function pass(){const rec={project:'spare-time-plan',passed:true,answers:gateAnswers,passed_at:new Date().toISOString()};try{localStorage.setItem('gyx_spare_time_gate',JSON.stringify(rec))}catch{}si=0;profile={gate:rec};drawStep()}
function field(f){return `<div class="gyx-field" data-field="${f.k}"><label>${f.label}</label><div class="gyx-choice-grid three">${f.opts.map(v=>`<button type="button" class="gyx-choice ${profile[f.k]===v?'is-selected':''}" data-key="${f.k}" data-value="${v.replace(/"/g,'&quot;')}">${v}</button>`).join('')}</div></div>`}
function bindChoices(h){h.querySelectorAll('.gyx-choice').forEach(b=>b.onclick=()=>{profile[b.dataset.key]=b.dataset.value;h.querySelectorAll(`.gyx-choice[data-key="${b.dataset.key}"]`).forEach(z=>z.classList.toggle('is-selected',z===b));b.closest('.gyx-field')?.classList.remove('is-missing')})}
function drawStep(){const h=host(),s=steps[si];if(!h||!s)return;h.innerHTML=`<div class="gyx-profile"><div class="gyx-profile-card"><h2 class="gyx-profile-title">${s.title}</h2>${s.fields.map(field).join('')}<div class="gyx-profile-actions"><button class="gyx-profile-back">上一步</button><button class="gyx-profile-next">下一步</button></div></div></div>`;bindChoices(h);$('.gyx-profile-back',h).onclick=()=>{if(si===0){gi=gate.length-1;drawGate()}else{si--;drawStep()}screen().scrollTop=0};$('.gyx-profile-next',h).onclick=()=>{const miss=s.fields.find(f=>!profile[f.k]);if(miss){const el=h.querySelector(`[data-field="${miss.k}"]`);el?.classList.add('is-missing');el?.scrollIntoView({behavior:'smooth',block:'center'});return}try{localStorage.setItem('gyx_spare_time_profile_draft',JSON.stringify(profile))}catch{}if(si<steps.length-1){si++;drawStep();screen().scrollTop=0}else renderDeep()}}
function renderDeep(){const h=host();if(!h)return;h.innerHTML=`<div class="gyx-profile gyx-deep-profile"><div class="gyx-profile-card"><h2 class="gyx-profile-title">实际情况</h2>${deepFields.map(field).join('')}<div class="gyx-profile-actions"><button class="gyx-deep-back">上一步</button><button class="gyx-deep-next">下一步</button></div></div></div>`;bindChoices(h);$('.gyx-deep-back',h).onclick=()=>{si=steps.length-1;drawStep();screen().scrollTop=0};$('.gyx-deep-next',h).onclick=()=>{const miss=deepFields.find(f=>!profile[f.k]);if(miss){const el=h.querySelector(`[data-field="${miss.k}"]`);el?.classList.add('is-missing');el?.scrollIntoView({behavior:'smooth',block:'center'});return}profile.completed_at=new Date().toISOString();try{localStorage.setItem('gyx_spare_time_profile',JSON.stringify(profile))}catch{}renderCases()};screen().scrollTop=0}
function renderCases(){const h=host();if(!h)return;h.innerHTML=`<div class="gyx-profile gyx-spare-cases"><div class="gyx-profile-card"><h2 class="gyx-profile-title">他们只是把零碎时间用对了</h2><div class="gyx-case-list">${cases.map(c=>`<article class="gyx-case"><b>${c.who}</b><p>${c.story}</p></article>`).join('')}</div><div class="gyx-profile-actions"><button type="button" class="gyx-case-back">上一步</button><button type="button" class="gyx-see-offers">下一步</button></div></div></div>`;$('.gyx-case-back',h).onclick=renderDeep;$('.gyx-see-offers',h).onclick=renderOffers;screen().scrollTop=0}
function buildEmotion(){const shortTime=['15分钟以内','15–30分钟'].includes(profile.daily_time);const offline=['线上线下都可以','线下为主，也可以线上','只做线下'].includes(profile.work_mode);const pressure=['收入不稳定','暂时没有固定收入','收入一般，希望增加收入'].includes(profile.economic_status);const beginner=['几乎没用过','偶尔聊天问问题'].includes(profile.ai_level)&&['完全没做过','会简单剪切'].includes(profile.video);const parts=[];parts.push(shortTime?'真正能改变生活的，不一定是一整块空闲时间。每天把一小段时间留下来，长期重复同一类有效动作，也会慢慢积累出别人拿不走的能力。':'你已经有条件把一部分时间稳定用在自己身上。接下来真正重要的不是一次做很多，而是把行动持续下来，让每一次练习都为下一次减少一点难度。');parts.push(beginner?'现在不会很多东西并不代表起步太晚。大多数能真正独立完成事情的人，也都是从第一次不会、第一次做不好、第一次没有结果开始的。只要愿意持续学习和修改，能力会在实际完成事情的过程中长出来。':'你已经有一些可利用的基础。下一步不是把所有东西重新学一遍，而是把现有能力用到真实事情里，在一次次完成、反馈和调整中变得更稳定。');parts.push(offline?'机会不一定只在屏幕里。只要愿意观察身边真实需求，线上学习到的能力也可以拿到现实环境里验证；先从自己能够接触到的小事情开始，比一直等一个“完美机会”更重要。':'不必因为暂时不方便外出就觉得选择很少。很多能力本来就可以在线上学习、练习、展示和交付，关键仍然是持续完成真实成果，而不是只停留在看教程。');parts.push(pressure?'越希望尽快改变现状，越不能靠不断换方向碰运气。先选择自己承受得起的节奏，坚持完成、复盘、调整，让每一步都留下东西，才更有可能从一次尝试变成长期能力。':'结果不会因为选了一个方向就自动出现。任何真正能留下来的能力，都需要时间、重复和坚持；做错了就调整，暂时没有结果就继续验证，最后拉开差距的往往就是这段没有立刻得到回报却仍然坚持的过程。');return parts}
function renderOffers(){const h=host();if(!h)return;const e=buildEmotion();h.innerHTML=`<div class="gyx-profile gyx-spare-offers"><div class="gyx-profile-card"><section class="gyx-emotion"><h2>真正适合自己的路，需要一步一步走出来。</h2>${e.map(x=>`<p>${x}</p>`).join('')}</section><section class="gyx-price-area"><h2 class="gyx-profile-title">选择适合自己的节奏</h2><div class="gyx-price-grid">${offers.map(o=>`<button type="button" class="gyx-price-card" data-product="${o.id}"><span>${o.name}</span><strong>${o.price}</strong><small>USDT</small><em>${o.desc}</em></button>`).join('')}</div></section><div class="gyx-profile-actions"><button type="button" class="gyx-offer-back">上一步</button><button type="button" class="gyx-gate-home">返回首页</button></div></div></div>`;$('.gyx-offer-back',h).onclick=renderCases;$('.gyx-gate-home',h).onclick=close;h.querySelectorAll('[data-product]').forEach(b=>b.onclick=async()=>{const id=b.dataset.product;if(!window.GYX_MEMBER_CHECKOUT?.open)return alert('订单功能正在加载，请稍后再点一次');await window.GYX_MEMBER_CHECKOUT.open(id,{question:'零碎时间养成计划',selections:Object.entries(profile).filter(([k])=>k!=='gate').map(([k,v])=>`${k}: ${v}`),tier:id})});screen().scrollTop=0}
const st=document.createElement('style');st.textContent=`.gyx-case-list{display:grid;gap:12px}.gyx-case{padding:16px;border:1px solid rgba(70,110,160,.14);border-radius:16px;background:#f8fafc;color:#182230}.gyx-case>b{display:block;font-size:16px;margin-bottom:8px}.gyx-case p{margin:7px 0;line-height:1.75;font-size:14px}.gyx-see-offers,.gyx-deep-next,.gyx-deep-back,.gyx-case-back,.gyx-offer-back{min-height:52px;border:0;border-radius:14px;font-size:16px;font-weight:850}.gyx-see-offers{background:#182230;color:#fff}.gyx-deep-profile .gyx-field{margin-bottom:18px}.gyx-field.is-missing{outline:2px solid #e55353;outline-offset:6px;border-radius:10px}.gyx-emotion{min-height:44vh;display:flex;flex-direction:column;justify-content:center;text-align:left;padding:18px 6px 28px}.gyx-emotion h2{font-size:24px;line-height:1.45;color:#182230;margin:14px 0}.gyx-emotion p{font-size:14px;line-height:1.85;color:#56657a;margin:7px 0}.gyx-price-area{border-top:1px solid rgba(70,110,160,.12);padding-top:20px}.gyx-price-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.gyx-price-card{border:1px solid rgba(70,110,160,.18);border-radius:15px;background:#fff;color:#182230;min-height:132px;padding:13px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center}.gyx-price-card span{font-size:13px;font-weight:850}.gyx-price-card strong{font-size:30px;line-height:1.1;margin-top:7px}.gyx-price-card small{font-size:11px;color:#69768a}.gyx-price-card em{font-style:normal;font-size:11px;line-height:1.4;color:#69768a;margin-top:7px}.gyx-price-card:nth-child(5){grid-column:1/-1;background:#182230;color:#fff}html[data-theme="dark"] .gyx-case,html[data-theme="dark"] .gyx-price-card{background:#101f35;color:#f8fafc;border-color:#26364c}html[data-theme="dark"] .gyx-emotion h2{color:#f8fafc}html[data-theme="dark"] .gyx-emotion p{color:#c6d0df}`;document.head.appendChild(st);
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-gyx-full="home"]');if(!b)return;setTimeout(renderGate,0)},true);
window.addEventListener('gyx:languagechange',()=>{if(screen()?.classList.contains('is-open'))renderGate()});
})();
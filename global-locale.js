(()=>{
'use strict';
const KEY='gyx_locale';
const VALID=new Set(['zh-CN','en','km']);
const MAP={
'账号ID / 名称':{en:'Account ID / Name',km:'លេខសម្គាល់គណនី / ឈ្មោះ'},
'请输入账号ID或名称':{en:'Enter account ID or name',km:'បញ្ចូលលេខសម្គាល់គណនី ឬឈ្មោះ'},
'收藏的方案，可继续查看或取消收藏':{en:'Saved plans can be viewed again or removed anytime.',km:'ផែនការដែលបានរក្សាទុក អាចមើលឡើងវិញ ឬលុបចេញបានគ្រប់ពេល។'},
'智能匹配':{en:'Smart Match',km:'ផ្គូផ្គងឆ្លាតវៃ'},
'我的搜索':{en:'My Searches',km:'ការស្វែងរករបស់ខ្ញុំ'},
'继续搜索':{en:'Continue Search',km:'បន្តស្វែងរក'},
'刷新':{en:'Refresh',km:'ផ្ទុកឡើងវិញ'},
'全部':{en:'All',km:'ទាំងអស់'},
'待付款':{en:'Pending',km:'រង់ចាំបង់ប្រាក់'},
'核验中':{en:'Verifying',km:'កំពុងផ្ទៀងផ្ទាត់'},
'已付款':{en:'Paid',km:'បានបង់ប្រាក់'},
'已完成':{en:'Completed',km:'បានបញ្ចប់'},
'已失效':{en:'Expired',km:'ផុតកំណត់'},
'我的下载':{en:'My Downloads',km:'ការទាញយករបស់ខ្ញុំ'},
'已付款 / 已完成订单的交付内容':{en:'Delivery content for paid / completed orders',km:'មាតិកាប្រគល់សម្រាប់ការបញ្ជាទិញដែលបានបង់ / បានបញ្ចប់'},
'暂无可下载内容':{en:'No downloadable content yet',km:'មិនទាន់មានមាតិកាសម្រាប់ទាញយក'},
'我的资料':{en:'My Materials',km:'ឯកសាររបស់ខ្ញុំ'},
'个人保存的资料与长文本':{en:'Your saved materials and long-form notes',km:'ឯកសារ និងអត្ថបទវែងដែលអ្នកបានរក្សាទុក'},
'新增资料':{en:'Add Material',km:'បន្ថែមឯកសារ'},
'资料标题':{en:'Material Title',km:'ចំណងជើងឯកសារ'},
'来源/文件名（选填）':{en:'Source / filename (optional)',km:'ប្រភព / ឈ្មោះឯកសារ (ស្រេចចិត្ត)'},
'分类':{en:'Category',km:'ប្រភេទ'},
'资料语言':{en:'Material Language',km:'ភាសាឯកសារ'},
'资料正文':{en:'Content',km:'មាតិកា'},
'保存到数据库':{en:'Save',km:'រក្សាទុក'},
'搜索资料':{en:'Search materials',km:'ស្វែងរកឯកសារ'},
'智能客服':{en:'Smart Support',km:'ជំនួយឆ្លាតវៃ'},
'需要进一步协助时，通过Telegram客服继续处理':{en:'Need more help? Continue with Telegram support.',km:'ត្រូវការជំនួយបន្ថែម? បន្តជាមួយជំនួយ Telegram។'},
'打开客服':{en:'Open Support',km:'បើកជំនួយ'},
'登录':{en:'Sign in',km:'ចូល'},
'注册':{en:'Register',km:'ចុះឈ្មោះ'},
'会员账号':{en:'Member Account',km:'គណនីសមាជិក'},
'一个账号同步你的资料、收藏与订单。':{en:'One account keeps your profile, saved items and orders in sync.',km:'គណនីមួយធ្វើសមកាលកម្មព័ត៌មាន ចំណូលចិត្ត និងការបញ្ជាទិញរបស់អ្នក។'},
'账号ID':{en:'Account ID',km:'លេខសម្គាល់គណនី'},
'设置账号ID':{en:'Set account ID',km:'កំណត់លេខសម្គាល់គណនី'},
'邮箱':{en:'Email',km:'អ៊ីមែល'},
'请输入邮箱':{en:'Enter email',km:'បញ្ចូលអ៊ីមែល'},
'密码':{en:'Password',km:'ពាក្យសម្ងាត់'},
'8～20位密码':{en:'8–20 character password',km:'ពាក្យសម្ងាត់ 8–20 តួ'},
'确认密码':{en:'Confirm password',km:'បញ្ជាក់ពាក្យសម្ងាត់'},
'再次输入密码':{en:'Enter password again',km:'បញ្ចូលពាក្យសម្ងាត់ម្តងទៀត'},
'显示':{en:'Show',km:'បង្ហាញ'},
'隐藏':{en:'Hide',km:'លាក់'},
'忘记密码？':{en:'Forgot password?',km:'ភ្លេចពាក្យសម្ងាត់?'},
'返回登录':{en:'Back to sign in',km:'ត្រឡប់ទៅចូល'},
'这个浏览器已经登录。':{en:'This browser is already signed in.',km:'កម្មវិធីរុករកនេះបានចូលគណនីរួចហើយ។'},
'切换账号':{en:'Switch account',km:'ប្តូរគណនី'},
'进入会员中心':{en:'Open Member Center',km:'ចូលមជ្ឈមណ្ឌលសមាជិក'},
'创建会员账号':{en:'Create account',km:'បង្កើតគណនី'},
'发送重置链接':{en:'Send reset link',km:'ផ្ញើតំណកំណត់ឡើងវិញ'},
'请输入至少2个字':{en:'Enter at least 2 characters',km:'សូមបញ្ចូលយ៉ាងហោចណាស់ 2 តួ'},
'请选择1个或多个关联问题':{en:'Choose one or more related questions',km:'ជ្រើសរើសសំណួរពាក់ព័ន្ធមួយ ឬច្រើន'},
'重新开始':{en:'Start over',km:'ចាប់ផ្តើមឡើងវិញ'},
'返回':{en:'Back',km:'ត្រឡប់'},
'最匹配方案':{en:'Best Match',km:'ផែនការផ្គូផ្គងល្អបំផុត'},
'方案深度':{en:'Plan Depth',km:'កម្រិតផែនការ'},
'本方案包含':{en:'This plan includes',km:'ផែនការនេះរួមមាន'},
'收藏答案':{en:'Save Answer',km:'រក្សាទុកចម្លើយ'},
'直接下单':{en:'Order Now',km:'បញ្ជាទិញឥឡូវ'},
'换一个问题':{en:'Ask Another Question',km:'សួរសំណួរផ្សេង'},
'确认订单':{en:'Confirm Order',km:'បញ្ជាក់ការបញ្ជាទិញ'},
'订单将保存到你的会员账号':{en:'This order will be saved to your member account',km:'ការបញ្ជាទិញនេះនឹងរក្សាទុកក្នុងគណនីសមាជិករបស់អ្នក'},
'姓名':{en:'Name',km:'ឈ្មោះ'},
'电话（选填）':{en:'Phone (optional)',km:'ទូរស័ព្ទ (ស្រេចចិត្ត)'},
'取消':{en:'Cancel',km:'បោះបង់'},
'创建真实订单':{en:'Create Order',km:'បង្កើតការបញ្ជាទិញ'},
'支付与核验':{en:'Payment & Verification',km:'ការបង់ប្រាក់ និងផ្ទៀងផ្ទាត់'},
'订单号':{en:'Order No.',km:'លេខការបញ្ជាទិញ'},
'应付金额':{en:'Amount Due',km:'ចំនួនត្រូវបង់'},
'网络':{en:'Network',km:'បណ្តាញ'},
'收款地址':{en:'Payment Address',km:'អាសយដ្ឋានទទួលប្រាក់'},
'复制':{en:'Copy',km:'ចម្លង'},
'交易哈希 TXID':{en:'Transaction Hash TXID',km:'ហាសប្រតិបត្តិការ TXID'},
'提交并核验付款':{en:'Submit & Verify Payment',km:'បញ្ជូន និងផ្ទៀងផ្ទាត់ការបង់ប្រាក់'},
'付款已确认':{en:'Payment Confirmed',km:'ការបង់ប្រាក់បានបញ្ជាក់'},
'查看我的订单':{en:'View My Orders',km:'មើលការបញ្ជាទិញរបស់ខ្ញុំ'},
'关闭':{en:'Close',km:'បិទ'},
'技术指导':{en:'Guidance',km:'ការណែនាំ'},
'留言邮箱':{en:'Email',km:'អ៊ីមែល'},
'首页':{en:'Home',km:'ទំព័រដើម'},
'我的订单':{en:'Orders',km:'ការបញ្ជាទិញ'},
'会员中心':{en:'Member',km:'សមាជិក'},
'播放音乐':{en:'Play Music',km:'ចាក់តន្ត្រី'},
'在线客服':{en:'Support',km:'ជំនួយ'}
};
const reverse=new Map();
Object.entries(MAP).forEach(([zh,v])=>{reverse.set(zh,zh);reverse.set(v.en,zh);reverse.set(v.km,zh)});
function locale(){const q=new URLSearchParams(location.search).get('lang');if(VALID.has(q))return q;try{const v=localStorage.getItem(KEY);if(VALID.has(v))return v}catch{}return'zh-CN'}
function target(zh,l){if(l==='zh-CN')return zh;return MAP[zh]?.[l]||zh}
function translateText(el,l){if(!el||el.closest?.('[translate="no"],[data-no-i18n]'))return;const raw=(el.textContent||'').trim();const zh=el.dataset?.gyxZh||reverse.get(raw);if(!zh)return;if(el.dataset)el.dataset.gyxZh=zh;el.textContent=target(zh,l)}
function translateNode(root,l){if(!root)return;if(root.nodeType===1){const el=root;translateText(el,l);['placeholder','title','aria-label'].forEach(attr=>{const raw=el.getAttribute?.(attr);if(!raw)return;const key='gyx'+attr.replace(/(^|-)([a-z])/g,(_,a,b)=>b.toUpperCase());const zh=el.dataset?.[key]||reverse.get(raw);if(!zh)return;el.dataset[key]=zh;el.setAttribute(attr,target(zh,l))});if(el.matches?.('[data-i18n],[data-i18n-placeholder],[data-i18n-aria]'))window.GYXI18N?.apply?.(el.parentElement||document);el.querySelectorAll?.('*').forEach(x=>translateText(x,l))}else if(root.nodeType===3){const p=root.parentElement;if(p&&p.childNodes.length===1)translateText(p,l)}}
let raf=0;function applyAll(){const l=locale();document.documentElement.lang=l;try{localStorage.setItem(KEY,l)}catch{}window.GYXI18N?.setLanguage?.(l,false);document.querySelectorAll('[data-language-select]').forEach(s=>s.value=l);translateNode(document.body,l)}
async function syncProfile(l){try{const db=window.gyxSupabase,u=await window.gyxGetVerifiedUser?.();if(!db||!u)return;await db.from('profiles').update({locale:l}).eq('user_id',u.id);try{await db.auth.updateUser({data:{locale:l}})}catch{}}catch{}}
function set(l,{sync=true}={}){if(!VALID.has(l))return;try{localStorage.setItem(KEY,l);localStorage.setItem('gyx_entry_lang',l)}catch{}window.GYXI18N?.setLanguage?.(l,false);document.documentElement.lang=l;applyAll();window.dispatchEvent(new CustomEvent('gyx:global-languagechange',{detail:{locale:l}}));if(sync)syncProfile(l)}
function bind(){document.addEventListener('change',e=>{const s=e.target.closest?.('[data-language-select]');if(s&&VALID.has(s.value))set(s.value)});document.addEventListener('click',e=>{const b=e.target.closest?.('[data-set-lang],[data-lang]');const l=b?.dataset?.setLang||b?.dataset?.lang;if(VALID.has(l))set(l)});window.addEventListener('gyx:languagechange',e=>{const l=e.detail?.locale;if(VALID.has(l)&&l!==locale())set(l)});window.addEventListener('storage',e=>{if(e.key===KEY&&VALID.has(e.newValue)){window.GYXI18N?.setLanguage?.(e.newValue,false);applyAll()}});const mo=new MutationObserver(ms=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const l=locale();for(const m of ms)for(const n of m.addedNodes)translateNode(n,l)})});mo.observe(document.documentElement,{childList:true,subtree:true});}
function init(){const q=new URLSearchParams(location.search).get('lang');if(VALID.has(q)){try{localStorage.setItem(KEY,q);localStorage.setItem('gyx_entry_lang',q)}catch{}const u=new URL(location.href);u.searchParams.delete('lang');history.replaceState(history.state,'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash)}applyAll();bind()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.GYXLocale={get:locale,set,apply:applyAll};
})();
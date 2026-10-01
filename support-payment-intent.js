/* 客服付款意图：用户在客服里问付款/支付/价格/多少钱/充值/购买（任何语言）时，不给 AI/知识库答案，
   直接打开站内已有的下单/付款弹窗。不改任何付款逻辑，只调用现有入口：
   1) 当前有搜索方案 → 触发方案里现有的“下单”按钮（#orderAnswerButton → GYX_ORDER.create 下单弹窗；未登录先走现有注册弹窗）
   2) 已登录且有待付款/核验中的订单 → GYX_PAY.open(订单号)（现有付款页 member.html?pay=）
   3) 都没有 → 会员页滚到现有“付款方式”区；首页聚焦搜索框（价格由方案决定）并给一句固定引导 */
(()=>{'use strict';if(window.GYXSupportPay)return;
const RE=new RegExp([
 // 中文（简/繁）
 '付款','付钱','付費','付费','支付','价格','價格','价钱','價錢','多少钱','多少錢','几块钱','收费','收費','费用','費用','充值','儲值','购买','購買','怎么买','怎麼買','买方案','买会员','下单','下單','结账','結帳','结算','转账','轉賬','汇款','匯款','报价','报个价',
 // English
 '\\bpay\\b','\\bpaying\\b','\\bpaid\\b','payment','\\bprices?\\b','pricing','\\bcosts?\\b','how much','\\bbuy\\b','\\bbuying\\b','purchase','checkout','check out','top ?up','recharge','\\bfees?\\b','\\busdt\\b','\\btrc-?20\\b',
 // ខ្មែរ
 'បង់ប្រាក់','បង់លុយ','ទូទាត់','តម្លៃ','ប៉ុន្មាន','ទិញ','បញ្ចូលលុយ','ថ្លៃ',
 // Tiếng Việt / ไทย / Bahasa / Español / Português / Français / Русский / 日本語 / 한국어 / العربية
 'thanh toán','bao nhiêu','\\bgiá\\b','\\bmua\\b','nạp tiền','ชำระ','ราคา','เท่าไร','เท่าไหร่','ซื้อ','จ่ายเงิน','เติมเงิน','\\bbayar','\\bharga\\b','berapa','\\bbeli\\b',
 '\\bpagar\\b','\\bpago\\b','precio','preço','comprar','cuánto','quanto custa','\\bpayer\\b','paiement','\\bprix\\b','acheter','combien','оплат','цена','стоимост','купить','сколько',
 '支払','値段','いくら','購入','결제','가격','얼마','구매','충전','دفع','سعر','شراء','بكم'
].join('|'),'i');
const T={
 zh:{plan:'已为你打开付款窗口 👉',order:'已为你打开待付款订单的付款页面 👉',none:'价格由你的方案决定：请在上方搜索框输入问题，完成五轮选择后会显示方案价格，点“下单”即弹出付款窗口。',member:'你目前没有待付款订单。已为你定位到“付款方式”；购买方案请到首页搜索，完成五轮选择后点“下单”即弹出付款窗口。'},
 en:{plan:'Opening the checkout window for you 👉',order:'Opening the payment page of your unpaid order 👉',none:'The price depends on your plan: type your question in the search box above, finish the five rounds, and tap “Order” — the payment window opens automatically.',member:'You have no unpaid order. Showing “Payment methods”; to buy a plan, search on the home page, finish the five rounds and tap “Order” to open the payment window.'},
 km:{plan:'កំពុងបើកផ្ទាំងបង់ប្រាក់សម្រាប់អ្នក 👉',order:'កំពុងបើកទំព័របង់ប្រាក់នៃការបញ្ជាទិញដែលមិនទាន់បង់ 👉',none:'តម្លៃអាស្រ័យលើផែនការរបស់អ្នក៖ វាយសំណួរក្នុងប្រអប់ស្វែងរកខាងលើ បញ្ចប់ការជ្រើសរើស ៥ ជុំ ហើយចុច “បញ្ជាទិញ” ផ្ទាំងបង់ប្រាក់នឹងបើកដោយស្វ័យប្រវត្តិ។',member:'អ្នកមិនមានការបញ្ជាទិញដែលមិនទាន់បង់ទេ។ កំពុងបង្ហាញ “វិធីបង់ប្រាក់”; ដើម្បីទិញផែនការ សូមស្វែងរកនៅទំព័រដើម ហើយចុច “បញ្ជាទិញ”។'}};
const tr=k=>{const l=String(window.GYXI18N?.locale||'zh').slice(0,2);return(T[l]||T.zh)[k]||T.zh[k]};
function isPaymentIntent(text){const s=String(text||'').trim();return s.length>=1&&s.length<=300&&RE.test(s)}
function closeSupport(){const p=document.getElementById('supportPanel');if(!p)return;const b=p.querySelector('[data-support-close],.support-close');if(b){b.click();return}p.classList.remove('show','open','active');p.setAttribute('aria-hidden','true');document.getElementById('gyxRegisterSupportBackdrop')?.classList.remove('show')}
async function pendingOrderRef(){const db=window.gyxSupabase;let u=null;try{u=await window.gyxGetVerifiedUser?.()}catch{}if(!db||!u)return'';try{const{data}=await db.from('orders').select('id,order_no,status,created_at').eq('user_id',u.id).eq('hidden_by_user',false).in('status',['pending','checking']).order('created_at',{ascending:false}).limit(5);const row=(data||[]).find(x=>x.status==='pending')||(data||[])[0];return row?String(row.order_no||row.id||''):''}catch{return''}}
/* 返回 {action, text}：action = 'checkout' | 'payment' | 'methods' | 'search' */
async function open(){
 const m=window.GYX_CURRENT_AI_MATCH,btn=document.getElementById('orderAnswerButton');
 if(m&&btn&&!document.getElementById('resultPanel')?.classList.contains('hidden')){setTimeout(()=>{closeSupport();btn.click()},450);return{action:'checkout',text:tr('plan')}}
 const ref=await pendingOrderRef();
 if(ref){setTimeout(()=>{closeSupport();if(window.GYX_PAY?.open)window.GYX_PAY.open(ref);else location.href='member.html?pay='+encodeURIComponent(ref)},450);return{action:'payment',text:tr('order')}}
 const methods=document.getElementById('paymentMethods');
 if(methods){setTimeout(()=>{closeSupport();methods.scrollIntoView({behavior:'smooth',block:'start'});methods.classList.add('gyx-pay-focus');setTimeout(()=>methods.classList.remove('gyx-pay-focus'),2400)},900);return{action:'methods',text:tr('member')}}
 const input=document.getElementById('problemInput');
 setTimeout(()=>{closeSupport();if(input){input.scrollIntoView({behavior:'smooth',block:'center'});try{input.focus({preventScroll:true})}catch{}}},1600);
 return{action:'search',text:tr('none')};
}
const st=document.createElement('style');st.textContent='#paymentMethods.gyx-pay-focus{outline:3px solid #2478ff;outline-offset:4px;border-radius:16px;transition:outline-color .3s}';document.head.appendChild(st);
window.GYXSupportPay=Object.freeze({isPaymentIntent,open});
})();

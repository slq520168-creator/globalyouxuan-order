(()=>{
'use strict';
const TABLE={
 en:{
  '会员中心':'Member Center','注册或登录后同步会员资料、收藏与订单。':'Sign up or sign in to sync your profile, saved items and orders.','注册':'Sign Up','登录':'Sign In','会员编号':'Member ID','会员账号':'Member Account','国家/地区':'Country / Region','按国际格式保存':'Save in international format','填写本地手机号；其他地区可输入 +国际区号':'Enter a local number; for other regions, include the international code','微信（选填）':'WeChat (optional)','微信号':'WeChat ID','WhatsApp（选填）':'WhatsApp (optional)','WhatsApp号码/账号':'WhatsApp number / account','国际区号':'Country code','只需填写本地手机号':'enter local number only','填写本地手机号':'Enter local number','请直接输入完整国际号码，例如 +85512345678':'Enter the full international number, e.g. +85512345678','+国际区号 手机号':'+country code phone number','数据库连接失败，请刷新页面后再试':'Database connection failed. Refresh the page and try again.','登录状态已失效，请重新登录':'Your session has expired. Please sign in again.','会员名称不能为空':'Member name is required.','请输入有效的国际手机号，例如选择柬埔寨后填写本地号码，或直接输入 +85512345678':'Enter a valid international phone number.','正在保存…':'Saving…','会员资料已保存':'Member profile saved.','保存失败，请刷新页面后再试':'Save failed. Refresh the page and try again.','保存会员资料':'Save Profile','订单':'Orders','收藏':'Saved','交付':'Deliveries','资料':'Materials','账号、订单、交付和个人资料，一页管理。':'Manage your account, orders, deliveries and profile in one place.','请粘贴邮件中的完整链接':'Paste the full link from the email.','链接里没有有效的重置参数，请重新复制完整链接':'No valid reset parameters were found. Copy the full link again.','该链接需要同浏览器打开。请改用：长按邮件链接复制，粘贴到本页验证。':'This link must be opened in the same browser. Copy the email link and paste it here to verify.','当前邮件链接需要在申请重置的同一浏览器中打开。请用 Safari 打开邮件链接，或稍后再试。':'Open this reset link in the same browser used to request it, or try again later.','密码需为 8～10 位，且同时包含数字和字母':'Password must be 8–10 characters and include both letters and numbers.','密码修改成功，正在进入会员中心…':'Password updated. Opening Member Center…','新密码不能与旧密码相同，请换一个':'Your new password must be different from the old password.','密码强度不够，请换更复杂的密码':'Password is too weak. Choose a stronger password.','隐藏':'Hide','显示':'Show','正在验证…':'Verifying…','验证粘贴的链接':'Verify Pasted Link','自动验证未成功。请长按邮件中的链接 → 复制 → 粘贴到下方框内 → 点验证。':'Automatic verification failed. Copy the email link, paste it below, then tap Verify.'
 },
 km:{
  '会员中心':'មជ្ឈមណ្ឌលសមាជិក','注册或登录后同步会员资料、收藏与订单。':'ចុះឈ្មោះ ឬចូល ដើម្បីធ្វើសមកាលកម្មព័ត៌មាន ការរក្សាទុក និងការបញ្ជាទិញរបស់អ្នក។','注册':'ចុះឈ្មោះ','登录':'ចូល','会员编号':'លេខសមាជិក','会员账号':'គណនីសមាជិក','国家/地区':'ប្រទេស / តំបន់','按国际格式保存':'រក្សាទុកតាមទម្រង់អន្តរជាតិ','填写本地手机号；其他地区可输入 +国际区号':'បញ្ចូលលេខទូរស័ព្ទក្នុងស្រុក; តំបន់ផ្សេងអាចបញ្ចូលលេខកូដអន្តរជាតិ','微信（选填）':'WeChat (ជាជម្រើស)','微信号':'លេខសម្គាល់ WeChat','WhatsApp（选填）':'WhatsApp (ជាជម្រើស)','WhatsApp号码/账号':'លេខ / គណនី WhatsApp','国际区号':'លេខកូដប្រទេស','只需填写本地手机号':'បញ្ចូលតែលេខក្នុងស្រុក','填写本地手机号':'បញ្ចូលលេខក្នុងស្រុក','请直接输入完整国际号码，例如 +85512345678':'សូមបញ្ចូលលេខអន្តរជាតិពេញលេញ ឧ. +85512345678','+国际区号 手机号':'+លេខកូដប្រទេស លេខទូរស័ព្ទ','数据库连接失败，请刷新页面后再试':'ការតភ្ជាប់មូលដ្ឋានទិន្នន័យបរាជ័យ។ សូមផ្ទុកទំព័រឡើងវិញ។','登录状态已失效，请重新登录':'សម័យចូលបានផុតកំណត់។ សូមចូលម្តងទៀត។','会员名称不能为空':'ឈ្មោះសមាជិកមិនអាចទទេ។','请输入有效的国际手机号，例如选择柬埔寨后填写本地号码，或直接输入 +85512345678':'សូមបញ្ចូលលេខទូរស័ព្ទអន្តរជាតិដែលត្រឹមត្រូវ។','正在保存…':'កំពុងរក្សាទុក…','会员资料已保存':'បានរក្សាទុកព័ត៌មានសមាជិក។','保存失败，请刷新页面后再试':'រក្សាទុកបរាជ័យ។ សូមផ្ទុកទំព័រឡើងវិញ។','保存会员资料':'រក្សាទុកព័ត៌មានសមាជិក','订单':'ការបញ្ជាទិញ','收藏':'បានរក្សាទុក','交付':'ការប្រគល់','资料':'ឯកសារ','账号、订单、交付和个人资料，一页管理。':'គ្រប់គ្រងគណនី ការបញ្ជាទិញ ការប្រគល់ និងព័ត៌មានផ្ទាល់ខ្លួននៅទំព័រតែមួយ។','请粘贴邮件中的完整链接':'សូមបិទភ្ជាប់តំណពេញលេញពីអ៊ីមែល។','链接里没有有效的重置参数，请重新复制完整链接':'មិនមានប៉ារ៉ាម៉ែត្រកំណត់ពាក្យសម្ងាត់ឡើងវិញត្រឹមត្រូវទេ។ សូមចម្លងតំណពេញលេញម្ដងទៀត។','该链接需要同浏览器打开。请改用：长按邮件链接复制，粘贴到本页验证。':'តំណនេះត្រូវបើកក្នុងកម្មវិធីរុករកដដែល។ សូមចម្លងតំណពីអ៊ីមែល ហើយបិទភ្ជាប់ទីនេះ។','当前邮件链接需要在申请重置的同一浏览器中打开。请用 Safari 打开邮件链接，或稍后再试。':'សូមបើកតំណកំណត់ឡើងវិញក្នុងកម្មវិធីរុករកដដែលដែលបានស្នើសុំ។','密码需为 8～10 位，且同时包含数字和字母':'ពាក្យសម្ងាត់ត្រូវមាន 8–10 តួ និងមានទាំងអក្សរ និងលេខ។','密码修改成功，正在进入会员中心…':'បានប្តូរពាក្យសម្ងាត់។ កំពុងចូលមជ្ឈមណ្ឌលសមាជិក…','新密码不能与旧密码相同，请换一个':'ពាក្យសម្ងាត់ថ្មីមិនអាចដូចពាក្យសម្ងាត់ចាស់ទេ។','密码强度不够，请换更复杂的密码':'ពាក្យសម្ងាត់ខ្សោយពេក។ សូមជ្រើសរើសពាក្យសម្ងាត់ខ្លាំងជាងនេះ។','隐藏':'លាក់','显示':'បង្ហាញ','正在验证…':'កំពុងផ្ទៀងផ្ទាត់…','验证粘贴的链接':'ផ្ទៀងផ្ទាត់តំណដែលបានបិទភ្ជាប់','自动验证未成功。请长按邮件中的链接 → 复制 → 粘贴到下方框内 → 点验证。':'ការផ្ទៀងផ្ទាត់ស្វ័យប្រវត្តិបរាជ័យ។ សូមចម្លងតំណអ៊ីមែល បិទភ្ជាប់ខាងក្រោម ហើយចុចផ្ទៀងផ្ទាត់។'
 }
};
function locale(){try{return window.GYXLocale?.get?.()||localStorage.getItem('gyx_locale')||'zh-CN'}catch{return'zh-CN'}}
function trans(s,l=locale()){
 const raw=String(s??''),trim=raw.trim();if(!trim||l==='zh-CN')return raw;
 let v=TABLE[l]?.[trim];
 if(!v){
  const m=trim.match(/^国际区号\s+(\+\d+)，只需填写本地手机号$/);
  if(m)v=l==='en'?`Country code ${m[1]}, enter local number only`:`លេខកូដប្រទេស ${m[1]} បញ្ចូលតែលេខក្នុងស្រុក`;
 }
 return v?raw.replace(trim,v):raw;
}
function apply(root=document.body){
 const l=locale();if(!root||l==='zh-CN')return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
 while((n=walker.nextNode())){const p=n.parentElement;if(!p||p.closest('script,style,code,pre,[translate="no"],[data-no-i18n]'))continue;const v=trans(n.nodeValue,l);if(v!==n.nodeValue)n.nodeValue=v}
 root.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach(el=>{for(const a of ['placeholder','title','aria-label']){const v=el.getAttribute(a);if(v){const nv=trans(v,l);if(nv!==v)el.setAttribute(a,nv)}}});
}
let timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(()=>apply(document.body),30)}
const mo=new MutationObserver(schedule);
function init(){apply();mo.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});window.addEventListener('gyx:languagechange',schedule);window.addEventListener('gyx:localechange',schedule)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.GYXRuntimeI18NStage2={apply,trans};
})();
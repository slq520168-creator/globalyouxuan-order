(() => {
  'use strict';
  // Compatibility layer only: one canonical Chinese source vocabulary.
  // global-locale.js remains the single renderer/translator for every target language.
  const VALID = new Set(['zh-CN', 'en', 'km']);
  const SOURCE = {
    logout:'退出登录', memberId:'会员编号', joinedAt:'注册时间', profileTitle:'会员资料', phone:'电话', profileLanguage:'默认语言', saveProfile:'保存会员资料',
    favoritesTitle:'我的收藏', ordersTitle:'我的订单', materialsTitle:'我的资料', loading:'正在读取数据库…', noFavorites:'暂无收藏', navShop:'智能匹配', navMember:'会员中心', navContact:'联系客服',
    orderFavorite:'下单', removeFavorite:'取消收藏', confirmRemoveFavorite:'确定取消收藏吗？', errorName:'请输入账号ID或名称', errorPhone:'请输入有效联系电话', saving:'正在保存…', saved:'会员资料已保存',
    pending:'待付款', checking:'核验中', paid:'已付款', delivered:'已完成', expired:'已失效', failed:'失败', cancelled:'已取消', status:'状态', noOrders:'暂无订单',
    amount:'金额', network:'网络', createdAt:'创建时间', wallet:'收款地址', txidPlaceholder:'粘贴交易哈希 TXID', verifyTxid:'核验付款', checkingPayment:'正在核验…',
    viewPurchasedAnswer:'查看交付内容', copyAnswer:'复制内容', copied:'已复制', loadingAnswer:'正在读取交付内容…', answerReady:'交付内容', download:'下载',
    errorTxid:'请输入有效的64位交易哈希 TXID', errorAuth:'登录状态已失效，请重新登录', errorPaymentMismatch:'付款信息不匹配，请检查后重试', errorTxidUsed:'该交易哈希已被使用', errorNetwork:'网络连接失败，请稍后重试', errorGeneric:'操作失败，请稍后重试',
    refresh:'刷新', all:'全部', pendingPayment:'待付款', verifying:'核验中', completed:'已完成',
    edit:'编辑', delete:'删除', save:'保存', cancel:'取消', add:'新增', search:'搜索', close:'关闭', back:'返回', home:'首页', member:'会员', orders:'订单', favorites:'收藏',
    brand:'全球优选', resetPasswordTitle:'设置新密码', resetPasswordLead:'验证链接通过后，在这里设置新密码。', newPassword:'新密码', confirmNewPassword:'确认新密码', checkingResetLink:'正在验证重置链接…', saveNewPassword:'保存新密码', requestNewResetLink:'重新发送重置邮件', openSupport:'在线客服'
  };

  const PRELOAD = {
    en: {
      '智能匹配':'Smart Match','我的收藏':'My Saved','会员中心':'Member Center','联系客服':'Contact Support','登录':'Sign In','注册':'Sign Up','会员账号':'Member Account','一个账号同步你的资料、收藏与订单。':'One account keeps your profile, saved items and orders in sync.','这个浏览器已经登录。':'You are already signed in on this browser.','切换账号':'Switch Account','进入会员中心':'Enter Member Center','账号ID':'Account ID','设置账号ID':'Set account ID','邮箱':'Email','请输入邮箱':'Enter your email','密码':'Password','8～20位密码':'8–20 character password','显示密码':'Show password','确认密码':'Confirm Password','再次输入密码':'Enter password again','忘记密码？':'Forgot password?','返回登录':'Back to sign in','退出登录':'Sign Out','会员编号':'Member ID','注册时间':'Joined','会员资料':'Member Profile','账号ID / 名称':'Account ID / Name','请输入账号ID或名称':'Enter account ID or name','电话':'Phone','请输入联系电话':'Enter contact phone','默认语言':'Default Language','保存会员资料':'Save Profile','收藏的方案，可继续查看或取消收藏':'Saved plans can be viewed again or removed.','正在读取数据库…':'Loading data…','我的搜索':'My Searches','继续搜索':'Continue Search','正在读取搜索记录…':'Loading search history…','我的订单':'My Orders','刷新':'Refresh','全部':'All','待付款':'Pending','核验中':'Verifying','已付款':'Paid','已完成':'Completed','已失效':'Expired','我的下载':'My Downloads','已付款 / 已完成订单的交付内容':'Deliveries from paid or completed orders','暂无可下载内容':'No downloads available','我的资料':'My Materials','个人保存的资料与长文本':'Your saved materials and long-form content','新增资料':'Add Material','资料标题':'Title','来源/文件名（选填）':'Source / filename (optional)','分类':'Category','AI办公':'AI Productivity','AI创作':'AI Creation','AI商业':'AI Business','AI自动化':'AI Automation','资料语言':'Material Language','资料正文':'Content','保存到数据库':'Save to Database','搜索资料':'Search materials','智能客服':'Smart Support','需要进一步协助时，通过Telegram客服继续处理':'For further assistance, continue with Telegram support.','打开客服':'Open Support','重新开始':'Restart','请选择最接近的一项':'Choose the closest option','返回':'Back','最匹配方案':'Best Match','方案深度':'Plan Depth','本方案包含':'Included','查看匹配说明':'View match details','收藏答案':'Save Answer','直接下单':'Order Now','换一个问题':'Ask Another Question','固定方案':'Fixed Plans','确认订单':'Confirm Order','订单将保存到你的会员账号':'This order will be saved to your member account.','姓名':'Name','电话（选填）':'Phone (optional)','取消':'Cancel','创建真实订单':'Create Order','订单号':'Order No.','应付金额':'Amount Due','网络':'Network','收款地址':'Payment Address','复制':'Copy','交易哈希 TXID':'Transaction Hash TXID','提交并核验付款':'Submit & Verify Payment','付款已确认':'Payment Confirmed','关闭':'Close','查看我的订单':'View My Orders','需要帮助？直接联系我们':'Need help? Contact us directly.','Telegram客服':'Telegram Support','邮箱客服':'Email Support','设置新密码':'Set New Password','验证链接通过后，在这里设置新密码。':'After your reset link is verified, set your new password here.','新密码':'New Password','8～10位数字加字母':'8–10 letters and numbers','确认新密码':'Confirm New Password','再次输入8～10位数字加字母':'Re-enter 8–10 letters and numbers','正在验证重置链接…':'Verifying reset link…','如果自动验证失败，请粘贴邮件里的完整链接':'If automatic verification fails, paste the full link from your email.','长按邮件链接 → 复制 → 粘贴到这里':'Press and hold the email link → Copy → Paste here','验证粘贴的链接':'Verify Pasted Link','保存新密码':'Save New Password','重新发送重置邮件':'Send Reset Email Again','切换主题':'Toggle theme','关闭':'Close','在线客服':'Support','首页':'Home','订单':'Orders','会员':'Member','收藏':'Saved','播放音乐':'Play Music'
    },
    km: {
      '智能匹配':'ផ្គូផ្គងឆ្លាតវៃ','我的收藏':'ការរក្សាទុករបស់ខ្ញុំ','会员中心':'មជ្ឈមណ្ឌលសមាជិក','联系客服':'ទាក់ទងជំនួយ','登录':'ចូល','注册':'ចុះឈ្មោះ','会员账号':'គណនីសមាជិក','一个账号同步你的资料、收藏与订单。':'គណនីមួយធ្វើសមកាលកម្មព័ត៌មាន ការរក្សាទុក និងការបញ្ជាទិញរបស់អ្នក។','这个浏览器已经登录。':'កម្មវិធីរុករកនេះបានចូលរួចហើយ។','切换账号':'ប្ដូរគណនី','进入会员中心':'ចូលមជ្ឈមណ្ឌលសមាជិក','账号ID':'លេខសម្គាល់គណនី','设置账号ID':'កំណត់លេខសម្គាល់គណនី','邮箱':'អ៊ីមែល','请输入邮箱':'បញ្ចូលអ៊ីមែល','密码':'ពាក្យសម្ងាត់','8～20位密码':'ពាក្យសម្ងាត់ 8–20 តួ','显示密码':'បង្ហាញពាក្យសម្ងាត់','确认密码':'បញ្ជាក់ពាក្យសម្ងាត់','再次输入密码':'បញ្ចូលពាក្យសម្ងាត់ម្តងទៀត','忘记密码？':'ភ្លេចពាក្យសម្ងាត់?','返回登录':'ត្រឡប់ទៅចូល','退出登录':'ចាកចេញ','会员编号':'លេខសមាជិក','注册时间':'ពេលចុះឈ្មោះ','会员资料':'ព័ត៌មានសមាជិក','账号ID / 名称':'លេខគណនី / ឈ្មោះ','请输入账号ID或名称':'បញ្ចូលលេខគណនី ឬឈ្មោះ','电话':'ទូរស័ព្ទ','请输入联系电话':'បញ្ចូលលេខទូរស័ព្ទ','默认语言':'ភាសាលំនាំដើម','保存会员资料':'រក្សាទុកព័ត៌មានសមាជិក','收藏的方案，可继续查看或取消收藏':'ផែនការដែលបានរក្សាទុក អាចមើលឡើងវិញ ឬដកចេញបាន។','正在读取数据库…':'កំពុងផ្ទុកទិន្នន័យ…','我的搜索':'ការស្វែងរករបស់ខ្ញុំ','继续搜索':'បន្តស្វែងរក','正在读取搜索记录…':'កំពុងផ្ទុកប្រវត្តិស្វែងរក…','我的订单':'ការបញ្ជាទិញរបស់ខ្ញុំ','刷新':'ផ្ទុកឡើងវិញ','全部':'ទាំងអស់','待付款':'រង់ចាំទូទាត់','核验中':'កំពុងផ្ទៀងផ្ទាត់','已付款':'បានទូទាត់','已完成':'បានបញ្ចប់','已失效':'ផុតសុពលភាព','我的下载':'ការទាញយករបស់ខ្ញុំ','已付款 / 已完成订单的交付内容':'មាតិកាប្រគល់ពីការបញ្ជាទិញដែលបានទូទាត់ ឬបានបញ្ចប់','暂无可下载内容':'មិនទាន់មានមាតិកាអាចទាញយក','我的资料':'ឯកសាររបស់ខ្ញុំ','个人保存的资料与长文本':'ឯកសារ និងអត្ថបទវែងដែលអ្នកបានរក្សាទុក','新增资料':'បន្ថែមឯកសារ','资料标题':'ចំណងជើង','来源/文件名（选填）':'ប្រភព / ឈ្មោះឯកសារ (ជាជម្រើស)','分类':'ប្រភេទ','AI办公':'AI ការងារ','AI创作':'AI ច្នៃប្រឌិត','AI商业':'AI អាជីវកម្ម','AI自动化':'AI ស្វ័យប្រវត្តិកម្ម','资料语言':'ភាសាឯកសារ','资料正文':'មាតិកា','保存到数据库':'រក្សាទុកទៅមូលដ្ឋានទិន្នន័យ','搜索资料':'ស្វែងរកឯកសារ','智能客服':'ជំនួយឆ្លាតវៃ','需要进一步协助时，通过Telegram客服继续处理':'បើត្រូវការជំនួយបន្ថែម សូមបន្តតាម Telegram។','打开客服':'បើកជំនួយ','重新开始':'ចាប់ផ្តើមឡើងវិញ','请选择最接近的一项':'ជ្រើសរើសជម្រើសដែលជិតបំផុត','返回':'ត្រឡប់','最匹配方案':'ផែនការដែលសមបំផុត','方案深度':'កម្រិតផែនការ','本方案包含':'ផែនការនេះរួមមាន','查看匹配说明':'មើលការពន្យល់ការផ្គូផ្គង','收藏答案':'រក្សាទុកចម្លើយ','直接下单':'បញ្ជាទិញឥឡូវ','换一个问题':'សួរសំណួរផ្សេង','固定方案':'ផែនការថេរ','确认订单':'បញ្ជាក់ការបញ្ជាទិញ','订单将保存到你的会员账号':'ការបញ្ជាទិញនឹងត្រូវរក្សាទុកក្នុងគណនីសមាជិករបស់អ្នក។','姓名':'ឈ្មោះ','电话（选填）':'ទូរស័ព្ទ (ជាជម្រើស)','取消':'បោះបង់','创建真实订单':'បង្កើតការបញ្ជាទិញ','订单号':'លេខបញ្ជាទិញ','应付金额':'ចំនួនត្រូវបង់','网络':'បណ្ដាញ','收款地址':'អាសយដ្ឋានទទួលប្រាក់','复制':'ចម្លង','交易哈希 TXID':'លេខ Hash ប្រតិបត្តិការ TXID','提交并核验付款':'បញ្ជូន និងផ្ទៀងផ្ទាត់ការទូទាត់','付款已确认':'បានបញ្ជាក់ការទូទាត់','关闭':'បិទ','查看我的订单':'មើលការបញ្ជាទិញរបស់ខ្ញុំ','需要帮助？直接联系我们':'ត្រូវការជំនួយ? ទាក់ទងយើងដោយផ្ទាល់។','Telegram客服':'ជំនួយ Telegram','邮箱客服':'ជំនួយអ៊ីមែល','设置新密码':'កំណត់ពាក្យសម្ងាត់ថ្មី','验证链接通过后，在这里设置新密码。':'បន្ទាប់ពីតំណកំណត់ឡើងវិញត្រូវបានផ្ទៀងផ្ទាត់ សូមកំណត់ពាក្យសម្ងាត់ថ្មីនៅទីនេះ។','新密码':'ពាក្យសម្ងាត់ថ្មី','8～10位数字加字母':'8–10 តួអក្សរ និងលេខ','确认新密码':'បញ្ជាក់ពាក្យសម្ងាត់ថ្មី','再次输入8～10位数字加字母':'បញ្ចូល 8–10 តួអក្សរ និងលេខម្តងទៀត','正在验证重置链接…':'កំពុងផ្ទៀងផ្ទាត់តំណកំណត់ឡើងវិញ…','如果自动验证失败，请粘贴邮件里的完整链接':'បើការផ្ទៀងផ្ទាត់ស្វ័យប្រវត្តិបរាជ័យ សូមបិទភ្ជាប់តំណពេញពីអ៊ីមែល។','长按邮件链接 → 复制 → 粘贴到这里':'ចុចយូរលើតំណអ៊ីមែល → ចម្លង → បិទភ្ជាប់ទីនេះ','验证粘贴的链接':'ផ្ទៀងផ្ទាត់តំណដែលបានបិទភ្ជាប់','保存新密码':'រក្សាទុកពាក្យសម្ងាត់ថ្មី','重新发送重置邮件':'ផ្ញើអ៊ីមែលកំណត់ឡើងវិញម្តងទៀត','切换主题':'ប្ដូររូបរាង','在线客服':'ជំនួយ','首页':'ទំព័រដើម','订单':'ការបញ្ជាទិញ','会员':'សមាជិក','收藏':'បានរក្សាទុក','播放音乐':'ចាក់តន្ត្រី'
    }
  };

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }
  function seedPhase2() {
    try {
      for (const locale of ['en', 'km']) {
        for (const [source, translated] of Object.entries(PRELOAD[locale])) {
          localStorage.setItem(`gyx_tr_v9:${locale}:${hash(source)}`, translated);
        }
      }
    } catch {}
  }
  seedPhase2();

  const getLocale = () => {
    try {
      const value = localStorage.getItem('gyx_locale');
      return VALID.has(value) ? value : 'zh-CN';
    } catch { return 'zh-CN'; }
  };
  function interpolate(text, vars) {
    if (!vars || typeof vars !== 'object' || Array.isArray(vars)) return text;
    return String(text).replace(/\{(\w+)\}/g, (_, k) => vars[k] == null ? `{${k}}` : String(vars[k]));
  }
  window.GYXI18N = {
    get locale() { return window.GYXLocale?.get?.() || getLocale(); },
    setLanguage(locale) { if (VALID.has(locale)) window.GYXLocale?.set?.(locale); },
    t(key, varsOrFallback = '') {
      const source = SOURCE[key];
      if (source) return interpolate(source, varsOrFallback);
      if (typeof varsOrFallback === 'string' && varsOrFallback) return varsOrFallback;
      return String(key || '');
    },
    apply() { window.GYXLocale?.apply?.(); }
  };
})();

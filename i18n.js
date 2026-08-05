(() => {
  'use strict';

  const messages = {
    'zh-CN': {
      brand: '全球优选', navShop: '方案中心', navKnowledge: '问答资料库', navMember: '会员中心',
      login: '登录', logout: '退出登录', register: '免费注册', language: '语言',
      shopEyebrow: '真实会员 · 真实订单 · 数据库资料', shopTitle: 'AI 实战资源与服务中心',
      shopLead: '按需求查资料、选择方案、登录下单，并在会员中心查看自己的订单和资料。',
      browseKnowledge: '进入 120 条问答资料库', viewMember: '查看会员中心',
      statAnswers: '数据库问答', statModules: '实战模块', statLanguages: '网站语言',
      quickSearchTitle: '先说你想解决什么问题', quickSearchLead: '搜索全部数据库问答和你自己保存的资料。',
      quickSearchPlaceholder: '例如：AI 视频、网站建设、自动回复、营销获客', search: '搜索资料',
      solutionsTitle: '选择实战模块', solutionsLead: '价格和方案从数据库实时读取，订单归属于当前登录会员。',
      catWork: 'AI 办公', catCreation: 'AI 创作', catBusiness: 'AI 商业', catAutomation: 'AI 自动化',
      catWorkDesc: '办公提效、知识管理与企业助手', catCreationDesc: '内容、图片、视频与数字资料',
      catBusinessDesc: '网站、品牌、营销与商业系统', catAutomationDesc: '工作流、通知、同步与智能执行',
      planCount: '{count} 个方案', choosePlan: '选择方案', loading: '正在读取数据库…', retry: '重新加载',
      noPlans: '暂时没有可用方案。', priceUnit: 'USDT',
      checkoutTitle: '确认订单', checkoutAccount: '订单将保存到你的会员账号',
      name: '姓名', email: '邮箱', phone: '电话', namePlaceholder: '请输入姓名',
      emailPlaceholder: '请输入常用邮箱', phonePlaceholder: '请输入联系电话',
      createOrder: '创建真实订单', creatingOrder: '正在创建订单…', cancel: '取消',
      paymentTitle: '支付与核验', orderNo: '订单号', amount: '应付金额', network: '网络', wallet: '收款地址',
      copy: '复制', copied: '已复制', txid: '交易哈希 TXID', txidPlaceholder: '粘贴 64 位 TRON 交易哈希',
      payHelp: '请按显示的精确金额转账；完成后粘贴 TXID，系统会通过链上数据核验。',
      submitPayment: '提交并核验付款', checkingPayment: '正在核验付款…', back: '返回',
      paymentSuccess: '付款已确认', paymentPending: '链上仍在确认，请稍后再试或在会员中心查看。',
      goMemberOrders: '查看我的订单', close: '关闭', musicOn: '♫ 播放中', musicOff: '♫ 轻音乐',
      authTitle: '会员注册与登录', authLead: '登录后才能下单，并且只能查看自己的资料和订单。',
      loginTab: '登录', registerTab: '注册', displayName: '会员名称', displayNamePlaceholder: '请输入会员名称',
      password: '密码', passwordPlaceholder: '至少 8 位密码', confirmPassword: '确认密码',
      confirmPasswordPlaceholder: '再次输入密码', signIn: '登录会员账号', signingIn: '正在登录…',
      signUp: '创建会员账号', signingUp: '正在注册…', haveSession: '这个浏览器已经登录。',
      enterMember: '进入会员中心', useAnother: '切换账号', emailCheck: '注册成功，请到邮箱点击确认链接后再登录。',
      authSuccess: '登录成功，正在进入…', authPrivacy: '账户使用 Supabase Auth；密码不会保存到网页代码或订单表。',
      memberTitle: '我的会员中心', memberLead: '只显示当前账号自己的资料、订单和私人资料库。',
      profileTitle: '会员资料', saveProfile: '保存会员资料', saving: '正在保存…', saved: '已保存',
      memberId: '会员编号', joinedAt: '注册时间', profileLanguage: '默认语言',
      ordersTitle: '我的订单', refresh: '刷新', noOrders: '你还没有订单。', status: '状态', product: '方案',
      createdAt: '创建时间', pending: '待付款', checking: '核验中', paid: '已付款', delivered: '已交付',
      expired: '已过期', failed: '失败', cancelled: '已取消', download: '下载资料', downloading: '正在生成下载链接…',
      verifyTxid: '核验 TXID', materialsTitle: '我的资料库', materialsLead: '把还没入库的长资料粘贴到这里；它只对你的账号可见，也会加入你的问答搜索。',
      materialTitle: '资料标题', materialTitlePlaceholder: '例如：短视频脚本模板', category: '分类',
      materialLanguage: '资料语言', sourceName: '来源/文件名（选填）', sourcePlaceholder: '例如：我的营销笔记.docx',
      materialContent: '资料正文', materialContentPlaceholder: '粘贴完整正文，最多 50,000 字符',
      saveMaterial: '保存到数据库', updateMaterial: '更新资料', newMaterial: '新增资料',
      edit: '编辑', delete: '删除', noMaterials: '还没有私人资料。', confirmDelete: '确定删除这条资料吗？',
      knowledgeTitle: '问答与资料库', knowledgeLead: '浏览 4 个模块的 120 条数据库问答；登录后还可一起搜索自己的私人资料。',
      all: '全部', mine: '我的资料', answerCount: '共 {count} 条结果', clear: '清除', loadMore: '加载更多',
      details: '展开详细答案', recommendedPlan: '查看推荐方案', source: '来源', privateMaterial: '私人资料',
      addMyMaterial: '把缺少的资料存入我的资料库', noResults: '没有找到匹配内容，请换一个关键词。',
      errorGeneric: '操作失败，请稍后重试。', errorNetwork: '网络连接失败，请检查后重试。',
      errorAuth: '请先登录会员账号。', errorEmailPassword: '邮箱或密码不正确。', errorPasswordMatch: '两次输入的密码不一致。',
      errorPasswordLength: '密码至少需要 8 位。', errorName: '请输入姓名。', errorEmail: '请输入正确邮箱。',
      errorPhone: '请输入正确联系电话。', errorTxid: '请输入正确的 64 位 TRON TXID。',
      errorOpenOrder: '这个方案已有待处理订单，已为你打开原订单。', errorRate: '操作太频繁，请稍后再试。',
      errorPaymentMismatch: '链上收款地址、代币或金额不匹配，请核对。', errorTxidUsed: '该 TXID 已使用或订单已绑定其他 TXID。',
      footer: '全球优选 · 安全会员与数字交付'
    },
    en: {
      brand: 'Global Youxuan', navShop: 'Solutions', navKnowledge: 'Knowledge Base', navMember: 'Member Center',
      login: 'Sign in', logout: 'Sign out', register: 'Register', language: 'Language',
      shopEyebrow: 'Real members · Real orders · Database knowledge', shopTitle: 'Practical AI Resources & Services',
      shopLead: 'Search the knowledge base, choose a solution, place an authenticated order, and manage your own data.',
      browseKnowledge: 'Browse 120 database answers', viewMember: 'Open member center',
      statAnswers: 'database answers', statModules: 'practical modules', statLanguages: 'site languages',
      quickSearchTitle: 'What do you want to solve?', quickSearchLead: 'Search every public answer and your own saved materials.',
      quickSearchPlaceholder: 'Example: AI video, website, auto-reply, marketing', search: 'Search',
      solutionsTitle: 'Choose a module', solutionsLead: 'Plans and prices are loaded live from the database. Orders belong to the signed-in member.',
      catWork: 'AI Work', catCreation: 'AI Creation', catBusiness: 'AI Business', catAutomation: 'AI Automation',
      catWorkDesc: 'Productivity, knowledge and enterprise assistants', catCreationDesc: 'Content, images, video and digital materials',
      catBusinessDesc: 'Websites, brands, marketing and business systems', catAutomationDesc: 'Workflows, alerts, sync and intelligent actions',
      planCount: '{count} plans', choosePlan: 'Choose plan', loading: 'Loading from database…', retry: 'Retry', noPlans: 'No plans are available.',
      priceUnit: 'USDT', checkoutTitle: 'Confirm order', checkoutAccount: 'This order will be saved to your member account',
      name: 'Name', email: 'Email', phone: 'Phone', namePlaceholder: 'Enter your name', emailPlaceholder: 'Enter your email',
      phonePlaceholder: 'Enter your phone number', createOrder: 'Create real order', creatingOrder: 'Creating order…', cancel: 'Cancel',
      paymentTitle: 'Payment verification', orderNo: 'Order number', amount: 'Exact amount', network: 'Network', wallet: 'Payment wallet',
      copy: 'Copy', copied: 'Copied', txid: 'Transaction hash (TXID)', txidPlaceholder: 'Paste the 64-character TRON TXID',
      payHelp: 'Transfer the exact amount shown, then paste the TXID. The system verifies it on-chain.',
      submitPayment: 'Submit & verify', checkingPayment: 'Verifying payment…', back: 'Back', paymentSuccess: 'Payment confirmed',
      paymentPending: 'The transfer is still confirming. Check again later or view it in your member center.', goMemberOrders: 'View my orders',
      close: 'Close', musicOn: '♫ Playing', musicOff: '♫ Music',
      authTitle: 'Member registration & sign in', authLead: 'Sign in to order and access only your own profile and orders.',
      loginTab: 'Sign in', registerTab: 'Register', displayName: 'Member name', displayNamePlaceholder: 'Enter a member name',
      password: 'Password', passwordPlaceholder: 'At least 8 characters', confirmPassword: 'Confirm password',
      confirmPasswordPlaceholder: 'Enter the password again', signIn: 'Sign in', signingIn: 'Signing in…', signUp: 'Create account',
      signingUp: 'Creating account…', haveSession: 'This browser is already signed in.', enterMember: 'Open member center', useAnother: 'Switch account',
      emailCheck: 'Registration complete. Confirm your email, then sign in.', authSuccess: 'Signed in. Redirecting…',
      authPrivacy: 'Accounts use Supabase Auth. Passwords are never stored in page code or order tables.',
      memberTitle: 'My member center', memberLead: 'Only the current account’s profile, orders and private materials are shown.',
      profileTitle: 'Profile', saveProfile: 'Save profile', saving: 'Saving…', saved: 'Saved', memberId: 'Member ID', joinedAt: 'Joined',
      profileLanguage: 'Default language', ordersTitle: 'My orders', refresh: 'Refresh', noOrders: 'You have no orders yet.',
      status: 'Status', product: 'Plan', createdAt: 'Created', pending: 'Pending', checking: 'Verifying', paid: 'Paid', delivered: 'Delivered',
      expired: 'Expired', failed: 'Failed', cancelled: 'Cancelled', download: 'Download', downloading: 'Preparing download…', verifyTxid: 'Verify TXID',
      materialsTitle: 'My knowledge', materialsLead: 'Paste long-form materials here. They stay private to your account and join your searches.',
      materialTitle: 'Title', materialTitlePlaceholder: 'Example: Short-video script template', category: 'Category', materialLanguage: 'Content language',
      sourceName: 'Source / filename (optional)', sourcePlaceholder: 'Example: marketing-notes.docx', materialContent: 'Full content',
      materialContentPlaceholder: 'Paste the full content, up to 50,000 characters', saveMaterial: 'Save to database', updateMaterial: 'Update material',
      newMaterial: 'New material', edit: 'Edit', delete: 'Delete', noMaterials: 'No private materials yet.', confirmDelete: 'Delete this material?',
      knowledgeTitle: 'Answers & knowledge base', knowledgeLead: 'Browse 120 database answers in 4 modules. Sign in to search your private materials too.',
      all: 'All', mine: 'Mine', answerCount: '{count} results', clear: 'Clear', loadMore: 'Load more', details: 'Open full answer',
      recommendedPlan: 'View recommended plan', source: 'Source', privateMaterial: 'Private material', addMyMaterial: 'Add missing material to my knowledge',
      noResults: 'No matching content. Try another keyword.', errorGeneric: 'Something went wrong. Please try again.', errorNetwork: 'Network error. Please try again.',
      errorAuth: 'Please sign in first.', errorEmailPassword: 'Incorrect email or password.', errorPasswordMatch: 'Passwords do not match.',
      errorPasswordLength: 'Password must be at least 8 characters.', errorName: 'Enter your name.', errorEmail: 'Enter a valid email.',
      errorPhone: 'Enter a valid phone number.', errorTxid: 'Enter a valid 64-character TRON TXID.',
      errorOpenOrder: 'An open order already exists. It has been loaded for you.', errorRate: 'Too many attempts. Try again later.',
      errorPaymentMismatch: 'The token, destination or amount does not match this order.', errorTxidUsed: 'This TXID is already used or the order has another TXID.',
      footer: 'Global Youxuan · Secure membership and digital delivery'
    },
    km: {
      brand: 'Global Youxuan', navShop: 'មជ្ឈមណ្ឌលដំណោះស្រាយ', navKnowledge: 'មូលដ្ឋានចំណេះដឹង', navMember: 'មជ្ឈមណ្ឌលសមាជិក',
      login: 'ចូល', logout: 'ចាកចេញ', register: 'ចុះឈ្មោះ', language: 'ភាសា',
      shopEyebrow: 'សមាជិកពិត · ការបញ្ជាទិញពិត · ចំណេះដឹងក្នុងទិន្នន័យ', shopTitle: 'ធនធាន និងសេវាកម្ម AI អនុវត្ត',
      shopLead: 'ស្វែងរកចំណេះដឹង ជ្រើសរើសគម្រោង បញ្ជាទិញដោយគណនី និងគ្រប់គ្រងទិន្នន័យផ្ទាល់ខ្លួន។',
      browseKnowledge: 'មើលចម្លើយ 120 ក្នុងទិន្នន័យ', viewMember: 'មើលមជ្ឈមណ្ឌលសមាជិក',
      statAnswers: 'ចម្លើយក្នុងទិន្នន័យ', statModules: 'ផ្នែកអនុវត្ត', statLanguages: 'ភាសាវេបសាយ',
      quickSearchTitle: 'តើអ្នកចង់ដោះស្រាយអ្វី?', quickSearchLead: 'ស្វែងរកចម្លើយសាធារណៈ និងឯកសារផ្ទាល់ខ្លួន។',
      quickSearchPlaceholder: 'ឧទាហរណ៍៖ វីដេអូ AI វេបសាយ ឆ្លើយតបស្វ័យប្រវត្តិ ទីផ្សារ', search: 'ស្វែងរក',
      solutionsTitle: 'ជ្រើសរើសផ្នែក', solutionsLead: 'គម្រោង និងតម្លៃអានផ្ទាល់ពីទិន្នន័យ។ ការបញ្ជាទិញជារបស់សមាជិកដែលបានចូល។',
      catWork: 'ការងារ AI', catCreation: 'ការបង្កើត AI', catBusiness: 'អាជីវកម្ម AI', catAutomation: 'ស្វ័យប្រវត្តិកម្ម AI',
      catWorkDesc: 'ប្រសិទ្ធភាពការងារ ចំណេះដឹង និងជំនួយការសហគ្រាស', catCreationDesc: 'មាតិកា រូបភាព វីដេអូ និងឯកសារឌីជីថល',
      catBusinessDesc: 'វេបសាយ ម៉ាក ទីផ្សារ និងប្រព័ន្ធអាជីវកម្ម', catAutomationDesc: 'លំហូរការងារ ការជូនដំណឹង សមកាលកម្ម និងសកម្មភាពឆ្លាតវៃ',
      planCount: '{count} គម្រោង', choosePlan: 'ជ្រើសគម្រោង', loading: 'កំពុងអានទិន្នន័យ…', retry: 'ព្យាយាមម្តងទៀត', noPlans: 'មិនមានគម្រោង។',
      priceUnit: 'USDT', checkoutTitle: 'បញ្ជាក់ការបញ្ជាទិញ', checkoutAccount: 'ការបញ្ជាទិញនេះនឹងរក្សាទុកក្នុងគណនីសមាជិករបស់អ្នក',
      name: 'ឈ្មោះ', email: 'អ៊ីមែល', phone: 'ទូរស័ព្ទ', namePlaceholder: 'បញ្ចូលឈ្មោះ', emailPlaceholder: 'បញ្ចូលអ៊ីមែល',
      phonePlaceholder: 'បញ្ចូលលេខទូរស័ព្ទ', createOrder: 'បង្កើតការបញ្ជាទិញពិត', creatingOrder: 'កំពុងបង្កើត…', cancel: 'បោះបង់',
      paymentTitle: 'ការផ្ទៀងផ្ទាត់ការទូទាត់', orderNo: 'លេខបញ្ជាទិញ', amount: 'ចំនួនត្រូវបង់', network: 'បណ្តាញ', wallet: 'អាសយដ្ឋានទទួលប្រាក់',
      copy: 'ចម្លង', copied: 'បានចម្លង', txid: 'លេខប្រតិបត្តិការ TXID', txidPlaceholder: 'បិទភ្ជាប់ TRON TXID 64 តួ',
      payHelp: 'ផ្ទេរចំនួនត្រឹមត្រូវ ហើយបិទភ្ជាប់ TXID។ ប្រព័ន្ធនឹងផ្ទៀងផ្ទាត់លើបណ្តាញ។',
      submitPayment: 'ដាក់ស្នើ និងផ្ទៀងផ្ទាត់', checkingPayment: 'កំពុងផ្ទៀងផ្ទាត់…', back: 'ត្រឡប់', paymentSuccess: 'បានបញ្ជាក់ការទូទាត់',
      paymentPending: 'ប្រតិបត្តិការកំពុងបញ្ជាក់។ សូមពិនិត្យម្តងទៀតនៅមជ្ឈមណ្ឌលសមាជិក។', goMemberOrders: 'មើលការបញ្ជាទិញរបស់ខ្ញុំ',
      close: 'បិទ', musicOn: '♫ កំពុងលេង', musicOff: '♫ តន្ត្រី',
      authTitle: 'ចុះឈ្មោះ និងចូលសមាជិក', authLead: 'ចូលដើម្បីបញ្ជាទិញ និងមើលតែព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នក។',
      loginTab: 'ចូល', registerTab: 'ចុះឈ្មោះ', displayName: 'ឈ្មោះសមាជិក', displayNamePlaceholder: 'បញ្ចូលឈ្មោះសមាជិក',
      password: 'ពាក្យសម្ងាត់', passwordPlaceholder: 'យ៉ាងតិច 8 តួ', confirmPassword: 'បញ្ជាក់ពាក្យសម្ងាត់',
      confirmPasswordPlaceholder: 'បញ្ចូលម្តងទៀត', signIn: 'ចូលគណនី', signingIn: 'កំពុងចូល…', signUp: 'បង្កើតគណនី', signingUp: 'កំពុងចុះឈ្មោះ…',
      haveSession: 'កម្មវិធីរុករកនេះបានចូលរួចហើយ។', enterMember: 'ចូលមជ្ឈមណ្ឌលសមាជិក', useAnother: 'ប្តូរគណនី',
      emailCheck: 'បានចុះឈ្មោះ។ សូមបញ្ជាក់អ៊ីមែល ហើយចូលម្តងទៀត។', authSuccess: 'ចូលបានជោគជ័យ…',
      authPrivacy: 'គណនីប្រើ Supabase Auth។ ពាក្យសម្ងាត់មិនរក្សាទុកក្នុងកូដវេបសាយ ឬតារាងបញ្ជាទិញទេ។',
      memberTitle: 'មជ្ឈមណ្ឌលសមាជិករបស់ខ្ញុំ', memberLead: 'បង្ហាញតែប្រវត្តិរូប ការបញ្ជាទិញ និងឯកសារផ្ទាល់ខ្លួនរបស់គណនីនេះ។',
      profileTitle: 'ប្រវត្តិរូប', saveProfile: 'រក្សាទុក', saving: 'កំពុងរក្សាទុក…', saved: 'បានរក្សាទុក', memberId: 'លេខសមាជិក', joinedAt: 'ថ្ងៃចុះឈ្មោះ',
      profileLanguage: 'ភាសាលំនាំដើម', ordersTitle: 'ការបញ្ជាទិញរបស់ខ្ញុំ', refresh: 'ធ្វើឱ្យថ្មី', noOrders: 'មិនទាន់មានការបញ្ជាទិញ។',
      status: 'ស្ថានភាព', product: 'គម្រោង', createdAt: 'បង្កើតនៅ', pending: 'រង់ចាំទូទាត់', checking: 'កំពុងផ្ទៀងផ្ទាត់', paid: 'បានទូទាត់',
      delivered: 'បានប្រគល់', expired: 'ផុតកំណត់', failed: 'បរាជ័យ', cancelled: 'បានបោះបង់', download: 'ទាញយក', downloading: 'កំពុងបង្កើតតំណ…', verifyTxid: 'ផ្ទៀងផ្ទាត់ TXID',
      materialsTitle: 'ចំណេះដឹងរបស់ខ្ញុំ', materialsLead: 'បិទភ្ជាប់ឯកសារវែងនៅទីនេះ។ វាឯកជនសម្រាប់គណនីរបស់អ្នក និងចូលក្នុងការស្វែងរក។',
      materialTitle: 'ចំណងជើង', materialTitlePlaceholder: 'ឧទាហរណ៍៖ គំរូស្គ្រីបវីដេអូ', category: 'ប្រភេទ', materialLanguage: 'ភាសាឯកសារ',
      sourceName: 'ប្រភព/ឈ្មោះឯកសារ (ស្រេចចិត្ត)', sourcePlaceholder: 'ឧទាហរណ៍៖ marketing-notes.docx', materialContent: 'ខ្លឹមសារពេញ',
      materialContentPlaceholder: 'បិទភ្ជាប់ខ្លឹមសារ រហូតដល់ 50,000 តួ', saveMaterial: 'រក្សាទុកក្នុងទិន្នន័យ', updateMaterial: 'ធ្វើបច្ចុប្បន្នភាព',
      newMaterial: 'ឯកសារថ្មី', edit: 'កែសម្រួល', delete: 'លុប', noMaterials: 'មិនទាន់មានឯកសារផ្ទាល់ខ្លួន។', confirmDelete: 'លុបឯកសារនេះ?',
      knowledgeTitle: 'ចម្លើយ និងមូលដ្ឋានចំណេះដឹង', knowledgeLead: 'មើលចម្លើយ 120 ក្នុង 4 ផ្នែក។ ចូលដើម្បីស្វែងរកឯកសារផ្ទាល់ខ្លួនផងដែរ។',
      all: 'ទាំងអស់', mine: 'របស់ខ្ញុំ', answerCount: '{count} លទ្ធផល', clear: 'សម្អាត', loadMore: 'បង្ហាញបន្ថែម', details: 'បើកចម្លើយលម្អិត',
      recommendedPlan: 'មើលគម្រោងណែនាំ', source: 'ប្រភព', privateMaterial: 'ឯកសារផ្ទាល់ខ្លួន', addMyMaterial: 'បន្ថែមឯកសារខ្វះទៅក្នុងចំណេះដឹងរបស់ខ្ញុំ',
      noResults: 'រកមិនឃើញ។ សូមសាកពាក្យផ្សេង។', errorGeneric: 'ប្រតិបត្តិការបរាជ័យ។ សូមសាកម្តងទៀត។', errorNetwork: 'បញ្ហាបណ្តាញ។ សូមសាកម្តងទៀត។',
      errorAuth: 'សូមចូលជាមុន។', errorEmailPassword: 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។', errorPasswordMatch: 'ពាក្យសម្ងាត់មិនដូចគ្នា។',
      errorPasswordLength: 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 8 តួ។', errorName: 'សូមបញ្ចូលឈ្មោះ។', errorEmail: 'សូមបញ្ចូលអ៊ីមែលត្រឹមត្រូវ។',
      errorPhone: 'សូមបញ្ចូលលេខទូរស័ព្ទត្រឹមត្រូវ។', errorTxid: 'សូមបញ្ចូល TRON TXID 64 តួ។',
      errorOpenOrder: 'មានការបញ្ជាទិញមិនទាន់បញ្ចប់។ ប្រព័ន្ធបានបើកវាឱ្យអ្នក។', errorRate: 'សំណើច្រើនពេក។ សូមសាកក្រោយ។',
      errorPaymentMismatch: 'អាសយដ្ឋាន Token ឬចំនួនទឹកប្រាក់មិនត្រូវគ្នា។', errorTxidUsed: 'TXID នេះបានប្រើ ឬការបញ្ជាទិញមាន TXID ផ្សេង។',
      footer: 'Global Youxuan · សមាជិកភាព និងការប្រគល់ឌីជីថលមានសុវត្ថិភាព'
    }
  };

  const valid = new Set(Object.keys(messages));
  let current = valid.has(localStorage.getItem('gyx_locale')) ? localStorage.getItem('gyx_locale') : 'zh-CN';

  function t(key, vars = {}) {
    let value = messages[current]?.[key] ?? messages['zh-CN']?.[key] ?? key;
    Object.entries(vars).forEach(([name, replacement]) => {
      value = value.replaceAll(`{${name}}`, String(replacement));
    });
    return value;
  }

  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach((element) => {
      element.setAttribute('aria-label', t(element.dataset.i18nAria));
    });
    document.documentElement.lang = current;
    document.querySelectorAll('[data-language-select]').forEach((select) => {
      select.value = current;
    });
  }

  function setLanguage(locale, persist = true) {
    if (!valid.has(locale)) return;
    current = locale;
    if (persist) localStorage.setItem('gyx_locale', locale);
    apply();
    window.dispatchEvent(new CustomEvent('gyx:languagechange', { detail: { locale } }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-language-select]').forEach((select) => {
      select.addEventListener('change', () => setLanguage(select.value));
    });
    apply();
  });

  window.GYXI18N = { t, apply, setLanguage, get locale() { return current; }, messages };
})();

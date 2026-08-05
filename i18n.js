(() => {
  'use strict';

  const messages = {
    'zh-CN': {
      brand: '全球优选', navShop: '智能匹配', navKnowledge: '答案匹配', navMember: '会员中心', navContact: '联系客服',
      login: '登录', logout: '退出登录', register: '免费注册', language: '语言',
      shopEyebrow: '输入问题 · 五轮选择 · 一个最匹配方案', shopTitle: '连接全球智慧，找到真正能执行的答案',
      shopLead: '输入问题并完成5轮选择，系统会给出一个最匹配的执行方案并自动定价。',
      browseKnowledge: '五轮匹配后只显示一个方案', viewMember: '查看会员中心',
      statAnswers: '数据库问答', statModules: '实战模块', statLanguages: '网站语言',
      quickSearchTitle: '你现在最想解决什么问题？', quickSearchLead: '描述得越具体，匹配结果越准确。',
      quickSearchPlaceholder: '例如：我想用AI自动回复客户，但不知道从哪里开始', search: '开始智能匹配',
      flowAsk: '输入问题', flowChoose: '连续5轮选择', flowResult: '得到1个方案',
      assistantReady: '智能匹配已就绪', priceNote: '完成选择后显示1个匹配方案和对应价格。',
      moduleWebsite: '网站建设', moduleWebsiteLead: '网站、商城与会员系统', moduleAi: '智能未来', moduleAiLead: 'AI创作与智能助手',
      moduleGrowth: '量化感知', moduleGrowthLead: '数据分析与增长决策', moduleAcademy: '数字学院', moduleAcademyLead: '短小清晰的实操方案',
      restart: '重新开始', matchedResult: '最匹配方案', answerDepth: '方案深度', youWillGet: '下单后获得',
      viewMatchPath: '查看本次匹配记录', favoriteAnswer: '收藏答案', favorited: '已收藏',
      orderNow: '直接下单', askAnother: '换一个问题',
      solutionsTitle: '选择实战模块', solutionsLead: '根据你的问题和选择给出对应方案与价格。',
      catWork: 'AI 办公', catCreation: 'AI 创作', catBusiness: 'AI 商业', catAutomation: 'AI 自动化',
      catWorkDesc: '办公提效、知识管理与企业助手', catCreationDesc: '内容、图片、视频与数字资料',
      catBusinessDesc: '网站、品牌、营销与商业系统', catAutomationDesc: '工作流、通知、同步与智能执行',
      planCount: '{count} 个方案', choosePlan: '选择方案', loading: '正在加载…', retry: '重新加载',
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
      goMemberOrders: '查看我的订单', close: '关闭', musicOn: '♫ 正在播放', musicOff: '♫ 播放音乐',
      authTitle: '会员注册与登录', authLead: '一个账号，保存你的方案、收藏与订单。',
      loginTab: '登录', registerTab: '注册', displayName: '会员名称', displayNamePlaceholder: '请输入会员名称',
      password: '密码', passwordPlaceholder: '至少 8 位密码', confirmPassword: '确认密码',
      confirmPasswordPlaceholder: '再次输入密码', signIn: '登录会员账号', signingIn: '正在登录…',
      signUp: '创建会员账号', signingUp: '正在注册…', haveSession: '这个浏览器已经登录。',
      enterMember: '进入会员中心', useAnother: '切换账号', emailCheck: '注册成功，正在登录…',
      authSuccess: '登录成功，正在进入…', registerSuccess: '注册成功，正在进入会员中心…', authPrivacy: '账户信息由安全登录系统保护。',
      memberTitle: '我的会员中心', memberLead: '收藏、订单和个人资料都在这里。',
      profileTitle: '会员资料', saveProfile: '保存会员资料', saving: '正在保存…', saved: '已保存',
      memberId: '会员编号', joinedAt: '注册时间', profileLanguage: '默认语言',
      ordersTitle: '我的订单', refresh: '刷新', noOrders: '你还没有订单。', status: '状态', product: '方案',
      createdAt: '创建时间', pending: '待付款', checking: '核验中', paid: '已付款', delivered: '已交付',
      expired: '已过期', failed: '失败', cancelled: '已取消', download: '下载资料', downloading: '正在生成下载链接…',
      viewPurchasedAnswer: '查看已购买答案', loadingAnswer: '正在读取答案…', answerReady: '答案已展开', copyAnswer: '复制答案',
      verifyTxid: '核验 TXID', favoritesTitle: '我的收藏', favoritesLead: '你在智能匹配结果页收藏的答案都保存在这里。',
      noFavorites: '还没有收藏答案，先去输入一个问题。', removeFavorite: '取消收藏', orderFavorite: '直接下单',
      confirmRemoveFavorite: '确定取消收藏这条答案吗？',
      materialsTitle: '我的私人资料', materialsLead: '在这里添加和管理你的长资料。',
      materialTitle: '资料标题', materialTitlePlaceholder: '例如：短视频脚本模板', category: '分类',
      materialLanguage: '资料语言', sourceName: '来源/文件名（选填）', sourcePlaceholder: '例如：我的营销笔记.docx',
      materialContent: '资料正文', materialContentPlaceholder: '粘贴完整正文，最多 50,000 字符',
      saveMaterial: '保存到数据库', updateMaterial: '更新资料', newMaterial: '新增资料',
      edit: '编辑', delete: '删除', noMaterials: '还没有私人资料。', confirmDelete: '确定删除这条资料吗？',
      knowledgeTitle: '智能答案匹配', knowledgeLead: '输入问题并完成选择，获取最适合的执行方案。',
      all: '全部', mine: '我的资料', answerCount: '共 {count} 条结果', clear: '清除', loadMore: '加载更多',
      details: '展开详细答案', recommendedPlan: '查看推荐方案', source: '来源', privateMaterial: '私人资料',
      addMyMaterial: '把缺少的资料存入我的资料库', noResults: '没有找到匹配内容，请换一个关键词。',
      errorGeneric: '操作失败，请稍后重试。', errorNetwork: '暂时无法完成，请稍后再试。',
      errorAuth: '请先登录会员账号。', errorEmailPassword: '邮箱或密码不正确。', errorPasswordMatch: '两次输入的密码不一致。',
      errorAccountExists: '该邮箱已经注册，请直接登录。',
      errorPasswordLength: '密码至少需要 8 位。', errorName: '请输入姓名。', errorEmail: '请输入正确邮箱。',
      errorPhone: '请输入正确联系电话。', errorTxid: '请输入正确的 64 位 TRON TXID。',
      errorOpenOrder: '这个方案已有待处理订单，已为你打开原订单。', errorRate: '操作太频繁，请稍后再试。',
      errorPaymentMismatch: '链上收款地址、代币或金额不匹配，请核对。', errorTxidUsed: '该 TXID 已使用或订单已绑定其他 TXID。',
      themeDark: '切换暗色', themeLight: '切换浅色', openSupport: '在线客服', supportTitle: '联系客服',
      supportLead: '需要帮助？直接联系我们', supportTelegram: 'Telegram客服', supportEmail: '邮箱客服',
      footer: '全球优选 · 数字解决方案'
    },
    en: {
      brand: 'Global Youxuan', navShop: 'Smart Match', navKnowledge: 'Answer Match', navMember: 'Member Center', navContact: 'Support',
      login: 'Sign in', logout: 'Sign out', register: 'Register', language: 'Language',
      shopEyebrow: 'Ask · Choose five rounds · Get one best match', shopTitle: 'Connect global intelligence with answers you can execute',
      shopLead: 'Enter your question and complete five rounds to receive one matched action plan with automatic pricing.',
      browseKnowledge: 'One result after five rounds', viewMember: 'Open member center',
      statAnswers: 'database answers', statModules: 'practical modules', statLanguages: 'site languages',
      quickSearchTitle: 'What do you want to solve now?', quickSearchLead: 'More detail produces a more accurate match.',
      quickSearchPlaceholder: 'Example: I want AI to reply to customers automatically', search: 'Start smart match',
      flowAsk: 'Enter question', flowChoose: 'Five choice rounds', flowResult: 'Get one plan',
      assistantReady: 'Smart matching is ready', priceNote: 'Your matched plan and price appear after five rounds.',
      moduleWebsite: 'Website Building', moduleWebsiteLead: 'Sites, stores and member systems', moduleAi: 'Intelligent Future', moduleAiLead: 'AI creation and assistants',
      moduleGrowth: 'Growth Intelligence', moduleGrowthLead: 'Data analysis and decisions', moduleAcademy: 'Digital Academy', moduleAcademyLead: 'Clear, practical action plans',
      restart: 'Start over', matchedResult: 'Best matched plan', answerDepth: 'Plan depth', youWillGet: 'What you receive',
      viewMatchPath: 'View matching record', favoriteAnswer: 'Save answer', favorited: 'Saved',
      orderNow: 'Order now', askAnother: 'Ask another question',
      solutionsTitle: 'Choose a module', solutionsLead: 'Your answers determine the matched plan and price.',
      catWork: 'AI Work', catCreation: 'AI Creation', catBusiness: 'AI Business', catAutomation: 'AI Automation',
      catWorkDesc: 'Productivity, knowledge and enterprise assistants', catCreationDesc: 'Content, images, video and digital materials',
      catBusinessDesc: 'Websites, brands, marketing and business systems', catAutomationDesc: 'Workflows, alerts, sync and intelligent actions',
      planCount: '{count} plans', choosePlan: 'Choose plan', loading: 'Loading…', retry: 'Retry', noPlans: 'No plans are available.',
      priceUnit: 'USDT', checkoutTitle: 'Confirm order', checkoutAccount: 'This order will be saved to your member account',
      name: 'Name', email: 'Email', phone: 'Phone', namePlaceholder: 'Enter your name', emailPlaceholder: 'Enter your email',
      phonePlaceholder: 'Enter your phone number', createOrder: 'Create real order', creatingOrder: 'Creating order…', cancel: 'Cancel',
      paymentTitle: 'Payment verification', orderNo: 'Order number', amount: 'Exact amount', network: 'Network', wallet: 'Payment wallet',
      copy: 'Copy', copied: 'Copied', txid: 'Transaction hash (TXID)', txidPlaceholder: 'Paste the 64-character TRON TXID',
      payHelp: 'Transfer the exact amount shown, then paste the TXID. The system verifies it on-chain.',
      submitPayment: 'Submit & verify', checkingPayment: 'Verifying payment…', back: 'Back', paymentSuccess: 'Payment confirmed',
      paymentPending: 'The transfer is still confirming. Check again later or view it in your member center.', goMemberOrders: 'View my orders',
      close: 'Close', musicOn: '♫ Playing', musicOff: '♫ Play music',
      authTitle: 'Member registration & sign in', authLead: 'One account for your plans, saved answers and orders.',
      loginTab: 'Sign in', registerTab: 'Register', displayName: 'Member name', displayNamePlaceholder: 'Enter a member name',
      password: 'Password', passwordPlaceholder: 'At least 8 characters', confirmPassword: 'Confirm password',
      confirmPasswordPlaceholder: 'Enter the password again', signIn: 'Sign in', signingIn: 'Signing in…', signUp: 'Create account',
      signingUp: 'Creating account…', haveSession: 'This browser is already signed in.', enterMember: 'Open member center', useAnother: 'Switch account',
      emailCheck: 'Registration complete. Signing in…', authSuccess: 'Signed in. Redirecting…', registerSuccess: 'Account created. Opening your member center…',
      authPrivacy: 'Your account is protected by secure sign-in.',
      memberTitle: 'My member center', memberLead: 'Your saved answers, orders and materials are all here.',
      profileTitle: 'Profile', saveProfile: 'Save profile', saving: 'Saving…', saved: 'Saved', memberId: 'Member ID', joinedAt: 'Joined',
      profileLanguage: 'Default language', ordersTitle: 'My orders', refresh: 'Refresh', noOrders: 'You have no orders yet.',
      status: 'Status', product: 'Plan', createdAt: 'Created', pending: 'Pending', checking: 'Verifying', paid: 'Paid', delivered: 'Delivered',
      expired: 'Expired', failed: 'Failed', cancelled: 'Cancelled', download: 'Download', downloading: 'Preparing download…', verifyTxid: 'Verify TXID',
      viewPurchasedAnswer: 'View purchased answer', loadingAnswer: 'Loading answer…', answerReady: 'Answer opened', copyAnswer: 'Copy answer',
      favoritesTitle: 'My saved answers', favoritesLead: 'Answers saved from smart matching appear here.',
      noFavorites: 'No saved answers yet. Start by asking a question.', removeFavorite: 'Remove', orderFavorite: 'Order now',
      confirmRemoveFavorite: 'Remove this saved answer?',
      materialsTitle: 'My private materials', materialsLead: 'Add and manage your long-form materials here.',
      materialTitle: 'Title', materialTitlePlaceholder: 'Example: Short-video script template', category: 'Category', materialLanguage: 'Content language',
      sourceName: 'Source / filename (optional)', sourcePlaceholder: 'Example: marketing-notes.docx', materialContent: 'Full content',
      materialContentPlaceholder: 'Paste the full content, up to 50,000 characters', saveMaterial: 'Save to database', updateMaterial: 'Update material',
      newMaterial: 'New material', edit: 'Edit', delete: 'Delete', noMaterials: 'No private materials yet.', confirmDelete: 'Delete this material?',
      knowledgeTitle: 'Smart answer matching', knowledgeLead: 'Enter a question and complete the choices to receive the best action plan.',
      all: 'All', mine: 'Mine', answerCount: '{count} results', clear: 'Clear', loadMore: 'Load more', details: 'Open full answer',
      recommendedPlan: 'View recommended plan', source: 'Source', privateMaterial: 'Private material', addMyMaterial: 'Add missing material to my knowledge',
      noResults: 'No matching content. Try another keyword.', errorGeneric: 'Something went wrong. Please try again.', errorNetwork: 'This action is temporarily unavailable. Please try again.',
      errorAuth: 'Please sign in first.', errorEmailPassword: 'Incorrect email or password.', errorPasswordMatch: 'Passwords do not match.',
      errorAccountExists: 'This email is already registered. Please sign in.',
      errorPasswordLength: 'Password must be at least 8 characters.', errorName: 'Enter your name.', errorEmail: 'Enter a valid email.',
      errorPhone: 'Enter a valid phone number.', errorTxid: 'Enter a valid 64-character TRON TXID.',
      errorOpenOrder: 'An open order already exists. It has been loaded for you.', errorRate: 'Too many attempts. Try again later.',
      errorPaymentMismatch: 'The token, destination or amount does not match this order.', errorTxidUsed: 'This TXID is already used or the order has another TXID.',
      themeDark: 'Switch to dark', themeLight: 'Switch to light', openSupport: 'Support', supportTitle: 'Contact support',
      supportLead: 'Need help? Contact us directly', supportTelegram: 'Telegram support', supportEmail: 'Email support',
      footer: 'Global Youxuan · Digital Solutions'
    },
    km: {
      brand: 'Global Youxuan', navShop: 'ផ្គូផ្គងឆ្លាតវៃ', navKnowledge: 'ផ្គូផ្គងចម្លើយ', navMember: 'មជ្ឈមណ្ឌលសមាជិក', navContact: 'ទាក់ទងជំនួយ',
      login: 'ចូល', logout: 'ចាកចេញ', register: 'ចុះឈ្មោះ', language: 'ភាសា',
      shopEyebrow: 'សួរ · ជ្រើស 5 ជុំ · ទទួលផែនការមួយ', shopTitle: 'ភ្ជាប់បញ្ញាសកល និងទទួលចម្លើយដែលអាចអនុវត្តបាន',
      shopLead: 'បញ្ចូលសំណួរ និងបំពេញជម្រើស 5 ជុំ ដើម្បីទទួលផែនការមួយ និងតម្លៃស្វ័យប្រវត្តិ។',
      browseKnowledge: 'លទ្ធផលមួយបន្ទាប់ពី 5 ជុំ', viewMember: 'មើលមជ្ឈមណ្ឌលសមាជិក',
      statAnswers: 'ចម្លើយក្នុងទិន្នន័យ', statModules: 'ផ្នែកអនុវត្ត', statLanguages: 'ភាសាវេបសាយ',
      quickSearchTitle: 'ឥឡូវអ្នកចង់ដោះស្រាយអ្វី?', quickSearchLead: 'ពណ៌នាកាន់តែលម្អិត លទ្ធផលកាន់តែត្រឹមត្រូវ។',
      quickSearchPlaceholder: 'ឧទាហរណ៍៖ ខ្ញុំចង់ឱ្យ AI ឆ្លើយតបអតិថិជនដោយស្វ័យប្រវត្តិ', search: 'ចាប់ផ្តើមផ្គូផ្គង',
      flowAsk: 'បញ្ចូលសំណួរ', flowChoose: 'ជ្រើស 5 ជុំ', flowResult: 'ទទួលផែនការមួយ',
      assistantReady: 'ការផ្គូផ្គងឆ្លាតវៃរួចរាល់', priceNote: 'បន្ទាប់ពី 5 ជុំ នឹងបង្ហាញផែនការ និងតម្លៃ។',
      moduleWebsite: 'បង្កើតវេបសាយ', moduleWebsiteLead: 'វេបសាយ ហាង និងប្រព័ន្ធសមាជិក', moduleAi: 'អនាគតឆ្លាតវៃ', moduleAiLead: 'ការបង្កើត AI និងជំនួយការ',
      moduleGrowth: 'ទិន្នន័យកំណើន', moduleGrowthLead: 'វិភាគទិន្នន័យ និងសម្រេចចិត្ត', moduleAcademy: 'សាលាឌីជីថល', moduleAcademyLead: 'ផែនការអនុវត្តច្បាស់លាស់',
      restart: 'ចាប់ផ្តើមឡើងវិញ', matchedResult: 'ផែនការសមបំផុត', answerDepth: 'ជម្រៅផែនការ', youWillGet: 'អ្វីដែលអ្នកទទួល',
      viewMatchPath: 'មើលកំណត់ត្រាផ្គូផ្គង', favoriteAnswer: 'រក្សាទុកចម្លើយ', favorited: 'បានរក្សាទុក',
      orderNow: 'បញ្ជាទិញឥឡូវ', askAnother: 'សួរសំណួរផ្សេង',
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
      close: 'បិទ', musicOn: '♫ កំពុងលេង', musicOff: '♫ ចាក់តន្ត្រី',
      authTitle: 'ចុះឈ្មោះ និងចូលសមាជិក', authLead: 'គណនីមួយសម្រាប់ផែនការ ចម្លើយរក្សាទុក និងការបញ្ជាទិញ។',
      loginTab: 'ចូល', registerTab: 'ចុះឈ្មោះ', displayName: 'ឈ្មោះសមាជិក', displayNamePlaceholder: 'បញ្ចូលឈ្មោះសមាជិក',
      password: 'ពាក្យសម្ងាត់', passwordPlaceholder: 'យ៉ាងតិច 8 តួ', confirmPassword: 'បញ្ជាក់ពាក្យសម្ងាត់',
      confirmPasswordPlaceholder: 'បញ្ចូលម្តងទៀត', signIn: 'ចូលគណនី', signingIn: 'កំពុងចូល…', signUp: 'បង្កើតគណនី', signingUp: 'កំពុងចុះឈ្មោះ…',
      haveSession: 'កម្មវិធីរុករកនេះបានចូលរួចហើយ។', enterMember: 'ចូលមជ្ឈមណ្ឌលសមាជិក', useAnother: 'ប្តូរគណនី',
      emailCheck: 'បានចុះឈ្មោះ។ កំពុងចូល…', authSuccess: 'ចូលបានជោគជ័យ…', registerSuccess: 'បានបង្កើតគណនី។ កំពុងបើកមជ្ឈមណ្ឌលសមាជិក…',
      authPrivacy: 'គណនីរបស់អ្នកត្រូវបានការពារដោយប្រព័ន្ធចូលសុវត្ថិភាព។',
      memberTitle: 'មជ្ឈមណ្ឌលសមាជិករបស់ខ្ញុំ', memberLead: 'ចម្លើយដែលបានរក្សាទុក ការបញ្ជាទិញ និងឯកសារនៅទីនេះ។',
      profileTitle: 'ប្រវត្តិរូប', saveProfile: 'រក្សាទុក', saving: 'កំពុងរក្សាទុក…', saved: 'បានរក្សាទុក', memberId: 'លេខសមាជិក', joinedAt: 'ថ្ងៃចុះឈ្មោះ',
      profileLanguage: 'ភាសាលំនាំដើម', ordersTitle: 'ការបញ្ជាទិញរបស់ខ្ញុំ', refresh: 'ធ្វើឱ្យថ្មី', noOrders: 'មិនទាន់មានការបញ្ជាទិញ។',
      status: 'ស្ថានភាព', product: 'គម្រោង', createdAt: 'បង្កើតនៅ', pending: 'រង់ចាំទូទាត់', checking: 'កំពុងផ្ទៀងផ្ទាត់', paid: 'បានទូទាត់',
      delivered: 'បានប្រគល់', expired: 'ផុតកំណត់', failed: 'បរាជ័យ', cancelled: 'បានបោះបង់', download: 'ទាញយក', downloading: 'កំពុងបង្កើតតំណ…', verifyTxid: 'ផ្ទៀងផ្ទាត់ TXID',
      viewPurchasedAnswer: 'មើលចម្លើយដែលបានទិញ', loadingAnswer: 'កំពុងអានចម្លើយ…', answerReady: 'បានបើកចម្លើយ', copyAnswer: 'ចម្លងចម្លើយ',
      favoritesTitle: 'ចម្លើយដែលបានរក្សាទុក', favoritesLead: 'ចម្លើយពីការផ្គូផ្គងឆ្លាតវៃនឹងបង្ហាញនៅទីនេះ។',
      noFavorites: 'មិនទាន់មានចម្លើយរក្សាទុក។ សូមចាប់ផ្តើមដោយសួរសំណួរ។', removeFavorite: 'ដកចេញ', orderFavorite: 'បញ្ជាទិញ',
      confirmRemoveFavorite: 'ដកចម្លើយដែលបានរក្សាទុកនេះ?',
      materialsTitle: 'ឯកសារផ្ទាល់ខ្លួន', materialsLead: 'បន្ថែម និងគ្រប់គ្រងឯកសាររបស់អ្នកនៅទីនេះ។',
      materialTitle: 'ចំណងជើង', materialTitlePlaceholder: 'ឧទាហរណ៍៖ គំរូស្គ្រីបវីដេអូ', category: 'ប្រភេទ', materialLanguage: 'ភាសាឯកសារ',
      sourceName: 'ប្រភព/ឈ្មោះឯកសារ (ស្រេចចិត្ត)', sourcePlaceholder: 'ឧទាហរណ៍៖ marketing-notes.docx', materialContent: 'ខ្លឹមសារពេញ',
      materialContentPlaceholder: 'បិទភ្ជាប់ខ្លឹមសារ រហូតដល់ 50,000 តួ', saveMaterial: 'រក្សាទុកក្នុងទិន្នន័យ', updateMaterial: 'ធ្វើបច្ចុប្បន្នភាព',
      newMaterial: 'ឯកសារថ្មី', edit: 'កែសម្រួល', delete: 'លុប', noMaterials: 'មិនទាន់មានឯកសារផ្ទាល់ខ្លួន។', confirmDelete: 'លុបឯកសារនេះ?',
      knowledgeTitle: 'ផ្គូផ្គងចម្លើយឆ្លាតវៃ', knowledgeLead: 'បញ្ចូលសំណួរ និងបំពេញជម្រើស ដើម្បីទទួលផែនការសមបំផុត។',
      all: 'ទាំងអស់', mine: 'របស់ខ្ញុំ', answerCount: '{count} លទ្ធផល', clear: 'សម្អាត', loadMore: 'បង្ហាញបន្ថែម', details: 'បើកចម្លើយលម្អិត',
      recommendedPlan: 'មើលគម្រោងណែនាំ', source: 'ប្រភព', privateMaterial: 'ឯកសារផ្ទាល់ខ្លួន', addMyMaterial: 'បន្ថែមឯកសារខ្វះទៅក្នុងចំណេះដឹងរបស់ខ្ញុំ',
      noResults: 'រកមិនឃើញ។ សូមសាកពាក្យផ្សេង។', errorGeneric: 'ប្រតិបត្តិការបរាជ័យ។ សូមសាកម្តងទៀត។', errorNetwork: 'បញ្ហាបណ្តាញ។ សូមសាកម្តងទៀត។',
      errorAuth: 'សូមចូលជាមុន។', errorEmailPassword: 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។', errorPasswordMatch: 'ពាក្យសម្ងាត់មិនដូចគ្នា។',
      errorAccountExists: 'អ៊ីមែលនេះបានចុះឈ្មោះរួច។ សូមចូលគណនី។',
      errorPasswordLength: 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 8 តួ។', errorName: 'សូមបញ្ចូលឈ្មោះ។', errorEmail: 'សូមបញ្ចូលអ៊ីមែលត្រឹមត្រូវ។',
      errorPhone: 'សូមបញ្ចូលលេខទូរស័ព្ទត្រឹមត្រូវ។', errorTxid: 'សូមបញ្ចូល TRON TXID 64 តួ។',
      errorOpenOrder: 'មានការបញ្ជាទិញមិនទាន់បញ្ចប់។ ប្រព័ន្ធបានបើកវាឱ្យអ្នក។', errorRate: 'សំណើច្រើនពេក។ សូមសាកក្រោយ។',
      errorPaymentMismatch: 'អាសយដ្ឋាន Token ឬចំនួនទឹកប្រាក់មិនត្រូវគ្នា។', errorTxidUsed: 'TXID នេះបានប្រើ ឬការបញ្ជាទិញមាន TXID ផ្សេង។',
      themeDark: 'ប្តូរទៅពណ៌ងងឹត', themeLight: 'ប្តូរទៅពណ៌ភ្លឺ', openSupport: 'ជំនួយ', supportTitle: 'ទាក់ទងជំនួយ',
      supportLead: 'ត្រូវការជំនួយ? ទាក់ទងយើងដោយផ្ទាល់', supportTelegram: 'ជំនួយ Telegram', supportEmail: 'ជំនួយអ៊ីមែល',
      footer: 'Global Youxuan · ដំណោះស្រាយឌីជីថល'
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

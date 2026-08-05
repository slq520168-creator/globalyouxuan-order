(() => {
  'use strict';

  const db = window.gyxSupabase;
  const i18n = window.GYXI18N;
  const config = window.GYX_CONFIG;
  if (!db || !i18n) return;

  const TIER_PRODUCTS = {
    essential: 'answer-essential',
    standard: 'answer-standard',
    detailed: 'answer-detailed',
    professional: 'answer-professional',
    custom: 'answer-custom'
  };
  const TIER_ORDER = ['essential', 'standard', 'detailed', 'professional', 'custom'];
  const FIXED_MODULES = {
    web: {
      titleKey: 'moduleWebsite',
      ids: ['web-photo', 'web-merchant', 'web-brand', 'web-enterprise']
    },
    automation: {
      titleKey: 'moduleAi',
      ids: ['automation-trial', 'automation-small', 'automation-team', 'automation-enterprise']
    },
    ai: {
      titleKey: 'moduleGrowth',
      ids: ['ai-trial', 'ai-content', 'ai-office', 'ai-enterprise']
    },
    digital: {
      titleKey: 'moduleAcademy',
      ids: ['digital-trial', 'digital-study', 'digital-expert', 'digital-private']
    }
  };
  const FIXED_PRODUCT_NAMES = {
    en: {
      'web-photo': 'Personal Gallery', 'web-merchant': 'Merchant Showcase', 'web-brand': 'Brand Website', 'web-enterprise': 'Enterprise System',
      'automation-trial': 'Trial', 'automation-small': 'Small Business Automation', 'automation-team': 'Team Collaboration', 'automation-enterprise': 'Enterprise Custom',
      'ai-trial': 'Trial', 'ai-content': 'Content Marketing', 'ai-office': 'Enterprise Productivity', 'ai-enterprise': 'Enterprise Custom',
      'digital-trial': 'Trial Pack', 'digital-study': 'Learning Pack', 'digital-expert': 'Expert Pack', 'digital-private': 'Private Coaching'
    },
    km: {
      'web-photo': 'អាល់ប៊ុមផ្ទាល់ខ្លួន', 'web-merchant': 'បង្ហាញអាជីវកម្ម', 'web-brand': 'គេហទំព័រម៉ាក', 'web-enterprise': 'ប្រព័ន្ធសហគ្រាស',
      'automation-trial': 'សាកល្បង', 'automation-small': 'ស្វ័យប្រវត្តិកម្មអាជីវកម្មតូច', 'automation-team': 'សហការក្រុម', 'automation-enterprise': 'កំណត់តាមសហគ្រាស',
      'ai-trial': 'សាកល្បង', 'ai-content': 'ទីផ្សារមាតិកា', 'ai-office': 'ការិយាល័យសហគ្រាស', 'ai-enterprise': 'កំណត់តាមសហគ្រាស',
      'digital-trial': 'កញ្ចប់សាកល្បង', 'digital-study': 'កញ្ចប់សិក្សា', 'digital-expert': 'កញ្ចប់អ្នកជំនាញ', 'digital-private': 'បង្រៀនផ្ទាល់ខ្លួន'
    }
  };
  const MIN_STRONG_SCORE = 6;
  const MATCH_STORAGE_KEY = 'gyx_pending_answer_match';

  const copy = {
    'zh-CN': {
      step: '第 {n} / 5 轮',
      candidateQuestion: '下面哪一个最接近你的问题？',
      candidateHelp: '系统已从后台答案中找出5个方向，请选择最接近的一项。',
      rounds: [
        null,
        {
          question: '你希望这次重点解决什么？',
          help: '选择最接近的目标。',
          options: ['先得到关键答案', '拿到清楚操作步骤', '获得可复制模板', '设计自动化流程', '得到完整执行方案']
        },
        {
          question: '你目前处在哪个阶段？',
          help: '当前基础会影响方案的起点。',
          options: ['完全不知道从哪开始', '已经有一些资料', '已经选好工具', '尝试过但没有成功', '需要重新完整设计']
        },
        {
          question: '你需要多详细的操作方案？',
          help: '这一项决定最终方案深度和价格。',
          options: ['只要关键结论', '标准操作方法', '详细步骤与模板', '专业完整执行', '深度定制匹配']
        },
        {
          question: '你最希望最后拿到什么？',
          help: '完成这一步后，只显示一个最匹配方案。',
          options: ['执行要点清单', '提示词和模板', '完整操作步骤', '落地执行方案', '专属深度方案']
        }
      ],
      tiers: {
        essential: { name: '要点答案', delivery: ['关键结论', '3个执行要点', '完成前检查清单'] },
        standard: { name: '标准操作答案', delivery: ['清楚的操作步骤', '可直接复制的提示词', '结果检查方法'] },
        detailed: { name: '详细实操方案', delivery: ['完整分步流程', '提示词与实用模板', '风险与交付检查清单'] },
        professional: { name: '专业执行方案', delivery: ['完整执行路径', '可直接使用的工作模板', '风险检查与优化建议'] },
        custom: { name: '深度匹配方案', delivery: ['从现有资料深度组合', '完整可执行方案', '专属检查与后续建议'] }
      },
      confidenceHigh: '高匹配',
      confidenceMatched: '已匹配',
      confidenceFallback: '深度匹配',
      needQuestion: '请至少输入2个字的问题。',
      loadingAnswers: '正在匹配后台答案…',
      answersUnavailable: '暂时无法读取答案，请稍后重试。',
      saveSuccess: '已收藏，可在会员中心随时查看。',
      alreadySaved: '这条答案已经收藏。',
      saving: '正在收藏…',
      loginFirst: '登录后即可收藏，当前结果不会丢失。',
      orderUnavailable: '价格方案读取失败，请刷新后重试。',
      fallbackNote: '没有完全一致的条目，已自动使用现有答案进行深度匹配。'
    },
    en: {
      step: 'Round {n} / 5',
      candidateQuestion: 'Which option is closest to your question?',
      candidateHelp: 'Five directions were selected from the private answer database.',
      rounds: [
        null,
        {
          question: 'What do you want to solve first?',
          help: 'Choose the closest goal.',
          options: ['Get the key answer', 'Get clear steps', 'Get reusable templates', 'Design an automation flow', 'Get a complete execution plan']
        },
        {
          question: 'Where are you now?',
          help: 'Your current stage determines the starting point.',
          options: ['Starting from zero', 'I have some materials', 'I chose the tools', 'I tried but failed', 'I need a full redesign']
        },
        {
          question: 'How detailed should the plan be?',
          help: 'This determines the depth and price.',
          options: ['Key conclusion only', 'Standard method', 'Detailed steps and templates', 'Professional execution', 'Deep custom match']
        },
        {
          question: 'What result do you want to receive?',
          help: 'The system will return only one best match.',
          options: ['Action checklist', 'Prompts and templates', 'Complete operating steps', 'Execution plan', 'Custom deep plan']
        }
      ],
      tiers: {
        essential: { name: 'Essential answer', delivery: ['Key conclusion', 'Three action points', 'Completion checklist'] },
        standard: { name: 'Standard answer', delivery: ['Clear operating steps', 'Reusable prompt', 'Result checks'] },
        detailed: { name: 'Detailed action plan', delivery: ['Complete workflow', 'Prompts and templates', 'Risk and delivery checklist'] },
        professional: { name: 'Professional execution plan', delivery: ['Full execution path', 'Ready-to-use templates', 'Risk checks and optimization'] },
        custom: { name: 'Deep matching plan', delivery: ['Deep combination of existing knowledge', 'Complete action plan', 'Custom checks and next steps'] }
      },
      confidenceHigh: 'High match',
      confidenceMatched: 'Matched',
      confidenceFallback: 'Deep match',
      needQuestion: 'Enter a question with at least two characters.',
      loadingAnswers: 'Matching database answers…',
      answersUnavailable: 'Answers cannot be loaded right now. Try again later.',
      saveSuccess: 'Saved. You can find it in your member center.',
      alreadySaved: 'This answer is already saved.',
      saving: 'Saving…',
      loginFirst: 'Sign in to save it. This result will not be lost.',
      orderUnavailable: 'The price plan could not be loaded. Refresh and try again.',
      fallbackNote: 'No exact entry was found. An existing answer has been selected for a deep match.'
    },
    km: {
      step: 'ជុំទី {n} / 5',
      candidateQuestion: 'ជម្រើសណាមួយនៅជិតសំណួររបស់អ្នកបំផុត?',
      candidateHelp: 'ប្រព័ន្ធបានជ្រើសទិសដៅ 5 ពីមូលដ្ឋានចម្លើយ។',
      rounds: [
        null,
        {
          question: 'អ្នកចង់ដោះស្រាយអ្វីជាមុន?',
          help: 'ជ្រើសគោលដៅដែលនៅជិតបំផុត។',
          options: ['ទទួលចម្លើយសំខាន់', 'ទទួលជំហានច្បាស់', 'ទទួលគំរូប្រើឡើងវិញ', 'រចនាលំហូរស្វ័យប្រវត្តិ', 'ទទួលផែនការអនុវត្តពេញលេញ']
        },
        {
          question: 'ឥឡូវអ្នកស្ថិតនៅដំណាក់កាលណា?',
          help: 'ដំណាក់កាលបច្ចុប្បន្នកំណត់ចំណុចចាប់ផ្តើម។',
          options: ['ចាប់ផ្តើមពីសូន្យ', 'មានឯកសារខ្លះ', 'បានជ្រើសឧបករណ៍', 'បានសាកតែមិនជោគជ័យ', 'ត្រូវរចនាឡើងវិញ']
        },
        {
          question: 'អ្នកត្រូវការផែនការលម្អិតកម្រិតណា?',
          help: 'ជម្រើសនេះកំណត់ជម្រៅ និងតម្លៃ។',
          options: ['តែសេចក្តីសន្និដ្ឋាន', 'វិធីស្តង់ដារ', 'ជំហាន និងគំរូលម្អិត', 'ការអនុវត្តវិជ្ជាជីវៈ', 'ផ្គូផ្គងជ្រៅផ្ទាល់ខ្លួន']
        },
        {
          question: 'ចុងក្រោយអ្នកចង់ទទួលអ្វី?',
          help: 'ប្រព័ន្ធបង្ហាញតែដំណោះស្រាយល្អបំផុតមួយ។',
          options: ['បញ្ជីអនុវត្ត', 'Prompt និងគំរូ', 'ជំហានពេញលេញ', 'ផែនការអនុវត្ត', 'ផែនការជ្រៅផ្ទាល់ខ្លួន']
        }
      ],
      tiers: {
        essential: { name: 'ចម្លើយសង្ខេប', delivery: ['សេចក្តីសន្និដ្ឋានសំខាន់', 'ចំណុចអនុវត្ត 3', 'បញ្ជីត្រួតពិនិត្យ'] },
        standard: { name: 'ចម្លើយស្តង់ដារ', delivery: ['ជំហានច្បាស់', 'Prompt អាចចម្លង', 'វិធីពិនិត្យលទ្ធផល'] },
        detailed: { name: 'ផែនការលម្អិត', delivery: ['លំហូរពេញលេញ', 'Prompt និងគំរូ', 'បញ្ជីហានិភ័យ'] },
        professional: { name: 'ផែនការវិជ្ជាជីវៈ', delivery: ['ផ្លូវអនុវត្តពេញលេញ', 'គំរូការងារ', 'ពិនិត្យហានិភ័យ និងកែលម្អ'] },
        custom: { name: 'ផែនការផ្គូផ្គងជ្រៅ', delivery: ['រួមបញ្ចូលចំណេះដឹងដែលមាន', 'ផែនការអនុវត្តពេញលេញ', 'ការណែនាំបន្ទាប់ផ្ទាល់ខ្លួន'] }
      },
      confidenceHigh: 'ផ្គូផ្គងខ្ពស់',
      confidenceMatched: 'បានផ្គូផ្គង',
      confidenceFallback: 'ផ្គូផ្គងជ្រៅ',
      needQuestion: 'សូមបញ្ចូលសំណួរយ៉ាងតិច 2 តួ។',
      loadingAnswers: 'កំពុងផ្គូផ្គងចម្លើយ…',
      answersUnavailable: 'មិនអាចអានចម្លើយបានទេ។ សូមសាកក្រោយ។',
      saveSuccess: 'បានរក្សាទុកក្នុងមជ្ឈមណ្ឌលសមាជិក។',
      alreadySaved: 'ចម្លើយនេះបានរក្សាទុករួចហើយ។',
      saving: 'កំពុងរក្សាទុក…',
      loginFirst: 'ចូលដើម្បីរក្សាទុក។ លទ្ធផលនេះមិនបាត់ទេ។',
      orderUnavailable: 'មិនអាចអានតម្លៃបានទេ។ សូមធ្វើឱ្យថ្មី។',
      fallbackNote: 'រកមិនឃើញចម្លើយដូចគ្នាទាំងស្រុង។ ប្រព័ន្ធបានផ្គូផ្គងជ្រៅពីចម្លើយដែលមាន។'
    }
  };

  const $ = (id) => document.getElementById(id);
  const t = (key, vars) => i18n.t(key, vars);
  const c = () => copy[i18n.locale] || copy['zh-CN'];

  let answers = [];
  let tierProducts = [];
  let fixedProducts = [];
  let activeFixedModule = '';
  let rankedCandidates = [];
  let originalQuestion = '';
  let quizIndex = 0;
  let selections = [];
  let initialStrongMatch = false;
  let currentMatch = null;
  let currentProduct = null;
  let currentOrder = null;
  let currentUser = null;
  let paymentPoll = null;

  function formatPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value || '0.00');
    return number.toFixed(2).replace(/\.00$/, '.00');
  }

  function localizedFixedProductName(product) {
    if (!product) return '';
    return FIXED_PRODUCT_NAMES[i18n.locale]?.[product.id] || product.product_name || '';
  }

  function localizedTitle(answer) {
    if (!answer) return '';
    if (i18n.locale === 'en') return answer.title_en || answer.title || answer.matched_title || '';
    if (i18n.locale === 'km') return answer.title_km || answer.title || answer.matched_title || '';
    return answer.title || answer.matched_title || '';
  }

  function localizedSummary(answer) {
    if (!answer) return '';
    if (i18n.locale === 'en') return answer.answer_summary_en || answer.answer_summary || answer.matched_summary || '';
    if (i18n.locale === 'km') return answer.answer_summary_km || answer.answer_summary || answer.matched_summary || '';
    return answer.answer_summary || answer.matched_summary || '';
  }

  function showToast(message, isError) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.className = 'toast'; }, 4200);
  }

  function showMessage(id, message, kind) {
    const element = $(id);
    if (!element) return;
    element.textContent = message;
    element.className = 'form-message show ' + (kind || 'error');
  }

  function clearMessage(id) {
    const element = $(id);
    if (!element) return;
    element.textContent = '';
    element.className = 'form-message';
  }

  function errorText(error) {
    const code = String(error && (error.code || error.message) || '').toUpperCase();
    if (code.includes('AUTH') || code.includes('SESSION') || code.includes('JWT')) return t('errorAuth');
    if (code.includes('OPEN_ORDER')) return t('errorOpenOrder');
    if (code.includes('RATE')) return t('errorRate');
    if (code.includes('PAYMENT_DETAILS_MISMATCH')) return t('errorPaymentMismatch');
    if (code.includes('TXID_ALREADY') || code.includes('DIFFERENT_TXID')) return t('errorTxidUsed');
    if (code.includes('FETCH') || code.includes('NETWORK')) return t('errorNetwork');
    return t('errorGeneric');
  }

  async function syncAccount() {
    currentUser = await window.gyxGetVerifiedUser();
    const link = $('accountLink');
    if (!link) return;
    link.href = currentUser ? 'member.html' : 'login.html';
    link.textContent = t(currentUser ? 'navMember' : 'login');
  }

  async function loadMatchingData() {
    const answerRequest = db
      .from('product_answer_options')
      .select('id,answer_code,module_code,title,title_en,title_km,answer_summary,answer_summary_en,answer_summary_km,keywords,priority')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(300);
    const productRequest = db
      .from('products')
      .select('id,product_name,product_price,currency,description')
      .eq('is_active', true);
    const results = await Promise.all([answerRequest, productRequest]);
    if (results[0].error || results[1].error) {
      answers = [];
      tierProducts = [];
      fixedProducts = [];
      return false;
    }
    answers = results[0].data || [];
    const allProducts = results[1].data || [];
    const tierIds = new Set(Object.values(TIER_PRODUCTS));
    const fixedIds = new Set(Object.values(FIXED_MODULES).flatMap((module) => module.ids));
    tierProducts = allProducts.filter((product) => tierIds.has(product.id));
    fixedProducts = allProducts.filter((product) => fixedIds.has(product.id));
    renderFixedModules();
    return answers.length > 0 && tierProducts.length === 5;
  }

  // ==================== 需求理解匹配（目标驱动，不是关键词匹配） ====================
  // 核心原则：理解客户真正想完成什么目标，再匹配能解决该目标的答案

  const INTENT_MAP = [
    {
      goals: ['赚钱', '增加收入', '副业变现', '兼职赚钱'],
      triggers: ['兼职', '副业', '赚钱', '变现', '收入', '盈利', '挣', '月入', '日入', '被动收入', 'side', 'hustle', 'earn', 'money', 'profit']
    },
    {
      goals: ['涨粉', '提升流量', '获取客户', '引流获客'],
      triggers: ['tiktok', '抖音', '快手', '小红书', '涨粉', '粉丝', '流量', '引流', '获客', '曝光', '播放', '关注', 'follower', 'traffic', 'fans', '微信', 'wechat', '社群', '私域']
    },
    {
      goals: ['提高经营效率', '优化管理', '降低成本', '提升效率'],
      triggers: ['宠物医院', '诊所', '医院', '店铺', '门店', '效率', '管理', '运营', '流程', '系统', '工具', '节省时间', '效率提升', '经营']
    },
    {
      goals: ['制作音乐', '创作内容', '生成内容', '做视频文案'],
      triggers: ['写歌', '作曲', '做音乐', 'ai写歌', '文案', '脚本', '视频', '图片', '创作', '生成', '内容', 'prompt', '提示词', 'music', 'song']
    },
    {
      goals: ['建网站', '品牌展示', '线上获客', '官网建设'],
      triggers: ['网站', '官网', '建站', '网页', '品牌', '展示', '电商', '落地页', 'homepage', 'website']
    },
    {
      goals: ['自动化', '减少人工', '机器人处理', '自动通知发货'],
      triggers: ['自动', '机器人', 'bot', '通知', '工作流', 'workflow', '同步', '自动发货', '自动回复', 'automation']
    },
    {
      goals: ['学习技能', '掌握方法', '实操教程', '提升能力'],
      triggers: ['学习', '教程', '怎么学', '入门', '掌握', '技能', '方法', '课程', 'learn', 'tutorial']
    },
    {
      goals: ['微信运营', '私域获客', '社群管理', '客户沟通'],
      triggers: ['微信', 'wechat', '公众号', '小程序', '企微', '企业微信', '社群', '私域', '朋友圈']
    }
  ];

  function simplify(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}]+/gu, '');
  }

  function tokens(value) {
    const source = String(value || '').toLowerCase().normalize('NFKC');
    const result = new Set();
    (source.match(/[a-z0-9]{2,}/g) || []).forEach((word) => result.add(word));
    (source.match(/[\u3400-\u9fff]{2,}/g) || []).forEach((segment) => {
      const max = Math.min(4, segment.length);
      for (let size = 2; size <= max; size += 1) {
        for (let index = 0; index <= segment.length - size; index += 1) {
          result.add(segment.slice(index, index + size));
          if (result.size >= 100) return;
        }
      }
    });
    return Array.from(result).slice(0, 100);
  }

  // 从客户问题中提取真实目标
  function extractGoals(question) {
    const q = String(question || '').toLowerCase().normalize('NFKC');
    const found = [];
    INTENT_MAP.forEach((item) => {
      const hit = item.triggers.some((t) => q.includes(t.toLowerCase()));
      if (hit) {
        found.push(...item.goals);
      }
    });
    return [...new Set(found)];
  }

  function scoreAnswer(answer, question) {
    const title = [answer.title, answer.title_en, answer.title_km].filter(Boolean).join(' ');
    const keywordText = Array.isArray(answer.keywords) ? answer.keywords.join(' ') : '';
    const summary = [answer.answer_summary, answer.answer_summary_en, answer.answer_summary_km].filter(Boolean).join(' ');
    const allText = (title + ' ' + keywordText + ' ' + summary).toLowerCase();

    const questionSimple = simplify(question);
    const titleSimple = simplify(title);
    const keywordSimple = simplify(keywordText);
    const summarySimple = simplify(summary);

    let score = 0;

    // 1. 需求目标匹配（最高权重）
    const goals = extractGoals(question);
    goals.forEach((goal) => {
      if (allText.includes(goal.toLowerCase())) score += 40;
      // 目标词出现在标题额外加分
      if (title.toLowerCase().includes(goal.toLowerCase())) score += 25;
    });

    // 2. 触发词直接命中答案文本
    INTENT_MAP.forEach((item) => {
      item.triggers.forEach((trigger) => {
        if (question.toLowerCase().includes(trigger) && allText.includes(trigger)) {
          score += 12;
        }
      });
    });

    // 3. 标题高度相关
    if (questionSimple && (titleSimple.includes(questionSimple) || questionSimple.includes(titleSimple))) {
      score += 30;
    }

    // 4. 分词相关（辅助，权重较低）
    tokens(question).forEach((token) => {
      const compact = simplify(token);
      if (!compact) return;
      if (titleSimple.includes(compact)) score += 6;
      if (keywordSimple.includes(compact)) score += 5;
      if (summarySimple.includes(compact)) score += 2;
    });

    // 5. 模块分类辅助
    const moduleHints = {
      work: ['办公', '文档', '表格', '邮件', '会议', '总结', 'work', 'office'],
      creation: ['图片', '视频', '文案', '创作', '脚本', 'image', 'video', 'content'],
      business: ['网站', '营销', '客户', '销售', '品牌', '获客', 'web', 'marketing', 'sales'],
      automation: ['自动', '机器人', '通知', '工作流', '同步', 'bot', 'automation', 'workflow']
    };
    (moduleHints[answer.module_code] || []).forEach((hint) => {
      if (String(question).toLowerCase().includes(hint)) score += 4;
    });

    return score;
  }

  function rankAnswers(question) {
    return answers
      .map((answer) => Object.assign({}, answer, { _score: scoreAnswer(answer, question) }))
      .sort((a, b) => b._score - a._score || Number(b.priority || 0) - Number(a.priority || 0) || Number(a.id) - Number(b.id));
  }

  function compactPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value || '0');
    return number.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  function fixedModuleProducts(moduleCode) {
    const module = FIXED_MODULES[moduleCode];
    if (!module) return [];
    return module.ids
      .map((id) => fixedProducts.find((product) => product.id === id))
      .filter(Boolean);
  }

  function renderFixedModules() {
    if (activeFixedModule) renderFixedPlans(activeFixedModule, false, true);
  }

  function closeFixedPlans() {
    activeFixedModule = '';
    const panel = $('fixedPlansPanel');
    if (panel) {
      panel.classList.remove('is-open');
      panel.classList.add('hidden');
    }
    document.querySelectorAll('[data-fixed-module]').forEach((button) => {
      button.classList.remove('active');
      button.setAttribute('aria-expanded', 'false');
    });
  }

  function renderFixedPlans(moduleCode, shouldScroll = true, force = false) {
    const module = FIXED_MODULES[moduleCode];
    if (!module) return;
    if (!force && activeFixedModule === moduleCode && !$('fixedPlansPanel').classList.contains('hidden')) {
      closeFixedPlans();
      return;
    }
    activeFixedModule = moduleCode;
    document.querySelectorAll('[data-fixed-module]').forEach((button) => {
      const active = button.dataset.fixedModule === moduleCode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-expanded', String(active));
    });
    $('fixedPlansTitle').textContent = t(module.titleKey);
    const list = $('fixedPlanList');
    list.replaceChildren();
    fixedModuleProducts(moduleCode).forEach((product) => {
      const article = document.createElement('article');
      article.className = 'fixed-plan';
      const heading = document.createElement('h3');
      heading.textContent = localizedFixedProductName(product);
      const price = document.createElement('div');
      price.className = 'fixed-plan-price';
      price.append(document.createTextNode(compactPrice(product.product_price)));
      const unit = document.createElement('small');
      unit.textContent = product.currency || 'USDT';
      price.appendChild(unit);
      const button = document.createElement('button');
      button.className = 'btn';
      button.type = 'button';
      button.textContent = t('choosePlan');
      button.addEventListener('click', () => openFixedOrder(product.id));
      article.append(heading, price, button);
      list.appendChild(article);
    });
    const panel = $('fixedPlansPanel');
    panel.classList.remove('hidden');
    panel.classList.remove('is-open');
    // 强制重绘后再加 is-open，触发展开动画
    requestAnimationFrame(() => panel.classList.add('is-open'));
    if (shouldScroll) {
      const activeBtn = document.querySelector('[data-fixed-module].active');
      const section = document.querySelector('.fixed-module-section');
      // 先把当前卡片滚到可视区中上部，面板就在卡片下方原地展开
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      setTimeout(() => {
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 180);
    }
  }

  let matchRunId = 0;

  function startMatching(event) {
    if (event) event.preventDefault();
    const question = $('problemInput').value.trim();
    if (question.length < 2) {
      showMessage('problemMessage', c().needQuestion);
      return;
    }
    if (!answers.length || tierProducts.length !== 5) {
      showMessage('problemMessage', c().answersUnavailable);
      return;
    }

    originalQuestion = question;
    const runId = ++matchRunId;

    // 分步反馈：每步约 0.5 秒
    showMessage('problemMessage', '🔍 正在理解你的问题…', 'success');
    $('resultPanel').classList.add('hidden');
    $('quizPanel').classList.add('hidden');

    // 提前计算匹配，动画结束后再展示
    const MIN_RELEVANT_SCORE = 4;
    let ranked = rankAnswers(question).filter((a) => Number(a._score) >= MIN_RELEVANT_SCORE);
    if (ranked.length < 5 && ranked.length > 0) {
      const topModule = ranked[0].module_code;
      const sameModule = rankAnswers(question)
        .filter((a) => a.module_code === topModule && !ranked.some((r) => r.id === a.id))
        .slice(0, 5 - ranked.length);
      ranked = ranked.concat(sameModule);
    }

    setTimeout(() => {
      if (runId !== matchRunId) return;
      showMessage('problemMessage', '🧠 正在分析你的目标…', 'success');
    }, 500);

    setTimeout(() => {
      if (runId !== matchRunId) return;
      showMessage('problemMessage', '📚 正在匹配解决方案…', 'success');
    }, 1000);

    setTimeout(() => {
      if (runId !== matchRunId) return;
      if (ranked.length === 0) {
        try {
          const unmatched = JSON.parse(localStorage.getItem('gyx_unmatched_questions') || '[]');
          unmatched.unshift({
            question: originalQuestion,
            goals: extractGoals(originalQuestion),
            time: new Date().toISOString()
          });
          localStorage.setItem('gyx_unmatched_questions', JSON.stringify(unmatched.slice(0, 50)));
        } catch (e) {}
        showMessage('problemMessage', '暂时没有完全匹配的答案，已记录你的问题，我们会尽快补充。你可以换个说法再试，或直接联系客服。', 'error');
        return;
      }
      rankedCandidates = ranked.slice(0, 5);
      showMessage('problemMessage', '✅ 已找到最相关的' + rankedCandidates.length + '个方向', 'success');
    }, 1500);

    setTimeout(() => {
      if (runId !== matchRunId) return;
      if (!rankedCandidates || !rankedCandidates.length) return;
      initialStrongMatch = Number(rankedCandidates[0] && rankedCandidates[0]._score || 0) >= MIN_STRONG_SCORE;
      quizIndex = 0;
      selections = [];
      currentMatch = null;
      $('resultPanel').classList.add('hidden');
      $('quizPanel').classList.remove('hidden');
      $('originalQuestion').textContent = '“' + originalQuestion + '”';
      clearMessage('problemMessage');
      renderQuiz();
      // 收起手机键盘，避免挡住结果
      try { $('problemInput')?.blur(); } catch (e) {}
      try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (e) {}
      setTimeout(() => {
        $('quizPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }, 2000);
  }

  function renderQuiz() {
    const localeCopy = c();
    $('quizStepLabel').textContent = localeCopy.step.replace('{n}', String(quizIndex + 1));
    $('quizProgressBar').style.width = String((quizIndex + 1) * 20) + '%';
    const optionGrid = $('quizOptions');
    optionGrid.replaceChildren();

    if (quizIndex === 0) {
      $('quizQuestion').textContent = localeCopy.candidateQuestion;
      $('quizHelp').textContent = localeCopy.candidateHelp;
      rankedCandidates.forEach((answer, index) => {
        const button = document.createElement('button');
        button.className = 'quiz-option quiz-option-enter';
        button.style.animationDelay = (index * 0.15) + 's';
        button.type = 'button';
        const number = document.createElement('span');
        number.className = 'option-number';
        number.textContent = String(index + 1);
        const body = document.createElement('span');
        const heading = document.createElement('strong');
        heading.textContent = localizedTitle(answer);
        const summary = document.createElement('small');
        summary.textContent = localizedSummary(answer);
        body.append(heading, summary);
        button.append(number, body);
        button.addEventListener('click', () => chooseOption(answer.id, localizedTitle(answer)));
        optionGrid.appendChild(button);
      });
    } else {
      const round = localeCopy.rounds[quizIndex];
      $('quizQuestion').textContent = round.question;
      $('quizHelp').textContent = round.help;
      round.options.forEach((label, index) => {
        const button = document.createElement('button');
        button.className = 'quiz-option compact';
        button.type = 'button';
        const number = document.createElement('span');
        number.className = 'option-number';
        number.textContent = String(index + 1);
        const heading = document.createElement('strong');
        heading.textContent = label;
        button.append(number, heading);
        button.addEventListener('click', () => chooseOption(index, label));
        optionGrid.appendChild(button);
      });
    }
    $('quizBackButton').classList.toggle('hidden', quizIndex === 0);
  }

  function chooseOption(value, label) {
    selections = selections.slice(0, quizIndex);
    selections[quizIndex] = { value: value, label: label };
    if (quizIndex < 4) {
      quizIndex += 1;
      renderQuiz();
      return;
    }
    finishMatching();
  }

  function finishMatching() {
    const selectedAnswerId = Number(selections[0].value);
    const answer = rankedCandidates.find((item) => Number(item.id) === selectedAnswerId) || rankedCandidates[0];
    const selectedScore = Number(answer && answer._score || 0);
    const fallback = !initialStrongMatch || selectedScore < MIN_STRONG_SCORE;
    const depthIndex = Math.max(0, Math.min(4, Number(selections[3].value) || 0));
    const tier = fallback ? 'custom' : TIER_ORDER[depthIndex];
    const productId = TIER_PRODUCTS[tier];
    const product = tierProducts.find((item) => item.id === productId);
    if (!answer || !product) {
      showMessage('problemMessage', c().answersUnavailable);
      resetAssistant();
      return;
    }

    currentMatch = {
      answer_id: Number(answer.id),
      title: answer.title || '',
      title_en: answer.title_en || '',
      title_km: answer.title_km || '',
      answer_summary: answer.answer_summary || '',
      answer_summary_en: answer.answer_summary_en || '',
      answer_summary_km: answer.answer_summary_km || '',
      question: originalQuestion,
      selections: selections.map((item) => item.label),
      tier: tier,
      product_id: productId,
      price: Number(product.product_price),
      fallback: fallback,
      score: selectedScore,
      created_at: Date.now()
    };
    persistMatch();
    $('quizPanel').classList.add('hidden');
    $('resultPanel').classList.remove('hidden');
    renderResult();
    syncFavoriteState();
    $('resultPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function persistMatch() {
    if (!currentMatch) return;
    localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(currentMatch));
  }

  function readStoredMatch() {
    try {
      const value = JSON.parse(localStorage.getItem(MATCH_STORAGE_KEY) || 'null');
      if (!value || !value.answer_id || !value.product_id || !Array.isArray(value.selections) || value.selections.length !== 5) return null;
      if (Date.now() - Number(value.created_at || 0) > 86400000) return null;
      return value;
    } catch {
      return null;
    }
  }

  function renderResult() {
    if (!currentMatch) return;
    const tierCopy = c().tiers[currentMatch.tier] || c().tiers.standard;
    $('resultTitle').textContent = localizedTitle(currentMatch);
    $('resultSummary').textContent = localizedSummary(currentMatch);
    $('resultTier').textContent = tierCopy.name;
    $('resultPrice').textContent = formatPrice(currentMatch.price);
    $('resultConfidence').textContent = currentMatch.fallback
      ? c().confidenceFallback
      : Number(currentMatch.score) >= 14 ? c().confidenceHigh : c().confidenceMatched;
    $('resultQuestion').textContent = currentMatch.question;
    const selectionList = $('resultSelections');
    selectionList.replaceChildren();
    currentMatch.selections.forEach((selection) => {
      const item = document.createElement('li');
      item.textContent = selection;
      selectionList.appendChild(item);
    });
    const deliveryList = $('deliveryList');
    deliveryList.replaceChildren();
    tierCopy.delivery.forEach((delivery) => {
      const item = document.createElement('li');
      item.textContent = delivery;
      deliveryList.appendChild(item);
    });
    clearMessage('resultMessage');
    if (currentMatch.fallback) showMessage('resultMessage', c().fallbackNote, 'success');
    $('favoriteButton').disabled = false;
    $('favoriteButton').textContent = t('favoriteAnswer');
  }

  async function syncFavoriteState() {
    if (!currentMatch || !currentUser) return;
    const result = await db
      .from('answer_favorites')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('answer_id', currentMatch.answer_id)
      .maybeSingle();
    if (result.data) {
      $('favoriteButton').disabled = true;
      $('favoriteButton').textContent = t('favorited');
    }
  }

  function loginForAction(action) {
    persistMatch();
    showMessage('resultMessage', c().loginFirst, 'success');
    const next = 'shop.html?resume=' + encodeURIComponent(action);
    setTimeout(() => {
      location.href = 'login.html?next=' + encodeURIComponent(next);
    }, 350);
  }

  async function saveFavorite(redirectIfNeeded) {
    if (!currentMatch) return;
    currentUser = await window.gyxGetVerifiedUser();
    if (!currentUser) {
      if (redirectIfNeeded !== false) loginForAction('favorite');
      return;
    }
    const button = $('favoriteButton');
    button.disabled = true;
    button.textContent = c().saving;
    const payload = {
      user_id: currentUser.id,
      answer_id: currentMatch.answer_id,
      question: currentMatch.question,
      selections: currentMatch.selections,
      tier: currentMatch.tier,
      product_id: currentMatch.product_id,
      quoted_price: currentMatch.price,
      matched_title: currentMatch.title || localizedTitle(currentMatch),
      matched_summary: currentMatch.answer_summary || localizedSummary(currentMatch),
      updated_at: new Date().toISOString()
    };
    const result = await db
      .from('answer_favorites')
      .upsert(payload, { onConflict: 'user_id,answer_id' })
      .select('id')
      .single();
    if (result.error) {
      button.disabled = false;
      button.textContent = t('favoriteAnswer');
      showMessage('resultMessage', errorText(result.error));
      return;
    }
    button.textContent = t('favorited');
    showMessage('resultMessage', c().saveSuccess, 'success');
  }

  function resetAssistant() {
    originalQuestion = '';
    quizIndex = 0;
    selections = [];
    rankedCandidates = [];
    currentMatch = null;
    $('quizPanel').classList.add('hidden');
    $('resultPanel').classList.add('hidden');
    $('problemInput').value = '';
    clearMessage('problemMessage');
    clearMessage('resultMessage');
    $('problemInput').focus();
  }

  function goBackQuiz() {
    if (quizIndex <= 0) {
      resetAssistant();
      return;
    }
    quizIndex -= 1;
    selections = selections.slice(0, quizIndex);
    renderQuiz();
  }

  async function loadFavoriteFromUrl(favoriteId) {
    currentUser = await window.gyxGetVerifiedUser();
    if (!currentUser) return false;
    const favoriteResult = await db
      .from('answer_favorites')
      .select('id,answer_id,question,selections,tier,product_id,quoted_price,matched_title,matched_summary,created_at')
      .eq('id', favoriteId)
      .eq('user_id', currentUser.id)
      .maybeSingle();
    if (favoriteResult.error || !favoriteResult.data) return false;
    const favorite = favoriteResult.data;
    const answerResult = await db
      .from('product_answer_options')
      .select('id,title,title_en,title_km,answer_summary,answer_summary_en,answer_summary_km')
      .eq('id', favorite.answer_id)
      .maybeSingle();
    const answer = answerResult.data || {};
    currentMatch = {
      answer_id: Number(favorite.answer_id),
      title: answer.title || favorite.matched_title,
      title_en: answer.title_en || '',
      title_km: answer.title_km || '',
      answer_summary: answer.answer_summary || favorite.matched_summary,
      answer_summary_en: answer.answer_summary_en || '',
      answer_summary_km: answer.answer_summary_km || '',
      question: favorite.question,
      selections: Array.isArray(favorite.selections) ? favorite.selections : [],
      tier: favorite.tier,
      product_id: favorite.product_id,
      price: Number(favorite.quoted_price),
      fallback: favorite.tier === 'custom',
      score: 0,
      created_at: Date.now()
    };
    persistMatch();
    $('quizPanel').classList.add('hidden');
    $('resultPanel').classList.remove('hidden');
    renderResult();
    return true;
  }

  async function showOrderModal(product, title, description) {
    currentProduct = product;
    currentOrder = null;
    clearInterval(paymentPoll);
    clearMessage('orderFormMessage');
    clearMessage('paymentMessage');
    $('paymentTxid').value = '';
    $('orderProductName').textContent = title;
    $('orderProductDescription').textContent = description || '';
    $('orderProductPrice').textContent = formatPrice(currentProduct.product_price);

    const profileResult = await db
      .from('profiles')
      .select('display_name,phone')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    const profile = profileResult.data;
    $('orderName').value = profile && profile.display_name || currentUser.user_metadata && currentUser.user_metadata.display_name || '';
    $('orderPhone').value = profile && profile.phone || '';
    $('orderEmail').value = currentUser.email || '';
    switchModalStep('details');
    $('orderModal').classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  async function openOrderFromMatch() {
    if (!currentMatch) return;
    currentUser = await window.gyxGetVerifiedUser();
    if (!currentUser) {
      loginForAction('order');
      return;
    }
    const product = tierProducts.find((item) => item.id === currentMatch.product_id);
    if (!product) {
      showMessage('resultMessage', c().orderUnavailable);
      return;
    }
    await showOrderModal(product, localizedTitle(currentMatch), c().tiers[currentMatch.tier].name);
  }

  async function openFixedOrder(productId) {
    const product = fixedProducts.find((item) => item.id === productId);
    if (!product) {
      showToast(c().orderUnavailable, true);
      return;
    }
    currentUser = await window.gyxGetVerifiedUser();
    if (!currentUser) {
      const next = `shop.html?fixed=${encodeURIComponent(productId)}&resume=fixed-order`;
      location.href = 'login.html?next=' + encodeURIComponent(next);
      return;
    }
    currentMatch = null;
    await showOrderModal(product, localizedFixedProductName(product), product.description || '');
  }

  function closeOrder() {
    $('orderModal').classList.remove('show');
    document.body.style.overflow = '';
    clearInterval(paymentPoll);
    paymentPoll = null;
  }

  function switchModalStep(step) {
    const map = { details: 'orderStepDetails', payment: 'orderStepPayment', success: 'orderStepSuccess' };
    Object.values(map).forEach((id) => {
      const element = $(id);
      if (element) element.classList.remove('active');
    });
    const active = $(map[step]);
    if (active) active.classList.add('active');
  }

  function validateOrderForm() {
    const name = $('orderName').value.trim();
    const email = $('orderEmail').value.trim().toLowerCase();
    const phone = $('orderPhone').value.trim();
    if (!name) throw new Error('FORM_NAME');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('FORM_EMAIL');
    if (phone.length < 6) throw new Error('FORM_PHONE');
    return { name: name, email: email, phone: phone };
  }

  function formErrorText(error) {
    if (error.message === 'FORM_NAME') return t('errorName');
    if (error.message === 'FORM_EMAIL') return t('errorEmail');
    if (error.message === 'FORM_PHONE') return t('errorPhone');
    return errorText(error);
  }

  async function createOrder(event) {
    event.preventDefault();
    clearMessage('orderFormMessage');
    let form;
    try {
      form = validateOrderForm();
    } catch (error) {
      showMessage('orderFormMessage', formErrorText(error));
      return;
    }
    const button = $('createOrderButton');
    button.disabled = true;
    button.textContent = t('creatingOrder');
    try {
      const orderInput = {
        product_id: currentProduct.id,
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone
      };
      if (currentProduct.id.startsWith('answer-') && currentMatch) {
        Object.assign(orderInput, {
          answer_id: currentMatch.answer_id,
          customer_question: currentMatch.question,
          selection_path: currentMatch.selections,
          answer_tier: currentMatch.tier
        });
      }
      const payload = await window.gyxInvokeFunction('create-order', orderInput);
      currentOrder = payload && payload.order;
      if (!currentOrder) throw new Error('ORDER_CREATE_FAILED');
      await db.from('profiles').update({
        display_name: form.name,
        phone: form.phone,
        locale: i18n.locale
      }).eq('user_id', currentUser.id);
      showPaymentStep();
    } catch (error) {
      const code = String(error.code || error.message || '');
      if (code.includes('OPEN_ORDER_ALREADY_EXISTS')) {
        const existing = await loadOpenOrder(currentProduct.id);
        if (existing) {
          currentOrder = existing;
          showPaymentStep();
          showMessage('paymentMessage', t('errorOpenOrder'), 'success');
          return;
        }
      }
      showMessage('orderFormMessage', errorText(error));
    } finally {
      button.disabled = false;
      button.textContent = t('createOrder');
    }
  }

  async function loadOpenOrder(productId) {
    const result = await db
      .from('orders')
      .select('id,order_no,product_id,product_name,product_price,payable_amount,currency,network,wallet_address,status,txid,answer_id,customer_question,answer_tier,matched_answer_title,created_at')
      .eq('product_id', productId)
      .in('status', ['pending', 'checking'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return result.data || null;
  }

  function showPaymentStep() {
    $('paymentOrderNo').textContent = currentOrder.order_no;
    $('paymentAmount').textContent = formatPrice(currentOrder.payable_amount);
    $('paymentNetwork').textContent = currentOrder.network || config.network;
    $('paymentWallet').textContent = currentOrder.wallet_address || config.wallet;
    $('paymentTxid').value = currentOrder.txid || '';
    switchModalStep('payment');
  }

  async function copyWallet() {
    const value = $('paymentWallet').textContent.trim();
    try {
      await navigator.clipboard.writeText(value);
      $('copyWalletButton').textContent = t('copied');
      setTimeout(() => { $('copyWalletButton').textContent = t('copy'); }, 1700);
    } catch {
      showToast(value);
    }
  }

  async function submitPayment(event) {
    event.preventDefault();
    clearMessage('paymentMessage');
    const txid = $('paymentTxid').value.trim().toUpperCase();
    if (!/^[0-9A-F]{64}$/.test(txid)) {
      showMessage('paymentMessage', t('errorTxid'));
      return;
    }
    const button = $('submitPaymentButton');
    button.disabled = true;
    button.textContent = t('checkingPayment');
    try {
      const result = await window.gyxInvokeFunction('submit-payment', {
        order_id: currentOrder.id,
        order_no: currentOrder.order_no,
        txid: txid
      });
      currentOrder.txid = txid;
      currentOrder.status = result && result.status || 'checking';
      if (['paid', 'delivered'].includes(currentOrder.status)) {
        showSuccess();
      } else {
        showMessage('paymentMessage', t('paymentPending'), 'success');
        startPaymentPolling();
      }
    } catch (error) {
      showMessage('paymentMessage', errorText(error));
    } finally {
      button.disabled = false;
      button.textContent = t('submitPayment');
    }
  }

  function startPaymentPolling() {
    clearInterval(paymentPoll);
    let attempts = 0;
    const check = async () => {
      attempts += 1;
      const result = await db.from('orders').select('status,updated_at').eq('id', currentOrder.id).maybeSingle();
      if (result.data && result.data.status) currentOrder.status = result.data.status;
      if (['paid', 'delivered'].includes(currentOrder.status)) {
        clearInterval(paymentPoll);
        showSuccess();
      } else if (['failed', 'expired', 'cancelled'].includes(currentOrder.status) || attempts >= 24) {
        clearInterval(paymentPoll);
      }
    };
    paymentPoll = setInterval(check, 5000);
  }

  function showSuccess() {
    clearInterval(paymentPoll);
    $('successCopy').textContent = t('orderNo') + ': ' + currentOrder.order_no;
    switchModalStep('success');
  }

  function setupMusic() {
    const button = $('musicToggle');
    const audio = $('backgroundMusic');
    if (!button || !audio) return;
    let playing = false;
    const update = () => {
      button.classList.toggle('playing', playing);
      button.setAttribute('aria-pressed', String(playing));
      button.textContent = t(playing ? 'musicOn' : 'musicOff');
    };
    const start = async () => {
      audio.muted = false;
      audio.volume = .78;
      await audio.play();
      playing = true;
      localStorage.setItem('gyx_music_enabled', 'on');
      update();
    };
    const stop = () => {
      audio.pause();
      playing = false;
      localStorage.setItem('gyx_music_enabled', 'off');
      update();
    };
    audio.addEventListener('playing', () => { playing = true; update(); });
    audio.addEventListener('pause', () => { playing = false; update(); });
    audio.addEventListener('error', () => {
      playing = false;
      update();
      showToast(t('musicError'), true);
    });
    button.addEventListener('click', async () => {
      button.disabled = true;
      try { playing ? stop() : await start(); }
      catch { playing = false; update(); showToast(t('musicError'), true); }
      finally { button.disabled = false; }
    });
    window.addEventListener('gyx:languagechange', update);
    update();
  }

  async function restoreStateFromUrl() {
    const params = new URLSearchParams(location.search);
    const favoriteId = Number(params.get('favorite'));
    const fixedProductId = params.get('fixed');
    const action = params.get('resume');
    let restored = false;
    if (action === 'fixed-order' && fixedProductId) {
      await openFixedOrder(fixedProductId);
      return;
    }
    if (Number.isSafeInteger(favoriteId) && favoriteId > 0) {
      restored = await loadFavoriteFromUrl(favoriteId);
    }
    if (!restored && action) {
      const stored = readStoredMatch();
      if (stored) {
        currentMatch = stored;
        $('quizPanel').classList.add('hidden');
        $('resultPanel').classList.remove('hidden');
        renderResult();
        restored = true;
      }
    }
    if (!restored) return;
    await syncFavoriteState();
    if (action === 'favorite') await saveFavorite(false);
    if (action === 'order') await openOrderFromMatch();
  }

  function bindEvents() {
    $('problemForm').addEventListener('submit', startMatching);

    // 停止输入约1秒后自动触发匹配（BUG-002）
    let autoMatchTimer = null;
    const inputEl = $('problemInput');
    if (inputEl) {
      inputEl.addEventListener('input', () => {
        clearTimeout(autoMatchTimer);
        matchRunId += 1; // 继续输入时取消上一次匹配流程
        autoMatchTimer = setTimeout(() => {
          const q = inputEl.value.trim();
          if (q.length >= 2) {
            startMatching();
          }
        }, 1000);
      });
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          clearTimeout(autoMatchTimer);
          startMatching();
        }
      });
    }

    // 离开页面或返回首页时清空搜索框（BUG-005）
    const clearSearchBox = () => {
      if (inputEl) inputEl.value = '';
      clearMessage('problemMessage');
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // 仅记录，真正清空在 pageshow/返回时
      }
    });
    window.addEventListener('pagehide', () => {
      try { sessionStorage.setItem('gyx_clear_search_on_leave', '1'); } catch (e) {}
    });
    window.addEventListener('pageshow', () => {
      try {
        if (sessionStorage.getItem('gyx_clear_search_on_leave') === '1') {
          sessionStorage.removeItem('gyx_clear_search_on_leave');
          clearSearchBox();
        }
      } catch (e) {}
    });
    // 首页导航点击时清空
    document.querySelectorAll('a.nav-home, .mobile-bottom-nav a[href="shop.html"]').forEach((a) => {
      a.addEventListener('click', () => {
        try { sessionStorage.setItem('gyx_clear_search_on_leave', '1'); } catch (e) {}
      });
    });

    document.querySelectorAll('[data-fixed-module]').forEach((button) => {
      button.addEventListener('click', () => renderFixedPlans(button.dataset.fixedModule));
    });
    $('closeFixedPlans').addEventListener('click', closeFixedPlans);
    document.querySelectorAll('[data-example]').forEach((button) => {
      button.addEventListener('click', () => {
        $('problemInput').value = button.dataset.example || '';
        $('problemInput').focus();
      });
    });
    $('quizBackButton').addEventListener('click', goBackQuiz);
    $('restartMatchButton').addEventListener('click', resetAssistant);
    $('newQuestionButton').addEventListener('click', resetAssistant);
    $('favoriteButton').addEventListener('click', () => saveFavorite(true));
    $('orderAnswerButton').addEventListener('click', openOrderFromMatch);
    $('closeOrderButton').addEventListener('click', closeOrder);
    $('cancelOrderButton').addEventListener('click', closeOrder);
    $('successCloseButton').addEventListener('click', closeOrder);
    $('orderDetailsForm').addEventListener('submit', createOrder);
    $('paymentForm').addEventListener('submit', submitPayment);
    $('copyWalletButton').addEventListener('click', copyWallet);
    $('paymentBackButton').addEventListener('click', () => switchModalStep('details'));
    $('orderModal').addEventListener('click', (event) => {
      if (event.target === $('orderModal')) closeOrder();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeOrder();
    });
    setupMusic();
  }

  window.addEventListener('gyx:languagechange', async (event) => {
    if (!$('quizPanel').classList.contains('hidden')) renderQuiz();
    if (currentMatch && !$('resultPanel').classList.contains('hidden')) renderResult();
    renderFixedModules();
    await syncAccount();
    await syncFavoriteState();
    if (currentUser) {
      db.from('profiles').update({ locale: event.detail.locale }).eq('user_id', currentUser.id).then(() => {});
    }
  });

  document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    const loaded = await loadMatchingData();
    await syncAccount();
    if (!loaded) showMessage('problemMessage', c().answersUnavailable);
    await restoreStateFromUrl();
  });
})();

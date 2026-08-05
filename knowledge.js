(() => {
  'use strict';

  const db = window.gyxSupabase;
  const i18n = window.GYXI18N;
  if (!db || !i18n) return;

  const $ = (id) => document.getElementById(id);
  const t = (key, vars) => i18n.t(key, vars);
  let user = null;
  let publicAnswers = [];
  let privateMaterials = [];
  let activeFilter = new URLSearchParams(location.search).get('filter') || 'all';
  let query = new URLSearchParams(location.search).get('q') || '';
  let visibleCount = 12;
  let currentResults = [];

  function normalize(value) {
    return String(value || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[，。！？、,.!?;；:：()（）【】\[\]"'“”‘’]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function categoryLabel(category) {
    return t({ work: 'catWork', creation: 'catCreation', business: 'catBusiness', automation: 'catAutomation', other: 'all' }[category] || 'all');
  }

  function localizedAnswer(item, field) {
    if (item.kind === 'private') {
      if (field === 'title') return item.title;
      if (field === 'summary') return item.content.slice(0, 220);
      if (field === 'detail') return item.content;
      return '';
    }
    const locale = i18n.locale;
    if (field === 'title') return locale === 'en' ? (item.title_en || item.title) : locale === 'km' ? (item.title_km || item.title) : item.title;
    if (field === 'summary') return locale === 'en' ? (item.answer_summary_en || item.answer_summary) : locale === 'km' ? (item.answer_summary_km || item.answer_summary) : item.answer_summary;
    if (field === 'detail') return locale === 'en' ? (item.answer_detail_en || item.answer_detail_zh || item.answer_summary) : locale === 'km' ? (item.answer_detail_km || item.answer_detail_zh || item.answer_summary) : (item.answer_detail_zh || item.answer_summary);
    return '';
  }

  function searchableText(item) {
    if (item.kind === 'private') return normalize(`${item.title} ${item.content} ${item.source_name || ''} ${item.category}`);
    return normalize([
      item.title, item.title_en, item.title_km, item.answer_summary, item.answer_summary_en, item.answer_summary_km,
      item.answer_detail_zh, item.answer_detail_en, item.answer_detail_km, ...(item.keywords || []), item.module_code
    ].join(' '));
  }

  function scoreItem(item, rawQuery) {
    const needle = normalize(rawQuery);
    if (!needle) {
      if (item.kind === 'private') return 30 + (Date.parse(item.updated_at) / 1e13);
      return 20 - (Number(item.priority) || 0) / 100;
    }
    const title = normalize(localizedAnswer(item, 'title'));
    const haystack = searchableText(item);
    let score = 0;
    if (title === needle) score += 180;
    if (title.includes(needle)) score += 90;
    if (haystack.includes(needle)) score += 55;
    const tokens = needle.split(' ').filter(Boolean);
    tokens.forEach((token) => {
      if (title.includes(token)) score += 28;
      else if (haystack.includes(token)) score += 10;
    });
    const compact = needle.replace(/\s/g, '');
    const compactHaystack = haystack.replace(/\s/g, '');
    const pairs = new Set();
    for (let index = 0; index < compact.length - 1; index += 1) {
      const pair = compact.slice(index, index + 2);
      if (!pairs.has(pair) && compactHaystack.includes(pair)) {
        pairs.add(pair);
        score += 2;
      }
    }
    return score;
  }

  async function loadAll() {
    user = await window.gyxGetVerifiedUser();
    const account = $('accountLink');
    if (user) {
      account.href = 'member.html';
      account.textContent = t('navMember');
    }

    const answerPromise = db
      .from('product_answer_options')
      .select('id,answer_code,module_code,title,title_en,title_km,answer_summary,answer_summary_en,answer_summary_km,answer_detail_zh,answer_detail_en,answer_detail_km,keywords,product_id,priority,source_name,updated_at')
      .eq('is_active', true)
      .order('module_code', { ascending: true })
      .order('priority', { ascending: true });
    const materialPromise = user
      ? db.from('member_materials').select('id,title,category,language,content,source_name,created_at,updated_at').order('updated_at', { ascending: false })
      : Promise.resolve({ data: [], error: null });
    const [answerResult, materialResult] = await Promise.all([answerPromise, materialPromise]);

    if (answerResult.error) {
      showLoadError();
      return;
    }
    publicAnswers = (answerResult.data || []).map((item) => ({ ...item, kind: 'answer', category: item.module_code }));
    privateMaterials = materialResult.error ? [] : (materialResult.data || []).map((item) => ({ ...item, kind: 'private' }));
    $('answerTotal').textContent = String(publicAnswers.length);
    applyFilter();
  }

  function showLoadError() {
    $('knowledgeList').replaceChildren();
    $('resultCount').textContent = t('errorNetwork');
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = t('errorNetwork');
    $('knowledgeList').appendChild(empty);
  }

  function applyFilter() {
    const allItems = [...privateMaterials, ...publicAnswers];
    currentResults = allItems
      .filter((item) => {
        if (activeFilter === 'mine') return item.kind === 'private';
        if (activeFilter === 'all') return true;
        return item.category === activeFilter;
      })
      .map((item) => ({ item, score: scoreItem(item, query) }))
      .filter((entry) => !query || entry.score > 0)
      .sort((a, b) => b.score - a.score || String(a.item.title).localeCompare(String(b.item.title)))
      .map((entry) => entry.item);
    visibleCount = 12;
    render();
  }

  function render() {
    const list = $('knowledgeList');
    list.replaceChildren();
    $('resultCount').textContent = t('answerCount', { count: currentResults.length });
    document.querySelectorAll('[data-filter]').forEach((button) => {
      button.classList.toggle('active', button.dataset.filter === activeFilter);
    });

    if (!currentResults.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = t('noResults');
      list.appendChild(empty);
      $('loadMoreWrap').classList.add('hidden');
      return;
    }

    currentResults.slice(0, visibleCount).forEach((item, index) => list.appendChild(createKnowledgeItem(item, index)));
    $('loadMoreWrap').classList.toggle('hidden', visibleCount >= currentResults.length);
  }

  function createKnowledgeItem(item, index) {
    const details = document.createElement('details');
    details.className = 'knowledge-item';
    const summary = document.createElement('summary');
    summary.className = 'knowledge-summary';
    const number = document.createElement('span');
    number.className = 'knowledge-index';
    number.textContent = String(index + 1).padStart(2, '0');
    const copy = document.createElement('div');
    const heading = document.createElement('h2');
    heading.className = 'knowledge-title';
    heading.textContent = localizedAnswer(item, 'title');
    const excerpt = document.createElement('p');
    excerpt.className = 'knowledge-excerpt';
    excerpt.textContent = localizedAnswer(item, 'summary');
    copy.append(heading, excerpt);
    const arrow = document.createElement('span');
    arrow.className = 'knowledge-arrow';
    arrow.textContent = '+';
    summary.append(number, copy, arrow);

    const body = document.createElement('div');
    body.className = 'knowledge-body';
    const detail = document.createElement('div');
    detail.className = 'knowledge-detail';
    detail.textContent = localizedAnswer(item, 'detail');
    body.appendChild(detail);

    const tags = document.createElement('div');
    tags.className = 'tag-row';
    const category = document.createElement('span');
    category.className = 'tag';
    category.textContent = categoryLabel(item.category);
    tags.appendChild(category);
    if (item.kind === 'private') {
      const privateTag = document.createElement('span');
      privateTag.className = 'tag';
      privateTag.textContent = `🔒 ${t('privateMaterial')}`;
      tags.appendChild(privateTag);
    } else {
      (item.keywords || []).slice(0, 6).forEach((keyword) => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = keyword;
        tags.appendChild(tag);
      });
    }
    body.appendChild(tags);

    const actions = document.createElement('div');
    actions.className = 'knowledge-actions';
    const primary = document.createElement('a');
    primary.className = 'btn btn-small';
    if (item.kind === 'private') {
      primary.href = 'member.html#materials';
      primary.textContent = t('edit');
    } else {
      primary.href = `shop.html?product=${encodeURIComponent(item.product_id)}`;
      primary.textContent = t('recommendedPlan');
    }
    actions.appendChild(primary);
    const source = document.createElement('span');
    source.className = 'source-note';
    source.textContent = `${t('source')}: ${item.source_name || t(item.kind === 'private' ? 'privateMaterial' : 'brand')}`;
    actions.appendChild(source);
    body.appendChild(actions);

    details.append(summary, body);
    return details;
  }

  function updateUrl() {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (activeFilter !== 'all') params.set('filter', activeFilter);
    const next = `${location.pathname}${params.toString() ? `?${params}` : ''}`;
    history.replaceState(null, '', next);
  }

  function bindEvents() {
    $('knowledgeSearchInput').value = query;
    $('knowledgeSearchForm').addEventListener('submit', (event) => {
      event.preventDefault();
      query = $('knowledgeSearchInput').value.trim();
      updateUrl();
      applyFilter();
    });
    $('clearSearchButton').addEventListener('click', () => {
      query = '';
      $('knowledgeSearchInput').value = '';
      updateUrl();
      applyFilter();
    });
    document.querySelectorAll('[data-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.filter;
        updateUrl();
        applyFilter();
      });
    });
    $('loadMoreButton').addEventListener('click', () => {
      visibleCount += 12;
      render();
    });
  }

  window.addEventListener('gyx:languagechange', () => {
    const account = $('accountLink');
    account.textContent = t(user ? 'navMember' : 'login');
    applyFilter();
  });

  document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    await loadAll();
  });
})();

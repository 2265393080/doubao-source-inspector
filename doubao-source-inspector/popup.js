'use strict';

const state = {
  tab: 'sources',
  filter: '',
  selectedDomain: '',
  data: null,
  currentTabId: null,
};

const el = {};

window.addEventListener('DOMContentLoaded', () => {
  Object.assign(el, {
    pageStatus: document.querySelector('#pageStatus'),
    notice: document.querySelector('#notice'),
    refreshBtn: document.querySelector('#refreshBtn'),
    sourceCount: document.querySelector('#sourceCount'),
    siteCount: document.querySelector('#siteCount'),
    batchCount: document.querySelector('#batchCount'),
    filterInput: document.querySelector('#filterInput'),
    copyBtn: document.querySelector('#copyBtn'),
    csvBtn: document.querySelector('#csvBtn'),
    jsonBtn: document.querySelector('#jsonBtn'),
    sourcesPanel: document.querySelector('#sourcesPanel'),
    networkPanel: document.querySelector('#networkPanel'),
    domainSummary: document.querySelector('#domainSummary'),
    sourceList: document.querySelector('#sourceList'),
    networkList: document.querySelector('#networkList'),
    emptySources: document.querySelector('#emptySources'),
    emptyNetwork: document.querySelector('#emptyNetwork'),
    scanTime: document.querySelector('#scanTime'),
  });

  bindEvents();
  analyzePage();
});

function bindEvents() {
  el.refreshBtn.addEventListener('click', analyzePage);
  el.filterInput.addEventListener('input', (event) => {
    state.filter = event.target.value.trim().toLowerCase();
    render();
  });

  document.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', () => {
      state.tab = button.dataset.tab;
      state.selectedDomain = '';
      document.querySelectorAll('.tab').forEach((node) => node.classList.toggle('active', node === button));
      el.sourcesPanel.classList.toggle('active', state.tab === 'sources');
      el.networkPanel.classList.toggle('active', state.tab === 'network');
      el.filterInput.placeholder = state.tab === 'sources'
        ? '筛选网站、标题或域名'
        : '筛选请求域名或资源类型';
      render();
    });
  });

  el.copyBtn.addEventListener('click', copyCurrentView);
  el.csvBtn.addEventListener('click', () => exportCurrentView('csv'));
  el.jsonBtn.addEventListener('click', () => exportCurrentView('json'));
}

async function analyzePage() {
  setLoading(true);
  hideNotice();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('无法读取当前标签页。');

    state.currentTabId = tab.id;
    el.pageStatus.textContent = tab.title || tab.url || '当前页面';

    if (!isSupportedPage(tab.url || '')) {
      throw new Error('请先打开豆包网页对话（doubao.com），然后再使用此插件。');
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: collectPageData,
    });

    state.data = normalizeResult(result);
    state.selectedDomain = '';
    el.scanTime.textContent = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    if (state.data.meta.fallbackUsed) {
      showNotice('未能直接读取 window._ROUTER_DATA，已改用页面脚本解析。结果仍可使用，但建议在对话完整加载后重新扫描。');
    }

    render();
  } catch (error) {
    state.data = { sources: [], network: [], meta: {} };
    showNotice(error?.message || String(error), true);
    render();
  } finally {
    setLoading(false);
  }
}

function isSupportedPage(url) {
  try {
    const host = new URL(url).hostname;
    return host === 'doubao.com' || host.endsWith('.doubao.com');
  } catch {
    return false;
  }
}

function normalizeResult(raw) {
  const safe = raw && typeof raw === 'object' ? raw : {};
  const sources = Array.isArray(safe.sources) ? safe.sources : [];
  const network = Array.isArray(safe.network) ? safe.network : [];

  return {
    sources: sources
      .map((item) => ({
        title: clean(item.title),
        sitename: clean(item.sitename) || domainOf(item.url),
        url: clean(item.url),
        domain: domainOf(item.url),
        summary: clean(item.summary),
        docId: clean(item.docId),
        searchId: clean(item.searchId),
        index: clean(item.index),
        rank: clean(item.rank),
        publishTime: clean(item.publishTime),
      }))
      .filter((item) => item.url && item.domain),
    network: network
      .map((item) => ({
        domain: clean(item.domain),
        count: Number(item.count) || 0,
        types: Array.isArray(item.types) ? item.types.map(clean).filter(Boolean) : [],
        sample: clean(item.sample),
        firstParty: Boolean(item.firstParty),
      }))
      .filter((item) => item.domain),
    meta: safe.meta || {},
  };
}

function render() {
  const data = state.data || { sources: [], network: [], meta: {} };
  const uniqueSites = new Set(data.sources.map((item) => item.domain));
  const uniqueBatches = new Set(data.sources.map((item) => item.searchId).filter(Boolean));

  el.sourceCount.textContent = String(data.sources.length);
  el.siteCount.textContent = String(uniqueSites.size);
  el.batchCount.textContent = String(uniqueBatches.size);

  renderSources(data.sources);
  renderNetwork(data.network);
}

function renderSources(allSources) {
  const domainStats = aggregateSources(allSources);
  const filtered = allSources.filter((item) => {
    const matchesDomain = !state.selectedDomain || item.domain === state.selectedDomain;
    const haystack = [item.sitename, item.domain, item.title, item.url, item.searchId].join(' ').toLowerCase();
    return matchesDomain && (!state.filter || haystack.includes(state.filter));
  });

  el.domainSummary.replaceChildren();
  if (domainStats.length > 0) {
    const allChip = makeDomainChip('全部', allSources.length, '');
    el.domainSummary.append(allChip);
    domainStats.forEach((item) => el.domainSummary.append(makeDomainChip(item.label, item.count, item.domain)));
  }

  el.sourceList.replaceChildren();
  filtered.forEach((item, idx) => el.sourceList.append(makeSourceCard(item, idx)));
  el.emptySources.classList.toggle('hidden', filtered.length !== 0);
}

function aggregateSources(sources) {
  const map = new Map();
  for (const item of sources) {
    const current = map.get(item.domain) || {
      domain: item.domain,
      label: item.sitename || item.domain,
      count: 0,
    };
    current.count += 1;
    map.set(item.domain, current);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
}

function makeDomainChip(label, count, domain) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'domain-chip';
  button.classList.toggle('active', state.selectedDomain === domain);
  button.append(document.createTextNode(label));
  const number = document.createElement('span');
  number.textContent = String(count);
  button.append(number);
  button.addEventListener('click', () => {
    state.selectedDomain = domain;
    renderSources(state.data?.sources || []);
  });
  return button;
}

function makeSourceCard(item, idx) {
  const card = document.createElement('article');
  card.className = 'result-card';

  const head = document.createElement('div');
  head.className = 'result-head';

  const rank = document.createElement('div');
  rank.className = 'rank';
  rank.textContent = item.index || item.rank || String(idx + 1);

  const main = document.createElement('div');
  main.className = 'result-main';

  const siteLine = document.createElement('div');
  siteLine.className = 'site-line';

  const siteName = document.createElement('span');
  siteName.className = 'site-name';
  siteName.textContent = item.sitename || item.domain;

  const domain = document.createElement('span');
  domain.className = 'domain';
  domain.textContent = item.domain;

  siteLine.append(siteName, domain);

  const title = document.createElement('a');
  title.className = 'result-title';
  title.href = item.url;
  title.target = '_blank';
  title.rel = 'noreferrer';
  title.textContent = item.title || item.url;

  const meta = document.createElement('div');
  meta.className = 'result-meta';
  if (item.searchId) meta.append(makeMetaBadge(`批次 ${shortId(item.searchId)}`));
  if (item.publishTime) meta.append(makeMetaText(formatDate(item.publishTime)));
  if (item.rank) meta.append(makeMetaText(`原始排名 ${item.rank}`));
  if (item.docId) meta.append(makeMetaText(`doc ${shortId(item.docId)}`));

  main.append(siteLine, title, meta);
  head.append(rank, main);
  card.append(head);
  return card;
}

function makeMetaBadge(text) {
  const span = document.createElement('span');
  span.className = 'badge';
  span.textContent = text;
  return span;
}

function makeMetaText(text) {
  const span = document.createElement('span');
  span.textContent = text;
  return span;
}

function renderNetwork(allNetwork) {
  const filtered = allNetwork.filter((item) => {
    const haystack = [item.domain, item.types.join(' '), item.sample].join(' ').toLowerCase();
    return !state.filter || haystack.includes(state.filter);
  });

  el.networkList.replaceChildren();
  filtered.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'network-card';

    const top = document.createElement('div');
    top.className = 'network-top';

    const domain = document.createElement('div');
    domain.className = 'network-domain';
    domain.textContent = item.domain;

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = item.firstParty ? '豆包/同站' : '第三方';

    const count = document.createElement('span');
    count.className = 'request-count';
    count.textContent = `${item.count} 次`;

    top.append(domain, badge, count);

    const types = document.createElement('div');
    types.className = 'type-list';
    types.textContent = `资源类型：${item.types.length ? item.types.join('、') : '未知'}`;

    const sample = document.createElement('div');
    sample.className = 'sample-url';
    sample.title = item.sample;
    sample.textContent = item.sample;

    card.append(top, types, sample);
    el.networkList.append(card);
  });

  el.emptyNetwork.classList.toggle('hidden', filtered.length !== 0);
}

async function copyCurrentView() {
  const rows = getCurrentRows();
  const text = state.tab === 'sources'
    ? rows.map((item, index) => `${index + 1}. ${item.sitename} | ${item.title}\n${item.url}\nsearch_id: ${item.searchId || '-'}`).join('\n\n')
    : rows.map((item) => `${item.domain}\t${item.count}\t${item.types.join(', ')}`).join('\n');

  try {
    await navigator.clipboard.writeText(text || '暂无数据');
    flashButton(el.copyBtn, '已复制');
  } catch {
    showNotice('复制失败，请使用 CSV 或 JSON 导出。', true);
  }
}

function exportCurrentView(format) {
  const rows = getCurrentRows();
  if (!rows.length) {
    showNotice('当前筛选条件下没有可导出的数据。');
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const prefix = state.tab === 'sources' ? 'doubao-search-sources' : 'doubao-page-network';

  if (format === 'json') {
    download(`${prefix}-${stamp}.json`, JSON.stringify(rows, null, 2), 'application/json;charset=utf-8');
    return;
  }

  const fields = state.tab === 'sources'
    ? ['sitename', 'domain', 'title', 'url', 'searchId', 'index', 'rank', 'publishTime', 'docId']
    : ['domain', 'count', 'types', 'sample', 'firstParty'];

  const csv = [
    fields.join(','),
    ...rows.map((row) => fields.map((field) => csvCell(Array.isArray(row[field]) ? row[field].join('|') : row[field])).join(',')),
  ].join('\r\n');

  download(`${prefix}-${stamp}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
}

function getCurrentRows() {
  const data = state.data || { sources: [], network: [] };
  if (state.tab === 'sources') {
    return data.sources.filter((item) => {
      const matchesDomain = !state.selectedDomain || item.domain === state.selectedDomain;
      const haystack = [item.sitename, item.domain, item.title, item.url, item.searchId].join(' ').toLowerCase();
      return matchesDomain && (!state.filter || haystack.includes(state.filter));
    });
  }

  return data.network.filter((item) => {
    const haystack = [item.domain, item.types.join(' '), item.sample].join(' ').toLowerCase();
    return !state.filter || haystack.includes(state.filter);
  });
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function clean(value) {
  return value == null ? '' : String(value).trim();
}

function domainOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, 'www.');
  } catch {
    return '';
  }
}

function shortId(value) {
  const text = String(value || '');
  return text.length > 14 ? `${text.slice(0, 8)}…${text.slice(-4)}` : text;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function setLoading(loading) {
  el.refreshBtn.disabled = loading;
  el.refreshBtn.classList.toggle('loading', loading);
}

function showNotice(message, error = false) {
  el.notice.textContent = message;
  el.notice.classList.remove('hidden');
  el.notice.classList.toggle('error', error);
}

function hideNotice() {
  el.notice.classList.add('hidden');
  el.notice.classList.remove('error');
}

function flashButton(button, text) {
  const original = button.textContent;
  button.textContent = text;
  button.disabled = true;
  setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
  }, 900);
}

/**
 * Runs inside the page's MAIN world.
 * Keep this function self-contained: Chrome serializes it before execution.
 */
function collectPageData() {
  const sources = [];
  const sourceKeys = new Set();
  let fallbackUsed = false;

  const addSource = (candidate) => {
    if (!candidate || typeof candidate !== 'object') return;
    const url = typeof candidate.url === 'string' ? candidate.url : '';
    const title = typeof candidate.title === 'string' ? candidate.title : '';
    const sitename = typeof candidate.sitename === 'string' ? candidate.sitename : '';
    if (!/^https?:\/\//i.test(url) || (!title && !sitename)) return;

    // Search cards normally contain at least one of these fields.
    const looksLikeSearchCard = Boolean(
      candidate.search_id || candidate.doc_id || candidate.original_doc_rank != null ||
      candidate.publish_time_second || candidate.source_type != null
    );
    if (!looksLikeSearchCard) return;

    const key = [url, candidate.search_id || '', candidate.doc_id || '', title].join('|');
    if (sourceKeys.has(key)) return;
    sourceKeys.add(key);

    sources.push({
      title,
      sitename,
      url,
      summary: typeof candidate.summary === 'string' ? candidate.summary : '',
      docId: candidate.doc_id == null ? '' : String(candidate.doc_id),
      searchId: candidate.search_id == null ? '' : String(candidate.search_id),
      index: candidate.index == null ? '' : String(candidate.index),
      rank: candidate.original_doc_rank == null ? '' : String(candidate.original_doc_rank),
      publishTime: candidate.publish_time_second == null ? '' : String(candidate.publish_time_second),
    });
  };

  const visited = new WeakSet();
  const walk = (value, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 40) return;
    if (visited.has(value)) return;
    visited.add(value);

    if (value.text_card && typeof value.text_card === 'object') addSource(value.text_card);
    addSource(value);

    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }

    for (const key of Object.keys(value)) {
      try { walk(value[key], depth + 1); } catch { /* Ignore getters/cycles. */ }
    }
  };

  try {
    if (window._ROUTER_DATA && typeof window._ROUTER_DATA === 'object') {
      walk(window._ROUTER_DATA);
    }
  } catch { /* Fall back to script parsing below. */ }

  // Fallback for pages where the variable is no longer exposed but SSR data remains in scripts.
  if (!sources.length) {
    fallbackUsed = true;

    const readJsonObject = (text, start) => {
      const open = text.indexOf('{', start);
      if (open < 0) return null;

      let depth = 0;
      let inString = false;
      let escaped = false;

      for (let i = open; i < text.length; i += 1) {
        const char = text[i];
        if (inString) {
          if (escaped) escaped = false;
          else if (char === '\\') escaped = true;
          else if (char === '"') inString = false;
          continue;
        }

        if (char === '"') inString = true;
        else if (char === '{') depth += 1;
        else if (char === '}') {
          depth -= 1;
          if (depth === 0) return text.slice(open, i + 1);
        }
      }
      return null;
    };

    for (const script of document.scripts) {
      const text = script.textContent || '';
      if (!text.includes('"text_card"') || !text.includes('"search_id"')) continue;

      let cursor = 0;
      while (cursor < text.length) {
        const marker = text.indexOf('"text_card"', cursor);
        if (marker < 0) break;
        const colon = text.indexOf(':', marker + 11);
        if (colon < 0) break;
        const objectText = readJsonObject(text, colon + 1);
        if (!objectText) {
          cursor = colon + 1;
          continue;
        }

        try { addSource(JSON.parse(objectText)); } catch { /* Ignore malformed candidates. */ }
        cursor = colon + objectText.length;
      }
    }
  }

  // Some SSR data is duplicated. Collapse by canonical URL + search batch.
  const dedupedSources = [];
  const dedupeKeys = new Set();
  for (const item of sources) {
    let canonical = item.url;
    try {
      const parsed = new URL(item.url);
      parsed.hash = '';
      canonical = parsed.toString();
    } catch { /* Keep original URL. */ }

    const key = `${canonical}|${item.searchId || ''}`;
    if (dedupeKeys.has(key)) continue;
    dedupeKeys.add(key);
    dedupedSources.push(item);
  }

  dedupedSources.sort((a, b) => {
    const batchCompare = String(a.searchId).localeCompare(String(b.searchId));
    if (batchCompare !== 0) return batchCompare;
    const ai = Number(a.index || a.rank || 9999);
    const bi = Number(b.index || b.rank || 9999);
    return ai - bi;
  });

  const networkMap = new Map();
  const pageHost = location.hostname;

  const registrableHint = (host) => {
    const parts = host.split('.').filter(Boolean);
    return parts.slice(-2).join('.');
  };
  const pageRoot = registrableHint(pageHost);

  const addNetwork = (rawUrl, type) => {
    let parsed;
    try { parsed = new URL(rawUrl, location.href); } catch { return; }
    if (!/^https?:$/.test(parsed.protocol)) return;

    const domain = parsed.hostname.toLowerCase();
    const current = networkMap.get(domain) || {
      domain,
      count: 0,
      types: new Set(),
      sample: parsed.href,
      firstParty: registrableHint(domain) === pageRoot,
    };
    current.count += 1;
    if (type) current.types.add(type);
    networkMap.set(domain, current);
  };

  try {
    addNetwork(location.href, 'navigation');
    for (const entry of performance.getEntriesByType('resource')) {
      addNetwork(entry.name, entry.initiatorType || 'resource');
    }
  } catch { /* Performance may be unavailable on restricted pages. */ }

  const network = [...networkMap.values()]
    .map((item) => ({
      ...item,
      types: [...item.types].sort(),
    }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));

  return {
    sources: dedupedSources,
    network,
    meta: {
      fallbackUsed,
      pageUrl: location.href,
      pageTitle: document.title,
      collectedAt: new Date().toISOString(),
      routerDataPresent: Boolean(window._ROUTER_DATA),
    },
  };
}

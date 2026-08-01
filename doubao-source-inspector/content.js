'use strict';

(() => {
  const MARKER_ATTR = 'data-doubao-source-inspector';
  const SUMMARY_ATTR = 'data-doubao-source-summary';
  const RESULT_ID_RE = /^(.*?)-result-(\d+)(?:$|[-_])/;

  const SITE_RULES = [
    { pattern: /^(?:www\.)?iesdouyin\.com$/i, key: 'douyin', name: '抖音' },
    { pattern: /(?:^|\.)douyin\.com$/i, key: 'douyin', name: '抖音' },
    { pattern: /(?:^|\.)sohu\.com$/i, key: 'sohu', name: '搜狐' },
    { pattern: /(?:^|\.)toutiao\.com$/i, key: 'toutiao', name: '今日头条' },
    { pattern: /(?:^|\.)163\.com$/i, key: '163', name: '网易' },
    { pattern: /(?:^|\.)bilibili\.com$/i, key: 'bilibili', name: '哔哩哔哩' },
    { pattern: /(?:^|\.)liebiao\.com$/i, key: 'liebiao', name: '列表网' },
    { pattern: /(?:^|\.)lieju\.com$/i, key: 'lieju', name: '列举网' },
    { pattern: /(?:^|\.)cnblogs\.com$/i, key: 'cnblogs', name: '博客园' },
    { pattern: /(?:^|\.)ifeng\.com$/i, key: 'ifeng', name: '凤凰网' },
    { pattern: /(?:^|\.)xnnews\.com\.cn$/i, key: 'xnnews', name: '咸宁新闻网' },
    { pattern: /(?:^|\.)ithome\.com$/i, key: 'ithome', name: 'IT之家' },
    { pattern: /(?:^|\.)ctrip\.com$/i, key: 'ctrip', name: '携程' },
    { pattern: /(?:^|\.)jiemian\.com$/i, key: 'jiemian', name: '界面新闻' },
    { pattern: /(?:^|\.)taobao\.com$/i, key: 'taobao', name: '淘宝' },
    { pattern: /(?:^|\.)chinapp\.com$/i, key: 'chinapp', name: '品牌网' },
    { pattern: /(?:^|\.)autohome\.com\.cn$/i, key: 'autohome', name: '汽车之家' },
    { pattern: /(?:^|\.)qcc\.com$/i, key: 'qcc', name: '企查查' },
    { pattern: /(?:^|\.)apps\.apple\.com$/i, key: 'apps-apple', name: '苹果商店' },
    { pattern: /(?:^|\.)cloud\.tencent\.com$/i, key: 'tencent-cloud', name: '腾讯云' },
    { pattern: /(?:^|\.)zhipin\.com$/i, key: 'zhipin', name: 'BOSS直聘' },
    { pattern: /(?:^|\.)ly\.com$/i, key: 'ly', name: '同程旅行' },
    { pattern: /(?:^|\.)lawtime\.cn$/i, key: 'lawtime', name: '法律快车' },
    { pattern: /(?:^|\.)bijike\.com$/i, key: 'bijike', name: '必集客' },
    { pattern: /(?:^|\.)jdz-news\.com\.cn$/i, key: 'jdznews', name: '景德镇新闻网' },
    { pattern: /(?:^|\.)vwjq\.com$/i, key: 'vwjq', name: 'APP地推拉新网' },
    { pattern: /(?:^|\.)zhihu\.com$/i, key: 'zhihu', name: '知乎' },
    { pattern: /(?:^|\.)baijiahao\.baidu\.com$/i, key: 'baijiahao', name: '百家号' },
    { pattern: /(?:^|\.)baidu\.com$/i, key: 'baidu', name: '百度' },
    { pattern: /(?:^|\.)weixin\.qq\.com$/i, key: 'weixin', name: '微信公众号' },
    { pattern: /(?:^|\.)qq\.com$/i, key: 'qq', name: '腾讯网' },
    { pattern: /(?:^|\.)sina\.(?:com\.cn|cn)$/i, key: 'sina', name: '新浪' },
    { pattern: /(?:^|\.)thepaper\.cn$/i, key: 'thepaper', name: '澎湃新闻' },
    { pattern: /(?:^|\.)people\.com\.cn$/i, key: 'people', name: '人民网' },
    { pattern: /(?:^|\.)xinhuanet\.com$/i, key: 'xinhuanet', name: '新华网' },
    { pattern: /(?:^|\.)cctv\.com$/i, key: 'cctv', name: '央视网' },
    { pattern: /(?:^|\.)xiaohongshu\.com$/i, key: 'xiaohongshu', name: '小红书' },
    { pattern: /(?:^|\.)csdn\.net$/i, key: 'csdn', name: 'CSDN' },
    { pattern: /(?:^|\.)juejin\.cn$/i, key: 'juejin', name: '掘金' },
    { pattern: /(?:^|\.)36kr\.com$/i, key: '36kr', name: '36氪' },
    { pattern: /(?:^|\.)eastmoney\.com$/i, key: 'eastmoney', name: '东方财富' },
    { pattern: /(?:^|\.)douban\.com$/i, key: 'douban', name: '豆瓣' },
    { pattern: /(?:^|\.)smzdm\.com$/i, key: 'smzdm', name: '什么值得买' },
  ];

  const SITE_ICON_FILES = {
    sohu: 'site-icons/sohu.png',
    toutiao: 'site-icons/toutiao.jpg',
    '163': 'site-icons/163.png',
    bilibili: 'site-icons/bilibili.png',
    douyin: 'site-icons/douyin.png',
    liebiao: 'site-icons/liebiao.png',
    lieju: 'site-icons/lieju.png',
    cnblogs: 'site-icons/cnblogs.png',
    sina: 'site-icons/sina.png',
    csdn: 'site-icons/csdn.png',
    xnnews: 'site-icons/xnnews.png',
    ithome: 'site-icons/ithome.png',
    ctrip: 'site-icons/ctrip.png',
    jiemian: 'site-icons/jiemian.png',
    taobao: 'site-icons/taobao.png',
    smzdm: 'site-icons/smzdm.png',
    ifeng: 'site-icons/ifeng.png',
    chinapp: 'site-icons/chinapp.png',
    autohome: 'site-icons/autohome.png',
    qcc: 'site-icons/qcc.png',
    'apps-apple': 'site-icons/apps-apple.png',
    'tencent-cloud': 'site-icons/tencent-cloud.png',
    qq: 'site-icons/qq.png',
    zhipin: 'site-icons/zhipin.png',
    ly: 'site-icons/ly.png',
  };

  let scheduled = false;

  function hostnameOf(rawUrl) {
    try {
      return new URL(rawUrl, location.href).hostname.toLowerCase();
    } catch {
      return '';
    }
  }

  function cleanHostname(hostname) {
    return hostname
      .replace(/^www\./, '')
      .replace(/^m\./, '')
      .replace(/^wap\./, '');
  }

  function iconUrlForKey(key) {
    const file = SITE_ICON_FILES[key];
    if (!file) return '';
    try {
      return chrome.runtime.getURL(file);
    } catch {
      return '';
    }
  }

  function siteInfoForUrl(rawUrl) {
    const hostname = hostnameOf(rawUrl);
    if (!hostname) {
      return { key: 'unknown', name: '未知来源', hostname: '', iconUrl: '' };
    }

    for (const rule of SITE_RULES) {
      if (rule.pattern.test(hostname)) {
        return {
          key: rule.key,
          name: rule.name,
          hostname,
          iconUrl: iconUrlForKey(rule.key),
        };
      }
    }

    return {
      key: cleanHostname(hostname),
      name: cleanHostname(hostname),
      hostname,
      iconUrl: '',
    };
  }

  function groupInfo(anchor) {
    const itemId = anchor.getAttribute('data-tool-call-item-id') || '';
    const match = itemId.match(RESULT_ID_RE);
    if (match) {
      return { key: match[1], index: Number(match[2]) };
    }
    return { key: itemId || `fallback-${anchor.href}`, index: Number.MAX_SAFE_INTEGER };
  }

  function isResultAnchor(anchor) {
    if (!(anchor instanceof HTMLAnchorElement)) return false;
    if (anchor.getAttribute('data-thinking-box-tool-call') !== 'true') return false;
    if (!anchor.hasAttribute('data-tool-call-item-id')) return false;

    const hostname = hostnameOf(anchor.href);
    if (!hostname || hostname === location.hostname || hostname.endsWith('.doubao.com')) return false;
    return true;
  }

  function resultWrapper(anchor) {
    const direct = anchor.parentElement;
    if (direct && direct.children.length === 1) return direct;
    return anchor;
  }

  function findTitleNode(anchor) {
    const children = [...anchor.children];
    return children.find((node) => {
      if (!(node instanceof HTMLElement)) return false;
      if (node.matches(`[${MARKER_ATTR}]`)) return false;
      if (node.tagName === 'SPAN' && /^\s*\d+[.、]?\s*$/.test(node.textContent || '')) return false;
      return true;
    }) || null;
  }

  function updateBadgeContent(badge, siteInfo) {
    badge.setAttribute('title', siteInfo.hostname || siteInfo.name);
    badge.dataset.siteKey = siteInfo.key || '';
    badge.dataset.siteName = siteInfo.name || '';

    let icon = badge.querySelector(':scope > img');
    if (siteInfo.iconUrl) {
      if (!icon) {
        icon = document.createElement('img');
        icon.className = 'doubao-source-inspector-badge-icon';
        icon.alt = `${siteInfo.name} 图标`;
        icon.decoding = 'async';
        icon.loading = 'lazy';
        badge.prepend(icon);
      }
      if (icon.src !== siteInfo.iconUrl) icon.src = siteInfo.iconUrl;
      icon.style.display = '';
    } else if (icon) {
      icon.remove();
    }

    let text = badge.querySelector(':scope > span');
    if (!text) {
      text = document.createElement('span');
      text.className = 'doubao-source-inspector-badge-text';
      badge.appendChild(text);
    }
    text.textContent = siteInfo.name;
  }

  function addLabel(anchor) {
    const existing = anchor.querySelector(`:scope > [${MARKER_ATTR}]`);
    const siteInfo = siteInfoForUrl(anchor.href);

    if (existing) {
      updateBadgeContent(existing, siteInfo);
      return;
    }

    const badge = document.createElement('span');
    badge.setAttribute(MARKER_ATTR, 'badge');
    badge.className = 'doubao-source-inspector-badge';
    updateBadgeContent(badge, siteInfo);

    const titleNode = findTitleNode(anchor);
    if (titleNode) anchor.insertBefore(badge, titleNode);
    else anchor.appendChild(badge);
  }

  function getSummaryHost(lastAnchor, groupAnchors) {
    const lastWrapper = resultWrapper(lastAnchor);

    if (lastWrapper.parentElement) {
      return { parent: lastWrapper.parentElement, after: lastWrapper };
    }

    const firstWrapper = resultWrapper(groupAnchors[0]);
    return { parent: firstWrapper.parentElement, after: firstWrapper };
  }

  function makeSummary(groupKey, anchors) {
    const counts = new Map();
    const order = [];

    for (const anchor of anchors) {
      const siteInfo = siteInfoForUrl(anchor.href);
      if (!counts.has(siteInfo.name)) order.push(siteInfo.name);
      counts.set(siteInfo.name, {
        count: (counts.get(siteInfo.name)?.count || 0) + 1,
        siteInfo,
      });
    }

    const summary = document.createElement('div');
    summary.setAttribute(SUMMARY_ATTR, groupKey);
    summary.className = 'doubao-source-inspector-summary';

    const title = document.createElement('span');
    title.className = 'doubao-source-inspector-summary-title';
    title.textContent = '来源汇总';
    summary.appendChild(title);

    order
      .sort((a, b) => (counts.get(b)?.count || 0) - (counts.get(a)?.count || 0))
      .forEach((name) => {
        const item = document.createElement('span');
        item.className = 'doubao-source-inspector-summary-item';

        const data = counts.get(name);
        const siteInfo = data.siteInfo;

        if (siteInfo.iconUrl) {
          const icon = document.createElement('img');
          icon.className = 'doubao-source-inspector-summary-icon';
          icon.src = siteInfo.iconUrl;
          icon.alt = `${siteInfo.name} 图标`;
          icon.decoding = 'async';
          icon.loading = 'lazy';
          item.appendChild(icon);
        }

        const site = document.createElement('strong');
        site.textContent = name;
        const count = document.createElement('span');
        count.textContent = `${data.count}个`;

        item.append(site, count);
        summary.appendChild(item);
      });

    const total = document.createElement('span');
    total.className = 'doubao-source-inspector-summary-total';
    total.textContent = `共 ${anchors.length} 条`;
    summary.appendChild(total);

    return summary;
  }

  function rebuildSummaries(groups) {
    document.querySelectorAll(`[${SUMMARY_ATTR}]`).forEach((node) => node.remove());

    for (const [groupKey, entries] of groups) {
      entries.sort((a, b) => a.index - b.index);
      const anchors = entries.map((entry) => entry.anchor);
      if (!anchors.length) continue;

      const lastAnchor = anchors[anchors.length - 1];
      const host = getSummaryHost(lastAnchor, anchors);
      if (!host.parent) continue;

      const summary = makeSummary(groupKey, anchors);
      host.after.insertAdjacentElement('afterend', summary);
    }
  }

  function scan() {
    scheduled = false;
    const anchors = [...document.querySelectorAll(
      'a[data-thinking-box-tool-call="true"][data-tool-call-item-id][href]'
    )].filter(isResultAnchor);

    const groups = new Map();
    for (const anchor of anchors) {
      addLabel(anchor);
      const info = groupInfo(anchor);
      const list = groups.get(info.key) || [];
      list.push({ anchor, index: info.index });
      groups.set(info.key, list);
    }

    rebuildSummaries(groups);
  }

  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(scan);
  }

  const observer = new MutationObserver((mutations) => {
    const meaningful = mutations.some((mutation) => {
      if (mutation.type === 'attributes') return mutation.attributeName === 'href';
      return [...mutation.addedNodes, ...mutation.removedNodes].some((node) => {
        if (!(node instanceof Element)) return false;
        if (node.matches(`[${MARKER_ATTR}], [${SUMMARY_ATTR}]`)) return false;
        return node.matches('a[data-thinking-box-tool-call="true"]') ||
          Boolean(node.querySelector?.('a[data-thinking-box-tool-call="true"]'));
      });
    });
    if (meaningful) scheduleScan();
  });

  function start() {
    scan();
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

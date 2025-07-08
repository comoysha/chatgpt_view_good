// ==UserScript==
// @name         ChatGPT 问题侧边栏（会话自动切换）
// @namespace    http://tampermonkey.net/
// @version      4.0
// @match        https://chatgpt.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
  
    // —— 1. 关键选择器 —— 
    const DETAIL_SELECTOR = "#thread > div > div.flex.basis-auto.flex-col.-mb-\\(--composer-overlap-px\\).\\[--composer-overlap-px\\:24px\\].grow.overflow-hidden > div > div > div.\\@thread-xl\\/thread\\:pt-header-height.mt-1\\.5.flex.flex-col.text-sm.pb-25";
  
    // —— 2. 侧边栏初始化 —— 
    const nav = document.createElement('div');
    nav.id = '__chatgpt-anchor-nav';
    nav.innerHTML = `
      <div id="__chatgpt-anchor-search-container" style="display: flex; align-items: center;">
        <input id="__chatgpt-anchor-search" type="text" placeholder="搜索问题…" style="flex-grow: 1; margin-right: 5px;">
        <span id="__chatgpt-anchor-refresh-btn" title="刷新列表" style="cursor: pointer; padding: 5px;">🔄</span>
      </div>
      <div id="__chatgpt-anchor-list"></div>
    `;
    document.body.appendChild(nav);
  
    const listContainer = nav.querySelector('#__chatgpt-anchor-list');
    const searchInput   = nav.querySelector('#__chatgpt-anchor-search');
    const refreshButton = nav.querySelector('#__chatgpt-anchor-refresh-btn');
  
    // —— 3. 核心功能 —— 
    let detailObserver = null;  // 当前会话的 MutationObserver
    let autoRefreshTimer = null; // 自动刷新定时器
  
    /** 等待 DETAIL_SELECTOR 出现 **/
    function waitFor(selector, timeout = 10000) {
      return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => {
          const found = document.querySelector(selector);
          if (found) {
            obs.disconnect();
            resolve(found);
          }
        });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
          obs.disconnect();
          reject(new Error(`Timeout waiting for ${selector}`));
        }, timeout);
      });
    }
  
    /** 清空侧边栏条目 **/
    function clearList() {
      listContainer.innerHTML = '';
    }
  
    /** 构建或重建整个列表 **/
    function rebuildList() {
      clearList();
      const articles = Array.from(
        document.querySelectorAll('article[data-testid^="conversation-turn-"]')
      ).filter(a => parseInt(a.dataset.testid.split('-')[2], 10) % 2 === 1);
  
      articles.forEach((el, idx) => {
        const id = `anchor-msg-${idx+1}`;
        el.id = id;
  
        const txtEl   = el.querySelector('.whitespace-pre-wrap');
        let fullText  = txtEl ? txtEl.textContent.trim().replace(/\s+/g,' ') : '';
        const preview = fullText.length > 20 ? fullText.slice(0,20) + '…' : fullText;
  
        const a = document.createElement('a');
        a.href        = `#${id}`;
        a.textContent = `${idx+1}. ${preview}`;
        a.title       = fullText;
        a.tabIndex    = 0;
        listContainer.appendChild(a);
      });
      filterList();
    }
  
    /** 启动自动刷新定时器 **/
    function startAutoRefresh() {
      // 清除现有定时器
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
      }
      // 设置15秒间隔的自动刷新
      autoRefreshTimer = setInterval(() => {
        rebuildList();
      }, 15000); // 15秒 = 15000毫秒
    }
  
    /** 停止自动刷新定时器 **/
    function stopAutoRefresh() {
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
      }
    }
  
    /** 新消息到来时增量追加 **/
    function handleMutations(muts) {
      for (const m of muts) {
        for (const node of m.addedNodes) {
          if (node.nodeType===1 && node.matches('article[data-testid^="conversation-turn-"]')) {
            rebuildList();  // 或者仅 append 这个 node
          }
        }
      }
    }
  
    /** 搜索过滤 **/
    function filterList() {
      const q = searchInput.value.trim();
      for (const a of listContainer.children) {
        a.style.display = (!q || a.textContent.includes(q) || a.title.includes(q))
          ? 'block'
          : 'none';
      }
    }
    searchInput.addEventListener('input', filterList);
    refreshButton.addEventListener('click', rebuildList);
  
    /** 初始化当前会话：等待详情区 → 绑定 observer → 初始化构建 **/
    function initForCurrentSession() {
      // 断开旧 observer
      if (detailObserver) detailObserver.disconnect();
      // 停止旧的自动刷新定时器
      stopAutoRefresh();
  
      waitFor(DETAIL_SELECTOR).then(el => {
        // 绑定新的 MutationObserver 监听"新消息"
        detailObserver = new MutationObserver(handleMutations);
        detailObserver.observe(el, { childList: true, subtree: true });
  
        // 构建历史列表
        rebuildList();
        // 启动自动刷新
        startAutoRefresh();
      }).catch(err => {
        console.error('ChatGPT Anchor Init Error:', err);
        // 即使找不到详情区域，也尝试启动自动刷新
        setTimeout(() => {
          rebuildList();
          startAutoRefresh();
        }, 2000);
      });
    }
  
    // —— 4. 监听 SPA URL 切换 —— 
    (function(history) {
      const push = history.pushState, replace = history.replaceState;
      history.pushState = function(...args) {
        const ret = push.apply(this, args);
        window.dispatchEvent(new Event('locationchange'));
        return ret;
      };
      history.replaceState = function(...args) {
        const ret = replace.apply(this, args);
        window.dispatchEvent(new Event('locationchange'));
        return ret;
      };
    })(window.history);
  
    window.addEventListener('popstate', () => window.dispatchEvent(new Event('locationchange')));
    window.addEventListener('locationchange', initForCurrentSession);
  
    // —— 5. 首次执行 —— 
    initForCurrentSession();
  
  })();
  
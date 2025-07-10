// ==UserScript==
// @name         ChatGPT 问题侧边栏（会话自动切换）- 完整版
// @namespace    http://tampermonkey.net/
// @version      4.3
// @match        https://chatgpt.com/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    
    // ========== CSS 样式注入 ==========
    GM_addStyle(`

        /* 解除 ChatGPT 对话栏宽度限制 */
        [class*="max-w-"],
        .lg\:max-w-4xl,
        .max-w-3xl {
            max-width: 100% !important;
        }


        /* 为聊天内容区添加右外边距 */
        .relative.flex.h-full.max-w-full.flex-1.flex-col {
            margin-right: 360px !important;
        }
        
        /* 侧边栏本身保持固定 */
        #__chatgpt-anchor-nav {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: 360px;
            background: #f9f9f9;
            border-left: 1px solid #ccc;
            padding: 12px;
            box-sizing: border-box;
            overflow-y: auto;
            z-index: 9999;
            color: #333;
        }
        
        /* 列表、搜索框依旧垂直排列 */
        #__chatgpt-anchor-search-container {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        
        #__chatgpt-anchor-search {
            flex-grow: 1;
            margin-right: 8px;
            background: #fff;
            border: 1px solid #bbb;
            color: #333;
        }
        
        #__chatgpt-anchor-search::placeholder {
            color: #666;
        }
        
        #__chatgpt-anchor-refresh-btn {
            cursor: pointer;
            padding: 4px;
            font-size: 1.2em;
            user-select: none;
        }
        
        #__chatgpt-anchor-list a {
            display: block;
            margin: 4px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #333;
        }
        
        /* 深色模式 */
        @media (prefers-color-scheme: dark) {
            #__chatgpt-anchor-nav {
                background: #2b2b2b;
                border-left: 1px solid #444;
                color: #ddd;
            }
            #__chatgpt-anchor-search {
                background: #3c3c3c;
                border: 1px solid #555;
                color: #eee;
            }
            #__chatgpt-anchor-search::placeholder {
                color: #aaa;
            }
            #__chatgpt-anchor-list a {
                color: #eee;
            }
        }
        
        /* 兼容 ChatGPT 自带深色类（html.dark） */
        html.dark #__chatgpt-anchor-nav {
            background: #2b2b2b !important;
            border-left: 1px solid #444 !important;
            color: #ddd !important;
        }
        html.dark #__chatgpt-anchor-search {
            background: #3c3c3c !important;
            border: 1px solid #555 !important;
            color: #eee !important;
        }
        html.dark #__chatgpt-anchor-search::placeholder {
            color: #aaa !important;
        }
        html.dark #__chatgpt-anchor-list a {
            color: #eee !important;
        }
    `);
    
    // ========== 配置区域 ==========
    // 当 ChatGPT 界面更新时，只需要修改这个配置对象
    const SELECTORS = {
        // 聊天容器选择器（用于添加右边距）
        CHAT_CONTAINER: ".relative.flex.h-full.max-w-full.flex-1.flex-col",
        
        // 详情区域选择器（用于监听新消息）
        DETAIL_CONTAINER: ".relative.flex.h-full.max-w-full.flex-1.flex-col",
        
        // 对话文章选择器（用于提取用户问题）
        ARTICLE_SELECTOR: "article.text-token-text-primary.w-full",
        
        // 用户消息文本选择器（按优先级排序）
        TEXT_SELECTORS: [
            '[data-message-author-role="user"]',
            '.whitespace-pre-wrap',
            'div[dir="auto"]'
        ],
        
        // 侧边栏配置
        SIDEBAR: {
            ID: '__chatgpt-anchor-nav',
            WIDTH: '360px'
        }
    };
    // ========== 配置区域结束 ==========
  
    // —— 2. 侧边栏初始化 —— 
    const nav = document.createElement('div');
    nav.id = SELECTORS.SIDEBAR.ID;
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
    let detailObserver = null;
    let autoRefreshTimer = null;
  
    /** 等待选择器出现 **/
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
        document.querySelectorAll(SELECTORS.ARTICLE_SELECTOR)
      ).filter((a, idx) => idx % 2 === 0);
  
      articles.forEach((el, idx) => {
        const id = `anchor-msg-${idx+1}`;
        el.id = id;
  
        // 尝试多个文本选择器
        let txtEl = null;
        for (const selector of SELECTORS.TEXT_SELECTORS) {
            txtEl = el.querySelector(selector);
            if (txtEl) break;
        }
        
        let fullText = txtEl ? txtEl.textContent.trim().replace(/\s+/g,' ') : '';
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
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
      }
      autoRefreshTimer = setInterval(() => {
        rebuildList();
      }, 15000);
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
          if (node.nodeType === 1 && 
              (node.matches(SELECTORS.ARTICLE_SELECTOR) ||
               node.querySelector(SELECTORS.ARTICLE_SELECTOR))) {
            rebuildList();
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
  
    /** 初始化当前会话 **/
    function initForCurrentSession() {
      if (detailObserver) detailObserver.disconnect();
      stopAutoRefresh();
  
      waitFor(SELECTORS.DETAIL_CONTAINER).then(el => {
        detailObserver = new MutationObserver(handleMutations);
        detailObserver.observe(el, { childList: true, subtree: true });
        rebuildList();
        startAutoRefresh();
      }).catch(err => {
        console.error('ChatGPT Anchor Init Error:', err);
        setTimeout(() => {
          detailObserver = new MutationObserver(handleMutations);
          detailObserver.observe(document.body, { childList: true, subtree: true });
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
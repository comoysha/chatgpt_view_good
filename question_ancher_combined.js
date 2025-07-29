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

        /* 针对可能的响应式容器 */
        .container[class*="max-w-"],
        .mx-auto[class*="max-w-"] {
            max-width: 100% !important;
        }

        /* 侧边栏本身保持固定，但默认隐藏 */
        #__chatgpt-anchor-nav {
            position: fixed;
            top: 0;
            right: -360px; /* 默认隐藏 */
            bottom: 0;
            width: 360px;
            background: #f9f9f9;
            border-left: 1px solid #ccc;
            padding: 12px;
            box-sizing: border-box;
            overflow-y: auto;
            z-index: 9999;
            color: #333;
            transition: right 0.3s ease;
        }

        /* 侧边栏可见状态 */
        #__chatgpt-anchor-nav.visible {
            right: 0;
        }

        /* 悬浮按钮样式 */
        #__chatgpt-anchor-toggle {
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #F5F5F5; /* 按钮背景色 */
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 20px;
            transition: transform 0.2s ease;
        }

        #__chatgpt-anchor-toggle:hover {
            transform: scale(1.05);
        }

        /* 列表、搜索框依旧垂直排列 */
        #__chatgpt-anchor-search-container {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            border-radius: 4px;
        }

        #__chatgpt-anchor-search {
            flex-grow: 1;
            margin-right: 8px;
            background: #fff;
            border: 1px solid #bbb;
            color: #333;
            border-radius: 14px;     /* 设置圆角边框，半径14px */
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
            display: block !important;          /* 将链接显示为块级元素 */
            margin: 8px 0 !important;          /* 上下外边距8px，左右无外边距 */
            padding: 4px 0 !important;         /* 增加内边距让间距更明显 */
            white-space: normal !important;     /* 文本允许换行 */
            overflow: visible !important;       /* 超出部分显示 */
            color: #333;                        /* 文本颜色设置为深灰色 */
            line-height: 1.4 !important;       /* 设置行高，改善可读性 */
        }
        
        /* hover效果 */
        #__chatgpt-anchor-list a:hover {
            background-color: #f0f0f0 !important;
            color: #000 !important;
        }

        /* 持久选中状态 */
        #__chatgpt-anchor-list a.current {
            background-color: #e3f2fd !important;
            color: #1976d2 !important;
            border-left: 3px solid #1976d2;
            padding-left: 8px !important;
            font-weight: 500;
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
            #__chatgpt-anchor-list a:hover {
                background-color: #404040 !important;
                color: #fff !important;
            }
            #__chatgpt-anchor-list a.current {
                background-color: #1e3a8a !important;
                color: #60a5fa !important;
                border-left: 3px solid #60a5fa;
                font-weight: 500;
            }
            #__chatgpt-anchor-toggle {
                background: #F5F5F5; /* 深色模式下稍亮一点 */
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
        html.dark #__chatgpt-anchor-list a:hover {
            background-color: #404040 !important;
            color: #fff !important;
        }
        html.dark #__chatgpt-anchor-list a.current {
            background-color: #1e3a8a !important;
            color: #60a5fa !important;
            border-left: 3px solid #60a5fa;
            font-weight: 500;
        }
        html.dark #__chatgpt-anchor-toggle {
            background: #3d3d3d !important;
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
            WIDTH: '360px',
            TOGGLE_ID: '__chatgpt-anchor-toggle'
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

    // 创建悬浮按钮
    const toggleBtn = document.createElement('div');
    toggleBtn.id = SELECTORS.SIDEBAR.TOGGLE_ID;
    toggleBtn.innerHTML = '🕓';
    toggleBtn.title = '显示/隐藏问题侧边栏';
    document.body.appendChild(toggleBtn);

    const listContainer = nav.querySelector('#__chatgpt-anchor-list');
    const searchInput   = nav.querySelector('#__chatgpt-anchor-search');
    const refreshButton = nav.querySelector('#__chatgpt-anchor-refresh-btn');

    // 侧边栏显示/隐藏状态
    let sidebarVisible = false;

    // 切换侧边栏显示/隐藏
    function toggleSidebar() {
      sidebarVisible = !sidebarVisible;

      if (sidebarVisible) {
        nav.classList.add('visible');
        document.body.classList.add('sidebar-visible');
      } else {
        nav.classList.remove('visible');
        document.body.classList.remove('sidebar-visible');
      }

      // 强制刷新样式 - 直接操作DOM元素，但排除特定的div
      const mainElements = document.querySelectorAll('.relative.flex.h-full.max-w-full.flex-1.flex-col:not(.max-xs\\:\\[--force-hide-label\\:none\\])');
      mainElements.forEach(el => {
        if (sidebarVisible) {
          el.style.marginRight = '360px';
        } else {
          el.style.marginRight = '0px';
        }
      });
    }

    // 绑定按钮点击事件
    toggleBtn.addEventListener('click', toggleSidebar);

    // 初始化时确保侧边栏隐藏
    document.addEventListener('DOMContentLoaded', function() {
      const mainElements = document.querySelectorAll('.relative.flex.h-full.max-w-full.flex-1.flex-col:not(.max-xs\\:\\[--force-hide-label\\:none\\])');
      mainElements.forEach(el => {
        el.style.marginRight = '0px';
      });
    });

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
        const preview = fullText.length > 50 ? fullText.slice(0,50) + '…' : fullText;

        const a = document.createElement('a');
        a.href        = `#${id}`;
        a.textContent = `${idx+1}. ${preview}`;
        a.title       = fullText;
        a.tabIndex    = 0;
        listContainer.appendChild(a);
      });
      filterList();
      // 检查并更新当前选中状态
      setTimeout(updateCurrentQuestion, 100);
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

    // —— 6. 滚动监听和自动选中功能 ——
    let scrollTimeout = null;
    
    /** 更新当前选中的问题 **/
    function updateCurrentQuestion() {
        const articles = document.querySelectorAll(SELECTORS.ARTICLE_SELECTOR);
        const links = listContainer.querySelectorAll('a');
        
        // 移除所有current类
        links.forEach(link => link.classList.remove('current'));
        
        // 找到当前视窗中最靠近顶部的问题
        let currentArticle = null;
        let minDistance = Infinity;
        
        articles.forEach((article, index) => {
            if (index % 2 === 0) { // 只检查用户问题
                const rect = article.getBoundingClientRect();
                const distance = Math.abs(rect.top - 100); // 距离顶部100px的位置
                
                if (rect.top <= 200 && distance < minDistance) { // 在视窗上半部分
                    minDistance = distance;
                    currentArticle = article;
                }
            }
        });
        
        // 为对应的链接添加current类
        if (currentArticle) {
            const articleId = currentArticle.id;
            if (articleId) {
                const correspondingLink = listContainer.querySelector(`a[href="#${articleId}"]`);
                if (correspondingLink) {
                    correspondingLink.classList.add('current');
                }
            }
        }
    }
    
    /** 滚动事件监听 **/
    function handleScroll() {
        // 使用防抖，避免频繁触发
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(updateCurrentQuestion, 100);
    }
    
    /** 点击链接时也更新选中状态 **/
    function handleLinkClick(event) {
        // 移除所有current类
        listContainer.querySelectorAll('a').forEach(link => link.classList.remove('current'));
        // 为点击的链接添加current类
        event.target.classList.add('current');
        
        // 延迟更新，让滚动完成后再检查
        setTimeout(updateCurrentQuestion, 500);
    }
    
    // 绑定滚动事件
    window.addEventListener('scroll', handleScroll);
    
    // 为动态生成的链接绑定点击事件
    listContainer.addEventListener('click', handleLinkClick);

})();
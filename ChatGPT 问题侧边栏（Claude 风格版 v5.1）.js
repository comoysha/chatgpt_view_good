// ==UserScript==
// @name         ChatGPT 问题侧边栏（Claude 风格版 v5.1）
// @namespace    http://tampermonkey.net/
// @version      5.1
// @description  Claude 橙色主题 + 可靠的搜索功能
// @author       夏越
// @match        https://chatgpt.com/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ========== CSS 样式（Claude 风格）==========
    GM_addStyle(`
        .container[class*="max-w-"],
        .mx-auto[class*="max-w-"] {
            max-width: 100% !important;
        }

        #__chatgpt-anchor-nav {
            position: fixed;
            top: 0;
            right: -380px;
            bottom: 0;
            width: 380px;
            background: #ffffff;
            border-left: 1px solid #e5e7eb;
            padding: 16px;
            box-sizing: border-box;
            overflow-y: auto;
            z-index: 9999;
            color: #1f2937;
            transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: -4px 0 12px rgba(0, 0, 0, 0.08);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        #__chatgpt-anchor-nav.visible {
            right: 0;
        }

        #__chatgpt-anchor-toggle {
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #cc785c 0%, #b86a4e 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(204, 120, 92, 0.3);
            z-index: 10000;
            font-size: 24px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        #__chatgpt-anchor-toggle:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(204, 120, 92, 0.4);
        }

        #__chatgpt-anchor-search-container {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
            gap: 8px;
        }

        #__chatgpt-anchor-search {
            flex-grow: 1;
            padding: 10px 14px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            color: #1f2937;
            border-radius: 8px;
            font-size: 14px;
            outline: none;
            transition: all 0.2s ease;
        }

        #__chatgpt-anchor-search:focus {
            background: #ffffff;
            border-color: #cc785c;
            box-shadow: 0 0 0 3px rgba(204, 120, 92, 0.1);
        }

        #__chatgpt-anchor-search::placeholder {
            color: #9ca3af;
        }

        #__chatgpt-anchor-refresh-btn {
            cursor: pointer;
            padding: 8px;
            font-size: 20px;
            color: #6b7280;
            transition: transform 0.2s ease;
            user-select: none;
        }

        #__chatgpt-anchor-refresh-btn:hover {
            transform: rotate(90deg);
            color: #cc785c;
        }

        #__chatgpt-anchor-list a {
            display: block !important;
            padding: 12px 14px !important;
            margin: 0 0 4px 0 !important;
            white-space: normal !important;
            color: #374151 !important;
            line-height: 1.5 !important;
            text-decoration: none !important;
            border-radius: 8px !important;
            background: transparent !important;
            font-size: 14px !important;
            border-left: 3px solid transparent !important;
            transition: all 0.15s ease !important;
        }

        #__chatgpt-anchor-list a:hover {
            background-color: #f3f4f6 !important;
            color: #1f2937 !important;
            border-left-color: #d1d5db !important;
        }

        #__chatgpt-anchor-list a.current {
            background-color: #fef3f1 !important;
            color: #cc785c !important;
            border-left-color: #cc785c !important;
            font-weight: 500 !important;
        }

        #__chatgpt-anchor-list a.current:hover {
            background-color: #fde8e3 !important;
        }

        #__chatgpt-anchor-nav h3 {
            margin: 0 0 16px 0;
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            padding-bottom: 12px;
            border-bottom: 2px solid #e5e7eb;
        }

        @media (prefers-color-scheme: dark) {
            #__chatgpt-anchor-nav {
                background: #1f1f1f;
                border-left-color: #374151;
                color: #e5e7eb;
            }
            #__chatgpt-anchor-nav h3 {
                color: #f3f4f6;
                border-bottom-color: #374151;
            }
            #__chatgpt-anchor-search {
                background: #2d2d2d;
                border-color: #374151;
                color: #e5e7eb;
            }
            #__chatgpt-anchor-search:focus {
                background: #1f1f1f;
                border-color: #cc785c;
            }
            #__chatgpt-anchor-search::placeholder {
                color: #6b7280;
            }
            #__chatgpt-anchor-refresh-btn {
                color: #9ca3af;
            }
            #__chatgpt-anchor-refresh-btn:hover {
                color: #cc785c;
            }
            #__chatgpt-anchor-list a {
                color: #d1d5db !important;
            }
            #__chatgpt-anchor-list a:hover {
                background-color: #2d2d2d !important;
                color: #f3f4f6 !important;
                border-left-color: #4b5563 !important;
            }
            #__chatgpt-anchor-list a.current {
                background-color: #2d1f1a !important;
                color: #f5b49a !important;
                border-left-color: #cc785c !important;
            }
            #__chatgpt-anchor-list a.current:hover {
                background-color: #3d2820 !important;
            }
        }

        html.dark #__chatgpt-anchor-nav {
            background: #1f1f1f !important;
            border-left-color: #374151 !important;
            color: #e5e7eb !important;
        }
        html.dark #__chatgpt-anchor-nav h3 {
            color: #f3f4f6 !important;
            border-bottom-color: #374151 !important;
        }
        html.dark #__chatgpt-anchor-search {
            background: #2d2d2d !important;
            border-color: #374151 !important;
            color: #e5e7eb !important;
        }
        html.dark #__chatgpt-anchor-search:focus {
            background: #1f1f1f !important;
            border-color: #cc785c !important;
        }
        html.dark #__chatgpt-anchor-search::placeholder {
            color: #6b7280 !important;
        }
        html.dark #__chatgpt-anchor-list a {
            color: #d1d5db !important;
        }
        html.dark #__chatgpt-anchor-list a:hover {
            background-color: #2d2d2d !important;
            color: #f3f4f6 !important;
        }
        html.dark #__chatgpt-anchor-list a.current {
            background-color: #2d1f1a !important;
            color: #f5b49a !important;
            border-left-color: #cc785c !important;
        }

        #__chatgpt-anchor-nav::-webkit-scrollbar {
            width: 8px;
        }
        #__chatgpt-anchor-nav::-webkit-scrollbar-track {
            background: transparent;
        }
        #__chatgpt-anchor-nav::-webkit-scrollbar-thumb {
            background: #d1d5db;
            border-radius: 4px;
        }
        #__chatgpt-anchor-nav::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
        }
        @media (prefers-color-scheme: dark) {
            #__chatgpt-anchor-nav::-webkit-scrollbar-thumb {
                background: #4b5563;
            }
        }
        html.dark #__chatgpt-anchor-nav::-webkit-scrollbar-thumb {
            background: #4b5563 !important;
        }
    `);

    // ========== 配置 ==========
    const SELECTORS = {
        CHAT_CONTAINER: ".relative.flex.h-full.max-w-full.flex-1.flex-col",
        DETAIL_CONTAINER: ".relative.flex.h-full.max-w-full.flex-1.flex-col",
        ARTICLE_SELECTOR: "article.text-token-text-primary.w-full",
        TEXT_SELECTORS: [
            '[data-message-author-role="user"]',
            '.whitespace-pre-wrap',
            'div[dir="auto"]'
        ],
        SIDEBAR: {
            ID: '__chatgpt-anchor-nav',
            WIDTH: '380px',
            TOGGLE_ID: '__chatgpt-anchor-toggle'
        }
    };

    // ========== 初始化 ==========
    const nav = document.createElement('div');
    nav.id = SELECTORS.SIDEBAR.ID;
    nav.innerHTML = `
        <div id="__chatgpt-anchor-search-container">
            <input id="__chatgpt-anchor-search" type="text" placeholder="搜索问题…" />
            <span id="__chatgpt-anchor-refresh-btn" title="刷新列表">🔄</span>
        </div>
        <div id="__chatgpt-anchor-list"></div>
    `;
    document.body.appendChild(nav);

    const toggleBtn = document.createElement('div');
    toggleBtn.id = SELECTORS.SIDEBAR.TOGGLE_ID;
    toggleBtn.innerHTML = '💬';
    toggleBtn.title = '显示/隐藏问题侧边栏';
    document.body.appendChild(toggleBtn);

    const listContainer = nav.querySelector('#__chatgpt-anchor-list');
    const searchInput = nav.querySelector('#__chatgpt-anchor-search');
    const refreshButton = nav.querySelector('#__chatgpt-anchor-refresh-btn');

    let sidebarVisible = false;

    // ========== 核心功能 ==========

    function toggleSidebar() {
        sidebarVisible = !sidebarVisible;

        if (sidebarVisible) {
            nav.classList.add('visible');
            document.body.classList.add('sidebar-visible');
        } else {
            nav.classList.remove('visible');
            document.body.classList.remove('sidebar-visible');
        }

        const mainElements = document.querySelectorAll('.relative.flex.h-full.max-w-full.flex-1.flex-col:not(.max-xs\\:\\[--force-hide-label\\:none\\])');
        mainElements.forEach(el => {
            el.style.marginRight = sidebarVisible ? '380px' : '0px';
        });
    }

    toggleBtn.addEventListener('click', toggleSidebar);

    document.addEventListener('DOMContentLoaded', function() {
        const mainElements = document.querySelectorAll('.relative.flex.h-full.max-w-full.flex-1.flex-col:not(.max-xs\\:\\[--force-hide-label\\:none\\])');
        mainElements.forEach(el => {
            el.style.marginRight = '0px';
        });
    });

    let detailObserver = null;
    let autoRefreshTimer = null;

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

    function clearList() {
        listContainer.innerHTML = '';
    }

    function rebuildList() {
        clearList();
        const articles = Array.from(
            document.querySelectorAll(SELECTORS.ARTICLE_SELECTOR)
        ).filter((a, idx) => idx % 2 === 0);

        articles.forEach((el, idx) => {
            const id = `anchor-msg-${idx+1}`;
            el.id = id;

            let txtEl = null;
            for (const selector of SELECTORS.TEXT_SELECTORS) {
                txtEl = el.querySelector(selector);
                if (txtEl) break;
            }

            let fullText = txtEl ? txtEl.textContent.trim().replace(/\s+/g,' ') : '';
            const preview = fullText.length > 50 ? fullText.slice(0,50) + '…' : fullText;

            const a = document.createElement('a');
            a.href = `#${id}`;
            a.textContent = `${idx+1}. ${preview}`;
            // 关键修复：使用 data-search-text 存储完整文本
            a.setAttribute('data-search-text', fullText.toLowerCase());
            a.tabIndex = 0;

            a.addEventListener('click', function(e) {
                e.preventDefault();

                document.querySelectorAll('#__chatgpt-anchor-list a.current').forEach(item => {
                    item.classList.remove('current');
                });

                this.classList.add('current');

                const targetElement = document.querySelector(this.getAttribute('href'));
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });

            listContainer.appendChild(a);
        });

        filterList();
    }

    function startAutoRefresh() {
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
        }
        autoRefreshTimer = setInterval(() => {
            rebuildList();
        }, 15000);
    }

    function stopAutoRefresh() {
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
            autoRefreshTimer = null;
        }
    }

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

    // 关键修复：使用 data-search-text 进行搜索
    function filterList() {
        const query = searchInput.value.trim().toLowerCase();
        const allLinks = listContainer.querySelectorAll('a');

        allLinks.forEach(link => {
            const searchText = link.getAttribute('data-search-text') || '';
            const matches = !query || query.split(/\s+/).every(word => searchText.includes(word));
            link.style.setProperty('display', matches ? 'block' : 'none', 'important');
        });
    }

    // 三重事件绑定确保搜索触发
    searchInput.addEventListener('input', filterList);
    searchInput.addEventListener('keyup', filterList);
    searchInput.addEventListener('change', filterList);
    refreshButton.addEventListener('click', rebuildList);

    function initForCurrentSession() {
        if (detailObserver) detailObserver.disconnect();
        stopAutoRefresh();

        waitFor(SELECTORS.DETAIL_CONTAINER).then(el => {
            detailObserver = new MutationObserver(handleMutations);
            detailObserver.observe(el, { childList: true, subtree: true });
            rebuildList();
            startAutoRefresh();
        }).catch(err => {
            console.error('[ChatGPT Nav] Init Error:', err);
            setTimeout(() => {
                detailObserver = new MutationObserver(handleMutations);
                detailObserver.observe(document.body, { childList: true, subtree: true });
                rebuildList();
                startAutoRefresh();
            }, 2000);
        });
    }

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

    initForCurrentSession();

    console.log('[ChatGPT Nav] v5.1 已加载 - Claude 风格 + 可靠搜索');

})();

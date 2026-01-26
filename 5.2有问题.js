// ==UserScript==
// @name         ChatGPT 问题侧边栏（Claude 风格 v5.2 稳定索引版）
// @namespace    http://tampermonkey.net/
// @version      5.2
// @description  稳定 role 识别 + 全文索引搜索 + 精准滚动定位
// @author       夏越
// @match        https://chatgpt.com/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  /******************************************************************
   * 样式（Claude 风格，与你 v5.1 基本一致，略做稳定性整理）
   ******************************************************************/
  GM_addStyle(`
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
      transition: right 0.25s ease;
      box-shadow: -4px 0 12px rgba(0,0,0,.08);
      font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;
    }
    #__chatgpt-anchor-nav.visible { right: 0; }

    #__chatgpt-anchor-toggle {
      position: fixed;
      right: 20px;
      bottom: 100px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg,#cc785c,#b86a4e);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      cursor: pointer;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(204,120,92,.3);
    }

    #__chatgpt-anchor-search-container {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    #__chatgpt-anchor-search {
      flex: 1;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      font-size: 14px;
      outline: none;
    }

    #__chatgpt-anchor-search:focus {
      border-color: #cc785c;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(204,120,92,.12);
    }

    #__chatgpt-anchor-refresh-btn {
      font-size: 20px;
      cursor: pointer;
      user-select: none;
    }

    #__chatgpt-anchor-list a {
      display: block;
      padding: 10px 12px;
      margin-bottom: 4px;
      border-radius: 8px;
      text-decoration: none;
      font-size: 14px;
      color: #374151;
      border-left: 3px solid transparent;
      line-height: 1.5;
    }

    #__chatgpt-anchor-list a:hover {
      background: #f3f4f6;
    }

    #__chatgpt-anchor-list a.current {
      background: #fef3f1;
      color: #cc785c;
      border-left-color: #cc785c;
      font-weight: 500;
    }

    @media (prefers-color-scheme: dark) {
      #__chatgpt-anchor-nav { background:#1f1f1f; color:#e5e7eb; border-left-color:#374151; }
      #__chatgpt-anchor-search { background:#2d2d2d; border-color:#374151; color:#e5e7eb; }
      #__chatgpt-anchor-list a { color:#d1d5db; }
      #__chatgpt-anchor-list a:hover { background:#2d2d2d; }
      #__chatgpt-anchor-list a.current { background:#2d1f1a; color:#f5b49a; }
    }
  `);

  /******************************************************************
   * DOM
   ******************************************************************/
  const nav = document.createElement('div');
  nav.id = '__chatgpt-anchor-nav';
  nav.innerHTML = `
    <div id="__chatgpt-anchor-search-container">
      <input id="__chatgpt-anchor-search" placeholder="搜索对话内容…" />
      <span id="__chatgpt-anchor-refresh-btn" title="重建索引">🔄</span>
    </div>
    <div id="__chatgpt-anchor-list"></div>
  `;
  document.body.appendChild(nav);

  const toggle = document.createElement('div');
  toggle.id = '__chatgpt-anchor-toggle';
  toggle.textContent = '💬';
  document.body.appendChild(toggle);

  const listEl = nav.querySelector('#__chatgpt-anchor-list');
  const searchInput = nav.querySelector('#__chatgpt-anchor-search');
  const refreshBtn = nav.querySelector('#__chatgpt-anchor-refresh-btn');

  let visible = false;

  toggle.onclick = () => {
    visible = !visible;
    nav.classList.toggle('visible', visible);
    document.querySelectorAll('main').forEach(el => {
      el.style.marginRight = visible ? '380px' : '0';
    });
  };

  /******************************************************************
   * 核心：稳定索引逻辑
   ******************************************************************/
  function getAllMessages() {
    return Array.from(
      document.querySelectorAll('article[data-message-author-role]')
    );
  }

  function getMessageText(article) {
    const block =
      article.querySelector('.whitespace-pre-wrap') ||
      article.querySelector('[dir="auto"]') ||
      article;
    return block.innerText.replace(/\s+/g, ' ').trim();
  }

  function rebuildIndex() {
    listEl.innerHTML = '';

    const messages = getAllMessages();

    messages.forEach((article, i) => {
      const role = article.getAttribute('data-message-author-role');
      const text = getMessageText(article);
      if (!text) return;

      const id = `__chatgpt-anchor-msg-${i}`;
      article.id = id;

      const preview = text.length > 60 ? text.slice(0, 60) + '…' : text;
      const prefix = role === 'user' ? 'Q' : 'A';

      const a = document.createElement('a');
      a.href = `#${id}`;
      a.textContent = `${prefix}${i + 1}. ${preview}`;
      a.dataset.searchText = text.toLowerCase();

      a.onclick = e => {
        e.preventDefault();
        listEl.querySelectorAll('.current').forEach(x => x.classList.remove('current'));
        a.classList.add('current');
        article.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      listEl.appendChild(a);
    });

    filterList();
  }

  function filterList() {
    const q = searchInput.value.trim().toLowerCase();
    listEl.querySelectorAll('a').forEach(a => {
      const hit = !q || a.dataset.searchText.includes(q);
      a.style.display = hit ? 'block' : 'none';
    });
  }

  searchInput.addEventListener('input', filterList);
  refreshBtn.addEventListener('click', rebuildIndex);

  /******************************************************************
   * 自动监听 ChatGPT 动态渲染
   ******************************************************************/
  let observer;
  function observe() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(rebuildIndex);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  observe();
  rebuildIndex();

  console.log('[ChatGPT Nav] v5.2 稳定索引版已加载');
})();

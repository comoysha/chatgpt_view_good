// 检查主要选择器是否还有效
console.log('聊天容器:', document.querySelector('.flex-row > .flex-1'));
console.log('对话文章:', document.querySelectorAll('article[data-testid^="conversation-turn-"]'));
console.log('详情区域:', document.querySelector("#thread > div > div.flex.basis-auto.flex-col.-mb-\\(--composer-overlap-px\\).\\[--composer-overlap-px\\:24px\\].grow.overflow-hidden > div > div > div.\\@thread-xl\\/thread\\:pt-header-height.mt-1\\.5.flex.flex-col.text-sm.pb-25"));
console.log('侧边栏:', document.querySelector('#__chatgpt-anchor-nav'));
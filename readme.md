## 解除对话栏宽度限制
1. 表格的列很多导致表格很宽，限制对话栏宽度就不好阅读

## 问题锚点 
我经常使用chatgpt.com
我经常在一个聊天里问很多问题，比如 20 个
我经常发现要找到之前我问过的问题非常难
所以我希望有一个锚点列表能帮助我滚动到我问过的问题，这个锚点列表正是我的问题列表
我要写一个可以用在 stylus里的样式代码，实际要配合 Tampermonkey 的 js 脚本使用

### 实现
- 动态在页面右侧创建一个可搜索的问题列表。
    - 要求是打开网页就立即出现已有的问题列表
    - 点击问题，滚动到对应的问题位置。
- 监听聊天记录的变化，当有新问题出现时自动更新列表。
- 监听浏览器 URL 的变化（SPA路由切换），在切换 ChatGPT 会话时重新初始化并加载对应会话的问题列表。
    - todo：需求没实现，暂时改为手动刷新
const zh = {
  // Header
  "app.title": "出行决策助手",
  "app.subtitle": "运行在 EdgeOne Makers 上，帮你比出附近最合适的商场",

  // Empty state
  "empty.title": "出行决策助手",
  "empty.hint": "告诉我你在哪个位置、想逛什么品牌，我会检索附近商场、核对门店、比较距离，给出有依据的推荐。",
  "empty.features": "高德地图 · 品牌核对 · 会话记忆",

  // Chat input
  "chat.placeholder": "说说你在哪、想逛什么…  ⏎ 发送 · Shift+⏎ 换行",
  "chat.hint": "由 OpenAI Agents SDK + EdgeOne Makers 驱动 · 距离与门店数据来自高德",

  // Preset questions
  "preset.1": "我在深圳北站，附近 3 公里有哪些商场？",
  "preset.2": "我想买优衣库，附近哪家商场有？哪家最近？",

  // Tool indicators
  "tool.locate": "定位解析",
  "tool.malls": "检索商场",
  "tool.brand": "核对品牌",
  "tool.rank": "排序推荐",

  // Status & errors
  "status.error": "⚠️ 请求失败，请检查后端服务是否启动。",
  "status.stopped": "⏹ *已停止生成*",
  "status.backendError": "⚠️ 后端中断请求失败，服务端可能仍在运行。",

  // Debug panel
  "debug.title": "传输流",
  "debug.events": "事件",
  "debug.clear": "清除",
  "debug.empty": "等待 SSE 事件...",
  "debug.emptyHint": "发送消息后，所有原始后端数据将在此处显示。",

  // Conversation sidebar
  "sidebar.label": "会话列表",
  "sidebar.title": "会话",
  "sidebar.newChat": "新建聊天",
  "sidebar.loading": "正在加载会话...",
  "sidebar.loadMore": "加载更多",
  "sidebar.loadingMore": "加载中...",
  "sidebar.emptyTitle": "暂无会话",
  "sidebar.emptyHint": "点击「新建聊天」开始第一段对话。",
  "sidebar.delete": "删除会话",
  "sidebar.deleteConfirm": "确定要永久删除这个会话吗？此操作不可恢复。",

  // Aria labels (button hover/screen-reader)
  "aria.send": "发送",
  "aria.clearHistory": "清除历史",
  "aria.stopGeneration": "停止生成",

  // Language toggle
  "lang.switch": "English",

  // ─── Floating bottom-right action badges ─────────────────────────────
  "floatingLink.deploy": "一键部署",
  "floatingLink.github": "GitHub",
} as const;

export default zh;

const en = {
  // Header
  "app.title": "Trip Decision Assistant",
  "app.subtitle": "Running on EdgeOne Makers — helps you pick the right mall nearby",
  "nav.backToPortfolio": "← Portfolio",
  "agent.loading": "Loading workspace…",

  // Empty state
  "empty.title": "Trip Decision Assistant",
  "empty.hint": "Tell me where you are and which brand you want. I'll check nearby malls, availability and distances.",
  "empty.features": "Amap · Brand check · Session memory",

  // Chat input
  "chat.placeholder": "Where are you, and what do you want to shop for?  ⏎ Send · Shift+⏎ Newline",
  "chat.hint": "Powered by OpenAI Agents SDK + EdgeOne Makers · Distances and stores from Amap",

  // Preset questions
  "preset.1": "I'm at Shenzhen North Station — which malls are within 3 km?",
  "preset.2": "I want to buy from Uniqlo. Which nearby mall has one, and which is closest?",
  "preset.3": "Is traffic bad to Bingo Space right now? Taxi or metro — which is faster?",

  // Tool indicators
  "tool.locate": "Geocode",
  "tool.malls": "Find malls",
  "tool.brand": "Check brand",
  "tool.rank": "Rank & pick",

  // Status & errors
  "status.error": "⚠️ Request failed. Please try again.",
  "status.auth": "⚠️ Invalid model API key (401). Check that the key matches the endpoint.",
  "status.quota": "⚠️ Demo quota exhausted (402). The model is unavailable for now.",
  "status.rateLimit": "⚠️ Too many requests (429). Wait a few seconds and retry.",
  "status.upstream": "⚠️ Upstream model service is temporarily unavailable.",
  "status.stopped": "⏹ *Generation stopped*",
  "status.backendError": "Backend abort request failed. The server may still be running.",

  // Debug panel
  "debug.title": "Trace",
  "debug.events": "events",
  "debug.clear": "Clear",
  "debug.empty": "Waiting for SSE events...",
  "debug.emptyHint": "After sending a message, all raw backend data will be displayed here.",
  "debug.tabSteps": "Steps",
  "debug.tabRaw": "Raw",
  "debug.stepHint": "After sending a message, the Agent's steps appear here in order.",
  "debug.stepAnswer": "Writing answer",
  "debug.stepDone": "Done",
  "debug.stepError": "Error",
  "debug.stepCount": "steps",

  // Conversation sidebar
  "sidebar.label": "Conversation list",
  "sidebar.title": "Chats",
  "sidebar.newChat": "New chat",
  "sidebar.loading": "Loading conversations...",
  "sidebar.loadMore": "Load more",
  "sidebar.loadingMore": "Loading...",
  "sidebar.emptyTitle": "No conversations yet",
  "sidebar.emptyHint": "Click \"New chat\" to start your first conversation.",
  "sidebar.delete": "Delete conversation",
  "sidebar.deleteConfirm": "Permanently delete this conversation? This cannot be undone.",

  // Aria labels (button hover/screen-reader)
  "aria.send": "Send",
  "aria.clearHistory": "Clear history",
  "aria.stopGeneration": "Stop generation",

  // Language toggle
  "lang.switch": "中文",

  // ─── Floating bottom-right action badges ─────────────────────────────
  "floatingLink.deploy": "Deploy console",
  "floatingLink.github": "GitHub",
} as const;

export default en;

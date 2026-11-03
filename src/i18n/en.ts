const en = {
  // Header
  "app.title": "Trip Decision Assistant",
  "app.subtitle": "Running on EdgeOne Makers — helps you pick the right mall nearby",

  // Empty state
  "empty.title": "Trip Decision Assistant",
  "empty.hint": "Tell me where you are and which brand you're after. I'll search nearby malls, check store availability, compare distances, and give you a grounded recommendation.",
  "empty.features": "Amap · Brand check · Session memory",

  // Chat input
  "chat.placeholder": "Where are you, and what do you want to shop for?  ⏎ Send · Shift+⏎ Newline",
  "chat.hint": "Powered by OpenAI Agents SDK + EdgeOne Makers · Distances and stores from Amap",

  // Preset questions
  "preset.1": "I'm at Shenzhen North Station — which malls are within 3 km?",
  "preset.2": "I want to buy from Uniqlo. Which nearby mall has one, and which is closest?",

  // Tool indicators
  "tool.locate": "Geocode",
  "tool.malls": "Find malls",
  "tool.brand": "Check brand",
  "tool.rank": "Rank & pick",

  // Status & errors
  "status.error": "Request failed. Please check if the backend service is running.",
  "status.stopped": "⏹ *Generation stopped*",
  "status.backendError": "Backend abort request failed. The server may still be running.",

  // Debug panel
  "debug.title": "Trace",
  "debug.events": "events",
  "debug.clear": "Clear",
  "debug.empty": "Waiting for SSE events...",
  "debug.emptyHint": "After sending a message, all raw backend data will be displayed here.",

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
  "floatingLink.deploy": "Deploy",
  "floatingLink.github": "GitHub",
} as const;

export default en;

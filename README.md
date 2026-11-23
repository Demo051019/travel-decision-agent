# Travel Decision Agent

A full-stack EdgeOne Makers Agent: streaming chat backed by the OpenAI Agents SDK (Python) that finds malls near you, checks brand availability, compares distances, and explains its recommendation.

**Framework:** OpenAI Agents SDK · **Category:** Agent · **Language:** Python

[![EdgeOne Makers](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/makers/project/makers-t9sghy2qvgjc/index)

<!-- ![preview](./assets/preview.png)  TODO: confirm -->

## Overview

Ask it "I'm at Shenzhen North Station, which mall nearby has a Uniqlo, and which is closest?" and it resolves the location, pulls real malls from Amap, checks whether the brand actually has a store inside or around each one, ranks them in code, and tells you how long walking / transit / taxi would take — plus whether the mall is still open and whether the road is congested right now.

The LLM only organises language. Distances, rankings, transit times and traffic levels are all computed in Python from Amap's response, so the numbers are reproducible and never invented.

- **SSE streaming chat** — token-by-token `text_delta` events plus `tool_called` events.
- **Four real Amap-backed tools** — `resolve_location`, `search_nearby_malls`, `check_brands_in_malls`, `rank_and_recommend`.
- **Decisions computed in code** — haversine distance, weighted ranking (distance / brand hit / rating), transit fares and walking times come from Amap route planning, not from the model.
- **Live traffic** — the top 3 malls each get walking / transit / taxi options; taxi routes are fetched from Amap v5 driving with `show_fields=cost,tmcs` and summarised into 畅通 / 缓行 / 拥堵 / 严重拥堵.
- **Opening hours** — POI `open_time` is parsed and compared with local time, so it warns you when a mall hasn't opened yet.
- **Asks instead of guessing** — no location, ambiguous place name, or zero results triggers a clarifying question; tool failures are reported with the actual reason.
- **Sticky conversation memory** — `context.store.openai_session(cid)` plugs straight into `Runner.run_streamed()`'s `session` parameter.
- **Honest cancellation** — backend `context.utils.abort_active_run()` truly interrupts the LLM call.
- **Two-folder backend** — long-running stateful work in `agents/`, short stateless `/history` in `cloud-functions/`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_GATEWAY_API_KEY` | Yes | Model gateway API key. Use your Makers Models API Key, or any OpenAI-compatible provider key. |
| `AI_GATEWAY_BASE_URL` | Yes | Gateway base URL. For Makers Models, use `https://ai-gateway.edgeone.link/v1`. |
| `AI_GATEWAY_MODEL` | No | Model ID. Defaults to `@makers/deepseek-v4-flash` (a free built-in model). |
| `AMAP_API_KEY` | Yes | Amap (高德) Web Service key for geocoding, POI search, and walking routes. Legacy name `AMAP_KEY` is also accepted. |

This project follows the OpenAI-compatible standard — point these at Makers Models or any compatible provider.

### How to get `AI_GATEWAY_API_KEY`

1. Open the [Makers Console](https://edgeone.ai/makers/new?s_url=https://console.tencentcloud.com/edgeone/makers).
2. Sign in and enable Makers.
3. Go to **Makers → Models → API Key** and create a key.
4. Copy it into `AI_GATEWAY_API_KEY`.

The built-in `@makers/deepseek-v4-flash` model is free with a usage cap and is suitable for prototyping. For production, bind your own paid provider (BYOK).

## Local Development

Prerequisites: Node.js ≥ 18, Python ≥ 3.10, and the EdgeOne CLI (`npm i -g edgeone`).

```bash
npm install
pip install -r requirements.txt
cp .env.example .env       # then fill in AI_GATEWAY_API_KEY / AI_GATEWAY_BASE_URL
edgeone makers dev
```

Local agent metrics & traces are exposed at `http://localhost:8080/agent-metrics`.

## Project Structure

```text
travel-decision-agent/
├── agents/                          # Stateful EdgeOne Makers Agent Functions (Python)
│   ├── chat/index.py               # POST /chat — SSE streaming chat
│   ├── chat/stop.py                # POST /chat/stop — abort active run
│   ├── _amap.py                    # Amap Web Service client (geocode / POI / walking / transit / driving v5)
│   ├── _geo.py                     # Distance, ranking, opening hours, traffic summary (pure functions)
│   ├── _prompts.py                 # Agent instructions, clarification rules, failure wording
│   ├── _tools.py                   # The four @function_tool definitions + search cache
│   └── _logger.py                  # Logger utility (private)
├── cloud-functions/                 # Stateless EdgeOne Makers Python cloud functions
│   ├── history/index.py            # POST /history — load conversation messages
│   └── _logger.py                  # Logger utility
├── src/                             # React + Vite + TypeScript frontend
│   ├── App.tsx                     # Main app + SSE stream lifecycle
│   ├── api.ts                      # /chat, /chat/stop, /history wrappers
│   └── components/                 # ChatWindow, ChatInput, CodeViewer, ToolIndicators, ...
├── package.json                     # Frontend dependencies
├── requirements.txt                 # Python dependencies
├── edgeone.json                     # framework=openai-agents-sdk
├── vite.config.ts
├── tsconfig.json
└── .gitignore
```

> Files prefixed with `_` are private modules — not exposed as public routes.

## Resources

- [EdgeOne Makers Agents — Documentation](https://pages.edgeone.ai/document/agents)
- [EdgeOne Makers — Quick Start](https://pages.edgeone.ai/document/agents-quick-start)
- [Makers Models](https://pages.edgeone.ai/document/models)

## License

MIT.

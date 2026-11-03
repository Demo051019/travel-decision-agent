# 出行决策助手 (Travel Decision Agent)

跑在 EdgeOne Makers 上的全栈 Python Agent：基于 OpenAI Agents SDK（Python）的流式聊天，能根据用户位置检索附近商场、核对品牌门店、比较距离并给出有依据的推荐。

**Framework：** OpenAI Agents SDK · **Category：** Agent · **Language：** Python

[![Deploy to EdgeOne Makers](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?template=openai-agents-starter-python)

<!-- ![preview](./assets/preview.png)  TODO: confirm -->

## 概述

基于 EdgeOne Makers 的 OpenAI Agents 模板改造而来，把示例工具换成了真实的出行决策链路：高德地图提供位置与 POI 数据，代码负责排序打分，模型只负责组织语言。

- **四段式工具链** —— `resolve_location` → `search_nearby_malls` → `check_brands_in_malls` → `rank_and_recommend`。
- **search_id 传递** —— 候选商场缓存在服务端，工具之间只传一个短 ID，不让模型转抄 JSON（转抄会丢字段且浪费上下文）。
- **排序在代码里算** —— 距离/品牌命中/评分三项加权，结果可复现；模型不许自己估算数字。
- **信息不足主动追问** —— 没给位置、地点有歧义、范围内无结果时先问清楚，不猜。
- **失败必给原因** —— 工具不抛异常，统一返回 `error_code` + `reason` + `hint`，模型据此解释"为什么没查成"。
- **SSE 流式聊天** —— 逐 token 推 `text_delta`，命中工具时推 `tool_called`。
- **会话粘性记忆** —— `context.store.openai_session(cid)` 直接喂给 `Runner.run_streamed()` 的 `session` 参数。
- **可信取消** —— 后端 `context.utils.abort_active_run()` 真正中断 LLM 调用。
- **后端拆两层** —— 有状态的长连接放 `agents/`，无状态的 `/history` 放 `cloud-functions/`。

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `AI_GATEWAY_API_KEY` | 是 | 模型网关 API Key。可填 Makers Models 的 API Key，也可以是任意 OpenAI 兼容服务商的 Key。 |
| `AI_GATEWAY_BASE_URL` | 是 | 网关 Base URL。Makers Models 请使用 `https://ai-gateway.edgeone.link/v1`。 |
| `AI_GATEWAY_MODEL` | 否 | 模型 ID。默认 `@makers/deepseek-v4-flash`（内置免费模型）。 |
| `AMAP_API_KEY` | 是 | 高德地图 Web 服务 Key，用于地点解析、POI 检索、路径规划。兼容旧名 `AMAP_KEY`。 |

模板遵循 OpenAI 兼容协议，可以指向 Makers Models，也可以指向任意 OpenAI 兼容的服务商。

### 如何获取 `AMAP_API_KEY`

1. 打开 [高德开放平台控制台](https://console.amap.com/dev/key/app)。
2. 「应用管理 → 创建新应用 → 添加 Key」。
3. **服务平台必须选「Web服务」**（选成「Web端(JS API)」会返回 `10009` 错误）。
4. 该 Key 需可用：地理编码、搜索 POI、路径规划。

> 高德对并发敏感：同一 Key 并发过高会返回 `10021`（并发超限）。代码里已把品牌核对的并发压到 2，并带退避重试。

### 如何获取 `AI_GATEWAY_API_KEY`

1. 打开 [Makers 控制台](https://console.cloud.tencent.com/edgeone/makers)。
2. 登录并开通 Makers。
3. 进入 **Makers → Models → API Key**，新建一个 Key。
4. 把它粘到 `AI_GATEWAY_API_KEY`。

内置的 `@makers/deepseek-v4-flash` 免费但有用量限制，适合验证；生产建议自行绑定付费厂商（BYOK）。

## 本地开发

前置依赖：Node.js ≥ 18、Python ≥ 3.10，以及 EdgeOne CLI（`npm i -g edgeone`）。

```bash
npm install
pip install -r requirements.txt
cp .env.example .env       # 然后填入 AI_GATEWAY_API_KEY / AI_GATEWAY_BASE_URL
edgeone makers dev
```

本地观测面板：`http://localhost:8080/agent-metrics`。

## 项目结构

```text
travel-decision-agent/
├── agents/                          # 有状态的 EdgeOne Makers Agent Functions（Python）
│   ├── chat/index.py               # POST /chat —— SSE 流式聊天
│   ├── chat/stop.py                # POST /chat/stop —— 中断当前 agent
│   ├── _amap.py                    # 高德 Web 服务客户端（geocode / POI / 步行路径）
│   ├── _geo.py                     # 距离计算与加权排序（纯函数，无网络）
│   ├── _tools.py                   # 四个 Agent 工具（私有）
│   ├── _prompts.py                 # instructions / 追问规则 / 失败话术
│   └── _logger.py                  # 日志工具（私有）
├── cloud-functions/                 # 无状态的 EdgeOne Makers Python cloud functions
│   ├── history/index.py            # POST /history —— 拉取对话消息
│   ├── conversations/index.py      # POST /conversations —— 会话列表
│   ├── clear-history/index.py      # POST /clear-history —— 清空历史
│   ├── delete-conversation/index.py# POST /delete-conversation —— 删除会话
│   └── _logger.py                  # 日志工具
├── src/                             # React + Vite + TypeScript 前端
│   ├── App.tsx                     # 主应用 + SSE 流生命周期管理
│   ├── api.ts                      # /chat、/chat/stop、/history 接口封装
│   └── components/                 # ChatWindow、ChatInput、CodeViewer、ToolIndicators 等
├── package.json                     # 前端依赖
├── requirements.txt                 # Python 依赖（含 httpx）
├── edgeone.json                     # framework=openai-agents-sdk
├── vite.config.ts
├── tsconfig.json
└── .gitignore
```

> 以 `_` 开头的文件是私有模块，不会暴露为公开路由。

## 资源

- [EdgeOne Makers Agents 文档](https://cloud.tencent.com/document/product/1552/132759)
- [EdgeOne Makers 快速开始](https://cloud.tencent.com/document/product/1552/132786)
- [Makers Models](https://cloud.tencent.com/document/product/1552/132748)

## License

MIT.

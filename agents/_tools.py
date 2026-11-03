"""
出行决策 Agent 的工具集（私有模块，`_` 前缀不生成路由）。

四个工具构成一条完整链路：
  1. resolve_location      地点文本 → 坐标（含歧义/找不到时主动追问）
  2. search_nearby_malls   坐标 → 附近商场，返回 search_id 供后续复用
  3. check_brands_in_malls 按 search_id 逐家核对品牌（并发，带容错）
  4. rank_and_recommend    按 search_id 加权排序 + 推荐理由（可精算步行距离）

为什么用 search_id 而不是把 JSON 在工具间传递
--------------------------------------------
最初的实现让模型把商场数组原样转抄给下一个工具，实测有两个硬伤：
  · 模型转抄会丢字段（坐标丢失导致"该商场缺少坐标"的假失败）；
  · 6 家商场的 JSON 约 1.5k token，每次转抄都在烧上下文、拉长响应。
改成服务端按 search_id 缓存候选后，模型只需要记住一个 10 位短 ID。

错误处理约定
------------
工具**绝不抛异常**。所有失败都返回 {"ok": false, "reason": ..., "hint": ...}，
让模型拿到明确的失败原因，从而能向用户解释"为什么没查成"，
而不是在异常中断里丢掉上下文、编一个看起来合理的答案。
"""

from __future__ import annotations

import asyncio
import json
import time
import uuid
from typing import Annotated, Any

from agents import function_tool

from . import _amap, _geo

# 单次请求最多核对的商场数量。必须与 search_nearby_malls 的 limit 上限（15）一致：
# 之前设成 8，而检索可以返回 15 家，模型看到 checked=8 < count=10 就误报
# 「有 2 家核对失败」——其实是静默截断，白白让用户以为接口不稳定。
_MAX_MALLS_PER_CHECK = 15
# 并发上限：个人版高德 Key 会报 10021（并发超限），2 是实测稳的上限，
# 叠加 _amap 里的退避重试，6 家商场核对基本不会失败。
_CONCURRENCY = 2

# 候选缓存：search_id -> 检索结果。工具之间靠它传递数据，不经过模型。
_CACHE_TTL_S = 15 * 60
_CACHE_MAX_ENTRIES = 200
_SEARCH_CACHE: dict[str, dict[str, Any]] = {}

_PREFERENCE_LABELS = {
    "balanced": "综合（距离/品牌/评分均衡）",
    "nearest": "最近优先",
    "brand": "品牌优先",
    "rating": "评分优先",
}

_QUOTA_HINT = "这项信息暂时查不到，可以稍后再试，或直接告诉我商场名称我来核对"

# 高德在只匹配到一部分时会返回「省级/市级」这种粗糙兜底坐标，
# 它跟真正的同名地点不是一回事，参与歧义判断会造成大量误追问。
# 例：搜「深圳北站」会返回「深圳北站(公交站)」+「广东省深圳市(level=市)」。
_COARSE_LEVELS = {"国家", "省", "市", "区县"}


def _dumps(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False)


def _error_payload(exc: _amap.AmapError) -> dict[str, Any]:
    payload = exc.to_dict()
    payload["next_step"] = _QUOTA_HINT
    return payload


# ========== 候选缓存 ==========
def _cache_sweep() -> None:
    """清理过期条目；超出上限时丢掉最早写入的。"""
    now = time.monotonic()
    expired = [k for k, v in _SEARCH_CACHE.items() if now - v["created"] > _CACHE_TTL_S]
    for key in expired:
        _SEARCH_CACHE.pop(key, None)

    overflow = len(_SEARCH_CACHE) - _CACHE_MAX_ENTRIES
    if overflow > 0:
        for key in sorted(_SEARCH_CACHE, key=lambda k: _SEARCH_CACHE[k]["created"])[:overflow]:
            _SEARCH_CACHE.pop(key, None)


def _cache_put(malls: list[dict[str, Any]], origin: dict[str, float], radius_m: int) -> str:
    _cache_sweep()
    search_id = uuid.uuid4().hex[:10]
    _SEARCH_CACHE[search_id] = {
        "malls": malls,
        "origin": origin,
        "radius_m": radius_m,
        "brand": None,
        "brand_matches": None,
        "created": time.monotonic(),
    }
    return search_id


def _cache_get(search_id: str) -> dict[str, Any] | None:
    entry = _SEARCH_CACHE.get((search_id or "").strip())
    if not entry:
        return None
    if time.monotonic() - entry["created"] > _CACHE_TTL_S:
        _SEARCH_CACHE.pop(search_id.strip(), None)
        return None
    return entry


def _expired_payload(search_id: str) -> dict[str, Any]:
    return {
        "ok": False,
        "need_clarification": True,
        "reason": f"检索结果 {search_id or '(空)'} 已过期或不存在（服务可能重启过）",
        "question": "我重新帮你搜一次附近的商场？告诉我位置就行。",
    }


# ========== Tool 1: 地点 → 坐标 ==========
@function_tool
async def resolve_location(
    address: Annotated[str, "用户描述的地点原文，例如「深圳北站」「深圳市南山区科技园」"],
    city: Annotated[str, "可选，城市名，用于消除同名地点歧义。不确定就留空"] = "",
) -> str:
    """把用户说的地点解析成经纬度坐标。

    返回 ok=true 时带上 lng/lat 供后续检索使用。
    地点不存在、或同一名称对应多个相距较远的地点时，返回 need_clarification=true
    并附带一个具体问题 —— 此时应当先向用户追问，不要自行猜测。
    """
    if not address or not address.strip():
        return _dumps(
            {
                "ok": False,
                "need_clarification": True,
                "reason": "没有提供地点",
                "question": "你现在在哪个位置附近？可以说地标、地铁站或商圈名，例如「深圳北站」。",
            }
        )

    try:
        results = await _amap.geocode(address, city=city.strip() or None)
    except _amap.AmapError as exc:
        return _dumps(_error_payload(exc))

    if not results:
        return _dumps(
            {
                "ok": False,
                "need_clarification": True,
                "reason": f"没有解析到「{address}」这个地点",
                "question": "能补充城市或附近地标吗？例如「深圳市南山区科技园」，这样定位会更准。",
            }
        )

    # 丢掉「省/市/区县」这类粗糙兜底结果，只保留真正指向某个地点的候选。
    # 若全是粗糙结果（用户直接搜城市名），则原样保留。
    precise = [item for item in results if item.get("level") not in _COARSE_LEVELS]
    if precise:
        results = precise

    top = results[0]

    # 同名地点相距超过 2km 视为歧义，必须追问而不是默认取第一个
    if len(results) > 1:
        second = results[1]
        spread = _geo.haversine_m(top["lng"], top["lat"], second["lng"], second["lat"])
        if spread > 2000:
            options = [item["formatted_address"] for item in results[:3]]
            return _dumps(
                {
                    "ok": False,
                    "need_clarification": True,
                    "reason": f"「{address}」匹配到多个相距较远的地点",
                    "candidates": options,
                    "question": "你指的是哪一个？" + " / ".join(options),
                }
            )

    return _dumps(
        {
            "ok": True,
            "lng": top["lng"],
            "lat": top["lat"],
            "formatted_address": top["formatted_address"],
            "city": top["city"],
            "district": top["district"],
            "level": top["level"],
        }
    )


# ========== Tool 2: 附近商场 ==========
@function_tool
async def search_nearby_malls(
    lng: Annotated[float, "中心点经度，来自 resolve_location 的返回值"],
    lat: Annotated[float, "中心点纬度，来自 resolve_location 的返回值"],
    radius_m: Annotated[int, "检索半径（米），默认 3000，范围 200~50000"] = 3000,
    limit: Annotated[int, "返回条数，默认 6，范围 1~15"] = 6,
) -> str:
    """按坐标检索附近的商场（购物中心 / 普通商场），结果按距离升序。

    返回 search_id —— 后续的核对品牌和排序推荐都用这个 ID，不要自己转抄商场列表。
    附近没有商场时返回 need_clarification=true，提示是否扩大检索范围。
    """
    radius = max(200, min(int(radius_m), 50000))
    count = max(1, min(int(limit), 15))

    try:
        malls = await _amap.malls_around(lng, lat, radius_m=radius, limit=count)
    except _amap.AmapError as exc:
        return _dumps(_error_payload(exc))

    if not malls:
        radius_km = radius / 1000
        return _dumps(
            {
                "ok": False,
                "need_clarification": True,
                "reason": f"周边 {radius_km:.1f} 公里内没有检索到商场",
                "question": f"要不要把范围扩大到 {radius_km * 2:.0f} 公里再看看？或者告诉我一个更靠近商圈的位置。",
            }
        )

    for mall in malls:
        mall["distance_text"] = _geo.format_distance(mall.get("distance_m"))
        mall["walk_minutes"] = _geo.walk_minutes(mall.get("distance_m"))

    search_id = _cache_put(malls, {"lng": float(lng), "lat": float(lat)}, radius)

    return _dumps(
        {
            "ok": True,
            "search_id": search_id,
            "origin": {"lng": lng, "lat": lat},
            "radius_m": radius,
            "count": len(malls),
            "malls": [
                {
                    "name": m["name"],
                    "distance_m": m.get("distance_m"),
                    "distance_text": m.get("distance_text"),
                    "walk_minutes": m.get("walk_minutes"),
                    "rating": m.get("rating"),
                    "address": m.get("address"),
                }
                for m in malls
            ],
        }
    )


# ========== Tool 3: 品牌核对 ==========
@function_tool
async def check_brands_in_malls(
    brand: Annotated[str, "要核对的品牌名，例如「星巴克」「优衣库」"],
    search_id: Annotated[str, "search_nearby_malls 返回的 search_id，原样传入"],
    radius_m: Annotated[int, "在每家商场周边多大范围内检索该品牌（米），默认 400；想放宽就传更大值"] = 400,
) -> str:
    """按 search_id 逐家商场核对目标品牌是否有门店。

    返回的 `matches` 是每家商场的核对明细；`not_checked` 是超出单次核对上限、
    根本没核对的商场（不要把它说成"核对失败"）。
    如果所有候选商场都没命中，会自动以用户位置为中心再搜一次该品牌，
    结果放在 `nearby_brand_stores` —— 这些门店不在候选商场里，但可能离用户更近/更值得去。

    只调用一次即可：需要更大范围就直接传更大的 radius_m，不要重复调用。
    单家商场检索失败不会影响其他商场，失败原因会记录在该条目的 error 字段里。
    """
    name = (brand or "").strip()
    if not name:
        return _dumps(
            {
                "ok": False,
                "need_clarification": True,
                "reason": "没有提供要核对的品牌",
                "question": "你想找哪个品牌？例如「星巴克」「优衣库」「Apple Store」。",
            }
        )

    entry = _cache_get(search_id)
    if not entry:
        return _dumps(_expired_payload(search_id))

    all_malls = entry["malls"]
    malls = all_malls[:_MAX_MALLS_PER_CHECK]
    skipped = all_malls[_MAX_MALLS_PER_CHECK:]
    radius = max(100, min(int(radius_m), 5000))
    semaphore = asyncio.Semaphore(_CONCURRENCY)

    async def check_one(mall: dict[str, Any]) -> dict[str, Any]:
        mall_name = mall.get("name") or "未命名商场"
        lng, lat = mall.get("lng"), mall.get("lat")
        base = {"mall_name": mall_name, "distance_m": mall.get("distance_m")}

        if not isinstance(lng, (int, float)) or not isinstance(lat, (int, float)):
            return {**base, "brand_found": False, "stores": [], "error": "该商场缺少坐标，无法核对"}

        async with semaphore:
            try:
                stores = await _amap.brand_around(name, lng, lat, radius_m=radius, limit=3)
            except _amap.AmapError as exc:
                return {**base, "brand_found": False, "stores": [], "error": exc.reason}

        return {
            **base,
            "brand_found": bool(stores),
            "stores": stores,
            "checked_radius_m": radius,
        }

    matches = await asyncio.gather(*(check_one(mall) for mall in malls))
    matched = [item for item in matches if item.get("brand_found")]
    failed = [item for item in matches if item.get("error")]

    # 候选商场全部没命中时，再从用户所在位置整体搜一次这个品牌。
    # 为什么必须有：候选商场只取最近的若干家「购物中心」，品牌开在更远的商场、
    # 或者开在街边独立门面时都会被漏掉。实测「深圳北站 + 优衣库」：10 家候选
    # 商场周边 500 米内都没有，但 2.1 公里外的龙华星河 COCOCity 明明有门店。
    # 只回「都没有」等于给了用户错误结论。
    nearby_stores: list[dict[str, Any]] = []
    nearby_radius = 0
    nearby_error = ""
    if not matched:
        origin = entry.get("origin") or {}
        o_lng, o_lat = origin.get("lng"), origin.get("lat")
        if isinstance(o_lng, (int, float)) and isinstance(o_lat, (int, float)):
            nearby_radius = max(1000, min(int(entry.get("radius_m") or 3000), 5000))
            try:
                nearby_stores = await _amap.brand_around(
                    name, o_lng, o_lat, radius_m=nearby_radius, limit=5
                )
            except _amap.AmapError as exc:
                nearby_error = exc.reason

    # 把结果写回缓存，供 rank_and_recommend 直接使用
    entry["brand"] = name
    entry["brand_matches"] = matches
    entry["brand_radius_m"] = radius
    entry["brand_nearby_stores"] = nearby_stores

    if matched:
        note = f"共核对 {len(matches)} 家商场，{len(matched)} 家周边 {radius} 米内找到{name}门店"
    else:
        note = f"这 {len(matches)} 家商场周边 {radius} 米内都没有找到{name}"
        if nearby_stores:
            nearest = nearby_stores[0]
            note += (
                f"；但以你的位置为中心 {nearby_radius / 1000:.1f} 公里内还有 "
                f"{len(nearby_stores)} 家{name}门店，最近的是「{nearest.get('name')}」"
                f"（约 {nearest.get('distance_m')} 米），它不在候选商场里"
            )
        elif nearby_error:
            note += f"；想确认更远处有没有门店时接口失败：{nearby_error}"
    if failed:
        note += f"；其中 {len(failed)} 家核对失败，已如实标注"
    if skipped:
        note += f"；另有 {len(skipped)} 家候选超出单次核对上限，未核对"

    return _dumps(
        {
            "ok": True,
            "search_id": search_id,
            "brand": name,
            "radius_m": radius,
            "checked": len(matches),
            "matched_count": len(matched),
            "matches": matches,
            "not_checked": [m.get("name") for m in skipped],
            "nearby_brand_stores": nearby_stores,
            "nearby_search_radius_m": nearby_radius,
            "note": note,
        }
    )


# ========== Tool 4: 排序与推荐 ==========
@function_tool
async def rank_and_recommend(
    search_id: Annotated[str, "search_nearby_malls 返回的 search_id，原样传入"],
    preference: Annotated[str, "排序偏好：balanced=综合(默认) / nearest=最近 / brand=品牌优先 / rating=评分优先"] = "balanced",
    refine_walking: Annotated[bool, "是否为前 3 名精算真实步行距离，默认 True"] = True,
) -> str:
    """按 search_id 里的候选商场做加权排序，输出前 3 名及各自的具体推荐理由。

    会自动合并同一次检索里的品牌核对结果（如果有）。
    打分权重按偏好切换：距离、品牌命中、评分三项加权。
    """
    entry = _cache_get(search_id)
    if not entry:
        return _dumps(_expired_payload(search_id))

    malls: list[dict[str, Any]] = entry["malls"]
    if not malls:
        return _dumps(
            {
                "ok": False,
                "need_clarification": True,
                "reason": "这次检索没有候选商场",
                "question": "要我先按你的位置搜一下附近的商场吗？告诉我大概地点就行。",
            }
        )

    brand: str | None = entry.get("brand")
    matches: list[dict[str, Any]] | None = entry.get("brand_matches")

    # 合并品牌核对结果
    candidates: list[dict[str, Any]] = []
    match_by_name = {m.get("mall_name"): m for m in (matches or [])}
    for mall in malls:
        item = dict(mall)
        hit = match_by_name.get(mall.get("name"))
        if hit is not None:
            item["brand_found"] = bool(hit.get("brand_found"))
            item["brand_stores"] = hit.get("stores") or []
        if brand and (hit is None or brand not in str(hit.get("mall_name", ""))):
            item["brand_name_checked"] = brand
        candidates.append(item)

    pref = (preference or "balanced").strip().lower()
    ranked = _geo.rank_candidates(candidates, preference=pref, brand=brand)

    # 可选：为前 3 名精算真实步行距离，让"步行 X 分钟"更可信
    origin = entry.get("origin") or {}
    origin_lng, origin_lat = origin.get("lng"), origin.get("lat")
    if refine_walking and isinstance(origin_lng, (int, float)) and isinstance(origin_lat, (int, float)):
        semaphore = asyncio.Semaphore(_CONCURRENCY)

        async def refine(item: dict[str, Any]) -> None:
            lng, lat = item.get("lng"), item.get("lat")
            if not isinstance(lng, (int, float)) or not isinstance(lat, (int, float)):
                return
            async with semaphore:
                try:
                    route = await _amap.walking_route((origin_lng, origin_lat), (lng, lat))
                except _amap.AmapError:
                    return  # 精算失败就保留直线距离，不影响推荐
            item["straight_distance_m"] = item.get("distance_m")
            item["distance_m"] = route["distance_m"]
            item["distance_text"] = _geo.format_distance(route["distance_m"])
            duration = route.get("duration_s")
            item["walk_minutes"] = (
                max(1, round(duration / 60)) if duration else _geo.walk_minutes(route["distance_m"])
            )
            item["distance_source"] = "步行路线"

        await asyncio.gather(*(refine(item) for item in ranked))

    best = ranked[0] if ranked else None
    return _dumps(
        {
            "ok": True,
            "search_id": search_id,
            "preference": pref,
            "preference_label": _PREFERENCE_LABELS.get(pref, _PREFERENCE_LABELS["balanced"]),
            "weights": _geo.resolve_weights(pref),
            "brand": brand,
            "count": len(ranked),
            "best_pick": best.get("name") if best else None,
            "recommendations": [
                {
                    "rank": item["rank"],
                    "name": item.get("name"),
                    "distance_text": item.get("distance_text"),
                    "walk_minutes": item.get("walk_minutes"),
                    "distance_source": item.get("distance_source", "直线距离"),
                    "rating": item.get("rating"),
                    "brand_found": item.get("brand_found"),
                    "brand_stores": [s.get("name") for s in (item.get("brand_stores") or [])][:2],
                    "score": item.get("score"),
                    "reason": item.get("reason"),
                }
                for item in ranked
            ],
        }
    )

"""
几何与排序计算（私有模块，`_` 前缀不生成路由）。

这里全部是纯函数，不发起任何网络请求 —— 排序逻辑放在代码里算，
比让大模型"心算"距离可靠得多，也让推荐结果可复现、可解释。
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Any

EARTH_RADIUS_M = 6_371_000.0

# 城市步行经验速度：约 4.8 km/h，比纯理论值更贴近真实路况
WALK_METERS_PER_MINUTE = 80.0

# 不同偏好下的权重分配：距离 / 品牌命中 / 商场评分
PREFERENCE_WEIGHTS: dict[str, dict[str, float]] = {
    "balanced": {"distance": 0.45, "brand": 0.35, "rating": 0.20},
    "nearest": {"distance": 0.75, "brand": 0.10, "rating": 0.15},
    "brand": {"distance": 0.20, "brand": 0.65, "rating": 0.15},
    "rating": {"distance": 0.25, "brand": 0.15, "rating": 0.60},
}

DEFAULT_PREFERENCE = "balanced"


def haversine_m(lng1: float, lat1: float, lng2: float, lat2: float) -> float:
    """两点间大圆距离（米）。"""
    lon1, lat1_r, lon2, lat2_r = map(
        math.radians, (lng1, lat1, lng2, lat2)
    )
    dlon = lon2 - lon1
    dlat = lat2_r - lat1_r
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def format_distance(meters: float | int | None) -> str:
    """把米数转成人话：850 米 / 1.3 公里。"""
    if meters is None:
        return "距离未知"
    value = float(meters)
    if value < 1000:
        return f"{int(round(value))} 米"
    return f"{value / 1000:.1f} 公里"


def walk_minutes(meters: float | int | None) -> int | None:
    """按经验步速估算步行分钟数，向上取整且至少 1 分钟。"""
    if meters is None or meters <= 0:
        return None
    return max(1, math.ceil(float(meters) / WALK_METERS_PER_MINUTE))


# ========== 时间 / 营业状态 / 交通时长 ==========
CST = timezone(timedelta(hours=8))

# 交通方式的中文标签，工具输出与提示词共用同一套说法，避免前后不一致
TRAVEL_LABELS: dict[str, str] = {
    "walk": "步行",
    "transit": "公交/地铁",
    "drive": "打车/驾车",
}


def now_cst() -> datetime:
    """统一用北京时间判断营业状态，避免服务器时区是 UTC 时判错。"""
    return datetime.now(CST)


def parse_open_range(open_time: str | None) -> tuple[int, int] | None:
    """把「10:00-22:00」解析成当天分钟数区间；跨天（如 18:00-02:00）也支持。

    解析不出来就返回 None —— 宁可说「营业时间未知」，也不要猜。
    """
    if not open_time or "-" not in open_time:
        return None
    start_raw, end_raw = open_time.split("-", 1)
    try:
        sh, sm = (int(x) for x in start_raw.strip().split(":"))
        eh, em = (int(x) for x in end_raw.strip().split(":"))
    except (TypeError, ValueError):
        return None
    if not (0 <= sh <= 24 and 0 <= eh <= 24 and 0 <= sm < 60 and 0 <= em < 60):
        return None
    return sh * 60 + sm, eh * 60 + em


def is_open_now(open_time: str | None, at: datetime | None = None) -> bool | None:
    """当前是否在营业时间内。返回 None 表示没有可用营业时间，不做判断。"""
    parsed = parse_open_range(open_time)
    if parsed is None:
        return None
    start, end = parsed
    moment = at or now_cst()
    current = moment.hour * 60 + moment.minute
    if start == end:
        return True  # 24 小时营业的常见写法
    if start < end:
        return start <= current < end
    # 跨天营业：18:00-02:00 → 当前 >= 18:00 或 < 02:00 都算营业中
    return current >= start or current < end


def format_duration(seconds: float | int | None) -> str:
    """秒 → 人话：26 分钟 / 1 小时 5 分钟。"""
    if not isinstance(seconds, (int, float)) or seconds <= 0:
        return "时长未知"
    minutes = int(round(float(seconds) / 60))
    if minutes < 60:
        return f"{max(1, minutes)} 分钟"
    hours, rest = divmod(minutes, 60)
    return f"{hours} 小时 {rest} 分钟" if rest else f"{hours} 小时"


TRAFFIC_LEVELS = ("畅通", "缓行", "拥堵", "严重拥堵")
# 未知路况（隧道、园区内部路等）不计入分母，否则会把畅通的路误判成堵
TRAFFIC_UNKNOWN = "未知"


def summarize_traffic(
    segments: list[dict[str, Any]] | None,
    total_distance_m: float | int | None = None,
) -> dict[str, Any]:
    """把逐段路况（高德 tmc）汇总成一句能直接说给用户的话。

    segments 形如 [{"status": "拥堵", "distance_m": 1200}, ...]。
    只统计有明确状态的路段；全是「未知」时 level 返回 None，
    表示没有可用实时路况 —— 让模型如实说不知道，而不是猜「应该不堵」。
    """
    buckets: dict[str, int] = {level: 0 for level in TRAFFIC_LEVELS}
    unknown_m = 0

    for seg in segments or []:
        status = str(seg.get("status") or "").strip()
        distance = seg.get("distance_m")
        if not isinstance(distance, (int, float)) or distance <= 0:
            continue
        if status in buckets:
            buckets[status] += int(distance)
        else:
            unknown_m += int(distance)

    known_m = sum(buckets.values())
    total_m = int(total_distance_m) if isinstance(total_distance_m, (int, float)) else known_m

    if known_m <= 0:
        return {
            "level": None,
            "level_text": "实时路况未知",
            "known_m": 0,
            "total_m": total_m,
            "congested_m": 0,
            "congested_share": None,
            "text": "高德没有返回这条路线的实时路况",
            "detail": "",
        }

    congested = buckets["拥堵"] + buckets["严重拥堵"]
    congested_share = congested / known_m
    slow_share = buckets["缓行"] / known_m
    severe_share = buckets["严重拥堵"] / known_m

    if severe_share >= 0.15 or congested_share >= 0.3:
        level = "严重拥堵" if severe_share >= 0.15 else "拥堵"
    elif congested_share >= 0.1 or slow_share >= 0.35:
        level = "缓行"
    else:
        level = "畅通"

    parts = []
    for name in TRAFFIC_LEVELS:
        if buckets[name] > 0:
            parts.append(f"{name} {format_distance(buckets[name])}")
    detail = "、".join(parts)
    share_text = f"，拥堵路段占 {congested_share:.0%}" if congested > 0 else ""

    if level == "畅通":
        text = f"沿途 {format_distance(known_m)}基本畅通"
    else:
        text = f"沿途 {format_distance(known_m)}中，{detail}{share_text}"

    return {
        "level": level,
        "level_text": f"实时路况：{level}",
        "known_m": known_m,
        "total_m": total_m,
        "unknown_m": unknown_m,
        "congested_m": congested,
        "congested_share": round(congested_share, 3),
        "slow_m": buckets["缓行"],
        "text": text,
        "detail": detail,
    }


def build_travel_option(
    mode: str,
    distance_m: float | int | None,
    duration_s: float | int | None,
    cost_yuan: float | None = None,
    lines: list[str] | None = None,
) -> dict[str, Any]:
    """统一的交通方式输出结构，前端和提示词都按这个形状读。"""
    label = TRAVEL_LABELS.get(mode, mode)
    option: dict[str, Any] = {
        "mode": mode,
        "label": label,
        "distance_text": format_distance(distance_m),
        "duration_text": format_duration(duration_s),
        "text": f"{label} {format_duration(duration_s)}",
    }
    if isinstance(duration_s, (int, float)) and duration_s > 0:
        option["duration_min"] = max(1, int(round(float(duration_s) / 60)))
    if cost_yuan is not None:
        option["cost_yuan"] = cost_yuan
        option["text"] += f"（约 {cost_yuan:g} 元）"
    if lines:
        option["lines"] = lines[:2]
        option["text"] += f"，{' / '.join(lines[:2])}"
    return option


def resolve_weights(preference: str | None) -> dict[str, float]:
    """把偏好字符串映射成权重；未知偏好回落到综合模式。"""
    key = (preference or DEFAULT_PREFERENCE).strip().lower()
    return dict(PREFERENCE_WEIGHTS.get(key, PREFERENCE_WEIGHTS[DEFAULT_PREFERENCE]))


def _rating_score(rating: Any) -> float:
    """评分归一化。缺评分时给中性分 0.6，避免因数据缺失被一票否决。"""
    try:
        value = float(rating)
    except (TypeError, ValueError):
        return 0.6
    if value <= 0:
        return 0.6
    return min(value / 5.0, 1.0)


def score_candidate(
    candidate: dict[str, Any],
    weights: dict[str, float],
    max_distance_m: float,
) -> float:
    """加权打分：距离越近、有目标品牌、评分越高，分数越高。"""
    distance = candidate.get("distance_m")
    if not isinstance(distance, (int, float)) or distance < 0:
        distance = max_distance_m  # 距离未知时按最差处理

    if max_distance_m > 0:
        distance_score = max(0.0, 1.0 - float(distance) / max_distance_m)
    else:
        distance_score = 0.0

    brand_score = 1.0 if candidate.get("brand_found") else 0.0
    rating_score = _rating_score(candidate.get("rating"))

    total = (
        weights["distance"] * distance_score
        + weights["brand"] * brand_score
        + weights["rating"] * rating_score
    )
    return round(total, 4)


def build_reasons(
    candidate: dict[str, Any],
    brand: str | None,
    is_nearest: bool,
    is_best_rated: bool,
) -> list[str]:
    """生成推荐理由。理由必须是用户能看懂的具体事实，不能是空泛形容。"""
    reasons: list[str] = []

    reasons.append(f"距离 {format_distance(candidate.get('distance_m'))}")
    minutes = walk_minutes(candidate.get("distance_m"))
    if minutes:
        reasons.append(f"步行约 {minutes} 分钟")

    if candidate.get("brand_found"):
        stores = candidate.get("brand_stores") or []
        label = brand or "目标品牌"
        if stores:
            names = "、".join(s["name"] for s in stores[:2] if s.get("name"))
            reasons.append(f"有{label}门店（{names}）")
        else:
            reasons.append(f"有{label}门店")
    elif brand:
        reasons.append(f"未找到{brand}门店")

    rating = candidate.get("rating")
    if isinstance(rating, (int, float)) and rating > 0:
        suffix = "，评分最高" if is_best_rated else ""
        reasons.append(f"评分 {rating} 分{suffix}")

    hours = candidate.get("open_time")
    if isinstance(hours, str) and hours:
        status = candidate.get("is_open_now")
        if status is True:
            reasons.append(f"营业中（{hours}）")
        elif status is False:
            reasons.append(f"当前不在营业时间（{hours}）")

    if is_nearest:
        reasons.append("距离最近")

    return reasons


def rank_candidates(
    candidates: list[dict[str, Any]],
    preference: str | None = None,
    brand: str | None = None,
    top_n: int = 3,
) -> list[dict[str, Any]]:
    """按偏好打分排序，返回前 top_n 个候选并附上推荐理由。"""
    if not candidates:
        return []

    weights = resolve_weights(preference)

    distances = [
        float(c["distance_m"])
        for c in candidates
        if isinstance(c.get("distance_m"), (int, float))
    ]
    # 用最大距离做归一基准，保证距离分落在 0~1
    max_distance = max(distances) if distances else 1.0
    max_distance = max(max_distance, 1.0)

    rated = [
        float(c["rating"])
        for c in candidates
        if isinstance(c.get("rating"), (int, float)) and c["rating"] > 0
    ]
    best_rating = max(rated) if rated else None

    nearest_distance = min(distances) if distances else None

    scored: list[dict[str, Any]] = []
    for candidate in candidates:
        item = dict(candidate)
        item["score"] = score_candidate(item, weights, max_distance)
        distance = item.get("distance_m")
        rating = item.get("rating")
        item["_is_nearest"] = (
            nearest_distance is not None
            and isinstance(distance, (int, float))
            and abs(float(distance) - nearest_distance) < 1
        )
        item["_is_best_rated"] = (
            best_rating is not None
            and isinstance(rating, (int, float))
            and abs(float(rating) - best_rating) < 1e-6
        )
        scored.append(item)

    # 分数降序；同分时按距离升序，保证结果稳定可复现
    scored.sort(
        key=lambda x: (
            -x["score"],
            x.get("distance_m") if isinstance(x.get("distance_m"), (int, float)) else 1e9,
        )
    )

    ranked: list[dict[str, Any]] = []
    for rank, item in enumerate(scored[:top_n], start=1):
        reasons = build_reasons(
            item,
            brand=brand,
            is_nearest=item.pop("_is_nearest", False),
            is_best_rated=item.pop("_is_best_rated", False),
        )
        item["rank"] = rank
        item["reason"] = "；".join(reasons)
        item["distance_text"] = format_distance(item.get("distance_m"))
        item["walk_minutes"] = walk_minutes(item.get("distance_m"))
        ranked.append(item)

    return ranked


def refresh_reasons(ranked: list[dict[str, Any]], brand: str | None = None) -> None:
    """精算步行/交通后重写推荐理由。

    排序阶段用的是直线距离，之后前 3 名会换成真实路线距离；
    如果不重写，理由里会留着旧的「步行约 X 分钟」，和结论对不上。
    """
    if not ranked:
        return
    distances = [
        float(item["distance_m"])
        for item in ranked
        if isinstance(item.get("distance_m"), (int, float))
    ]
    ratings = [
        float(item["rating"])
        for item in ranked
        if isinstance(item.get("rating"), (int, float)) and item["rating"] > 0
    ]
    nearest = min(distances) if distances else None
    best_rating = max(ratings) if ratings else None

    for item in ranked:
        distance = item.get("distance_m")
        rating = item.get("rating")
        item["distance_text"] = format_distance(distance)
        item["walk_minutes"] = walk_minutes(distance)
        reasons = build_reasons(
            item,
            brand=brand,
            is_nearest=(
                nearest is not None
                and isinstance(distance, (int, float))
                and abs(float(distance) - nearest) < 1
            ),
            is_best_rated=(
                best_rating is not None
                and isinstance(rating, (int, float))
                and abs(float(rating) - best_rating) < 1e-6
            ),
        )
        item["reason"] = "；".join(reasons)

"""
几何与排序计算（私有模块，`_` 前缀不生成路由）。

这里全部是纯函数，不发起任何网络请求 —— 排序逻辑放在代码里算，
比让大模型"心算"距离可靠得多，也让推荐结果可复现、可解释。
"""

from __future__ import annotations

import math
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

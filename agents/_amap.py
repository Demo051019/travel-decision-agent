"""
高德地图 Web 服务客户端（私有模块，`_` 前缀不生成路由）。

凭证只从环境变量读取，代码中不允许出现任何字面量 Key：
  - AMAP_API_KEY : EdgeOne Makers 控制台的标准命名
  - AMAP_KEY     : 本地旧命名，作为兜底兼容

设计要点
--------
1. 所有 HTTP 调用收敛到 `_request()`，统一超时与错误码映射。
2. 失败一律抛 `AmapError`，由工具层转成结构化 JSON 交给模型 ——
   这样模型能向用户解释"为什么没查成"，而不是拿着空结果瞎猜。
3. 返回结构做归一化，去掉高德原始响应里大量的无关字段，
   避免把 token 浪费在模型根本用不上的数据上。
"""

from __future__ import annotations

import asyncio
import os
from typing import Any

import httpx

_BASE_URL = "https://restapi.amap.com/v3"
_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

# 高德 POI 分类码：购物服务(06) - 商场(060100)。
# 实测该码同时覆盖「购物中心 / 普通商场 / 商场」三个子类，
# 单独用 060100 比叠加子码更全（35 条 vs 36 条中含非商场项）。
MALL_TYPE_CODE = "060100"

# 高德错误码 → (可读原因, 修复建议)
# 只收录确认过的码；未收录的码直接透出高德原始 info，不猜含义。
_ERROR_HINTS: dict[str, tuple[str, str]] = {
    "10001": ("高德 Key 无效或已被删除", "检查环境变量 AMAP_API_KEY 是否正确"),
    "10002": ("高德服务已被禁用", "在高德控制台为这把 Key 启用 Web 服务"),
    "10003": ("今日调用配额已用尽", "等待次日额度重置，或提升配额"),
    "10004": ("调用过于频繁被限流", "等待几秒后重试"),
    "10005": ("该 Key 未开通「Web服务」权限", "在高德控制台把 Key 类型改为「Web服务」"),
    "10006": ("请求来源 IP 或域名不合法", "检查 Key 的域名白名单设置"),
    "10007": ("数字签名校验失败", "检查签名配置"),
    "10009": ("Key 与平台类型不匹配", "确认申请的是「Web服务」Key，而非 JS API / 移动端"),
    "10010": ("IP 访问量超限", "降低并发或稍后重试"),
    "10012": ("请求频率（QPS）超限", "降低并发后重试"),
    "10020": ("请求并发量超限", "降低并发后重试"),
    "10021": ("请求并发量超限", "降低并发后重试"),
    "10029": ("该 Key 的 Web 服务调用量已达上限", "提升配额或等待重置"),
    "10044": ("今日调用配额已用尽", "等待次日额度重置，或提升配额"),
    "20000": ("请求参数不正确", "检查必填参数"),
    "20001": ("缺少必填参数", "补全参数"),
    "20003": ("参数格式错误", "检查经纬度格式是否为 lng,lat"),
    "20800": ("请求超出服务范围", "缩小检索半径"),
}

# 这些码属于"再试一次就好"的限流类错误，做退避重试比直接失败体验好得多
_RETRYABLE_CODES = {"10004", "10012", "10020", "10021", "10044", "20800"}
_MAX_RETRIES = 2


class AmapError(Exception):
    """携带可读原因的异常，工具层会把它转成 JSON 返回给模型。"""

    def __init__(self, code: str, reason: str, hint: str = "", platform_info: str = "") -> None:
        self.code = code
        self.reason = reason
        self.hint = hint
        self.platform_info = platform_info
        super().__init__(f"[{code}] {reason}")

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "ok": False,
            "error_code": self.code,
            "reason": self.reason,
        }
        if self.hint:
            payload["hint"] = self.hint
        # 透出高德原始 info，方便排查"到底哪个码"，也避免我们猜错含义
        if self.platform_info and self.platform_info != self.reason:
            payload["platform_info"] = self.platform_info
        return payload


def api_key() -> str:
    """读取高德 Key。优先控制台标准命名，兼容本地旧命名。"""
    key = (os.getenv("AMAP_API_KEY") or os.getenv("AMAP_KEY") or "").strip()
    if not key:
        raise AmapError(
            "NO_KEY",
            "服务端没有配置高德地图 Key，无法检索位置信息",
            "在环境变量中配置 AMAP_API_KEY（高德开放平台 → 应用管理 → Web服务 Key）",
        )
    return key


async def _request_once(path: str, query: dict[str, Any]) -> dict[str, Any]:
    """发一次请求，把 HTTP 层与平台层错误都翻译成 AmapError。"""
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(f"{_BASE_URL}{path}", params=query)
    except httpx.TimeoutException as exc:
        raise AmapError(
            "HTTP_TIMEOUT", "高德接口响应超时", "稍后重试；若持续超时请检查服务器出口网络"
        ) from exc
    except httpx.HTTPError as exc:
        raise AmapError(
            "HTTP_ERROR",
            f"调用高德接口失败（{exc.__class__.__name__}）",
            "检查服务器能否访问 restapi.amap.com",
        ) from exc

    if resp.status_code != 200:
        raise AmapError(
            "HTTP_STATUS", f"高德接口返回 HTTP {resp.status_code}", "稍后重试"
        )

    try:
        data: dict[str, Any] = resp.json()
    except ValueError as exc:
        raise AmapError("BAD_JSON", "高德接口返回了非 JSON 内容", "稍后重试") from exc

    if str(data.get("status")) != "1":
        code = str(data.get("infocode") or "")
        raw_info = str(data.get("info") or "未知错误")
        reason, hint = _ERROR_HINTS.get(code, (raw_info, ""))
        raise AmapError(
            code or "AMAP_ERROR", reason, hint, platform_info=raw_info
        )

    return data


async def _request(path: str, params: dict[str, Any]) -> dict[str, Any]:
    """带退避重试的请求入口：限流类错误自动重试，其余直接抛出。"""
    query = {**params, "key": api_key(), "output": "JSON"}

    last: AmapError | None = None
    for attempt in range(_MAX_RETRIES + 1):
        try:
            return await _request_once(path, query)
        except AmapError as exc:
            last = exc
            if exc.code in _RETRYABLE_CODES and attempt < _MAX_RETRIES:
                # 0.4s → 0.8s 退避，给高德的并发窗口留出余量
                await asyncio.sleep(0.4 * (2**attempt))
                continue
            raise

    raise last or AmapError("AMAP_ERROR", "高德接口调用失败")


def _split_location(value: Any) -> tuple[float, float] | None:
    """把 "lng,lat" 字符串转成浮点元组；高德在无坐标时返回空数组。"""
    if not isinstance(value, str) or "," not in value:
        return None
    try:
        lng_str, lat_str = value.split(",", 1)
        return float(lng_str), float(lat_str)
    except (TypeError, ValueError):
        return None


def _to_int(value: Any) -> int | None:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _to_float(value: Any) -> float | None:
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    return num if num > 0 else None


def _to_text(value: Any) -> str:
    """高德在字段为空时返回 []，需要归一化成空字符串。"""
    return value if isinstance(value, str) else ""


async def geocode(address: str, city: str | None = None) -> list[dict[str, Any]]:
    """地理编码：地址文本 → 经纬度。返回按置信度排序的候选列表。"""
    params: dict[str, Any] = {"address": address.strip(), "extensions": "base"}
    if city:
        params["city"] = city.strip()

    data = await _request("/geocode/geo", params)

    results: list[dict[str, Any]] = []
    for item in data.get("geocodes") or []:
        coords = _split_location(item.get("location"))
        if not coords:
            continue
        results.append(
            {
                "formatted_address": _to_text(item.get("formatted_address")),
                "lng": coords[0],
                "lat": coords[1],
                "city": _to_text(item.get("city")),
                "district": _to_text(item.get("district")),
                "level": _to_text(item.get("level")),
            }
        )
    return results


async def malls_around(
    lng: float,
    lat: float,
    radius_m: int = 3000,
    limit: int = 6,
) -> list[dict[str, Any]]:
    """周边搜索：按坐标检索附近商场（购物中心 / 普通商场）。"""
    data = await _request(
        "/place/around",
        {
            "location": f"{lng},{lat}",
            "types": MALL_TYPE_CODE,
            "radius": radius_m,
            "offset": limit,
            "page": 1,
            "sortrule": "distance",
            "extensions": "all",
        },
    )

    malls: list[dict[str, Any]] = []
    for item in data.get("pois") or []:
        coords = _split_location(item.get("location"))
        if not coords:
            continue
        biz = item.get("biz_ext")
        rating = _to_float(biz.get("rating")) if isinstance(biz, dict) else None
        malls.append(
            {
                "id": _to_text(item.get("id")),
                "name": _to_text(item.get("name")),
                "address": _to_text(item.get("address")),
                "lng": coords[0],
                "lat": coords[1],
                # 高德已按 distance 排序，这里的 distance 是相对检索中心点的直线距离
                "distance_m": _to_int(item.get("distance")),
                "rating": rating,
                "category": _to_text(item.get("type")).split(";")[-1],
            }
        )
    return malls


async def brand_around(
    brand: str,
    lng: float,
    lat: float,
    radius_m: int = 400,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """在指定坐标周边检索某个品牌的门店，用于判断商场内是否有该品牌。"""
    data = await _request(
        "/place/around",
        {
            "location": f"{lng},{lat}",
            "keywords": brand.strip(),
            "radius": radius_m,
            "offset": limit,
            "page": 1,
            "sortrule": "distance",
            "extensions": "base",
        },
    )

    stores: list[dict[str, Any]] = []
    for item in data.get("pois") or []:
        stores.append(
            {
                "name": _to_text(item.get("name")),
                "address": _to_text(item.get("address")),
                "distance_m": _to_int(item.get("distance")),
            }
        )
    return stores


async def walking_route(
    origin: tuple[float, float],
    destination: tuple[float, float],
) -> dict[str, Any]:
    """步行路径规划，返回真实步行距离与耗时。"""
    data = await _request(
        "/direction/walking",
        {
            "origin": f"{origin[0]},{origin[1]}",
            "destination": f"{destination[0]},{destination[1]}",
        },
    )

    paths = ((data.get("route") or {}).get("paths")) or []
    if not paths:
        raise AmapError(
            "NO_ROUTE",
            "两点之间没有可用的步行路线",
            "可能距离过远或隔着水域，建议改用直线距离判断",
        )

    first = paths[0]
    distance = _to_int(first.get("distance")) or 0
    duration = _to_int(first.get("duration")) or 0
    return {"distance_m": distance, "duration_s": duration}

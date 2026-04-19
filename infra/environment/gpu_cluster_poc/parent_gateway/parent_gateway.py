"""Parent WebSocket gateway.

Frontend connects over ws://parent:8000/ws/infer and sends commands. The
gateway resolves the worker IPs from the ASG, fans out HTTP requests, and
streams per-request events back to the client in real time.

Two endpoints are supported:
  - /hello : GET, latency / scale demo
  - /infer : POST WAV bytes, actual iruka_cnn inference

WAV samples for /infer are generated ahead of time via the iruka_cnn sender
(run once on the host, see the README for the docker one-liner) and loaded
into memory at startup.
"""

from __future__ import annotations

import asyncio
import json
import os
import random
import time
import uuid
from pathlib import Path
from typing import Any, Literal

import aiohttp
import boto3
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware


ASG_NAME = os.environ.get("ASG_NAME", "dolphin-poc-fleet-asg")
AWS_REGION = os.environ.get("AWS_REGION", "ap-northeast-1")
WORKER_PORT = int(os.environ.get("WORKER_PORT", "8080"))
WORKER_CACHE_TTL_S = 30.0
DISPATCH_CONCURRENCY = int(os.environ.get("DISPATCH_CONCURRENCY", "256"))
WAV_DIR = Path(os.environ.get("WAV_DIR", "/home/ec2-user/wavs"))

Endpoint = Literal["/hello", "/infer"]

_worker_ips_cache: list[str] = []
_worker_ips_cached_at: float = 0.0

_WAV_SAMPLES: dict[str, bytes] = {}
_WAV_KEYS: list[str] = []


def _fetch_worker_ips() -> list[str]:
    ec2 = boto3.client("ec2", region_name=AWS_REGION)
    paginator = ec2.get_paginator("describe_instances")
    ips: list[str] = []
    for page in paginator.paginate(
        Filters=[
            {"Name": "tag:aws:autoscaling:groupName", "Values": [ASG_NAME]},
            {"Name": "instance-state-name", "Values": ["running"]},
        ]
    ):
        for reservation in page["Reservations"]:
            for inst in reservation["Instances"]:
                ip = inst.get("PrivateIpAddress")
                if ip:
                    ips.append(ip)
    return sorted(ips)


def get_worker_ips() -> list[str]:
    global _worker_ips_cache, _worker_ips_cached_at
    now = time.time()
    if _worker_ips_cache and now - _worker_ips_cached_at < WORKER_CACHE_TTL_S:
        return _worker_ips_cache
    _worker_ips_cache = _fetch_worker_ips()
    _worker_ips_cached_at = now
    return _worker_ips_cache


def _load_wavs() -> None:
    """Load all *.wav from WAV_DIR into memory, keyed by stem."""
    global _WAV_SAMPLES, _WAV_KEYS
    _WAV_SAMPLES = {}
    if not WAV_DIR.exists():
        return
    for path in sorted(WAV_DIR.glob("*.wav")):
        try:
            _WAV_SAMPLES[path.stem] = path.read_bytes()
        except OSError:
            continue
    _WAV_KEYS = sorted(_WAV_SAMPLES.keys())


def pick_wav(phrase_key: str | None) -> tuple[str, bytes] | None:
    if not _WAV_SAMPLES:
        return None
    if phrase_key and phrase_key in _WAV_SAMPLES:
        return phrase_key, _WAV_SAMPLES[phrase_key]
    key = random.choice(_WAV_KEYS)
    return key, _WAV_SAMPLES[key]


_load_wavs()


app = FastAPI(title="iruka-gpu-gateway")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, Any]:
    return {
        "service": "iruka-gpu-gateway",
        "workers": len(get_worker_ips()),
        "wav_samples": len(_WAV_KEYS),
    }


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    return {
        "ok": True,
        "workers": len(get_worker_ips()),
        "wav_samples": len(_WAV_KEYS),
    }


@app.get("/workers")
async def workers() -> dict[str, Any]:
    return {"ips": get_worker_ips()}


@app.get("/phrases")
async def phrases() -> dict[str, Any]:
    return {"keys": _WAV_KEYS}


@app.post("/reload-wavs")
async def reload_wavs() -> dict[str, Any]:
    _load_wavs()
    return {"wav_samples": len(_WAV_KEYS)}


async def call_hello(session: aiohttp.ClientSession, ip: str) -> dict[str, Any]:
    async with session.get(f"http://{ip}:{WORKER_PORT}/hello") as resp:
        resp.raise_for_status()
        body = await resp.json()
        return {
            "label": str(body.get("msg", "hello")),
            "confidence": 1.0,
        }


async def call_infer(
    session: aiohttp.ClientSession,
    ip: str,
    wav_bytes: bytes,
) -> dict[str, Any]:
    async with session.post(
        f"http://{ip}:{WORKER_PORT}/infer",
        data=wav_bytes,
        headers={"Content-Type": "application/octet-stream"},
    ) as resp:
        resp.raise_for_status()
        body = await resp.json()
        return {
            "label": str(body.get("label") or body.get("predicted_label") or "?"),
            "confidence": float(body.get("confidence", 0.0)),
            "is_unknown": bool(body.get("is_unknown", False)),
            "is_silence": bool(body.get("is_silence", False)),
            "top_k": body.get("top_k", [])[:3],
        }


class Session:
    def __init__(self, ws: WebSocket) -> None:
        self.ws = ws
        self.ambient_task: asyncio.Task[None] | None = None
        self.alive = True

    async def send(self, msg: dict[str, Any]) -> None:
        if not self.alive:
            return
        try:
            await self.ws.send_text(json.dumps(msg))
        except Exception:
            self.alive = False

    async def dispatch(self, count: int, endpoint: Endpoint, phrase_key: str | None) -> None:
        ips = get_worker_ips()
        if not ips:
            await self.send({"type": "error", "message": "no workers in ASG"})
            return
        if endpoint == "/infer" and not _WAV_SAMPLES:
            await self.send(
                {
                    "type": "error",
                    "message": f"no WAV samples in {WAV_DIR}; run gen_wavs.py first",
                }
            )
            return

        await self.send({"type": "pulse", "count": count, "endpoint": endpoint})

        start = time.perf_counter()
        latencies: list[float] = []
        total_ok = 0
        total_fail = 0

        timeout = aiohttp.ClientTimeout(total=15)
        connector = aiohttp.TCPConnector(limit=DISPATCH_CONCURRENCY + 32)
        sem = asyncio.Semaphore(DISPATCH_CONCURRENCY)

        async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:

            async def one(i: int) -> None:
                nonlocal total_ok, total_fail
                worker_id = i % len(ips)
                ip = ips[worker_id]
                request_id = uuid.uuid4().hex[:8]
                phrase_used: str | None = None

                await self.send(
                    {
                        "type": "dispatched",
                        "worker_id": worker_id,
                        "request_id": request_id,
                        "phrase_key": phrase_key,
                    }
                )
                t0 = time.perf_counter()
                async with sem:
                    try:
                        if endpoint == "/hello":
                            result = await call_hello(session, ip)
                        else:
                            pick = pick_wav(phrase_key)
                            if pick is None:
                                raise RuntimeError("no WAV samples")
                            phrase_used, wav_bytes = pick
                            result = await call_infer(session, ip, wav_bytes)
                        dt_ms = (time.perf_counter() - t0) * 1000
                        latencies.append(dt_ms)
                        total_ok += 1
                        await self.send(
                            {
                                "type": "result",
                                "worker_id": worker_id,
                                "request_id": request_id,
                                "label": result["label"],
                                "confidence": result.get("confidence", 0.0),
                                "latency_ms": dt_ms,
                                "phrase_key": phrase_used,
                                "extra": {
                                    k: v
                                    for k, v in result.items()
                                    if k not in ("label", "confidence")
                                },
                            }
                        )
                    except Exception as exc:
                        total_fail += 1
                        await self.send(
                            {
                                "type": "error",
                                "worker_id": worker_id,
                                "request_id": request_id,
                                "message": f"{type(exc).__name__}: {exc}",
                            }
                        )

            await asyncio.gather(*[one(i) for i in range(count)])

        wall_ms = (time.perf_counter() - start) * 1000
        latencies.sort()

        def percentile(q: float) -> float:
            if not latencies:
                return 0.0
            idx = min(len(latencies) - 1, int(len(latencies) * q))
            return latencies[idx]

        rps = (count / wall_ms * 1000) if wall_ms > 0 else 0.0
        await self.send(
            {
                "type": "metrics",
                "rps": rps,
                "p50": percentile(0.5),
                "p95": percentile(0.95),
                "total_ok": total_ok,
                "total_fail": total_fail,
                "wall_ms": wall_ms,
                "endpoint": endpoint,
            }
        )

    async def start_ambient(
        self,
        interval_ms: int,
        endpoint: Endpoint,
        phrase_key: str | None,
    ) -> None:
        await self.stop_ambient()

        async def run() -> None:
            try:
                timeout = aiohttp.ClientTimeout(total=6)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    while self.alive:
                        ips = get_worker_ips()
                        if not ips:
                            await asyncio.sleep(interval_ms / 1000)
                            continue
                        worker_id = int(time.time() * 1000) % len(ips)
                        request_id = uuid.uuid4().hex[:8]
                        phrase_used: str | None = None
                        await self.send(
                            {
                                "type": "dispatched",
                                "worker_id": worker_id,
                                "request_id": request_id,
                            }
                        )
                        t0 = time.perf_counter()
                        try:
                            if endpoint == "/hello":
                                result = await call_hello(session, ips[worker_id])
                            else:
                                pick = pick_wav(phrase_key)
                                if pick is None:
                                    raise RuntimeError("no WAV samples")
                                phrase_used, wav_bytes = pick
                                result = await call_infer(session, ips[worker_id], wav_bytes)
                            dt_ms = (time.perf_counter() - t0) * 1000
                            await self.send(
                                {
                                    "type": "result",
                                    "worker_id": worker_id,
                                    "request_id": request_id,
                                    "label": result["label"],
                                    "confidence": result.get("confidence", 0.0),
                                    "latency_ms": dt_ms,
                                    "phrase_key": phrase_used,
                                }
                            )
                        except Exception as exc:
                            await self.send(
                                {
                                    "type": "error",
                                    "worker_id": worker_id,
                                    "request_id": request_id,
                                    "message": f"{type(exc).__name__}: {exc}",
                                }
                            )
                        await asyncio.sleep(interval_ms / 1000)
            except asyncio.CancelledError:
                raise

        self.ambient_task = asyncio.create_task(run())

    async def stop_ambient(self) -> None:
        if self.ambient_task and not self.ambient_task.done():
            self.ambient_task.cancel()
            try:
                await self.ambient_task
            except asyncio.CancelledError:
                pass
        self.ambient_task = None


@app.websocket("/ws/infer")
async def ws_infer(ws: WebSocket) -> None:
    await ws.accept()
    session = Session(ws)
    await session.send(
        {
            "type": "hello",
            "workers": len(get_worker_ips()),
            "wav_samples": len(_WAV_KEYS),
            "phrase_keys": _WAV_KEYS,
        }
    )

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await session.send({"type": "error", "message": "invalid JSON"})
                continue

            command = str(msg.get("type", ""))
            if command == "dispatch":
                count = max(1, min(10000, int(msg.get("count", 126))))
                endpoint = msg.get("endpoint", "/hello")
                if endpoint not in ("/hello", "/infer"):
                    endpoint = "/hello"
                phrase_key = msg.get("phrase_key")
                asyncio.create_task(session.dispatch(count, endpoint, phrase_key))
            elif command == "ambient_start":
                interval = max(50, min(5000, int(msg.get("interval_ms", 700))))
                endpoint = msg.get("endpoint", "/hello")
                if endpoint not in ("/hello", "/infer"):
                    endpoint = "/hello"
                phrase_key = msg.get("phrase_key")
                await session.start_ambient(interval, endpoint, phrase_key)
            elif command == "ambient_stop":
                await session.stop_ambient()
            elif command == "ping":
                await session.send({"type": "pong"})
            else:
                await session.send(
                    {"type": "error", "message": f"unknown command: {command}"}
                )
    except WebSocketDisconnect:
        pass
    finally:
        session.alive = False
        await session.stop_ambient()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "parent_gateway:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8000")),
        log_level="info",
    )

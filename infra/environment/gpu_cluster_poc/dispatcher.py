"""Fan-out dispatcher that hits /hello on every worker and reports throughput.

Runs on the parent EC2. Relies on ``worker_ips.py`` (a snapshot of ASG worker
private IPs) sitting next to it.

Usage examples::

    # single shot: one request per worker, all in parallel
    python3 dispatcher.py

    # send 1000 requests round-robin'd across workers, up to 126 in-flight
    python3 dispatcher.py --requests 1000

    # scan over several batch sizes to draw a scaling curve
    python3 dispatcher.py --sweep 126,504,1008,2016 --csv sweep.csv
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import statistics
import time
from collections import Counter

import aiohttp

from worker_ips import WORKER_IPS


TIMEOUT = aiohttp.ClientTimeout(total=5)


async def hit(session: aiohttp.ClientSession, ip: str, rid: int) -> dict:
    t0 = time.perf_counter()
    try:
        async with session.get(f"http://{ip}:8080/hello", timeout=TIMEOUT) as resp:
            body = await resp.json()
            return {
                "ok": True,
                "ip": ip,
                "rid": rid,
                "ms": (time.perf_counter() - t0) * 1000,
                "body": body,
            }
    except Exception as e:
        return {
            "ok": False,
            "ip": ip,
            "rid": rid,
            "ms": (time.perf_counter() - t0) * 1000,
            "error": f"{type(e).__name__}: {e}",
        }


async def run(n: int, concurrency: int) -> list[dict]:
    sem = asyncio.Semaphore(concurrency)

    async def bounded(session: aiohttp.ClientSession, ip: str, rid: int) -> dict:
        async with sem:
            return await hit(session, ip, rid)

    connector = aiohttp.TCPConnector(limit=concurrency + 32, ttl_dns_cache=300)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [
            bounded(session, WORKER_IPS[i % len(WORKER_IPS)], i) for i in range(n)
        ]
        return await asyncio.gather(*tasks)


def percentile(sorted_vals: list[float], q: float) -> float:
    if not sorted_vals:
        return 0.0
    idx = min(int(len(sorted_vals) * q), len(sorted_vals) - 1)
    return sorted_vals[idx]


def summarize(results: list[dict], wall_s: float) -> dict:
    n = len(results)
    ok = [r for r in results if r["ok"]]
    failed = [r for r in results if not r["ok"]]
    latencies = sorted(r["ms"] for r in ok)
    per_worker = Counter(r["ip"] for r in results)
    return {
        "total": n,
        "ok": len(ok),
        "failed": len(failed),
        "wall_s": wall_s,
        "throughput_rps": n / wall_s if wall_s > 0 else 0.0,
        "p50_ms": percentile(latencies, 0.50),
        "p95_ms": percentile(latencies, 0.95),
        "p99_ms": percentile(latencies, 0.99),
        "max_ms": latencies[-1] if latencies else 0.0,
        "mean_ms": statistics.mean(latencies) if latencies else 0.0,
        "workers_hit": len(per_worker),
        "reqs_per_worker_min": min(per_worker.values()) if per_worker else 0,
        "reqs_per_worker_max": max(per_worker.values()) if per_worker else 0,
    }


def print_summary(s: dict, extra: dict | None = None) -> None:
    print(f"  requests:    {s['total']}  (ok={s['ok']}, fail={s['failed']})")
    print(f"  wall time:   {s['wall_s']:.2f} s")
    print(f"  throughput:  {s['throughput_rps']:.1f} req/s")
    print(
        f"  latency:     mean={s['mean_ms']:.0f} / p50={s['p50_ms']:.0f} / "
        f"p95={s['p95_ms']:.0f} / p99={s['p99_ms']:.0f} / max={s['max_ms']:.0f} ms"
    )
    print(
        f"  workers hit: {s['workers_hit']}  "
        f"(per-worker min={s['reqs_per_worker_min']} / max={s['reqs_per_worker_max']})"
    )
    if extra:
        for k, v in extra.items():
            print(f"  {k}: {v}")


def dump_failures(results: list[dict], limit: int = 5) -> None:
    fails = [r for r in results if not r["ok"]]
    if not fails:
        return
    print(f"  failures (showing up to {limit}):")
    for r in fails[:limit]:
        print(f"    [rid={r['rid']}] {r['ip']}: {r['error']}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--requests",
        type=int,
        default=len(WORKER_IPS),
        help=f"total requests to send (default: {len(WORKER_IPS)} = one per worker)",
    )
    ap.add_argument(
        "--concurrency",
        type=int,
        default=len(WORKER_IPS),
        help=f"max in-flight requests (default: {len(WORKER_IPS)})",
    )
    ap.add_argument(
        "--sweep",
        help="comma-separated request counts. Runs each in sequence with the "
        "same --concurrency. Use this to plot scaling curves.",
    )
    ap.add_argument("--csv", help="write per-sweep summary to this CSV path")
    args = ap.parse_args()

    targets = (
        [int(x.strip()) for x in args.sweep.split(",")] if args.sweep else [args.requests]
    )

    rows: list[dict] = []
    for n in targets:
        print(
            f"\n=== {n} requests, concurrency={args.concurrency}, "
            f"fleet={len(WORKER_IPS)} workers ==="
        )
        t0 = time.perf_counter()
        results = asyncio.run(run(n, args.concurrency))
        wall = time.perf_counter() - t0
        s = summarize(results, wall)
        print_summary(s)
        dump_failures(results)
        rows.append({"concurrency": args.concurrency, **s})

    if args.csv and rows:
        with open(args.csv, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        print(f"\nwrote {args.csv}")


if __name__ == "__main__":
    main()

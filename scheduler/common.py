"""Shared helpers used by every scheduling algorithm."""


def normalize(processes):
    """Copy the input and add the bookkeeping fields the simulators need."""
    return [
        {
            "id": p["id"],
            "arrival": int(p["arrival"]),
            "burst": int(p["burst"]),
            "priority": int(p.get("priority", 1)),
            "remaining": int(p["burst"]),
            "start": None,
            "completion": None,
            "order": i,
        }
        for i, p in enumerate(processes)
    ]


def build_result(ps, slices):
    """Merge adjacent slices and compute per-process and overall metrics."""
    timeline = []
    for pid, start, end in slices:
        if timeline and timeline[-1]["pid"] == pid and timeline[-1]["end"] == start:
            timeline[-1]["end"] = end
        else:
            timeline.append({"pid": pid, "start": start, "end": end})

    rows = []
    for p in sorted(ps, key=lambda p: p["order"]):
        turnaround = p["completion"] - p["arrival"]
        rows.append({
            "id": p["id"],
            "arrival": p["arrival"],
            "burst": p["burst"],
            "priority": p["priority"],
            "completion": p["completion"],
            "turnaround": turnaround,
            "waiting": turnaround - p["burst"],
            "response": p["start"] - p["arrival"],
        })

    busy_order = [s["pid"] for s in timeline if s["pid"] != "Idle"]
    switches = sum(1 for a, b in zip(busy_order, busy_order[1:]) if a != b)

    total_time = max((r["completion"] for r in rows), default=0)
    busy = sum(s["end"] - s["start"] for s in timeline if s["pid"] != "Idle")
    n = len(rows) or 1
    return {
        "timeline": timeline,
        "processes": rows,
        "summary": {
            "avg_waiting": round(sum(r["waiting"] for r in rows) / n, 2),
            "avg_turnaround": round(sum(r["turnaround"] for r in rows) / n, 2),
            "avg_response": round(sum(r["response"] for r in rows) / n, 2),
            "cpu_utilization": round(busy / total_time * 100, 2) if total_time else 0,
            "throughput": round(len(rows) / total_time, 3) if total_time else 0,
            "context_switches": switches,
            "total_time": total_time,
        },
    }


def run_by_key(processes, key, preemptive=False):
    """Generic 'pick the best ready process' scheduler.

    `key(p)` ranks ready processes (lowest wins). Ties go to the earlier
    arrival, then to the order the processes were entered.
    """
    ps = normalize(processes)
    t, done, slices = 0, 0, []

    while done < len(ps):
        ready = [p for p in ps if p["arrival"] <= t and p["remaining"] > 0]
        if not ready:
            nxt = min(p["arrival"] for p in ps if p["remaining"] > 0)
            slices.append(("Idle", t, nxt))
            t = nxt
            continue

        p = min(ready, key=lambda p: (key(p), p["arrival"], p["order"]))
        run = p["remaining"]
        if preemptive:  # only a new arrival can change the decision
            future = [q["arrival"] for q in ps if q["arrival"] > t]
            if future:
                run = min(run, min(future) - t)

        if p["start"] is None:
            p["start"] = t
        slices.append((p["id"], t, t + run))
        t += run
        p["remaining"] -= run
        if p["remaining"] == 0:
            p["completion"] = t
            done += 1

    return build_result(ps, slices)
from collections import deque

from .common import normalize, build_result


def round_robin(processes, quantum=2):
    """Round Robin with a fixed time quantum.

    A process that arrives at the same moment another one's slice ends is
    queued ahead of the preempted process (the common textbook convention).
    """
    ps = sorted(normalize(processes), key=lambda p: (p["arrival"], p["order"]))
    n, i, t, done = len(ps), 0, 0, 0
    queue, slices = deque(), []

    def admit():
        nonlocal i
        while i < n and ps[i]["arrival"] <= t:
            queue.append(ps[i])
            i += 1

    while done < n:
        admit()
        if not queue:
            nxt = ps[i]["arrival"]
            slices.append(("Idle", t, nxt))
            t = nxt
            continue

        p = queue.popleft()
        run = min(quantum, p["remaining"])
        if p["start"] is None:
            p["start"] = t
        slices.append((p["id"], t, t + run))
        t += run
        p["remaining"] -= run
        admit()
        if p["remaining"] > 0:
            queue.append(p)
        else:
            p["completion"] = t
            done += 1

    return build_result(ps, slices)
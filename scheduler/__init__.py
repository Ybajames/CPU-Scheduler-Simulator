from .fcfs import fcfs
from .sjf import sjf
from .round_robin import round_robin
from .priority import priority

ALGORITHMS = {
    "fcfs": fcfs,
    "sjf": sjf,
    "rr": round_robin,
    "priority": priority,
}


def simulate(algorithm, processes, quantum=2, preemptive=False):
    if algorithm == "fcfs":
        return fcfs(processes)
    if algorithm == "rr":
        return round_robin(processes, quantum)
    return ALGORITHMS[algorithm](processes, preemptive)

METRICS = ("avg_waiting", "avg_turnaround", "avg_response", "context_switches")


def compare(processes, quantum=2):
    """Run every algorithm variant on the same processes and find the winners."""
    runs = [
        ("FCFS", fcfs(processes)),
        ("SJF", sjf(processes, False)),
        ("SRTF", sjf(processes, True)),
        (f"Round Robin (q={quantum})", round_robin(processes, quantum)),
        ("Priority", priority(processes, False)),
        ("Priority (preemptive)", priority(processes, True)),
    ]
    results = [{"name": name, "summary": r["summary"]} for name, r in runs]

    best = {}
    for metric in METRICS:  # lower is better for all four; ties all win
        low = min(r["summary"][metric] for r in results)
        best[metric] = [r["name"] for r in results if r["summary"][metric] == low]
    return {"results": results, "best": best}
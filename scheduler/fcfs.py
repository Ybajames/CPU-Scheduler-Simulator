from .common import run_by_key


def fcfs(processes):
    """First Come First Served (non-preemptive)."""
    return run_by_key(processes, key=lambda p: 0, preemptive=False)
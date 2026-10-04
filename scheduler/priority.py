from .common import run_by_key


def priority(processes, preemptive=False):
    """Priority scheduling. A LOWER number means a HIGHER priority."""
    return run_by_key(processes, key=lambda p: p["priority"], preemptive=preemptive)
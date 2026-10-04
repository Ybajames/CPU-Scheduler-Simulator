from .common import run_by_key


def sjf(processes, preemptive=False):
    """Shortest Job First. preemptive=True gives SRTF (shortest remaining time)."""
    return run_by_key(processes, key=lambda p: p["remaining"], preemptive=preemptive)
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
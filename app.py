from flask import Flask, render_template, request, jsonify

from scheduler import ALGORITHMS, simulate, compare

app = Flask(__name__)


class InputError(Exception):
    """Raised for bad user input; the message is shown to the user."""


def read_processes(data):
    processes = data.get("processes")
    if not isinstance(processes, list) or not processes:
        raise InputError("Add at least one process before simulating.")
    for p in processes:
        if int(p["arrival"]) < 0 or int(p["burst"]) < 1:
            raise InputError("Each process needs arrival >= 0 and burst >= 1.")
    return processes


def read_quantum(data):
    quantum = int(data.get("quantum", 2))
    if quantum < 1:
        raise InputError("Time quantum must be at least 1.")
    return quantum


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/simulate", methods=["POST"])
def api_simulate():
    data = request.get_json(silent=True) or {}
    algorithm = data.get("algorithm")
    if algorithm not in ALGORITHMS:
        return jsonify(error="Unknown algorithm."), 400
    try:
        processes = read_processes(data)
        quantum = read_quantum(data) if algorithm == "rr" else 2
        result = simulate(algorithm, processes, quantum, bool(data.get("preemptive")))
    except InputError as e:
        return jsonify(error=str(e)), 400
    except (KeyError, TypeError, ValueError):
        return jsonify(error="Each process needs arrival >= 0 and burst >= 1."), 400
    return jsonify(result)


@app.route("/api/compare", methods=["POST"])
def api_compare():
    data = request.get_json(silent=True) or {}
    try:
        processes = read_processes(data)
        quantum = read_quantum(data)
        result = compare(processes, quantum)
    except InputError as e:
        return jsonify(error=str(e)), 400
    except (KeyError, TypeError, ValueError):
        return jsonify(error="Each process needs arrival >= 0 and burst >= 1."), 400
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True)
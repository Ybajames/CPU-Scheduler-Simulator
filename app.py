from flask import Flask, render_template, request, jsonify

from scheduler import ALGORITHMS, simulate

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/simulate", methods=["POST"])
def api_simulate():
    data = request.get_json(silent=True) or {}
    algorithm = data.get("algorithm")
    processes = data.get("processes")

    if algorithm not in ALGORITHMS:
        return jsonify(error="Unknown algorithm."), 400
    if not isinstance(processes, list) or not processes:
        return jsonify(error="Add at least one process before simulating."), 400

    try:
        for p in processes:
            if int(p["arrival"]) < 0 or int(p["burst"]) < 1:
                raise ValueError
        quantum = int(data.get("quantum", 2))
        if algorithm == "rr" and quantum < 1:
            return jsonify(error="Time quantum must be at least 1."), 400
        result = simulate(algorithm, processes, quantum, bool(data.get("preemptive")))
    except (KeyError, TypeError, ValueError):
        return jsonify(error="Each process needs arrival >= 0 and burst >= 1."), 400

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True)
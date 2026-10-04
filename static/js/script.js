
const addProcessBtn = document.getElementById("addProcessBtn");
const processModal = document.getElementById("processModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelBtn = document.getElementById("cancelBtn");
const processForm = document.getElementById("processForm");
const processTableBody = document.getElementById("processTableBody");

let processes = [];
let nextProcessId = 1;

// Open modal
addProcessBtn.addEventListener("click", () => {
    processModal.style.display = "flex";
});

// Close modal
function closeModal() {
    processModal.style.display = "none";
    processForm.reset();
}

closeModalBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);

// Add process
processForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const arrivalTime = Number(document.getElementById("arrivalTime").value);
    const burstTime = Number(document.getElementById("burstTime").value);
    const priority = Number(document.getElementById("priority").value);

    const process = {
        id: `P${nextProcessId}`,
        arrivalTime,
        burstTime,
        priority
    };

    processes.push(process);
    nextProcessId++;

    renderProcesses();
    closeModal();
});

// Display processes
function renderProcesses() {
    document.getElementById("totalProcesses").textContent = processes.length;
    processTableBody.innerHTML = "";

    if (processes.length === 0) {
        processTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-message">
                    No processes added yet.
                </td>
            </tr>
        `;
        return;
    }

    processes.forEach((process, index) => {
        const row = document.createElement("tr");

        const values = [
            process.id,
            process.arrivalTime,
            process.burstTime,
            process.priority
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");
        const deleteBtn = document.createElement("button");

        deleteBtn.textContent = "Delete";
        deleteBtn.className = "secondary-btn";

        deleteBtn.addEventListener("click", () => {
            processes.splice(index, 1);
            renderProcesses();
        });

        actionCell.appendChild(deleteBtn);
        row.appendChild(actionCell);

        processTableBody.appendChild(row);
    });
}

// ---------- Simulation ----------
const algorithmSelect = document.getElementById("algorithmSelect");
const quantumField = document.getElementById("quantumField");
const preemptiveField = document.getElementById("preemptiveField");
const simMessage = document.getElementById("simMessage");
const resultsPanel = document.getElementById("resultsPanel");
const LABELS = { fcfs: "FCFS", sjf: "SJF", rr: "Round Robin", priority: "Priority" };
const PALETTE = ["#38bdf8", "#a78bfa", "#f472b6", "#fb923c", "#facc15", "#4ade80", "#2dd4bf", "#f87171"];

function colorFor(pid) {
    const n = parseInt(pid.replace(/\D/g, ""), 10) || 1;
    return PALETTE[(n - 1) % PALETTE.length];
}

// Show quantum only for RR, Preemptive only for SJF / Priority
function syncControls() {
    const algo = algorithmSelect.value;
    quantumField.classList.toggle("hidden", algo !== "rr");
    preemptiveField.classList.toggle("hidden", algo !== "sjf" && algo !== "priority");
}
algorithmSelect.addEventListener("change", syncControls);
syncControls();

function showMessage(text, isError) {
    simMessage.textContent = text;
    simMessage.classList.toggle("error-message", Boolean(isError));
}

document.getElementById("startSimBtn").addEventListener("click", async () => {
    const algorithm = algorithmSelect.value;
    if (processes.length === 0) {
        showMessage("Add at least one process before simulating.", true);
        return;
    }

    const payload = {
        algorithm,
        quantum: Number(document.getElementById("quantum").value),
        preemptive: document.getElementById("preemptive").checked,
        processes: processes.map(p => ({
            id: p.id, arrival: p.arrivalTime, burst: p.burstTime, priority: p.priority
        }))
    };

    try {
        const response = await fetch("/api/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) {
            showMessage(data.error || "Simulation failed.", true);
            return;
        }
        let label = LABELS[algorithm];
        if (algorithm === "rr") label += ` (q=${payload.quantum})`;
        if (payload.preemptive && (algorithm === "sjf" || algorithm === "priority")) {
            label += " - preemptive";
        }
        showResults(data, label);
        showMessage(`Last run: ${label}`, false);
    } catch (err) {
        showMessage("Could not reach the server. Is Flask running?", true);
    }
});

function showResults(data, label) {
    const s = data.summary;
    document.getElementById("statUtil").textContent = `${s.cpu_utilization}%`;
    document.getElementById("statWait").textContent = s.avg_waiting.toFixed(2);
    document.getElementById("statTat").textContent = s.avg_turnaround.toFixed(2);
    document.getElementById("resultsLabel").textContent = label;

    drawGantt(data.timeline, s.total_time);

    const body = document.getElementById("resultsBody");
    body.innerHTML = "";
    data.processes.forEach(p => {
        const row = document.createElement("tr");
        [p.id, p.arrival, p.burst, p.completion, p.turnaround, p.waiting, p.response]
            .forEach(v => {
                const td = document.createElement("td");
                td.textContent = v;
                row.appendChild(td);
            });
        body.appendChild(row);
    });

    resultsPanel.classList.remove("hidden");
    resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function drawGantt(timeline, totalTime) {
    const gantt = document.getElementById("gantt");
    gantt.innerHTML = "";
    const PX_PER_UNIT = 36;
    gantt.style.width = `${Math.max(totalTime * PX_PER_UNIT, 240)}px`;

    const bar = document.createElement("div");
    bar.className = "gantt-bar";
    const ticks = document.createElement("div");
    ticks.className = "gantt-ticks";

    timeline.forEach((seg, i) => {
        const block = document.createElement("div");
        block.className = seg.pid === "Idle" ? "gantt-block idle" : "gantt-block";
        block.style.flexGrow = seg.end - seg.start;   // width proportional to duration
        block.style.flexBasis = "0";
        if (seg.pid !== "Idle") block.style.background = colorFor(seg.pid);
        block.textContent = seg.pid;
        block.title = `${seg.pid}: ${seg.start} to ${seg.end}`;
        bar.appendChild(block);

        const tick = document.createElement("span");
        tick.style.flexGrow = seg.end - seg.start;
        tick.style.flexBasis = "0";
        tick.textContent = seg.start;
        if (i === timeline.length - 1) {            // end time under the last block
            const last = document.createElement("em");
            last.textContent = seg.end;
            tick.appendChild(last);
        }
        ticks.appendChild(tick);
    });

    gantt.appendChild(bar);
    gantt.appendChild(ticks);
}

// ---------- Algorithm comparison ----------
const compareBtn = document.getElementById("compareBtn");

compareBtn.addEventListener("click", async () => {
    if (processes.length === 0) {
        showMessage("Add at least one process before comparing.", true);
        return;
    }

    const quantum = Number(document.getElementById("quantum").value) || 2;
    try {
        const response = await fetch("/api/compare", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                quantum,
                processes: processes.map(p => ({
                    id: p.id, arrival: p.arrivalTime, burst: p.burstTime, priority: p.priority
                }))
            })
        });
        const data = await response.json();
        if (!response.ok) {
            showMessage(data.error || "Comparison failed.", true);
            return;
        }
        showMessage(`Compared ${data.results.length} algorithms.`, false);
        renderComparison(data, quantum);
    } catch (err) {
        showMessage("Could not reach the server. Is Flask running?", true);
    }
});

function renderComparison(data, quantum) {
    const { results, best } = data;
    const isBest = (metric, name) => best[metric].includes(name);

    document.getElementById("compareEmpty").classList.add("hidden");
    document.getElementById("compareContent").classList.remove("hidden");
    document.getElementById("compareLabel").textContent =
        `${processes.length} processes, quantum ${quantum}`;

    // Verdict: lowest average waiting time
    const winners = best.avg_waiting;
    const low = results.find(r => r.name === winners[0]).summary.avg_waiting;
    document.getElementById("verdict").textContent =
        `Lowest average waiting time: ${winners.join(" and ")} (${low.toFixed(2)} time units).`;

    // Table
    const body = document.getElementById("compareBody");
    body.innerHTML = "";
    results.forEach(r => {
        const s = r.summary;
        const row = document.createElement("tr");
        const cells = [
            [r.name, null],
            [s.avg_waiting.toFixed(2), "avg_waiting"],
            [s.avg_turnaround.toFixed(2), "avg_turnaround"],
            [s.avg_response.toFixed(2), "avg_response"],
            [s.context_switches, "context_switches"],
            [`${s.cpu_utilization}%`, null],
            [s.throughput, null]
        ];
        cells.forEach(([text, metric]) => {
            const td = document.createElement("td");
            td.textContent = text;
            if (metric && isBest(metric, r.name)) td.className = "best-cell";
            row.appendChild(td);
        });
        body.appendChild(row);
    });

    // Charts
    const charts = document.getElementById("compareCharts");
    charts.innerHTML = "";
    [
        ["avg_waiting", "Average waiting time"],
        ["avg_turnaround", "Average turnaround time"],
        ["avg_response", "Average response time"],
        ["context_switches", "Context switches"]
    ].forEach(([metric, title]) => charts.appendChild(buildBarChart(results, best, metric, title)));
}

function buildBarChart(results, best, metric, title) {
    const wrap = document.createElement("div");
    wrap.className = "bar-chart";

    const heading = document.createElement("h4");
    heading.className = "sub-title";
    heading.textContent = `${title} (lower is better)`;
    wrap.appendChild(heading);

    const max = Math.max(...results.map(r => r.summary[metric]));
    results.forEach(r => {
        const value = r.summary[metric];

        const row = document.createElement("div");
        row.className = "bar-row";

        const label = document.createElement("span");
        label.className = "bar-label";
        label.textContent = r.name;

        const track = document.createElement("div");
        track.className = "bar-track";
        const fill = document.createElement("div");
        fill.className = best[metric].includes(r.name) ? "bar-fill best" : "bar-fill";
        fill.style.width = max > 0 ? `${(value / max) * 100}%` : "0%";
        track.appendChild(fill);

        const num = document.createElement("span");
        num.className = "bar-value";
        num.textContent = Number.isInteger(value) ? value : value.toFixed(2);

        row.append(label, track, num);
        wrap.appendChild(row);
    });
    return wrap;
}

// Sidebar: highlight the link you clicked
document.querySelectorAll(".sidebar nav a").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".sidebar nav a").forEach(a => a.classList.remove("active"));
        link.classList.add("active");
    });
});
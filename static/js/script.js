
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
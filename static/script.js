let dataTable = [];

// ─── INIT ORG ──────────────────────────────────────────
window.onload = function () {
  fetch("/init_org")
    .then(res => res.json())
    .then(data => {
      document.getElementById("orgName").innerText = data.org || "Unknown";
    })
    .catch(() => {
      document.getElementById("orgName").innerText = "Error";
    });
};

// ─── FILE INPUT TRIGGER ─────────────────────────────────
function triggerFileInput() {
  const zone = document.getElementById("uploadZone");
  if (zone.classList.contains("disabled")) return;
  document.getElementById("fileInput").click();
}

// ─── UPLOAD ────────────────────────────────────────────
function uploadFile() {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return;

  const zone     = document.getElementById("uploadZone");
  const btn      = document.getElementById("uploadBtn");
  const heading  = document.getElementById("uploadHeading");
  const sub      = document.getElementById("uploadSub");
  const icon     = document.getElementById("uploadIcon");

  // Visual feedback — loading
  icon.textContent    = "⏳";
  heading.textContent = "Uploading…";
  sub.textContent     = file.name;

  const formData = new FormData();
  formData.append("file", file);

  fetch("/upload", { method: "POST", body: formData })
    .then(res => res.json())
    .then(data => {
      dataTable = data;

      // Lock the upload zone
      zone.classList.add("has-file", "disabled");
      btn.disabled        = true;
      icon.textContent    = "✅";
      heading.textContent = "File uploaded successfully";
      sub.textContent     = `${file.name}  ·  ${data.length} service(s) detected`;

      document.getElementById("tableCard").style.display = "block";
      updateMetrics();
      renderTable();
    })
    .catch(() => {
      icon.textContent    = "❌";
      heading.textContent = "Upload failed. Try again.";
      sub.textContent     = "";
    });
}

// ─── RENDER TABLE ──────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  dataTable.forEach((row, i) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><span class="sl-num">${i + 1}</span></td>
      <td><span class="service-name">${row.service}</span></td>
      <td>
        <input type="text" value="${row.branch}"
          ${row.locked ? "disabled" : ""}
          onchange="updateBranch(${i}, this.value)"
          placeholder="branch name…" />
      </td>
      <td>
        <div class="validate-btns">
          <button class="btn btn-sm btn-success" onclick="validate(${i}, true)"
            ${row.locked === true ? "disabled" : ""}>✔ Yes</button>
          <button class="btn btn-sm btn-danger" onclick="validate(${i}, false)"
            ${row.locked === false ? "disabled" : ""}>✖ No</button>
        </div>
      </td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="processRow(${i})"
          ${!row.locked ? "disabled" : ""}>
          ${row.status === "completed" || row.status === "exists" ? "🔁 Re-run" : "▶ Create Repository and Push Code"}
        </button>
      </td>
      <td>${renderBadge(row.status, i)}</td>
    `;

    tbody.appendChild(tr);
  });
}

function renderBadge(status, i) {
  const map = {
    "Pending":    `<span class="badge badge-pending">⏸ Pending</span>`,
    "processing": `<span class="badge badge-running" id="badge-${i}">⏳ Processing…</span>`,
    "completed":  `<span class="badge badge-done">✅ Completed</span>`,
    "exists":     `<span class="badge badge-exists">🔄 Repository Already Created</span>`,
    "failed":     `<span class="badge badge-failed">❌ Failed</span>`,
  };
  return map[status] || `<span class="badge badge-pending">${status}</span>`;
}

// ─── UPDATE BRANCH ─────────────────────────────────────
function updateBranch(i, val) {
  dataTable[i].branch = val;
}

// ─── VALIDATE ──────────────────────────────────────────
function validate(i, val) {
  dataTable[i].locked = val;
  renderTable();
}

// ─── PROCESS SINGLE ROW ────────────────────────────────
function processRow(i) {
  const row = dataTable[i];

  // Set to processing immediately — fixes "Pending" flicker on re-run
  dataTable[i].status = "processing";
  renderTable();

  fetch("/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(row)
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === "completed") {
        dataTable[i].status = "completed";
      } else if (data.status === "already_exists") {
        dataTable[i].status = "exists";
      } else {
        dataTable[i].status = "failed";
      }
      renderTable();
      updateMetrics();
    })
    .catch(() => {
      dataTable[i].status = "failed";
      renderTable();
      updateMetrics();
    });
}

// ─── PROCESS ALL VALIDATED ─────────────────────────────
function processAll() {
  dataTable.forEach((row, i) => {
    if (row.locked && row.status !== "completed" && row.status !== "exists") {
      processRow(i);
    }
  });
}

// ─── METRICS ───────────────────────────────────────────
function updateMetrics() {
  const total  = dataTable.length;
  const done   = dataTable.filter(r => r.status === "completed").length;
  const failed = dataTable.filter(r => r.status === "failed").length;
  const exists = dataTable.filter(r => r.status === "exists").length;

  document.getElementById("metricTotal").textContent  = total  || "—";
  document.getElementById("metricDone").textContent   = done   || "0";
  document.getElementById("metricFailed").textContent = failed || "0";
  document.getElementById("metricExists").textContent = exists || "0";
}

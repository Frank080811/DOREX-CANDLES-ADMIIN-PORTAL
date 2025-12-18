const API_BASE = "https://iluminous-candle-uk-be.onrender.com";

const selectedOrders = new Set();

/* NAV */
function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav").forEach(n => n.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  event.target.classList.add("active");
}

/* LOAD DASHBOARD */
async function loadDashboard() {
  const res = await fetch(`${API_BASE}/admin/orders`);
  const data = await res.json();

  document.getElementById("statOrders").textContent = data.length;
  document.getElementById("statPaid").textContent =
    data.filter(o => o.status === "PAID").length;
  document.getElementById("statRevenue").textContent =
    data.reduce((s, o) => s + Number(o.total || 0), 0).toFixed(2);

  loadOrders(data);
}

/* ORDERS TABLE */
function loadOrders(orders) {
  const tbody = document.getElementById("ordersTable");
  tbody.innerHTML = "";

  orders.forEach(o => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><input type="checkbox" onchange="toggleSelect('${o.id}', this.checked)"></td>
      <td>${o.id.slice(0, 8)}...</td>
      <td>${o.customer_name}</td>
      <td>${o.status}</td>
      <td>£${o.total}</td>
      <td>
        <button class="action-btn" onclick="printSingleLabel('${o.id}')">
          Print Label
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* LABEL ACTIONS */
function toggleSelect(id, checked) {
  checked ? selectedOrders.add(id) : selectedOrders.delete(id);
}

function printSingleLabel(orderId) {
  window.open(`${API_BASE}/admin/orders/${orderId}/label`, "_blank");
}

async function printBatchLabels() {
  if (!selectedOrders.size) {
    alert("Select at least one order");
    return;
  }

  const res = await fetch(`${API_BASE}/admin/labels/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([...selectedOrders])
  });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

/* INIT */
loadDashboard();

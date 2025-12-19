const API_BASE = "https://iluminous-candle-uk-be.onrender.com";

const selectedOrders = new Set();

/* =========================
   CHART.JS — DARK GLASS THEME
========================= */
Chart.defaults.color = "#d4d4d8";
Chart.defaults.font.family = "Segoe UI, sans-serif";
Chart.defaults.borderColor = "rgba(255,255,255,0.08)";
Chart.defaults.plugins.legend.labels.color = "#e5e7eb";
Chart.defaults.plugins.tooltip.backgroundColor = "rgba(20,20,30,0.95)";
Chart.defaults.plugins.tooltip.borderColor = "rgba(255,255,255,0.12)";
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.titleColor = "#f3f4f6";
Chart.defaults.plugins.tooltip.bodyColor = "#e5e7eb";

/* =========================
   NAV
   (fixed: no implicit global `event`)
========================= */
function showSection(id, el) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav").forEach(n => n.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (el) el.classList.add("active");
}

/* LOAD DASHBOARD */
let salesTrendChart, topProductsChart, orderStatusChart, revenueChart;

async function loadDashboard() {
  try {
    const res = await fetch(`${API_BASE}/admin/orders`);
    if (!res.ok) throw new Error(`Failed to fetch orders (${res.status})`);
    const orders = await res.json();

    // KPIs
    document.getElementById("statOrders").textContent = orders.length;

    const paidOrders = orders.filter(o => o.status === "PAID");
    document.getElementById("statPaid").textContent = paidOrders.length;

    const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    document.getElementById("statRevenue").textContent = totalRevenue.toFixed(2);

    loadOrders(orders);
    buildCharts(orders);
  } catch (err) {
    console.error(err);
    alert("Could not load dashboard data. Please try again.");
  }
}

/* =========================
   ORDERS TABLE
========================= */
function loadOrders(orders) {
  const tbody = document.getElementById("ordersTable");
  tbody.innerHTML = "";

  orders.forEach(o => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><input type="checkbox" onchange="toggleSelect('${o.id}', this.checked)"></td>
      <td>${String(o.id).slice(0, 8)}...</td>
      <td>${o.customer_name ?? "—"}</td>
      <td>${o.status ?? "—"}</td>
      <td>£${Number(o.total || 0).toFixed(2)}</td>
      <td>
        <button class="action-btn" onclick="printSingleLabel('${o.id}')">
          Print Label
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* =========================
   LABEL ACTIONS
========================= */
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

  try {
    const res = await fetch(`${API_BASE}/admin/labels/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([...selectedOrders])
    });

    if (!res.ok) throw new Error(`Batch label failed (${res.status})`);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch (err) {
    console.error(err);
    alert("Could not generate batch labels. Please try again.");
  }
}

/* =========================
   CHART HELPERS
========================= */
function makeLineScales() {
  return {
    x: {
      ticks: { color: "#cbd5e1" },
      grid: { color: "rgba(255,255,255,0.06)" }
    },
    y: {
      ticks: { color: "#cbd5e1" },
      grid: { color: "rgba(255,255,255,0.06)" }
    }
  };
}

function basePlugins() {
  return {
    legend: {
      position: "top",
      labels: { usePointStyle: true, boxWidth: 10 }
    },
    tooltip: {
      padding: 12,
      displayColors: true
    }
  };
}

/* =========================
   SALES TREND
========================= */
function buildSalesTrend(orders) {
  const daily = {};

  orders.forEach(o => {
    if (o.status !== "PAID") return;
    const day = new Date(o.created_at).toLocaleDateString();
    daily[day] = (daily[day] || 0) + Number(o.total || 0);
  });

  const labels = Object.keys(daily);
  const data = Object.values(daily);

  if (salesTrendChart) salesTrendChart.destroy();

  salesTrendChart = new Chart(document.getElementById("salesTrendChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Revenue (£)",
        data,
        tension: 0.4,
        fill: true,
        borderColor: "#f2a93b",
        backgroundColor: "rgba(242,169,59,0.25)",
        pointBackgroundColor: "#f2a93b",
        pointBorderColor: "rgba(0,0,0,0)",
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: basePlugins(),
      scales: makeLineScales()
    }
  });
}

/* =========================
   TOP PRODUCTS
========================= */
function buildTopProducts(orders) {
  const products = {};

  orders.forEach(o => {
    if (!o.items) return;
    o.items.forEach(i => {
      const name = i.product_name ?? "Unknown";
      products[name] = (products[name] || 0) + Number(i.quantity || 0);
    });
  });

  const labels = Object.keys(products);
  const data = Object.values(products);

  if (topProductsChart) topProductsChart.destroy();

  topProductsChart = new Chart(document.getElementById("topProductsChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Units Sold",
        data,
        backgroundColor: "rgba(242,169,59,0.6)",
        borderColor: "rgba(242,169,59,0.9)",
        borderWidth: 1,
        borderRadius: 10
      }]
    },
    options: {
      responsive: true,
      plugins: basePlugins(),
      scales: makeLineScales()
    }
  });
}

/* =========================
   ORDER STATUS DISTRIBUTION
========================= */
function buildOrderStatus(orders) {
  const statusCount = {};

  orders.forEach(o => {
    const s = o.status ?? "UNKNOWN";
    statusCount[s] = (statusCount[s] || 0) + 1;
  });

  if (orderStatusChart) orderStatusChart.destroy();

  orderStatusChart = new Chart(document.getElementById("orderStatusChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(statusCount),
      datasets: [{
        data: Object.values(statusCount),
        backgroundColor: [
          "rgba(74,222,128,0.85)",  // green
          "rgba(251,191,36,0.85)",  // amber
          "rgba(96,165,250,0.85)",  // blue
          "rgba(167,139,250,0.85)", // purple
          "rgba(244,114,182,0.85)"  // pink
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      cutout: "65%",
      plugins: basePlugins()
    }
  });
}

/* =========================
   REVENUE BREAKDOWN
========================= */
function buildRevenueBreakdown(orders) {
  let subtotal = 0, tax = 0, shipping = 0;

  orders.forEach(o => {
    if (o.status !== "PAID") return;
    subtotal += Number(o.subtotal || 0);
    tax += Number(o.tax || 0);
    shipping += Number(o.shipping || 0);
  });

  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(document.getElementById("revenueBreakdownChart"), {
    type: "pie",
    data: {
      labels: ["Product", "Tax", "Shipping"],
      datasets: [{
        data: [subtotal, tax, shipping],
        backgroundColor: [
          "rgba(242,169,59,0.85)",
          "rgba(96,165,250,0.85)",
          "rgba(167,139,250,0.85)"
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: basePlugins()
    }
  });
}

/* =========================
   INIT
========================= */
function buildCharts(orders) {
  buildSalesTrend(orders);
  buildTopProducts(orders);
  buildOrderStatus(orders);
  buildRevenueBreakdown(orders);
}

document.addEventListener("DOMContentLoaded", () => {
  // If your HTML still uses onclick="showSection('dashboard')" etc,
  // this keeps it working by grabbing the last click target:
  document.querySelectorAll(".nav").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const label = btn.textContent.trim().toLowerCase();
      const id =
        label.includes("dashboard") ? "dashboard" :
        label.includes("orders") ? "orders" :
        label.includes("shipping") ? "labels" :
        "dashboard";
      showSection(id, btn);
    });
  });

  loadDashboard();
});

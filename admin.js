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
let salesTrendChart, topProductsChart, orderStatusChart, revenueChart;

async function loadDashboard() {
  const res = await fetch(`${API_BASE}/admin/orders`);
  const orders = await res.json();

  // KPIs
  document.getElementById("statOrders").textContent = orders.length;
  document.getElementById("statPaid").textContent =
    orders.filter(o => o.status === "PAID").length;

  const totalRevenue = orders.reduce(
    (s, o) => s + (o.status === "PAID" ? Number(o.total) : 0), 0
  );

  document.getElementById("statRevenue").textContent =
    totalRevenue.toFixed(2);

  loadOrders(orders);
  buildCharts(orders);
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


function buildSalesTrend(orders) {
  const daily = {};

  orders.forEach(o => {
    if (o.status !== "PAID") return;
    const day = new Date(o.created_at).toLocaleDateString();
    daily[day] = (daily[day] || 0) + Number(o.total);
  });

  const labels = Object.keys(daily);
  const data = Object.values(daily);

  if (salesTrendChart) salesTrendChart.destroy();

  salesTrendChart = new Chart(
    document.getElementById("salesTrendChart"),
    {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Revenue (£)",
          data,
          tension: 0.4,
          fill: true
        }]
      }
    }
  );
}

function buildTopProducts(orders) {
  const products = {};

  orders.forEach(o => {
    if (!o.items) return;
    o.items.forEach(i => {
      products[i.product_name] =
        (products[i.product_name] || 0) + i.quantity;
    });
  });

  const labels = Object.keys(products);
  const data = Object.values(products);

  if (topProductsChart) topProductsChart.destroy();

  topProductsChart = new Chart(
    document.getElementById("topProductsChart"),
    {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Units Sold",
          data
        }]
      }
    }
  );
}

///////// ORDER STATUS ///////////////////
function buildOrderStatus(orders) {
  const statusCount = { PAID: 0, PENDING: 0 };

  orders.forEach(o => {
    statusCount[o.status] =
      (statusCount[o.status] || 0) + 1;
  });

  if (orderStatusChart) orderStatusChart.destroy();

  orderStatusChart = new Chart(
    document.getElementById("orderStatusChart"),
    {
      type: "doughnut",
      data: {
        labels: Object.keys(statusCount),
        datasets: [{
          data: Object.values(statusCount)
        }]
      }
    }
  );
}

////////////// REVENUE BREAK DOWN /////////////////////
function buildRevenueBreakdown(orders) {
  let subtotal = 0, tax = 0, shipping = 0;

  orders.forEach(o => {
    if (o.status !== "PAID") return;
    subtotal += Number(o.subtotal || 0);
    tax += Number(o.tax || 0);
    shipping += Number(o.shipping || 0);
  });

  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(
    document.getElementById("revenueBreakdownChart"),
    {
      type: "pie",
      data: {
        labels: ["Product", "Tax", "Shipping"],
        datasets: [{
          data: [subtotal, tax, shipping]
        }]
      }
    }
  );
}


/* INIT */
loadDashboard();

function buildCharts(orders) {
  buildSalesTrend(orders);
  buildTopProducts(orders);
  buildOrderStatus(orders);
  buildRevenueBreakdown(orders);
}
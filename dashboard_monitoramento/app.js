/*
 * ============================================================
 * CONFIGURAÇÃO DO BACKEND
 * ============================================================
 *
 * O frontend NÃO possui dados simulados.
 *
 * Quando sua API estiver pronta, altere DATA_ENDPOINT para a
 * URL que retorna os registros do banco de dados.
 *
 * Formato esperado:
 * [
 *   {
 *     "timestamp": "2026-10-01T14:30:00Z",
 *     "temperature": 24.5,
 *     "humidity": 61.2,
 *     "pressure": 1012.8,
 *     "wind": 4.1
 *   }
 * ]
 *
 * Se os nomes das colunas do seu banco forem diferentes,
 * ajuste a função normalizeReading().
 * ============================================================
 */

const DATA_ENDPOINT = ""; // Ex.: "http://localhost:8000/api/readings"

let readings = [];
let selectedPeriod = "24h";
let temperatureChart = null;
let humidityChart = null;

const $ = (selector) => document.querySelector(selector);

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadData();
});

function bindEvents() {
  $("#refresh-button").addEventListener("click", loadData);

  document.querySelectorAll(".period-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".period-button").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      selectedPeriod = button.dataset.period;
      renderDashboard();
    });
  });
}

async function loadData() {
  if (!DATA_ENDPOINT) {
    setConnectionState(false, "Aguardando conexão", "Endpoint não configurado");
    renderDashboard();
    return;
  }

  setConnectionState(false, "Conectando...", "Buscando dados");

  try {
    const response = await fetch(DATA_ENDPOINT, {
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("A API deve retornar um array de leituras.");
    }

    readings = data
      .map(normalizeReading)
      .filter((reading) => reading.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setConnectionState(true, "Banco conectado", getLastUpdateText());
    renderDashboard();
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    readings = [];
    setConnectionState(false, "Erro de conexão", "Verifique o endpoint");
    renderDashboard();
  }
}

function normalizeReading(row) {
  return {
    timestamp: row.timestamp ?? row.datetime ?? row.created_at ?? row.data_hora ?? null,
    temperature: numberOrNull(row.temperature ?? row.temperatura ?? row.temp),
    humidity: numberOrNull(row.humidity ?? row.umidade),
    pressure: numberOrNull(row.pressure ?? row.pressao),
    wind: numberOrNull(row.wind ?? row.wind_speed ?? row.velocidade_vento ?? row.vento)
  };
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getFilteredReadings() {
  const now = Date.now();

  const periodMs = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000
  }[selectedPeriod];

  return readings.filter((reading) => {
    const time = new Date(reading.timestamp).getTime();
    return Number.isFinite(time) && time >= now - periodMs;
  });
}

function renderDashboard() {
  renderCards();
  renderTable();
  renderCharts();
}

function renderCards() {
  const latest = readings[0];

  if (!latest) {
    setMetric("temperature", null);
    setMetric("humidity", null);
    setMetric("pressure", null);
    setMetric("wind", null);
    return;
  }

  setMetric("temperature", latest.temperature, "°C", latest.timestamp);
  setMetric("humidity", latest.humidity, "%", latest.timestamp);
  setMetric("pressure", latest.pressure, "hPa", latest.timestamp);
  setMetric("wind", latest.wind, "m/s", latest.timestamp);
}

function setMetric(name, value, unit, timestamp) {
  const valueElement = $(`#${name}-value`);
  const timeElement = $(`#${name}-time`);

  if (value === null) {
    valueElement.textContent = "--";
    valueElement.classList.add("empty");
    timeElement.textContent = "--";
    return;
  }

  valueElement.textContent = `${formatNumber(value)} ${unit}`;
  valueElement.classList.remove("empty");
  timeElement.textContent = formatTime(timestamp);
}

function renderTable() {
  const table = $("#readings-table");
  const visible = readings.slice(0, 10);

  $("#record-count").textContent = `${readings.length} ${readings.length === 1 ? "registro" : "registros"}`;

  if (!visible.length) {
    table.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">
          <div class="table-empty">
            <strong>Nenhuma leitura disponível</strong>
            <span>Conecte o endpoint do banco em <code>app.js</code>.</span>
          </div>
        </td>
      </tr>`;
    return;
  }

  table.innerHTML = visible.map((reading) => `
    <tr>
      <td>${formatDateTime(reading.timestamp)}</td>
      <td>${formatValue(reading.temperature, "°C")}</td>
      <td>${formatValue(reading.humidity, "%")}</td>
      <td>${formatValue(reading.pressure, "hPa")}</td>
      <td>${formatValue(reading.wind, "m/s")}</td>
      <td><span class="status ok">Recebido</span></td>
    </tr>
  `).join("");
}

function renderCharts() {
  const filtered = getFilteredReadings().sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  drawChart(
    "temperature-chart",
    "temperature-empty",
    "Temperatura",
    filtered,
    "temperature",
    "°C"
  );

  drawChart(
    "humidity-chart",
    "humidity-empty",
    "Umidade",
    filtered,
    "humidity",
    "%"
  );
}

function drawChart(canvasId, emptyId, label, data, field, unit) {
  const canvas = $(`#${canvasId}`);
  const empty = $(`#${emptyId}`);

  const points = data.filter((item) => item[field] !== null);

  if (!points.length) {
    canvas.style.display = "none";
    empty.style.display = "flex";
  } else {
    canvas.style.display = "block";
    empty.style.display = "none";
  }

  const chartData = {
    labels: points.map((item) => formatChartTime(item.timestamp)),
    datasets: [{
      label,
      data: points.map((item) => item[field]),
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.35,
      fill: true
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${formatNumber(context.raw)} ${unit}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 7, font: { size: 9 } }
      },
      y: {
        grid: { color: "#edf0f2" },
        ticks: {
          font: { size: 9 },
          callback: (value) => `${value} ${unit}`
        }
      }
    }
  };

  const chart = new Chart(canvas, {
    type: "line",
    data: chartData,
    options
  });

  if (field === "temperature") {
    if (temperatureChart) temperatureChart.destroy();
    temperatureChart = chart;
  } else {
    if (humidityChart) humidityChart.destroy();
    humidityChart = chart;
  }
}

function setConnectionState(connected, label, lastUpdate) {
  const dot = document.querySelector(".status-dot");
  dot.classList.toggle("connected", connected);
  $("#connection-label").textContent = label;
  $("#last-update").textContent = lastUpdate;
}

function getLastUpdateText() {
  return readings.length
    ? `Última leitura: ${formatDateTime(readings[0].timestamp)}`
    : "Nenhuma leitura";
}

function formatNumber(value) {
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  });
}

function formatValue(value, unit) {
  return value === null ? "--" : `${formatNumber(value)} ${unit}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatChartTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

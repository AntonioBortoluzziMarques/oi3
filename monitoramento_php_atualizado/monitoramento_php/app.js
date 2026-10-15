const API = { readings: "./api/readings.php", stations: "./api/stations.php" };
let readings = [], stations = [], period = "24h", selected = "all", tempChart = null, humChart = null;
const $ = (s) => document.querySelector(s);

document.addEventListener("DOMContentLoaded", () => { bind(); load(); });
function bind() {
  $("#refresh").addEventListener("click", load);
  $("#station").addEventListener("change", e => { selected = e.target.value; render(); });
  document.querySelectorAll(".periods button").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".periods button").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    period = button.dataset.p;
    render();
  }));
}

async function load() {
  setStatus(false, "Conectando...", "Consultando banco MySQL");
  try {
    const [readingsResponse, stationsResponse] = await Promise.all([fetch(API.readings), fetch(API.stations)]);
    if (!readingsResponse.ok || !stationsResponse.ok) throw new Error("A API retornou erro HTTP.");
    const [readingsData, stationsData] = await Promise.all([readingsResponse.json(), stationsResponse.json()]);
    if (!Array.isArray(readingsData) || !Array.isArray(stationsData)) {
      throw new Error(readingsData.error || stationsData.error || "Resposta inesperada da API.");
    }
    readings = readingsData.map(normalizeReading).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    stations = stationsData.map(normalizeStation);
    populateStations();
    render();
    setStatus(true, "Sistema conectado", `${stations.length} caixa(s) cadastrada(s)`);
  } catch (error) {
    console.error(error);
    readings = []; stations = [];
    populateStations(); render();
    setStatus(false, "Sem conexão", "Verifique servidor PHP e configuração MySQL");
  }
}

function normalizeReading(row) {
  return {
    stationId: String(row.station_id ?? ""),
    stationName: row.station_name ?? "Caixa",
    active: Boolean(row.active),
    timestamp: row.timestamp,
    temperature: numberOrNull(row.temperature),
    humidity: numberOrNull(row.humidity),
    pressure: numberOrNull(row.pressure),
    temperatureUnit: row.temperature_unit || "°C",
    humidityUnit: row.humidity_unit || "%",
    pressureUnit: row.pressure_unit || "hPa",
    collectionId: row.collection_id,
    collectionName: row.collection_name || "",
    locality: row.locality || ""
  };
}
function normalizeStation(row) {
  return { id: String(row.id), name: row.name || `Caixa ${row.id}`, active: row.active === true || row.active === 1 || row.active === "1", ip: row.ip || "", network: row.network || "", lastLogin: row.last_login || "" };
}
function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function populateStations() {
  const select = $("#station");
  select.innerHTML = '<option value="all">Todas as caixas</option>' + stations.map(s =>
    `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join("");
  if (stations.some(s => s.id === selected)) select.value = selected;
  else { selected = "all"; select.value = "all"; }
}
function chosenReadings() {
  return readings.filter(r => selected === "all" || r.stationId === selected);
}
function periodReadings() {
  const duration = { "24h": 24 * 60 * 60 * 1000, "7d": 7 * 86400000, "30d": 30 * 86400000 }[period];
  const cutoff = Date.now() - duration;
  return chosenReadings().filter(r => {
    const timestamp = new Date(r.timestamp).getTime();
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  });
}
function latestFor(field) {
  return chosenReadings().find(r => r[field] !== null && r[field] !== undefined);
}
function render() {
  const temp = latestFor("temperature"), humidity = latestFor("humidity"), pressure = latestFor("pressure");
  metric("temperature", temp, "temperature", "temperatureUnit");
  metric("humidity", humidity, "humidity", "humidityUnit");
  metric("pressure", pressure, "pressure", "pressureUnit");
  const activeCount = stations.filter(s => s.active).length;
  $("#active").textContent = stations.length ? activeCount : "--";
  $("#active-status").textContent = stations.length ? `${activeCount}/${stations.length} ativas` : "--";
  const latestTimestamp = chosenReadings().find(r => r.timestamp)?.timestamp;
  $("#last-update").textContent = latestTimestamp ? formatDate(latestTimestamp) : "--";
  renderTable(); renderStationCards(); renderCharts();
}
function metric(id, row, field, unitField) {
  const value = row ? row[field] : null;
  $(`#${id}`).textContent = value == null ? "--" : formatNumber(value);
  $(`#${id}-time`).textContent = row?.timestamp ? formatTime(row.timestamp) : "--";
  const unit = row?.[unitField];
  $(`#${id}-unit`).textContent = unit || ({temperature:"°C",humidity:"%",pressure:"hPa"}[id]);
}
function renderTable() {
  const rows = chosenReadings().slice(0, 15);
  $("#count").textContent = `${rows.length} ${rows.length === 1 ? "registro" : "registros"}`;
  $("#table").innerHTML = rows.length ? rows.map(row => `<tr>
    <td>${escapeHtml(row.stationName)}</td><td>${formatDate(row.timestamp)}</td>
    <td>${formatValue(row.temperature, row.temperatureUnit)}</td>
    <td>${formatValue(row.humidity, row.humidityUnit)}</td>
    <td>${formatValue(row.pressure, row.pressureUnit)}</td>
    <td>${row.collectionName ? escapeHtml(row.collectionName) : (row.collectionId ? `#${escapeHtml(row.collectionId)}` : "--")}</td>
  </tr>`).join("") : `<tr><td colspan="6"><div class="empty-table"><strong>Nenhuma leitura disponível</strong><span>Confira se existem registros na tabela leitura e se a API está configurada.</span></div></td></tr>`;
}
function renderStationCards() {
  $("#stations").innerHTML = stations.length ? stations.map(station => {
    const rows = readings.filter(r => r.stationId === station.id);
    const t = rows.find(r => r.temperature != null), h = rows.find(r => r.humidity != null), p = rows.find(r => r.pressure != null);
    return `<article class="station"><div class="station-head"><h4>${escapeHtml(station.name)}</h4><span class="${station.active ? "online" : "online offline"}">${station.active ? "Ativa" : "Inativa"}</span></div>
      <div class="station-data">
        <div><span>Temperatura</span><b>${formatValue(t?.temperature, t?.temperatureUnit || "°C")}</b></div>
        <div><span>Umidade</span><b>${formatValue(h?.humidity, h?.humidityUnit || "%")}</b></div>
        <div><span>Pressão</span><b>${formatValue(p?.pressure, p?.pressureUnit || "hPa")}</b></div>
        <div><span>Última leitura</span><b>${rows[0] ? formatTime(rows[0].timestamp) : "--"}</b></div>
        ${station.ip ? `<div><span>IP</span><b>${escapeHtml(station.ip)}</b></div>` : ""}
        ${station.network ? `<div><span>Rede Wi-Fi</span><b>${escapeHtml(station.network)}</b></div>` : ""}
      </div></article>`;
  }).join("") : `<div class="empty-station">Nenhuma caixa cadastrada na tabela mac.</div>`;
}
function renderCharts() {
  drawChart("temp-chart", "temp-empty", "temperature", "temperatureUnit", "°C", tempChart, chart => tempChart = chart);
  drawChart("hum-chart", "hum-empty", "humidity", "humidityUnit", "%", humChart, chart => humChart = chart);
}
function drawChart(canvasId, emptyId, field, unitField, fallbackUnit, oldChart, saveChart) {
  const data = periodReadings().filter(r => r[field] != null).sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp));
  const canvas = $(`#${canvasId}`), empty = $(`#${emptyId}`);
  if (oldChart) oldChart.destroy();
  canvas.style.display = data.length && window.Chart ? "block" : "none";
  empty.style.display = data.length && window.Chart ? "none" : "flex";
  if (!data.length || !window.Chart) return;
  const chart = new Chart(canvas, {
    type: "line",
    data: { labels: data.map(r => `${r.stationName} · ${formatTime(r.timestamp)}`), datasets: [{
      data: data.map(r => r[field]), borderWidth: 2, pointRadius: 1, tension: .3, fill: true
    }]},
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: {display:false}, tooltip: { callbacks: { label: item => `${formatNumber(item.raw)} ${data[item.dataIndex]?.[unitField] || fallbackUnit}` } } },
      scales: { x: { grid: {display:false}, ticks: {font:{size:8}, maxTicksLimit:7} },
        y: { grid: {color:"#edf1ef"}, ticks: {font:{size:8}, callback: value => `${value} ${fallbackUnit}`} } }
    }
  });
  saveChart(chart);
}
function setStatus(connected, title, detail) {
  $("#status-dot").classList.toggle("ok", connected);
  $("#status-text").textContent = title;
  $("#status-detail").textContent = detail;
}
function formatNumber(value) { return Number(value).toLocaleString("pt-BR", {minimumFractionDigits:1, maximumFractionDigits:2}); }
function formatValue(value, unit) { return value == null ? "--" : `${formatNumber(value)} ${unit || ""}`.trim(); }
function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleString("pt-BR", {day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"});
}
function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"});
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[character]));
}

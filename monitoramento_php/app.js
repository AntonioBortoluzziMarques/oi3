const API = { readings: "api/readings.php", stations: "api/stations.php" };
let readings = [],
  stations = [],
  period = "24h",
  selected = "all",
  tc = null,
  hc = null;
const $ = (s) => document.querySelector(s);
document.addEventListener("DOMContentLoaded", () => {
  bind();
  load();
});
function bind() {
  $("#refresh").onclick = load;
  $("#station").onchange = (e) => {
    selected = e.target.value;
    render();
  };
  document.querySelectorAll(".periods button").forEach(
    (b) =>
      (b.onclick = () => {
        document
          .querySelectorAll(".periods button")
          .forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        period = b.dataset.p;
        render();
      }),
  );
}
async function load() {
  setStatus(false, "Conectando...", "Consultando API PHP");
  try {
    let [a, b] = await Promise.all([fetch(API.readings), fetch(API.stations)]);
    if (!a.ok || !b.ok) throw Error("API");
    readings = (await a.json())
      .map(normR)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    stations = (await b.json()).map(normS);
    options();
    render();
    setStatus(true, "Sistema conectado", last());
  } catch (e) {
    console.error(e);
    readings = [];
    stations = [];
    options();
    render();
    setStatus(false, "Sem conexão", "API PHP indisponível");
  }
}
function normR(x) {
  return {
    stationId: x.station_id ?? x.caixa_id ?? x.estacao_id,
    stationName: x.station_name ?? x.caixa_nome ?? x.estacao_nome ?? "Caixa",
    timestamp: x.timestamp ?? x.datetime ?? x.created_at ?? x.data_hora,
    temperature: num(x.temperature ?? x.temperatura ?? x.temp),
    humidity: num(x.humidity ?? x.umidade),
    pressure: num(x.pressure ?? x.pressao),
  };
}
function normS(x) {
  return {
    id: String(x.id ?? x.station_id ?? x.caixa_id),
    name: x.name ?? x.station_name ?? x.nome ?? "Caixa",
    active: Boolean(x.active ?? x.ativo ?? true),
  };
}
function num(x) {
  if (x === null || x === undefined || x === "") return null;
  let n = Number(x);
  return Number.isFinite(n) ? n : null;
}
function options() {
  let s = $("#station");
  s.innerHTML =
    '<option value="all">Todas as caixas</option>' +
    stations
      .map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`)
      .join("");
  if (stations.some((x) => String(x.id) === String(selected)))
    s.value = selected;
  else {
    selected = "all";
    s.value = "all";
  }
}
function current() {
  let x =
    selected === "all"
      ? readings
      : readings.filter((r) => String(r.stationId) === String(selected));
  return x[0];
}
function filtered() {
  let ms = { "24h": 864e5, "7d": 6048e5, "30d": 2592e6 }[period],
    cut = Date.now() - ms;
  return readings.filter(
    (r) =>
      (selected === "all" || String(r.stationId) === String(selected)) &&
      new Date(r.timestamp).getTime() >= cut,
  );
}
function render() {
  let x = current();
  metric("temperature", x?.temperature, x?.timestamp);
  metric("humidity", x?.humidity, x?.timestamp);
  metric("pressure", x?.pressure, x?.timestamp);
  let act = stations.filter((x) => x.active).length;
  $("#active").textContent = stations.length ? act : "--";
  $("#active-status").textContent = stations.length
    ? `${act}/${stations.length} ativas`
    : "--";
  $("#last-update").textContent = last();
  table();
  stationCards();
  charts();
}
function metric(n, v, t) {
  $("#" + n).textContent = v == null ? "--" : fmt(v);
  $("#" + n + "-time").textContent = t ? time(t) : "--";
}
function table() {
  let rows = readings
    .filter(
      (r) => selected === "all" || String(r.stationId) === String(selected),
    )
    .slice(0, 12);
  $("#count").textContent =
    `${rows.length} ${rows.length === 1 ? "registro" : "registros"}`;
  $("#table").innerHTML = rows.length
    ? rows
        .map(
          (r) =>
            `<tr><td>${esc(r.stationName)}</td><td>${date(r.timestamp)}</td><td>${val(r.temperature, "°C")}</td><td>${val(r.humidity, "%")}</td><td>${val(r.pressure, "hPa")}</td><td style="color:#126b58">● Recebido</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="6"><div class="empty-table"><strong>Nenhuma leitura disponível</strong><span>Conecte a API PHP para carregar os dados.</span></div></td></tr>`;
}
function stationCards() {
  $("#stations").innerHTML = stations.length
    ? stations
        .map((s) => {
          let r = readings.find((x) => String(x.stationId) === String(s.id));
          return `<article class="station"><div class="station-head"><h4>${esc(s.name)}</h4><span class="${s.active ? "online" : "online offline"}">${s.active ? "Ativa" : "Inativa"}</span></div><div class="station-data"><div><span>Temperatura</span><b>${val(r?.temperature, "°C")}</b></div><div><span>Umidade</span><b>${val(r?.humidity, "%")}</b></div><div><span>Pressão</span><b>${val(r?.pressure, "hPa")}</b></div><div><span>Último contato</span><b>${r ? time(r.timestamp) : "--"}</b></div></div></article>`;
        })
        .join("")
    : `<div class="empty-station">Nenhuma estação cadastrada.</div>`;
}
function charts() {
  draw("temp-chart", "temp-empty", "temperature", "°C");
  draw("hum-chart", "hum-empty", "humidity", "%");
}
function draw(id, eid, field, unit) {
  let d = filtered()
      .filter((x) => x[field] != null)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    c = $("#" + id),
    e = $("#" + eid);
  let old = field === "temperature" ? tc : hc;
  if (old) old.destroy();
  c.style.display = d.length ? "block" : "none";
  e.style.display = d.length ? "none" : "flex";
  let chart = new Chart(c, {
    type: "line",
    data: {
      labels: d.map((x) => time(x.timestamp)),
      datasets: [
        {
          data: d.map((x) => x[field]),
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.35,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (q) => `${fmt(q.raw)} ${unit}` } },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 8 }, maxTicksLimit: 7 },
        },
        y: {
          grid: { color: "#edf1ef" },
          ticks: { font: { size: 8 }, callback: (v) => `${v} ${unit}` },
        },
      },
    },
  });
  if (field === "temperature") tc = chart;
  else hc = chart;
}
function setStatus(ok, t, d) {
  $("#status-dot").classList.toggle("ok", ok);
  $("#status-text").textContent = t;
  $("#status-detail").textContent = d;
}
function last() {
  return readings[0] ? date(readings[0].timestamp) : "--";
}
function fmt(x) {
  return Number(x).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}
function val(x, u) {
  return x == null ? "--" : `${fmt(x)} ${u}`;
}
function date(x) {
  let d = new Date(x);
  return isNaN(d)
    ? "--"
    : d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}
function time(x) {
  let d = new Date(x);
  return isNaN(d)
    ? "--"
    : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function esc(x) {
  return String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c],
  );
}

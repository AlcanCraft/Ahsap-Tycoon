const CONFIG = {
  plotCount: 16,
  seedCost: 5,
  growthSeconds: 18,
  harvestedDisplaySeconds: 3,
  forestAutomationIntervalMs: 1600,
  lumberSellPrice: 25,
  hireCost: 50,
  workerSalaryPerMinute: 1,
  logStorage: 100,
  lumberStorage: 100,
  factory: {
    levels: [
      { level: 1, processSeconds: 10, workers: 2, upgradeCost: 250 },
      { level: 2, processSeconds: 8, workers: 3, upgradeCost: 700 },
      { level: 3, processSeconds: 6, workers: 4, upgradeCost: 1600 },
      { level: 4, processSeconds: 5, workers: 5, upgradeCost: 3500 },
      { level: 5, processSeconds: 4, workers: 6, upgradeCost: null }
    ]
  },
  lodging: {
    levels: [
      { level: 1, capacity: 10, upgradeCost: 300 },
      { level: 2, capacity: 16, upgradeCost: 900 },
      { level: 3, capacity: 24, upgradeCost: 2200 },
      { level: 4, capacity: 35, upgradeCost: 5000 },
      { level: 5, capacity: 50, upgradeCost: null }
    ]
  }
};

const initialState = () => ({
  money: 500,
  logs: 0,
  lumber: 0,
  workers: 4,
  factoryLevel: 1,
  lodgingLevel: 1,
  autoForest: false,
  lastForestAutomationAt: 0,
  processing: null,
  plots: Array.from({ length: CONFIG.plotCount }, (_, id) => ({
    id,
    state: "empty",
    plantedAt: null,
    harvestedAt: null
  })),
  logsHistory: [],
  lastSalaryAt: Date.now()
});

let state = loadGame() ?? initialState();
migrateState();
let toastTimer = null;

const els = {
  fieldGrid: document.querySelector("#fieldGrid"),
  money: document.querySelector("#moneyValue"),
  logs: document.querySelector("#logValue"),
  lumber: document.querySelector("#lumberValue"),
  workers: document.querySelector("#workerValue"),
  factoryLevel: document.querySelector("#factoryLevel"),
  processTime: document.querySelector("#processTime"),
  factoryWorkers: document.querySelector("#factoryWorkers"),
  factoryProgress: document.querySelector("#factoryProgress"),
  factoryStatus: document.querySelector("#factoryStatus"),
  processBtn: document.querySelector("#processBtn"),
  upgradeFactoryBtn: document.querySelector("#upgradeFactoryBtn"),
  lodgingLevel: document.querySelector("#lodgingLevel"),
  lodgingCapacity: document.querySelector("#lodgingCapacity"),
  lodgingFree: document.querySelector("#lodgingFree"),
  hireBtn: document.querySelector("#hireBtn"),
  upgradeLodgingBtn: document.querySelector("#upgradeLodgingBtn"),
  sellBtn: document.querySelector("#sellBtn"),
  eventLog: document.querySelector("#eventLog"),
  toast: document.querySelector("#toast"),
  resetBtn: document.querySelector("#resetBtn"),
  forestModeBadge: document.querySelector("#forestModeBadge"),
  forestStatus: document.querySelector("#forestStatus"),
  forestWorkerInfo: document.querySelector("#forestWorkerInfo"),
  manualForestBtn: document.querySelector("#manualForestBtn"),
  autoForestBtn: document.querySelector("#autoForestBtn"),
  fieldWorkersValue: document.querySelector("#fieldWorkersValue"),
  factoryWorkersValue: document.querySelector("#factoryWorkersValue"),
  idleWorkersValue: document.querySelector("#idleWorkersValue"),
  lodgingMapLevel: document.querySelector("#lodgingMapLevel"),
  factoryMapLevel: document.querySelector("#factoryMapLevel"),
  warehouseMapInfo: document.querySelector("#warehouseMapInfo"),
  gameLevelBadge: document.querySelector("#gameLevelBadge"),
  workerA: document.querySelector("#workerA"),
  workerB: document.querySelector("#workerB"),
  movingLogA: document.querySelector("#movingLogA"),
  movingLogB: document.querySelector("#movingLogB"),
  movingTruck: document.querySelector("#movingTruck"),
  sawWheel: document.querySelector("#sawWheel"),
  smoke1: document.querySelector("#smoke1"),
  smoke2: document.querySelector("#smoke2"),
  smoke3: document.querySelector("#smoke3"),
  forklift: document.querySelector("#forklift"),
  gameMap: document.querySelector(".game-map")
};

function migrateState() {
  if (typeof state.autoForest !== "boolean") state.autoForest = false;
  if (!state.lastForestAutomationAt) state.lastForestAutomationAt = 0;
  if (!state.lastSalaryAt) state.lastSalaryAt = Date.now();
  if (!Array.isArray(state.logsHistory)) state.logsHistory = [];
  for (const plot of state.plots) {
    if (!("harvestedAt" in plot)) plot.harvestedAt = null;
  }
}

function currency(value) {
  return new Intl.NumberFormat("tr-TR").format(Math.floor(value)) + " ₺";
}

function factoryConfig() {
  return CONFIG.factory.levels[state.factoryLevel - 1];
}

function lodgingConfig() {
  return CONFIG.lodging.levels[state.lodgingLevel - 1];
}

function factoryAssignedWorkers() {
  return Math.min(state.workers, factoryConfig().workers);
}

function availableFieldWorkers() {
  return Math.max(0, state.workers - factoryAssignedWorkers());
}

function idleWorkers() {
  const plotsThatNeedWork = state.plots.filter(p =>
    p.state === "empty" ||
    p.state === "ready" ||
    (p.state === "harvested" && (Date.now() - p.harvestedAt) >= CONFIG.harvestedDisplaySeconds * 1000)
  ).length;
  const fieldUsed = Math.min(availableFieldWorkers(), plotsThatNeedWork);
  return Math.max(0, state.workers - factoryAssignedWorkers() - fieldUsed);
}

function addLog(message) {
  state.logsHistory.unshift({
    time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    message
  });
  state.logsHistory = state.logsHistory.slice(0, 80);
  renderLog();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2100);
}

function saveGame() {
  localStorage.setItem("ahsapTycoonSave", JSON.stringify(state));
}

function loadGame() {
  try {
    const raw = localStorage.getItem("ahsapTycoonSave");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.plots || parsed.plots.length !== CONFIG.plotCount) return null;
    return parsed;
  } catch {
    return null;
  }
}

function resetGame() {
  if (!confirm("Tüm ilerleme silinsin mi?")) return;
  state = initialState();
  localStorage.removeItem("ahsapTycoonSave");
  addLog("Yeni işletme kuruldu.");
  render();
}

function plotVisual(plot) {
  if (plot.state === "empty") {
    return { icon: "🟫", label: `Fidan dik • ${CONFIG.seedCost} ₺`, className: "" };
  }

  if (plot.state === "ready") {
    return { icon: "🌲", label: "Kesime hazır", className: "ready", ratio: 1 };
  }

  if (plot.state === "harvested") {
    const elapsedHarvest = (Date.now() - plot.harvestedAt) / 1000;
    const ratio = Math.min(1, elapsedHarvest / CONFIG.harvestedDisplaySeconds);
    return { icon: "🪵", label: "Kütükler taşınıyor", className: "harvested", ratio };
  }

  const elapsed = (Date.now() - plot.plantedAt) / 1000;
  const ratio = Math.min(1, elapsed / CONFIG.growthSeconds);

  if (ratio < .4) return { icon: "🌱", label: "Fidan büyüyor", className: "seedling", ratio };
  return { icon: "🌳", label: "Ağaç büyüyor", className: "growing", ratio };
}

function plantPlot(plot, source = "manuel") {
  if (!plot || !["empty", "harvested"].includes(plot.state)) return false;
  if (state.money < CONFIG.seedCost) return false;
  if (availableFieldWorkers() < 1) return false;

  state.money -= CONFIG.seedCost;
  plot.state = "growing";
  plot.plantedAt = Date.now();
  plot.harvestedAt = null;

  if (source === "manuel") {
    addLog(`${plot.id + 1}. araziye fidan dikildi.`);
  }
  return true;
}

function harvestPlot(plot, source = "manuel") {
  if (!plot || plot.state !== "ready") return false;
  if (availableFieldWorkers() < 1) return false;
  if (state.logs >= CONFIG.logStorage) return false;

  plot.state = "harvested";
  plot.plantedAt = null;
  plot.harvestedAt = Date.now();

  if (source === "manuel") {
    addLog("Ağaç kesildi. 1 kütük depoya taşındı.");
  }
  return true;
}

function clickPlot(id) {
  const plot = state.plots.find(p => p.id === id);
  if (!plot) return;

  if (plot.state === "empty") {
    if (state.money < CONFIG.seedCost) return showToast("Fidan için paran yetmiyor.");
    if (availableFieldWorkers() < 1) return showToast("Arazide çalışacak işçi yok.");
    queueWorkerTask("plant", id, "manuel");
    dispatchWorkerTasks();
    return;
  }

  if (plot.state === "ready") {
    if (availableFieldWorkers() < 1) return showToast("Kesim için arazide işçi yok.");
    if (state.logs >= CONFIG.logStorage) return showToast("Kütük deposu dolu.");
    queueWorkerTask("harvest", id, "manuel");
    dispatchWorkerTasks();
    return;
  }

  if (plot.state === "harvested") {
    if (!forkliftQueuedPlots.has(id)) {
      queueForkliftTask(id);
      dispatchForklift();
    }
    return showToast("Forklift kütükleri almaya geliyor.");
  }

  showToast("Ağaç henüz büyüyor.");
}

function runManualForestCycle() {
  if (availableFieldWorkers() < 1) return showToast("Arazide çalışacak işçi yok.");

  const ready = state.plots.find(p => p.state === "ready" && !plotActionState.has(p.id));
  if (ready) {
    queueWorkerTask("harvest", ready.id, "manuel");
    dispatchWorkerTasks();
    return;
  }

  const empty = state.plots.find(p => p.state === "empty" && !plotActionState.has(p.id));
  if (empty) {
    if (state.money < CONFIG.seedCost) return showToast("Fidan için paran yetmiyor.");
    queueWorkerTask("plant", empty.id, "manuel");
    dispatchWorkerTasks();
    return;
  }

  showToast("Şu anda bütün araziler dolu veya işlem görüyor.");
}

function toggleAutoForest() {
  state.autoForest = !state.autoForest;
  state.lastForestAutomationAt = 0;
  addLog(state.autoForest ? "Otomatik orman üretimi açıldı." : "Otomatik orman üretimi kapatıldı.");
  render();
}

function runForestAutomation() {
  if (!state.autoForest) return;

  const now = Date.now();
  if (now - state.lastForestAutomationAt < CONFIG.forestAutomationIntervalMs) return;
  state.lastForestAutomationAt = now;

  if (availableFieldWorkers() < 1) return;

  for (const plot of state.plots.filter(p => p.state === "ready")) {
    queueWorkerTask("harvest", plot.id, "otomatik");
  }

  for (const plot of state.plots.filter(p => p.state === "harvested")) {
    if (!forkliftQueuedPlots.has(plot.id)) {
      queueForkliftTask(plot.id);
    }
  }

  const replantable = state.plots.filter(p =>
    p.state === "empty" ||
    (
      p.state === "harvested" &&
      !forkliftQueuedPlots.has(p.id) &&
      !plotActionState.has(p.id)
    )
  );

  for (const plot of replantable) {
    if (state.money < CONFIG.seedCost) break;
    queueWorkerTask("plant", plot.id, "otomatik");
  }

  dispatchWorkerTasks();
  dispatchForklift();
}

function startProcessing() {
  const cfg = factoryConfig();

  if (state.processing) return showToast("Fabrika zaten çalışıyor.");
  if (state.logs < 1) return showToast("İşlemek için kütük yok.");
  if (state.lumber >= CONFIG.lumberStorage) return showToast("Kereste deposu dolu.");
  if (state.workers < cfg.workers) return showToast(`Fabrika için ${cfg.workers} işçi gerekiyor.`);

  state.logs--;
  state.processing = {
    startedAt: Date.now(),
    finishAt: Date.now() + cfg.processSeconds * 1000
  };
  addLog("Fabrika 1 kütüğü işlemeye başladı.");
  render();
}

function finishProcessing() {
  if (!state.processing || Date.now() < state.processing.finishAt) return;
  state.processing = null;

  if (state.lumber < CONFIG.lumberStorage) {
    state.lumber++;
    addLog("1 kütük, 1 keresteye dönüştürüldü.");
  } else {
    state.logs++;
    addLog("Kereste deposu dolu; kütük geri alındı.");
  }
  render();
}

function sellLumber() {
  if (state.lumber <= 0) return showToast("Satılacak kereste yok.");

  const sold = state.lumber;
  const revenue = sold * CONFIG.lumberSellPrice;
  state.lumber = 0;
  state.money += revenue;
  addLog(`${sold} kereste satıldı. ${currency(revenue)} kazanıldı.`);
  showToast(`${currency(revenue)} kazandın.`);
  render();
}

function hireWorker() {
  const lodging = lodgingConfig();
  if (state.workers >= lodging.capacity) return showToast("Lojmanda boş yer yok.");
  if (state.money < CONFIG.hireCost) return showToast("Yeni işçi için paran yetmiyor.");

  state.money -= CONFIG.hireCost;
  state.workers++;
  addLog("Yeni işçi işe alındı. İş dağılımı otomatik güncellendi.");
  render();
}

function upgradeFactory() {
  const cfg = factoryConfig();
  if (cfg.upgradeCost === null) return showToast("Fabrika en yüksek seviyede.");
  if (state.money < cfg.upgradeCost) return showToast("Fabrika yükseltmesi için paran yetmiyor.");

  const next = CONFIG.factory.levels[state.factoryLevel];
  if (state.workers < next.workers) {
    return showToast(`Yeni seviye için en az ${next.workers} işçi gerekiyor.`);
  }

  state.money -= cfg.upgradeCost;
  state.factoryLevel++;
  addLog(`Kereste fabrikası seviye ${state.factoryLevel} oldu.`);
  render();
}

function upgradeLodging() {
  const cfg = lodgingConfig();
  if (cfg.upgradeCost === null) return showToast("Lojman en yüksek seviyede.");
  if (state.money < cfg.upgradeCost) return showToast("Lojman yükseltmesi için paran yetmiyor.");

  state.money -= cfg.upgradeCost;
  state.lodgingLevel++;
  addLog(`İşçi lojmanı seviye ${state.lodgingLevel} oldu.`);
  render();
}

function paySalaries() {
  const minute = 60_000;
  const now = Date.now();
  if (now - state.lastSalaryAt < minute) return;

  const elapsed = Math.floor((now - state.lastSalaryAt) / minute);
  const salary = state.workers * CONFIG.workerSalaryPerMinute * elapsed;
  state.lastSalaryAt += elapsed * minute;
  state.money -= salary;
  addLog(`${elapsed} dakikalık maaş ödendi: ${currency(salary)}.`);
  if (state.money < 0) showToast("İşletme borca girdi.");
}

function updateGrowth() {
  const now = Date.now();
  let count = 0;

  for (const plot of state.plots) {
    if (plot.state !== "growing" || !plot.plantedAt) continue;
    if (now - plot.plantedAt >= CONFIG.growthSeconds * 1000) {
      plot.state = "ready";
      count++;
    }
  }

  if (count > 0) addLog(`${count} ağaç kesime hazır hale geldi.`);
}

function treeMarkup(plot, visual) {
  if (plot.state === "empty") {
    return `
      <svg class="tree-svg" viewBox="0 0 64 64" aria-hidden="true">
        <rect x="29" y="34" width="6" height="20" rx="3" fill="#8b582e"/>
        <path d="M32 34c-8-2-14-8-14-15 8 0 14 5 14 15Z" fill="#62b66e"/>
        <path d="M32 34c8-2 14-8 14-15-8 0-14 5-14 15Z" fill="#79c783"/>
      </svg>`;
  }

  if (plot.state === "ready") {
    return `
      <svg class="tree-svg" viewBox="0 0 64 64" aria-hidden="true">
        <rect x="27" y="34" width="10" height="25" rx="3" fill="#83512c"/>
        <circle cx="32" cy="21" r="16" fill="#2f7a43"/>
        <circle cx="20" cy="28" r="12" fill="#398c4f"/>
        <circle cx="44" cy="28" r="12" fill="#3d9353"/>
        <circle cx="32" cy="12" r="12" fill="#4da55f"/>
      </svg>`;
  }

  if (plot.state === "harvested") {
    return `
      <svg class="tree-svg log-stage-svg" viewBox="0 0 64 64" aria-hidden="true">
        <g transform="translate(5 12)">
          <rect x="5" y="26" width="42" height="12" rx="6" fill="#8a552c"/>
          <circle cx="47" cy="32" r="6" fill="#c18a4e"/>
          <circle cx="47" cy="32" r="3.3" fill="none" stroke="#8c5c32" stroke-width="1.4"/>
          <rect x="12" y="13" width="42" height="12" rx="6" fill="#9c6232"/>
          <circle cx="54" cy="19" r="6" fill="#d09b5d"/>
          <circle cx="54" cy="19" r="3.3" fill="none" stroke="#925f34" stroke-width="1.4"/>
          <rect x="0" y="39" width="42" height="12" rx="6" fill="#774822"/>
          <circle cx="42" cy="45" r="6" fill="#b87940"/>
          <circle cx="42" cy="45" r="3.3" fill="none" stroke="#80522c" stroke-width="1.4"/>
        </g>
      </svg>`;
  }

  const small = (visual.ratio ?? 0) < .4;
  return small
    ? `
      <svg class="tree-svg" viewBox="0 0 64 64" aria-hidden="true">
        <rect x="29" y="35" width="6" height="20" rx="3" fill="#8b582e"/>
        <circle cx="32" cy="29" r="12" fill="#4da65f"/>
        <circle cx="25" cy="32" r="8" fill="#61b971"/>
        <circle cx="40" cy="32" r="8" fill="#5ab06a"/>
      </svg>`
    : `
      <svg class="tree-svg" viewBox="0 0 64 64" aria-hidden="true">
        <rect x="28" y="34" width="8" height="23" rx="3" fill="#87532c"/>
        <circle cx="32" cy="23" r="15" fill="#39894e"/>
        <circle cx="21" cy="29" r="10" fill="#4b9e5c"/>
        <circle cx="43" cy="29" r="10" fill="#4fa662"/>
      </svg>`;
}

function renderPlots() {
  els.fieldGrid.innerHTML = "";

  for (const plot of state.plots) {
    const visual = plotVisual(plot);
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.plotId = String(plot.id);
    const activeAction = plotActionState.get(plot.id);
    button.className = `plot ${visual.className}${activeAction ? " working" : ""}`;
    button.setAttribute("aria-label", `${plot.id + 1}. arazi: ${visual.label}`);
    button.innerHTML = `
      <span class="plot-content">
        ${treeMarkup(plot, visual)}
        <span class="plot-label">${visual.label}</span>
        ${activeAction ? `<span class="plot-action">${activeAction}</span>` : ""}
      </span>
      ${["growing", "harvested"].includes(plot.state) ? `
        <span class="plot-progress">
          <span style="width:${Math.round((visual.ratio ?? 0) * 100)}%"></span>
        </span>` : ""}
    `;
    button.addEventListener("click", () => clickPlot(plot.id));
    els.fieldGrid.appendChild(button);
  }
}

function renderLog() {
  els.eventLog.innerHTML = state.logsHistory.length
    ? state.logsHistory.map(entry => `
        <div class="log-entry">
          <time>${entry.time}</time>
          <span>${entry.message}</span>
        </div>`).join("")
    : `<div class="log-entry"><span>Henüz kayıt yok.</span></div>`;
}

function render() {
  const factory = factoryConfig();
  const lodging = lodgingConfig();
  const fieldWorkers = availableFieldWorkers();
  const assignedFactory = factoryAssignedWorkers();
  const idle = idleWorkers();

  els.money.textContent = currency(state.money);
  els.logs.textContent = `${state.logs} / ${CONFIG.logStorage}`;
  els.lumber.textContent = `${state.lumber} / ${CONFIG.lumberStorage}`;
  els.workers.textContent = `${state.workers} / ${lodging.capacity}`;

  els.factoryLevel.textContent = `Sv. ${state.factoryLevel}`;
  els.processTime.textContent = `${factory.processSeconds} sn`;
  els.factoryWorkers.textContent = factory.workers;
  els.processBtn.disabled = Boolean(state.processing);
  els.upgradeFactoryBtn.textContent = factory.upgradeCost === null
    ? "Maksimum seviye"
    : `Yükselt • ${currency(factory.upgradeCost)}`;
  els.upgradeFactoryBtn.disabled = factory.upgradeCost === null;

  els.lodgingLevel.textContent = `Sv. ${state.lodgingLevel}`;
  els.lodgingCapacity.textContent = lodging.capacity;
  els.lodgingFree.textContent = Math.max(0, lodging.capacity - state.workers);
  els.hireBtn.textContent = `İşçi al • ${currency(CONFIG.hireCost)}`;
  els.upgradeLodgingBtn.textContent = lodging.upgradeCost === null
    ? "Maksimum seviye"
    : `Yükselt • ${currency(lodging.upgradeCost)}`;
  els.upgradeLodgingBtn.disabled = lodging.upgradeCost === null;

  els.fieldWorkersValue.textContent = fieldWorkers;
  els.factoryWorkersValue.textContent = assignedFactory;
  els.idleWorkersValue.textContent = idle;
  els.forestWorkerInfo.textContent = `${fieldWorkers} işçi arazide`;

  els.forestModeBadge.textContent = state.autoForest ? "Otomatik" : "Manuel";
  els.autoForestBtn.querySelector("strong").textContent = state.autoForest
    ? "Otomatik Üretimi Kapat"
    : "Otomatik Üretimi Aç";
  els.forestStatus.textContent = state.autoForest
    ? `Otomatik ekip aktif. ${fieldWorkers} müsait işçi fidan dikiyor, olgun ağaçları kesiyor ve yeniden ekim yapıyor.`
    : "Manuel mod açık. Araziye tıklayabilir veya üretim düğmesini kullanabilirsin.";

  els.sellBtn.textContent = state.lumber > 0
    ? `${state.lumber} keresteyi sat • ${currency(state.lumber * CONFIG.lumberSellPrice)}`
    : "Tüm keresteyi sat";

  els.lodgingMapLevel.textContent = `Seviye ${state.lodgingLevel} • ${state.workers}/${lodging.capacity} işçi`;
  els.factoryMapLevel.textContent = `Seviye ${state.factoryLevel} • ${factory.processSeconds} sn`;
  els.warehouseMapInfo.textContent = `Kütük ${state.logs} • Kereste ${state.lumber}`;
  els.gameLevelBadge.textContent = `İşletme Seviyesi ${Math.max(state.factoryLevel, state.lodgingLevel)}`;

  if (!state.processing) {
    els.factoryProgress.style.width = "0%";
    els.factoryStatus.textContent = state.workers < factory.workers
      ? `Fabrika için ${factory.workers} işçi gerekiyor.`
      : "Fabrika bekliyor.";
  }

  renderPlots();
  renderLog();
  saveGame();
}

function updateProcessingUI() {
  if (!state.processing) return;

  const total = factoryConfig().processSeconds * 1000;
  const elapsed = Date.now() - state.processing.startedAt;
  const ratio = Math.min(1, Math.max(0, elapsed / total));
  const remaining = Math.max(0, Math.ceil((state.processing.finishAt - Date.now()) / 1000));

  els.factoryProgress.style.width = `${Math.round(ratio * 100)}%`;
  els.factoryStatus.textContent = `Üretim devam ediyor: ${remaining} saniye kaldı.`;
}



const workerTaskQueue = [];
const forkliftTaskQueue = [];
const plotActionState = new Map();
const queuedTaskKeys = new Set();
const forkliftQueuedPlots = new Set();

const workerAgents = [
  { el: els.workerA, busy: false, homeX: 8, homeY: 62 },
  { el: els.workerB, busy: false, homeX: 12, homeY: 64 }
];

let forkliftBusy = false;

function queueWorkerTask(type, plotId, source = "otomatik") {
  const key = `${type}:${plotId}`;
  if (queuedTaskKeys.has(key) || plotActionState.has(plotId)) return false;

  const plot = state.plots.find(p => p.id === plotId);
  if (!plot) return false;
  if (type === "plant" && plot.state !== "empty") return false;
  if (type === "harvest" && plot.state !== "ready") return false;

  queuedTaskKeys.add(key);
  workerTaskQueue.push({ type, plotId, source, key });
  return true;
}

function queueForkliftTask(plotId) {
  if (forkliftQueuedPlots.has(plotId)) return false;
  const plot = state.plots.find(p => p.id === plotId);
  if (!plot || plot.state !== "harvested") return false;

  forkliftQueuedPlots.add(plotId);
  forkliftTaskQueue.push({ plotId });
  return true;
}

function getPlotPosition(plotId) {
  const plotEl = document.querySelector(`.plot[data-plot-id="${plotId}"]`);
  const map = els.gameMap;
  if (!plotEl || !map) return { x: 30, y: 30 };

  const plotRect = plotEl.getBoundingClientRect();
  const mapRect = map.getBoundingClientRect();

  return {
    x: ((plotRect.left + plotRect.width / 2 - mapRect.left) / mapRect.width) * 100,
    y: ((plotRect.top + plotRect.height / 2 - mapRect.top) / mapRect.height) * 100
  };
}

function moveAbsolute(el, from, to, duration = 1100) {
  return new Promise(resolve => {
    if (!el) return resolve();

    el.style.left = `${from.x}%`;
    el.style.top = `${from.y}%`;

    const animation = el.animate(
      [
        { left: `${from.x}%`, top: `${from.y}%`, transform: "translate(-50%,-50%) scaleX(1)" },
        { left: `${to.x}%`, top: `${to.y}%`, transform: `translate(-50%,-50%) scaleX(${to.x < from.x ? -1 : 1})` }
      ],
      {
        duration,
        easing: "ease-in-out",
        fill: "forwards"
      }
    );

    animation.onfinish = () => {
      el.style.left = `${to.x}%`;
      el.style.top = `${to.y}%`;
      el.style.transform = `translate(-50%,-50%) scaleX(${to.x < from.x ? -1 : 1})`;
      resolve();
    };
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeWorkerTask(agent, task) {
  agent.busy = true;
  agent.el?.classList.add("active-worker");

  const label = task.type === "plant" ? "Fidan dikiliyor" : "Ağaç kesiliyor";
  plotActionState.set(task.plotId, label);
  renderPlots();

  const target = getPlotPosition(task.plotId);
  const start = {
    x: parseFloat(agent.el?.style.left) || agent.homeX,
    y: parseFloat(agent.el?.style.top) || agent.homeY
  };

  await moveAbsolute(agent.el, start, target, 1200);
  await wait(850);

  const plot = state.plots.find(p => p.id === task.plotId);

  if (task.type === "plant" && plot?.state === "empty") {
    if (state.money >= CONFIG.seedCost) {
      state.money -= CONFIG.seedCost;
      plot.state = "growing";
      plot.plantedAt = Date.now();
      plot.harvestedAt = null;
      addLog(`${task.plotId + 1}. araziye işçi tarafından fidan dikildi.`);
    }
  }

  if (task.type === "harvest" && plot?.state === "ready") {
    plot.state = "harvested";
    plot.plantedAt = null;
    plot.harvestedAt = Date.now();
    addLog(`${task.plotId + 1}. arazideki ağaç kesildi. Forklift çağrıldı.`);
    queueForkliftTask(task.plotId);
  }

  plotActionState.delete(task.plotId);
  queuedTaskKeys.delete(task.key);
  render();

  await moveAbsolute(agent.el, target, { x: agent.homeX, y: agent.homeY }, 1050);

  agent.el?.classList.remove("active-worker");
  agent.busy = false;

  dispatchWorkerTasks();
  dispatchForklift();
}

function dispatchWorkerTasks() {
  for (const agent of workerAgents) {
    if (agent.busy) continue;
    const task = workerTaskQueue.shift();
    if (!task) break;
    executeWorkerTask(agent, task);
  }
}

async function dispatchForklift() {
  if (forkliftBusy || !forkliftTaskQueue.length || !els.forklift) return;

  forkliftBusy = true;
  const task = forkliftTaskQueue.shift();
  const plot = state.plots.find(p => p.id === task.plotId);

  if (!plot || plot.state !== "harvested") {
    forkliftQueuedPlots.delete(task.plotId);
    forkliftBusy = false;
    return dispatchForklift();
  }

  els.forklift.classList.add("active");
  els.forklift.classList.remove("carrying");

  const factoryPos = { x: 78, y: 49 };
  const target = getPlotPosition(task.plotId);

  plotActionState.set(task.plotId, "Forklift geliyor");
  renderPlots();

  await moveAbsolute(els.forklift, factoryPos, target, 1500);
  await wait(650);

  els.forklift.classList.add("carrying");
  plotActionState.set(task.plotId, "Kütükler yükleniyor");
  renderPlots();
  await wait(700);

  plot.state = "empty";
  plot.harvestedAt = null;
  plotActionState.delete(task.plotId);
  renderPlots();

  await moveAbsolute(els.forklift, target, factoryPos, 1700);
  await wait(300);

  if (state.logs < CONFIG.logStorage) {
    state.logs += 1;
    addLog("Forklift 1 kütüğü fabrikaya teslim etti.");
  } else {
    addLog("Kütük deposu dolu olduğu için teslimat bekletildi.");
  }

  els.forklift.classList.remove("carrying");
  els.forklift.classList.remove("active");

  forkliftQueuedPlots.delete(task.plotId);
  forkliftBusy = false;
  render();

  dispatchForklift();
}

const motionState = {
  start: performance.now(),
  lastFrame: performance.now()
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function routePoint(progress) {
  const points = [
    { x: 8, y: 62 },
    { x: 35, y: 54 },
    { x: 58, y: 48 },
    { x: 72, y: 40 },
    { x: 48, y: 58 },
    { x: 8, y: 62 }
  ];

  const scaled = progress * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(scaled));
  const local = scaled - index;
  return {
    x: lerp(points[index].x, points[index + 1].x, local),
    y: lerp(points[index].y, points[index + 1].y, local)
  };
}

function animateWorker(el, seconds, phase, now) {
  if (!el) return;
  const progress = (((now / 1000) + phase) % seconds) / seconds;
  const point = routePoint(progress);
  const bob = Math.sin(progress * Math.PI * 18) * 2;
  el.style.left = `${point.x}%`;
  el.style.top = `${point.y}%`;
  el.style.transform = `translate(-50%, ${bob}px)`;
}

function animateTruck(now) {
  if (!els.movingTruck) return;
  const scene = els.movingTruck.parentElement;
  const width = scene?.clientWidth || 900;
  const duration = 12;
  const progress = ((now / 1000) % duration) / duration;
  const x = lerp(-140, width + 30, progress);
  const bounce = Math.sin(progress * Math.PI * 30) * 1.5;
  els.movingTruck.style.transform = `translate(${x}px, ${bounce}px)`;
}

function animateLog(el, seconds, phase, now) {
  if (!el) return;
  const parentWidth = el.parentElement?.clientWidth || 150;
  const progress = (((now / 1000) + phase) % seconds) / seconds;
  const x = lerp(0, Math.max(0, parentWidth - 38), progress);
  const roll = progress * 720;
  el.style.transform = `translateX(${x}px) rotate(${roll}deg)`;
}

function animateSaw(now) {
  if (!els.sawWheel) return;
  const rotation = (now * 0.36) % 360;
  els.sawWheel.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
}

function animateSmoke(el, phase, now) {
  if (!el) return;
  const duration = 3.2;
  const progress = (((now / 1000) + phase) % duration) / duration;
  const x = progress * 30;
  const y = -progress * 52;
  const scale = .65 + progress * .95;
  const opacity = Math.sin(progress * Math.PI) * .42;
  el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  el.style.opacity = opacity.toFixed(2);
}

function animateMachineLog(now) {
  const el = document.querySelector(".machine-log");
  if (!el) return;
  const duration = 4;
  const progress = ((now / 1000) % duration) / duration;
  const containerWidth = el.parentElement?.clientWidth || 250;
  const maxX = Math.max(0, containerWidth * .45);
  const x = progress < .7
    ? lerp(0, maxX, progress / .7)
    : maxX;
  const opacity = progress < .85 ? 1 : Math.max(0, 1 - (progress - .85) / .15);
  el.style.transform = `translateX(${x}px)`;
  el.style.opacity = opacity;
}

function motionLoop(now) {
  if (!workerAgents[0].busy) {
    els.workerA.style.left = `${workerAgents[0].homeX}%`;
    els.workerA.style.top = `${workerAgents[0].homeY}%`;
  }
  if (!workerAgents[1].busy) {
    els.workerB.style.left = `${workerAgents[1].homeX}%`;
    els.workerB.style.top = `${workerAgents[1].homeY}%`;
  }
  animateTruck(now);
  animateLog(els.movingLogA, 4.5, 0, now);
  animateLog(els.movingLogB, 4.5, 2.25, now);
  animateSaw(now);
  animateSmoke(els.smoke1, 0, now);
  animateSmoke(els.smoke2, 1.05, now);
  animateSmoke(els.smoke3, 2.1, now);
  animateMachineLog(now);

  requestAnimationFrame(motionLoop);
}

requestAnimationFrame(motionLoop);

els.manualForestBtn.addEventListener("click", runManualForestCycle);
els.autoForestBtn.addEventListener("click", toggleAutoForest);
els.processBtn.addEventListener("click", startProcessing);
els.sellBtn.addEventListener("click", sellLumber);
els.hireBtn.addEventListener("click", hireWorker);
els.upgradeFactoryBtn.addEventListener("click", upgradeFactory);
els.upgradeLodgingBtn.addEventListener("click", upgradeLodging);
els.resetBtn.addEventListener("click", resetGame);

const motionDebug = document.createElement("div");
motionDebug.className = "motion-debug";
motionDebug.textContent = "Canlı animasyon sistemi aktif";
document.querySelector(".game-map")?.appendChild(motionDebug);

if (!state.logsHistory.length) {
  addLog("Ahşap Tycoon v0.7 başladı. İlk fidanını dik.");
}

render();

setInterval(() => {
  updateGrowth();
  runForestAutomation();
  dispatchWorkerTasks();
  dispatchForklift();
  finishProcessing();
  paySalaries();
  updateProcessingUI();
  renderPlots();
  saveGame();
}, 250);

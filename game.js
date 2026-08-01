const CONFIG = {
  plotCount: 16,
  seedCost: 5,
  growthSeconds: 20,
  logCapacity: 100,
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
  processing: null,
  plots: Array.from({ length: CONFIG.plotCount }, (_, id) => ({
    id,
    state: "empty",
    plantedAt: null
  })),
  logsHistory: [],
  lastSalaryAt: Date.now()
});

let state = loadGame() ?? initialState();
let toastTimer = null;

const els = {
  fieldGrid: document.querySelector("#fieldGrid"),
  money: document.querySelector("#moneyValue"),
  logs: document.querySelector("#logValue"),
  lumber: document.querySelector("#lumberValue"),
  workers: document.querySelector("#workerValue"),
  levelBadge: document.querySelector("#levelBadge"),
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
  resetBtn: document.querySelector("#resetBtn")
};

function currency(value) {
  return new Intl.NumberFormat("tr-TR").format(Math.floor(value)) + " ₺";
}

function factoryConfig() {
  return CONFIG.factory.levels[state.factoryLevel - 1];
}

function lodgingConfig() {
  return CONFIG.lodging.levels[state.lodgingLevel - 1];
}

function availableFieldWorkers() {
  return Math.max(0, state.workers - factoryConfig().workers);
}

function addLog(message) {
  state.logsHistory.unshift({
    time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    message
  });
  state.logsHistory = state.logsHistory.slice(0, CONFIG.logCapacity);
  renderLog();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
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
  const confirmed = confirm("Tüm ilerleme silinsin mi?");
  if (!confirmed) return;
  state = initialState();
  localStorage.removeItem("ahsapTycoonSave");
  addLog("Yeni işletme kuruldu.");
  render();
}

function plotVisual(plot) {
  if (plot.state === "empty") {
    return { icon: "🟫", label: `Fidan dik (${CONFIG.seedCost} ₺)`, className: "" };
  }
  if (plot.state === "ready") {
    return { icon: "🌲", label: "Kesime hazır", className: "ready" };
  }

  const elapsed = (Date.now() - plot.plantedAt) / 1000;
  const ratio = Math.min(1, elapsed / CONFIG.growthSeconds);

  if (ratio < .45) return { icon: "🌱", label: "Fidan büyüyor", className: "seedling", ratio };
  return { icon: "🌳", label: "Ağaç büyüyor", className: "growing", ratio };
}

function clickPlot(id) {
  const plot = state.plots.find(p => p.id === id);
  if (!plot) return;

  if (plot.state === "empty") {
    if (state.money < CONFIG.seedCost) {
      showToast("Fidan için paran yetmiyor.");
      return;
    }
    if (availableFieldWorkers() < 1) {
      showToast("Arazide çalışacak işçi yok.");
      return;
    }
    state.money -= CONFIG.seedCost;
    plot.state = "growing";
    plot.plantedAt = Date.now();
    addLog(`${id + 1}. araziye fidan dikildi.`);
    render();
    return;
  }

  if (plot.state === "ready") {
    if (availableFieldWorkers() < 1) {
      showToast("Kesim için arazide işçi bulunmuyor.");
      return;
    }
    if (state.logs >= CONFIG.logStorage) {
      showToast("Kütük deposu dolu.");
      return;
    }

    state.logs += 1;
    plot.state = "empty";
    plot.plantedAt = null;
    addLog(`Ağaç kesildi. 1 kütük depoya taşındı.`);
    render();
    return;
  }

  showToast("Ağaç henüz büyüyor.");
}

function startProcessing() {
  const cfg = factoryConfig();

  if (state.processing) {
    showToast("Fabrika zaten çalışıyor.");
    return;
  }
  if (state.logs < 1) {
    showToast("İşlemek için kütük yok.");
    return;
  }
  if (state.lumber >= CONFIG.lumberStorage) {
    showToast("Kereste deposu dolu.");
    return;
  }
  if (state.workers < cfg.workers) {
    showToast(`Fabrika için ${cfg.workers} işçi gerekiyor.`);
    return;
  }

  state.logs -= 1;
  state.processing = {
    startedAt: Date.now(),
    finishAt: Date.now() + cfg.processSeconds * 1000
  };
  addLog("Fabrika 1 kütüğü işlemeye başladı.");
  render();
}

function finishProcessing() {
  if (!state.processing) return;
  if (Date.now() < state.processing.finishAt) return;

  state.processing = null;

  if (state.lumber < CONFIG.lumberStorage) {
    state.lumber += 1;
    addLog("1 kütük, 1 keresteye dönüştürüldü.");
  } else {
    state.logs += 1;
    addLog("Kereste deposu dolu olduğu için kütük geri alındı.");
  }
  render();
}

function sellLumber() {
  if (state.lumber <= 0) {
    showToast("Satılacak kereste yok.");
    return;
  }
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
  if (state.workers >= lodging.capacity) {
    showToast("Lojmanda boş yer yok.");
    return;
  }
  if (state.money < CONFIG.hireCost) {
    showToast("Yeni işçi için paran yetmiyor.");
    return;
  }
  state.money -= CONFIG.hireCost;
  state.workers += 1;
  addLog("Yeni işçi işe alındı.");
  render();
}

function upgradeFactory() {
  const cfg = factoryConfig();
  if (cfg.upgradeCost === null) {
    showToast("Fabrika en yüksek seviyede.");
    return;
  }
  if (state.money < cfg.upgradeCost) {
    showToast("Fabrika yükseltmesi için paran yetmiyor.");
    return;
  }

  const nextCfg = CONFIG.factory.levels[state.factoryLevel];
  if (state.workers < nextCfg.workers) {
    showToast(`Yeni seviye için en az ${nextCfg.workers} işçi gerekiyor.`);
    return;
  }

  state.money -= cfg.upgradeCost;
  state.factoryLevel += 1;
  addLog(`Fabrika seviye ${state.factoryLevel} oldu.`);
  render();
}

function upgradeLodging() {
  const cfg = lodgingConfig();
  if (cfg.upgradeCost === null) {
    showToast("Lojman en yüksek seviyede.");
    return;
  }
  if (state.money < cfg.upgradeCost) {
    showToast("Lojman yükseltmesi için paran yetmiyor.");
    return;
  }

  state.money -= cfg.upgradeCost;
  state.lodgingLevel += 1;
  addLog(`İşçi lojmanı seviye ${state.lodgingLevel} oldu.`);
  render();
}

function paySalaries() {
  const now = Date.now();
  const minute = 60_000;
  if (now - state.lastSalaryAt < minute) return;

  const elapsedMinutes = Math.floor((now - state.lastSalaryAt) / minute);
  const salary = state.workers * CONFIG.workerSalaryPerMinute * elapsedMinutes;
  state.lastSalaryAt += elapsedMinutes * minute;
  state.money -= salary;
  addLog(`${elapsedMinutes} dakikalık işçi maaşı ödendi: ${currency(salary)}.`);
  if (state.money < 0) showToast("İşletme borca girdi.");
}

function updateGrowth() {
  const now = Date.now();
  let changed = false;

  for (const plot of state.plots) {
    if (plot.state !== "growing" || !plot.plantedAt) continue;
    if (now - plot.plantedAt >= CONFIG.growthSeconds * 1000) {
      plot.state = "ready";
      changed = true;
    }
  }

  if (changed) {
    addLog("Bir veya daha fazla ağaç kesime hazır.");
  }
}

function renderPlots() {
  els.fieldGrid.innerHTML = "";

  for (const plot of state.plots) {
    const visual = plotVisual(plot);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `plot ${visual.className}`;
    button.setAttribute("aria-label", `${plot.id + 1}. arazi: ${visual.label}`);
    button.innerHTML = `
      <span class="plot-content">
        <span class="plot-icon">${visual.icon}</span>
        <span class="plot-label">${visual.label}</span>
      </span>
      ${plot.state === "growing" ? `<span class="plot-progress"><span style="width:${Math.round((visual.ratio ?? 0) * 100)}%"></span></span>` : ""}
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
        </div>
      `).join("")
    : `<div class="log-entry"><span>Henüz kayıt yok.</span></div>`;
}

function render() {
  const factory = factoryConfig();
  const lodging = lodgingConfig();
  const fieldWorkers = availableFieldWorkers();

  els.money.textContent = currency(state.money);
  els.logs.textContent = `${state.logs} / ${CONFIG.logStorage}`;
  els.lumber.textContent = `${state.lumber} / ${CONFIG.lumberStorage}`;
  els.workers.textContent = `${state.workers} / ${lodging.capacity}`;
  els.levelBadge.textContent = `Seviye ${Math.max(state.factoryLevel, state.lodgingLevel)}`;

  els.factoryLevel.textContent = `Sv. ${state.factoryLevel}`;
  els.processTime.textContent = `${factory.processSeconds} sn`;
  els.factoryWorkers.textContent = `${factory.workers}`;
  els.processBtn.disabled = Boolean(state.processing);

  const factoryUpgradeText = factory.upgradeCost === null
    ? "Maksimum seviye"
    : `Yükselt (${currency(factory.upgradeCost)})`;
  els.upgradeFactoryBtn.textContent = factoryUpgradeText;
  els.upgradeFactoryBtn.disabled = factory.upgradeCost === null;

  els.lodgingLevel.textContent = `Sv. ${state.lodgingLevel}`;
  els.lodgingCapacity.textContent = lodging.capacity;
  els.lodgingFree.textContent = Math.max(0, lodging.capacity - state.workers);
  els.hireBtn.textContent = `İşçi al (${currency(CONFIG.hireCost)})`;

  const lodgingUpgradeText = lodging.upgradeCost === null
    ? "Maksimum seviye"
    : `Yükselt (${currency(lodging.upgradeCost)})`;
  els.upgradeLodgingBtn.textContent = lodgingUpgradeText;
  els.upgradeLodgingBtn.disabled = lodging.upgradeCost === null;

  els.sellBtn.textContent = state.lumber > 0
    ? `${state.lumber} keresteyi sat (${currency(state.lumber * CONFIG.lumberSellPrice)})`
    : "Tüm keresteyi sat";

  if (!state.processing) {
    els.factoryProgress.style.width = "0%";
    els.factoryStatus.textContent =
      state.workers < factory.workers
        ? `Fabrika için ${factory.workers} işçi gerekiyor.`
        : `Fabrika bekliyor. Arazide ${fieldWorkers} işçi çalışabilir.`;
  }

  renderPlots();
  renderLog();
  saveGame();
}

function updateProcessingUI() {
  if (!state.processing) return;
  const cfg = factoryConfig();
  const total = cfg.processSeconds * 1000;
  const elapsed = Date.now() - state.processing.startedAt;
  const ratio = Math.max(0, Math.min(1, elapsed / total));
  const remaining = Math.max(0, Math.ceil((state.processing.finishAt - Date.now()) / 1000));

  els.factoryProgress.style.width = `${Math.round(ratio * 100)}%`;
  els.factoryStatus.textContent = `Üretim sürüyor: ${remaining} saniye kaldı.`;
}

els.processBtn.addEventListener("click", startProcessing);
els.sellBtn.addEventListener("click", sellLumber);
els.hireBtn.addEventListener("click", hireWorker);
els.upgradeFactoryBtn.addEventListener("click", upgradeFactory);
els.upgradeLodgingBtn.addEventListener("click", upgradeLodging);
els.resetBtn.addEventListener("click", resetGame);

if (!state.logsHistory.length) {
  addLog("Ahşap Tycoon v0.1 başladı. İlk fidanını dik.");
}

render();

setInterval(() => {
  updateGrowth();
  finishProcessing();
  paySalaries();
  updateProcessingUI();
  renderPlots();
  saveGame();
}, 250);

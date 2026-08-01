(() => {
"use strict";

const CONFIG = {
  basePlotCount: 16,
  plotsPerLand: 4,
  maxPlotCount: 32,
  seedCost: 5,
  growthSeconds: 18,
  logStorage: 180,
  lumberStorage: 180,
  hireCost: 50,
  salaryPerWorkerPerMinute: 1,
  autoForestTickMs: 1200,

  maxForklifts: 5,
  forkliftBaseCost: 350,
  forkliftCostMultiplier: 1.65,

  baseLandCost: 850,
  landCostMultiplier: 1.75,
  landSellRate: .55,

  spotLogPrice: 15,
  spotLumberPrice: 32,

  companyOrderCount: 6,
  companyOrderMinSeconds: 30,
  companyOrderMaxSeconds: 58,
  companyReplacementDelayMs: 2200,

  factoryLevels: [
    { level:1, seconds:10, workers:2, upgradeCost:250 },
    { level:2, seconds:8, workers:3, upgradeCost:700 },
    { level:3, seconds:6, workers:4, upgradeCost:1600 },
    { level:4, seconds:5, workers:5, upgradeCost:3500 },
    { level:5, seconds:4, workers:6, upgradeCost:null }
  ],

  lodgingLevels: [
    { level:1, capacity:10, upgradeCost:300 },
    { level:2, capacity:16, upgradeCost:900 },
    { level:3, capacity:24, upgradeCost:2200 },
    { level:4, capacity:35, upgradeCost:5000 },
    { level:5, capacity:50, upgradeCost:null }
  ]
};

const COMPANY_NAMES = [
  "Master Dekorasyon", "Hazer Ahşap", "Altın Ahşap İşleme",
  "Doruk Mobilya", "Marmara Dekor", "Atlas Yapı Ahşap",
  "Kuzey Kereste", "Selçuklu İç Mimari", "Vadi Tasarım",
  "Bora Ahşap Sanayi"
];

const SAVE_KEY = "ahsapTycoonSave_v13";
const UPDATE_KEY = "ahsapTycoonUpdateSeen_1.3";
const $ = selector => document.querySelector(selector);

function makePlots(count = CONFIG.basePlotCount) {
  return Array.from({length:count}, (_,id) => ({
    id, state:"empty", plantedAt:null, harvestedAt:null, isNew:false
  }));
}

function initialState() {
  return {
    money:500,
    logs:0,
    lumber:0,
    workers:4,
    factoryLevel:1,
    lodgingLevel:1,
    autoForest:false,
    autoFactory:false,
    factoryQueue:0,
    processing:null,

    forkliftCount:1,
    landPurchases:0,

    salesPaused:false,
    autoSales:true,

    plots:makePlots(),
    companyOrders:[],
    logsHistory:[],
    lastSalaryAt:Date.now(),
    lastAutoForestAt:0
  };
}

function loadState() {
  const fresh = initialState();

  try {
    const rawText =
      localStorage.getItem(SAVE_KEY) ||
      localStorage.getItem("ahsapTycoonSave_v12") ||
      localStorage.getItem("ahsapTycoonSave");

    if (!rawText) return fresh;
    const raw = JSON.parse(rawText);

    for (const key of ["money","logs","lumber","workers","factoryQueue"]) {
      if (Number.isFinite(raw[key])) fresh[key] = Math.max(0, raw[key]);
    }

    fresh.factoryLevel = Math.min(5,Math.max(1,Number(raw.factoryLevel)||1));
    fresh.lodgingLevel = Math.min(5,Math.max(1,Number(raw.lodgingLevel)||1));
    fresh.autoForest = Boolean(raw.autoForest);
    fresh.autoFactory = Boolean(raw.autoFactory);
    fresh.processing = raw.processing && Number.isFinite(raw.processing.finishAt)
      ? raw.processing : null;

    fresh.forkliftCount = Math.min(CONFIG.maxForklifts,Math.max(1,Number(raw.forkliftCount)||1));
    fresh.landPurchases = Math.min(4,Math.max(0,Number(raw.landPurchases)||0));

    fresh.salesPaused = Boolean(raw.salesPaused);
    fresh.autoSales = raw.autoSales === undefined ? true : Boolean(raw.autoSales);

    fresh.lastSalaryAt = Number.isFinite(raw.lastSalaryAt) ? raw.lastSalaryAt : Date.now();

    if (Array.isArray(raw.plots) && raw.plots.length >= CONFIG.basePlotCount) {
      fresh.plots = raw.plots.slice(0,CONFIG.maxPlotCount).map((plot,id) => ({
        id,
        state:["empty","growing","ready","harvested"].includes(plot?.state)
          ? plot.state : "empty",
        plantedAt:Number.isFinite(plot?.plantedAt) ? plot.plantedAt : null,
        harvestedAt:Number.isFinite(plot?.harvestedAt) ? plot.harvestedAt : null,
        isNew:false
      }));
      fresh.landPurchases = Math.max(
        fresh.landPurchases,
        Math.floor((fresh.plots.length-CONFIG.basePlotCount)/CONFIG.plotsPerLand)
      );
    }

    if (Array.isArray(raw.companyOrders)) {
      fresh.companyOrders = raw.companyOrders.filter(Boolean).map(order => ({
        ...order,
        productType:order.productType === "logs" ? "logs" : "lumber"
      }));
    }

    if (Array.isArray(raw.logsHistory)) fresh.logsHistory = raw.logsHistory.slice(0,80);
  } catch (error) {
    console.warn("Kayıt okunamadı:",error);
  }

  return fresh;
}

let state = loadState();

const els = {
  fieldGrid:$("#fieldGrid"),
  money:$("#moneyValue"), logs:$("#logValue"), lumber:$("#lumberValue"), workers:$("#workerValue"),
  forestModeBadge:$("#forestModeBadge"), forestWorkerInfo:$("#forestWorkerInfo"),
  forestStatus:$("#forestStatus"), manualForestBtn:$("#manualForestBtn"), autoForestBtn:$("#autoForestBtn"),

  factoryLevel:$("#factoryLevel"), processTime:$("#processTime"), factoryWorkers:$("#factoryWorkers"),
  factoryProgress:$("#factoryProgress"), factoryStatus:$("#factoryStatus"),
  processBtn:$("#processBtn"), autoFactoryBtn:$("#autoFactoryBtn"),
  factoryQueueValue:$("#factoryQueueValue"), upgradeFactoryBtn:$("#upgradeFactoryBtn"),

  lodgingLevel:$("#lodgingLevel"), lodgingCapacity:$("#lodgingCapacity"), lodgingFree:$("#lodgingFree"),
  hireBtn:$("#hireBtn"), upgradeLodgingBtn:$("#upgradeLodgingBtn"),
  fieldWorkersValue:$("#fieldWorkersValue"), factoryWorkersValue:$("#factoryWorkersValue"),
  idleWorkersValue:$("#idleWorkersValue"),

  lodgingMapLevel:$("#lodgingMapLevel"), factoryMapLevel:$("#factoryMapLevel"),
  warehouseMapInfo:$("#warehouseMapInfo"), gameLevelBadge:$("#gameLevelBadge"),

  forkliftCountBadge:$("#forkliftCountBadge"), forkliftCountValue:$("#forkliftCountValue"),
  forkliftCapacityValue:$("#forkliftCapacityValue"), forkliftQueueValue:$("#forkliftQueueValue"),
  activeForkliftValue:$("#activeForkliftValue"), forkliftFleetVisual:$("#forkliftFleetVisual"),
  buyForkliftBtn:$("#buyForkliftBtn"),

  landCountBadge:$("#landCountBadge"), landCountValue:$("#landCountValue"),
  mapScaleValue:$("#mapScaleValue"), buyLandBtn:$("#buyLandBtn"),
  sellLandBtn:$("#sellLandBtn"), landStatus:$("#landStatus"),

  salesStatusBadge:$("#salesStatusBadge"), pauseSalesBtn:$("#pauseSalesBtn"),
  sellAllBtn:$("#sellAllBtn"), autoSalesBtn:$("#autoSalesBtn"),
  logisticsStatus:$("#logisticsStatus"),

  companyOrders:$("#companyOrders"), eventLog:$("#eventLog"),
  resetBtn:$("#resetBtn"), toast:$("#toast"),
  updateModal:$("#updateModal"), closeUpdateModal:$("#closeUpdateModal"),

  gameMap:$(".game-map"), workerA:$("#workerA"), workerB:$("#workerB"),
  forklift:$("#forklift"), movingTruck:$("#movingTruck"),
  movingLogA:$("#movingLogA"), movingLogB:$("#movingLogB"),
  sawWheel:$("#sawWheel"), smoke1:$("#smoke1"), smoke2:$("#smoke2"), smoke3:$("#smoke3")
};

const workerQueue=[];
const workerKeys=new Set();
const activeLabels=new Map();
const forkliftQueue=[];
const forkliftKeys=new Set();
const forkliftAgents=[];

const workerAgents=[
  {el:els.workerA,busy:false,home:{x:8,y:88}},
  {el:els.workerB,busy:false,home:{x:16,y:88}}
];

let toastTimer=null;

function currency(value) {
  return `${new Intl.NumberFormat("tr-TR").format(Math.floor(value))} ₺`;
}

const factoryCfg=()=>CONFIG.factoryLevels[state.factoryLevel-1];
const lodgingCfg=()=>CONFIG.lodgingLevels[state.lodgingLevel-1];

function factoryAssignedWorkers() {
  return Math.min(state.workers,factoryCfg().workers);
}
function availableFieldWorkers() {
  return Math.max(0,state.workers-factoryAssignedWorkers());
}
function idleWorkers() {
  const need=state.plots.filter(p=>p.state==="empty"||p.state==="ready").length;
  return Math.max(0,availableFieldWorkers()-Math.min(availableFieldWorkers(),need));
}

function save() {
  localStorage.setItem(SAVE_KEY,JSON.stringify(state));
}
function addLog(message) {
  state.logsHistory.unshift({
    time:new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}),
    message
  });
  state.logsHistory=state.logsHistory.slice(0,80);
}
function toast(message) {
  if(!els.toast)return;
  els.toast.textContent=message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>els.toast.classList.remove("show"),2100);
}
function randomInt(min,max) {
  return Math.floor(Math.random()*(max-min+1))+min;
}

function forkliftCost() {
  return Math.floor(CONFIG.forkliftBaseCost*Math.pow(CONFIG.forkliftCostMultiplier,state.forkliftCount-1));
}
function forkliftCapacity() {
  return state.forkliftCount;
}
function landCost() {
  return Math.floor(CONFIG.baseLandCost*Math.pow(CONFIG.landCostMultiplier,state.landPurchases));
}
function sellableLastLand() {
  if(state.landPurchases<=0)return false;
  const last=state.plots.slice(-CONFIG.plotsPerLand);
  return last.length===CONFIG.plotsPerLand && last.every(plot =>
    plot.state==="empty" && !activeLabels.has(plot.id) && !forkliftKeys.has(plot.id)
  );
}

function makeOrder() {
  const productType=Math.random()<.45?"logs":"lumber";
  const quantity=randomInt(1,5);
  const pricePerUnit=productType==="logs"?randomInt(12,20):randomInt(28,42);
  const duration=randomInt(CONFIG.companyOrderMinSeconds,CONFIG.companyOrderMaxSeconds);

  return {
    id:`${Date.now()}_${Math.random().toString(36).slice(2)}`,
    company:COMPANY_NAMES[randomInt(0,COMPANY_NAMES.length-1)],
    productType,quantity,remaining:quantity,pricePerUnit,
    createdAt:Date.now(),expiresAt:Date.now()+duration*1000,
    status:"waiting",replacementAt:null
  };
}
function ensureOrders() {
  while(state.companyOrders.length<CONFIG.companyOrderCount)state.companyOrders.push(makeOrder());
}
function processOrders() {
  const now=Date.now();

  for(const order of state.companyOrders) {
    if(order.status!=="waiting")continue;

    if(!state.salesPaused && state.autoSales) {
      const stock=order.productType==="logs"?state.logs:state.lumber;

      if(stock>=order.remaining) {
        if(order.productType==="logs")state.logs-=order.remaining;
        else state.lumber-=order.remaining;

        const revenue=order.remaining*order.pricePerUnit;
        state.money+=revenue;
        const product=order.productType==="logs"?"kütük":"kereste";
        addLog(`${order.company}, ${order.remaining} ${product} satın aldı. ${currency(revenue)} kazanıldı.`);
        order.remaining=0;
        order.status="fulfilled";
        order.replacementAt=now+CONFIG.companyReplacementDelayMs;
        continue;
      }
    }

    if(now>=order.expiresAt) {
      order.status="expired";
      order.replacementAt=now+CONFIG.companyReplacementDelayMs;
      addLog(`${order.company}, bekleme süresi dolduğu için ayrıldı.`);
    }
  }

  state.companyOrders=state.companyOrders.filter(order=>!order.replacementAt||now<order.replacementAt);
  ensureOrders();
}

function treeSvg(plot) {
  if(plot.state==="empty")return `<svg class="tree-svg" viewBox="0 0 64 64"><rect x="29" y="34" width="6" height="20" rx="3" fill="#8b582e"/><path d="M32 34c-8-2-14-8-14-15 8 0 14 5 14 15Z" fill="#62b66e"/><path d="M32 34c8-2 14-8 14-15-8 0-14 5-14 15Z" fill="#79c783"/></svg>`;
  if(plot.state==="harvested")return `<svg class="tree-svg log-stage-svg" viewBox="0 0 64 64"><g transform="translate(5 12)"><rect x="5" y="26" width="42" height="12" rx="6" fill="#8a552c"/><circle cx="47" cy="32" r="6" fill="#c18a4e"/><rect x="12" y="13" width="42" height="12" rx="6" fill="#9c6232"/><circle cx="54" cy="19" r="6" fill="#d09b5d"/><rect x="0" y="39" width="42" height="12" rx="6" fill="#774822"/><circle cx="42" cy="45" r="6" fill="#b87940"/></g></svg>`;
  if(plot.state==="ready")return `<svg class="tree-svg" viewBox="0 0 64 64"><rect x="27" y="34" width="10" height="25" rx="3" fill="#83512c"/><circle cx="32" cy="21" r="16" fill="#2f7a43"/><circle cx="20" cy="28" r="12" fill="#398c4f"/><circle cx="44" cy="28" r="12" fill="#3d9353"/><circle cx="32" cy="12" r="12" fill="#4da55f"/></svg>`;

  const ratio=Math.min(1,(Date.now()-plot.plantedAt)/(CONFIG.growthSeconds*1000));
  return ratio<.42
    ? `<svg class="tree-svg" viewBox="0 0 64 64"><rect x="29" y="35" width="6" height="20" rx="3" fill="#8b582e"/><circle cx="32" cy="29" r="12" fill="#4da65f"/><circle cx="25" cy="32" r="8" fill="#61b971"/><circle cx="40" cy="32" r="8" fill="#5ab06a"/></svg>`
    : `<svg class="tree-svg" viewBox="0 0 64 64"><rect x="28" y="34" width="8" height="23" rx="3" fill="#87532c"/><circle cx="32" cy="23" r="15" fill="#39894e"/><circle cx="21" cy="29" r="10" fill="#4b9e5c"/><circle cx="43" cy="29" r="10" fill="#4fa662"/></svg>`;
}

function renderPlots() {
  if(!els.fieldGrid)return;
  els.fieldGrid.innerHTML="";

  els.fieldGrid.classList.remove("expanded-1","expanded-2","expanded-3","expanded-4");
  if(state.landPurchases>0)els.fieldGrid.classList.add(`expanded-${Math.min(4,state.landPurchases)}`);

  els.fieldGrid.style.gridTemplateColumns=
    state.plots.length<=16?"repeat(4,minmax(54px,1fr))":
    state.plots.length<=24?"repeat(6,minmax(46px,1fr))":
    "repeat(8,minmax(40px,1fr))";

  for(const plot of state.plots) {
    const button=document.createElement("button");
    button.type="button";
    button.dataset.plotId=String(plot.id);
    const active=activeLabels.get(plot.id);
    button.className=`plot ${plot.state}${active?" working":""}${plot.isNew?" new-plot":""}`;

    const label=
      plot.state==="empty"?`Fidan dik • ${CONFIG.seedCost} ₺`:
      plot.state==="growing"?"Fidan büyüyor":
      plot.state==="ready"?"Kesime hazır":"Forklift bekleniyor";

    const progress=plot.state==="growing"
      ? Math.min(100,(Date.now()-plot.plantedAt)/(CONFIG.growthSeconds*1000)*100):0;

    button.innerHTML=`
      <span class="plot-content">
        ${treeSvg(plot)}
        <span class="plot-label">${label}</span>
        ${active?`<span class="plot-action">${active}</span>`:""}
      </span>
      ${plot.state==="growing"?`<span class="plot-progress"><span style="width:${progress}%"></span></span>`:""}
    `;

    button.addEventListener("click",()=>handlePlotClick(plot.id));
    els.fieldGrid.appendChild(button);
    plot.isNew=false;
  }
}

function renderOrders() {
  if(!els.companyOrders)return;
  const now=Date.now();

  els.companyOrders.innerHTML=state.companyOrders.map(order=>{
    const total=Math.max(1,order.expiresAt-order.createdAt);
    const left=Math.max(0,order.expiresAt-now);
    const seconds=Math.ceil(left/1000);
    const ratio=Math.max(0,Math.min(1,left/total));
    const initials=order.company.split(" ").slice(0,2).map(w=>w[0]).join("");
    const productName=order.productType==="logs"?"Kütük Talebi":"Kereste Talebi";
    const cardClass=order.status==="fulfilled"?"fulfilled":
      (order.status==="expired"||seconds<=10?"expiring":"waiting");

    let status=state.salesPaused?"Satış durduruldu":
      (!state.autoSales?"Manuel satış bekleniyor":"Stok bekleniyor");
    let cls="";

    if(order.status==="fulfilled"){status="Sipariş tamamlandı";cls="success";}
    if(order.status==="expired"){status="Firma ayrılıyor";cls="danger";}

    return `<article class="company-order ${cardClass}">
      <div class="company-order-header">
        <div class="company-logo">${initials}</div>
        <div class="company-name">
          <strong>${order.company}</strong>
          <small>${order.pricePerUnit} ₺ / adet</small>
          <span class="product-badge ${order.productType}">${productName}</span>
        </div>
        <div class="order-amount">
          <strong>${order.quantity} adet</strong>
          <small>${currency(order.quantity*order.pricePerUnit)}</small>
        </div>
      </div>
      <div class="order-progress"><span style="width:${Math.round(ratio*100)}%"></span></div>
      <div class="order-footer"><span class="${cls}">${status}</span><span>${order.status==="waiting"?`${seconds} sn`:""}</span></div>
    </article>`;
  }).join("");
}

function renderLog() {
  if(!els.eventLog)return;
  els.eventLog.innerHTML=state.logsHistory.length
    ? state.logsHistory.map(e=>`<div class="log-entry"><time>${e.time}</time><span>${e.message}</span></div>`).join("")
    : `<div class="log-entry"><span>Henüz kayıt yok.</span></div>`;
}

function render() {
  const factory=factoryCfg(), lodging=lodgingCfg();
  els.money.textContent=currency(state.money);
  els.logs.textContent=`${state.logs} / ${CONFIG.logStorage}`;
  els.lumber.textContent=`${state.lumber} / ${CONFIG.lumberStorage}`;
  els.workers.textContent=`${state.workers} / ${lodging.capacity}`;

  els.forestModeBadge.textContent=state.autoForest?"Otomatik":"Manuel";
  els.forestWorkerInfo.textContent=`${availableFieldWorkers()} işçi arazide`;
  els.forestStatus.textContent=state.autoForest
    ?"İşçiler diker ve keser; forklift filosu kütükleri otomatik toplar."
    :"Manuel mod açık. Araziye tıklayarak işçi gönderebilirsin.";
  els.autoForestBtn.querySelector("strong").textContent=state.autoForest?"Otomatik Üretimi Kapat":"Otomatik Üretimi Aç";

  els.factoryLevel.textContent=`Sv. ${state.factoryLevel}`;
  els.processTime.textContent=`${factory.seconds} sn`;
  els.factoryWorkers.textContent=factory.workers;
  els.factoryQueueValue.textContent=`${state.factoryQueue} kütük`;
  els.processBtn.disabled=state.logs<1;
  els.processBtn.textContent=state.logs>0?"1 kütüğü sıraya al":"Kütük bekleniyor";
  els.autoFactoryBtn.textContent=state.autoFactory?"Otomatik üretimi kapat":"Otomatik üretimi aç";
  els.upgradeFactoryBtn.textContent=factory.upgradeCost===null?"Maksimum seviye":`Yükselt • ${currency(factory.upgradeCost)}`;
  els.upgradeFactoryBtn.disabled=factory.upgradeCost===null;

  els.lodgingLevel.textContent=`Sv. ${state.lodgingLevel}`;
  els.lodgingCapacity.textContent=lodging.capacity;
  els.lodgingFree.textContent=Math.max(0,lodging.capacity-state.workers);
  els.hireBtn.textContent=`İşçi al • ${currency(CONFIG.hireCost)}`;
  els.upgradeLodgingBtn.textContent=lodging.upgradeCost===null?"Maksimum seviye":`Yükselt • ${currency(lodging.upgradeCost)}`;
  els.upgradeLodgingBtn.disabled=lodging.upgradeCost===null;

  els.fieldWorkersValue.textContent=availableFieldWorkers();
  els.factoryWorkersValue.textContent=factoryAssignedWorkers();
  els.idleWorkersValue.textContent=idleWorkers();

  els.lodgingMapLevel.textContent=`Seviye ${state.lodgingLevel} • ${state.workers}/${lodging.capacity} işçi`;
  els.factoryMapLevel.textContent=`Seviye ${state.factoryLevel} • ${factory.seconds} sn`;
  els.warehouseMapInfo.textContent=`Kütük ${state.logs} • Kereste ${state.lumber}`;
  els.gameLevelBadge.textContent=`İşletme Seviyesi ${Math.max(state.factoryLevel,state.lodgingLevel)}`;

  els.forkliftCountBadge.textContent=`${state.forkliftCount} / ${CONFIG.maxForklifts}`;
  els.forkliftCountValue.textContent=state.forkliftCount;
  els.forkliftCapacityValue.textContent=`${forkliftCapacity()} kütük`;
  els.forkliftQueueValue.textContent=forkliftQueue.length;
  els.activeForkliftValue.textContent=forkliftAgents.filter(a=>a.busy).length;
  els.buyForkliftBtn.textContent=state.forkliftCount>=CONFIG.maxForklifts
    ?"Maksimum forklift":`Forklift satın al • ${currency(forkliftCost())}`;
  els.buyForkliftBtn.disabled=state.forkliftCount>=CONFIG.maxForklifts;
  els.forkliftFleetVisual?.querySelectorAll(".mini-forklift").forEach((icon,i)=>
    icon.classList.toggle("active",i<state.forkliftCount)
  );

  const scale=Math.max(68,100-state.landPurchases*8);
  els.landCountBadge.textContent=`${state.plots.length} Parsel`;
  els.landCountValue.textContent=state.plots.length;
  els.mapScaleValue.textContent=`%${scale}`;
  els.buyLandBtn.textContent=state.plots.length>=CONFIG.maxPlotCount
    ?"Maksimum arazi":`Arazi satın al • ${currency(landCost())}`;
  els.buyLandBtn.disabled=state.plots.length>=CONFIG.maxPlotCount;
  els.sellLandBtn.textContent=sellableLastLand()?"Son araziyi sat":"Arazi satılamaz";
  els.sellLandBtn.disabled=!sellableLastLand();
  els.landStatus.textContent=state.landPurchases===0
    ?"Yeni arazi 4 tarla parseli açar."
    :"Satış için son alınan 4 parsel boş olmalıdır.";

  els.salesStatusBadge.textContent=state.salesPaused?"Satış Kapalı":"Satış Açık";
  els.pauseSalesBtn.textContent=state.salesPaused?"Satışı devam ettir":"Satışı durdur";
  els.autoSalesBtn.textContent=state.autoSales?"Otomatik satışı kapat":"Otomatik satışı aç";
  els.logisticsStatus.textContent=state.salesPaused
    ?"Bütün satışlar durduruldu."
    : state.autoSales
      ?"Firma talepleri stok oluştuğunda otomatik karşılanır."
      :"Firma satışları manuel moda alındı.";

  if(!state.processing){
    els.factoryProgress.style.width="0%";
    els.factoryStatus.textContent=state.factoryQueue>0?"Sıradaki üretim başlatılıyor.":"Fabrika bekliyor.";
  }

  renderPlots(); renderOrders(); renderLog(); save();
}

function getPlotPosition(plotId,space="map") {
  const plot=document.querySelector(`.plot[data-plot-id="${plotId}"]`);
  const zone=document.querySelector(".worker-route");
  const container=space==="worker"&&zone?zone:els.gameMap;
  if(!plot||!container)return{x:30,y:30};
  const pr=plot.getBoundingClientRect(),cr=container.getBoundingClientRect();
  return{x:(pr.left+pr.width/2-cr.left)/cr.width*100,y:(pr.top+pr.height/2-cr.top)/cr.height*100};
}

function move(el,from,to,duration=1000) {
  return new Promise(resolve=>{
    if(!el)return resolve();
    const facing=to.x<from.x?-1:1;
    const anim=el.animate([
      {left:`${from.x}%`,top:`${from.y}%`,transform:"translate(-50%,-50%) scaleX(1)"},
      {left:`${to.x}%`,top:`${to.y}%`,transform:`translate(-50%,-50%) scaleX(${facing})`}
    ],{duration,easing:"ease-in-out",fill:"forwards"});
    anim.onfinish=()=>{el.style.left=`${to.x}%`;el.style.top=`${to.y}%`;resolve();};
  });
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));

function queueWorker(type,plotId) {
  const key=`${type}:${plotId}`;
  if(workerKeys.has(key)||activeLabels.has(plotId))return;
  const plot=state.plots[plotId];
  if(!plot)return;
  if(type==="plant"&&plot.state!=="empty")return;
  if(type==="harvest"&&plot.state!=="ready")return;
  workerKeys.add(key);workerQueue.push({type,plotId,key});
}

async function runWorker(agent,task) {
  agent.busy=true;
  const plot=state.plots[task.plotId];
  activeLabels.set(task.plotId,task.type==="plant"?"İşçi fidan dikiyor":"İşçi ağacı kesiyor");
  renderPlots();
  const target=getPlotPosition(task.plotId,"worker");
  await move(agent.el,agent.home,target,1050);await wait(650);

  if(task.type==="plant"&&plot.state==="empty"&&state.money>=CONFIG.seedCost) {
    state.money-=CONFIG.seedCost;plot.state="growing";plot.plantedAt=Date.now();
    addLog(`${task.plotId+1}. araziye fidan dikildi.`);
  }
  if(task.type==="harvest"&&plot.state==="ready") {
    plot.state="harvested";plot.plantedAt=null;plot.harvestedAt=Date.now();
    addLog(`${task.plotId+1}. ağaç kesildi. Forklift filosuna görev gönderildi.`);
    queueForklift(task.plotId);
  }

  activeLabels.delete(task.plotId);workerKeys.delete(task.key);render();
  await move(agent.el,target,agent.home,900);
  agent.busy=false;dispatchWorkers();dispatchForklifts();
}

function dispatchWorkers() {
  for(const agent of workerAgents) {
    if(agent.busy)continue;
    const task=workerQueue.shift();
    if(!task)break;
    runWorker(agent,task);
  }
}

function queueForklift(plotId) {
  if(forkliftKeys.has(plotId))return;
  const plot=state.plots[plotId];
  if(!plot||plot.state!=="harvested")return;
  forkliftKeys.add(plotId);forkliftQueue.push(plotId);
}

function syncForkliftAgents() {
  while(forkliftAgents.length<state.forkliftCount) {
    const i=forkliftAgents.length;
    let el;
    if(i===0)el=els.forklift;
    else if(els.forklift){
      el=els.forklift.cloneNode(true);
      el.id=`forklift_${i+1}`;
      el.classList.remove("active","carrying");
      els.forklift.parentElement?.appendChild(el);
    }
    forkliftAgents.push({
      index:i,el,busy:false,
      home:{x:77+(i%3)*3.4,y:47+Math.floor(i/3)*5}
    });
  }
  while(forkliftAgents.length>state.forkliftCount) {
    const removed=forkliftAgents.pop();
    if(removed.index>0)removed.el?.remove();
  }
}

async function runForklift(agent,plotIds) {
  agent.busy=true;
  let current=agent.home;
  let carried=0;

  agent.el?.classList.add("active");

  for(const plotId of plotIds) {
    const plot=state.plots[plotId];
    if(!plot||plot.state!=="harvested"){forkliftKeys.delete(plotId);continue;}

    const target=getPlotPosition(plotId,"map");
    activeLabels.set(plotId,`Forklift ${agent.index+1} geliyor`);
    renderPlots();
    await move(agent.el,current,target,1050);await wait(350);

    agent.el?.classList.add("carrying");
    activeLabels.set(plotId,"Kütük yükleniyor");
    renderPlots();await wait(430);

    plot.state="empty";plot.harvestedAt=null;
    activeLabels.delete(plotId);forkliftKeys.delete(plotId);
    carried++;current=target;renderPlots();
  }

  await move(agent.el,current,agent.home,1150);await wait(150);

  const free=Math.max(0,CONFIG.logStorage-state.logs);
  const delivered=Math.min(free,carried);
  state.logs+=delivered;
  if(delivered>0)addLog(`Forklift ${agent.index+1}, ${delivered} kütüğü fabrikaya teslim etti.`);
  if(delivered<carried)addLog("Kütük deposu dolduğu için bazı teslimatlar bekletildi.");

  agent.el?.classList.remove("carrying","active");
  agent.busy=false;

  if(state.autoForest) {
    for(const plotId of plotIds) {
      if(state.plots[plotId]?.state==="empty")queueWorker("plant",plotId);
    }
  }

  processOrders();render();dispatchWorkers();dispatchForklifts();
}

function dispatchForklifts() {
  syncForkliftAgents();

  for(const agent of forkliftAgents) {
    if(agent.busy)continue;
    const batch=forkliftQueue.splice(0,forkliftCapacity());
    if(batch.length===0)break;
    runForklift(agent,batch);
  }
}

function handlePlotClick(plotId) {
  const plot=state.plots[plotId];
  if(!plot)return;
  if(plot.state==="empty") {
    if(availableFieldWorkers()<1)return toast("Arazide çalışacak işçi yok.");
    if(state.money<CONFIG.seedCost)return toast("Fidan için paran yetmiyor.");
    queueWorker("plant",plotId);dispatchWorkers();return;
  }
  if(plot.state==="ready") {
    queueWorker("harvest",plotId);dispatchWorkers();return;
  }
  if(plot.state==="harvested") {
    queueForklift(plotId);dispatchForklifts();return toast("Forklift görevlendirildi.");
  }
  toast("Fidan henüz büyüyor.");
}

function runManualForest() {
  const ready=state.plots.find(p=>p.state==="ready"&&!activeLabels.has(p.id));
  if(ready){queueWorker("harvest",ready.id);dispatchWorkers();return;}
  const empty=state.plots.find(p=>p.state==="empty"&&!activeLabels.has(p.id));
  if(empty){
    if(state.money<CONFIG.seedCost)return toast("Fidan için paran yetmiyor.");
    queueWorker("plant",empty.id);dispatchWorkers();return;
  }
  toast("Şu anda iş verilebilecek arazi yok.");
}

function runAutoForest() {
  if(!state.autoForest||Date.now()-state.lastAutoForestAt<CONFIG.autoForestTickMs)return;
  state.lastAutoForestAt=Date.now();

  for(const plot of state.plots){
    if(plot.state==="ready")queueWorker("harvest",plot.id);
    if(plot.state==="harvested")queueForklift(plot.id);
  }

  let allowance=Math.max(0,availableFieldWorkers()-workerQueue.length);
  for(const plot of state.plots){
    if(allowance<=0||state.money<CONFIG.seedCost)break;
    if(plot.state==="empty"){queueWorker("plant",plot.id);allowance--;}
  }

  dispatchWorkers();dispatchForklifts();
}

function updateGrowth() {
  for(const plot of state.plots){
    if(plot.state==="growing"&&Date.now()-plot.plantedAt>=CONFIG.growthSeconds*1000){
      plot.state="ready";addLog(`${plot.id+1}. ağaç kesime hazır.`);
    }
  }
}

function queueOneLog() {
  if(state.logs<1)return toast("Sıraya almak için kütük yok.");
  state.logs--;state.factoryQueue++;addLog("1 kütük üretim sırasına alındı.");
  startNextFactoryJob();render();
}
function refillFactoryQueue() {
  if(!state.autoFactory)return;
  const room=Math.max(0,CONFIG.lumberStorage-state.lumber-state.factoryQueue-(state.processing?1:0));
  const amount=Math.min(state.logs,room);
  if(amount>0){state.logs-=amount;state.factoryQueue+=amount;addLog(`${amount} kütük otomatik sıraya alındı.`);}
}
function startNextFactoryJob() {
  if(state.processing||state.factoryQueue<=0||state.lumber>=CONFIG.lumberStorage||state.workers<factoryCfg().workers)return;
  state.factoryQueue--;
  state.processing={startedAt:Date.now(),finishAt:Date.now()+factoryCfg().seconds*1000};
  addLog("Fabrika sıradaki kütüğü işlemeye başladı.");
}
function finishFactoryJob() {
  if(!state.processing||Date.now()<state.processing.finishAt)return;
  state.processing=null;
  if(state.lumber<CONFIG.lumberStorage){state.lumber++;addLog("Fabrika 1 kereste üretti.");processOrders();}
  else{state.factoryQueue++;addLog("Kereste deposu dolu; ürün sıraya geri alındı.");}
  refillFactoryQueue();startNextFactoryJob();render();
}
function updateFactoryUi() {
  if(!state.processing)return;
  const total=factoryCfg().seconds*1000;
  const ratio=Math.min(1,(Date.now()-state.processing.startedAt)/total);
  const remaining=Math.max(0,Math.ceil((state.processing.finishAt-Date.now())/1000));
  els.factoryProgress.style.width=`${ratio*100}%`;
  els.factoryStatus.textContent=`Üretim sürüyor: ${remaining} saniye kaldı.`;
}

function buyForklift() {
  if(state.forkliftCount>=CONFIG.maxForklifts)return toast("En fazla 5 forklift çalıştırabilirsin.");
  const cost=forkliftCost();
  if(state.money<cost)return toast("Forklift için paran yetmiyor.");
  state.money-=cost;state.forkliftCount++;syncForkliftAgents();
  addLog(`Yeni forklift satın alındı. Filoda ${state.forkliftCount} forklift var.`);
  render();dispatchForklifts();
}

function buyLand() {
  if(state.plots.length>=CONFIG.maxPlotCount)return toast("Maksimum arazi sınırına ulaştın.");
  const cost=landCost();
  if(state.money<cost)return toast("Arazi için paran yetmiyor.");
  state.money-=cost;
  const start=state.plots.length;
  for(let i=0;i<CONFIG.plotsPerLand;i++){
    state.plots.push({id:start+i,state:"empty",plantedAt:null,harvestedAt:null,isNew:true});
  }
  state.landPurchases++;
  addLog("4 yeni tarla parseli satın alındı.");
  render();
}

function sellLand() {
  if(!sellableLastLand())return toast("Son alınan 4 parsel tamamen boş olmalıdır.");
  const index=Math.max(0,state.landPurchases-1);
  const original=Math.floor(CONFIG.baseLandCost*Math.pow(CONFIG.landCostMultiplier,index));
  const revenue=Math.floor(original*CONFIG.landSellRate);
  state.plots.splice(-CONFIG.plotsPerLand,CONFIG.plotsPerLand);
  state.landPurchases--;state.money+=revenue;
  addLog(`4 tarla parseli ${currency(revenue)} karşılığında satıldı.`);
  render();
}

function pauseSales() {
  state.salesPaused=!state.salesPaused;
  addLog(state.salesPaused?"Bütün satışlar durduruldu.":"Satışlar yeniden başlatıldı.");
  render();
}
function toggleAutoSales() {
  state.autoSales=!state.autoSales;
  addLog(state.autoSales?"Otomatik satış açıldı.":"Otomatik satış kapatıldı.");
  processOrders();render();
}
function sellAll() {
  if(state.salesPaused)return toast("Önce satışı yeniden başlat.");
  if(state.logs===0&&state.lumber===0)return toast("Satılacak ürün yok.");

  const logs=state.logs,lumber=state.lumber;
  const revenue=logs*CONFIG.spotLogPrice+lumber*CONFIG.spotLumberPrice;
  state.logs=0;state.lumber=0;state.money+=revenue;
  addLog(`${logs} kütük ve ${lumber} kereste toplu satıldı. ${currency(revenue)} kazanıldı.`);
  refillFactoryQueue();render();
}

function hireWorker() {
  if(state.workers>=lodgingCfg().capacity)return toast("Lojmanda boş yer yok.");
  if(state.money<CONFIG.hireCost)return toast("İşçi için paran yetmiyor.");
  state.money-=CONFIG.hireCost;state.workers++;addLog("Yeni işçi işe alındı.");render();
}
function upgradeFactory() {
  const cfg=factoryCfg();
  if(cfg.upgradeCost===null)return toast("Fabrika en yüksek seviyede.");
  if(state.money<cfg.upgradeCost)return toast("Yükseltme için paran yetmiyor.");
  const next=CONFIG.factoryLevels[state.factoryLevel];
  if(state.workers<next.workers)return toast(`Yeni seviye için ${next.workers} işçi gerekiyor.`);
  state.money-=cfg.upgradeCost;state.factoryLevel++;addLog(`Fabrika seviye ${state.factoryLevel} oldu.`);render();
}
function upgradeLodging() {
  const cfg=lodgingCfg();
  if(cfg.upgradeCost===null)return toast("Lojman en yüksek seviyede.");
  if(state.money<cfg.upgradeCost)return toast("Yükseltme için paran yetmiyor.");
  state.money-=cfg.upgradeCost;state.lodgingLevel++;addLog(`Lojman seviye ${state.lodgingLevel} oldu.`);render();
}
function paySalaries() {
  const elapsed=Math.floor((Date.now()-state.lastSalaryAt)/60000);
  if(elapsed<=0)return;
  const cost=state.workers*CONFIG.salaryPerWorkerPerMinute*elapsed;
  state.money-=cost;state.lastSalaryAt+=elapsed*60000;
  addLog(`${elapsed} dakikalık maaş ödendi: ${currency(cost)}.`);
}
function resetGame() {
  if(!confirm("Tüm ilerleme silinsin mi?"))return;
  state=initialState();
  workerQueue.length=0;forkliftQueue.length=0;workerKeys.clear();forkliftKeys.clear();activeLabels.clear();
  localStorage.removeItem(SAVE_KEY);
  syncForkliftAgents();ensureOrders();addLog("Yeni işletme kuruldu.");render();
}

function showUpdateModalIfNeeded() {
  if(!els.updateModal||localStorage.getItem(UPDATE_KEY)==="true")return;
  setTimeout(()=>{els.updateModal.classList.add("open");els.updateModal.setAttribute("aria-hidden","false");document.body.classList.add("modal-open");},400);
}
function closeUpdateModal() {
  els.updateModal?.classList.remove("open");els.updateModal?.setAttribute("aria-hidden","true");
  document.body.classList.remove("modal-open");localStorage.setItem(UPDATE_KEY,"true");
}

function animateAmbient(now) {
  if(els.movingTruck){
    const width=els.movingTruck.parentElement?.clientWidth||900;
    const p=((now/1000)%12)/12;
    els.movingTruck.style.transform=`translate(${-140+p*(width+170)}px,${Math.sin(p*28)*1.5}px)`;
  }
  [els.movingLogA,els.movingLogB].forEach((el,i)=>{
    if(!el)return;
    const width=el.parentElement?.clientWidth||150,p=(((now/1000)+i*2.25)%4.5)/4.5;
    el.style.transform=`translateX(${p*Math.max(0,width-38)}px) rotate(${p*720}deg)`;
  });
  if(els.sawWheel)els.sawWheel.style.transform=`translateX(-50%) rotate(${(now*.36)%360}deg)`;
  [els.smoke1,els.smoke2,els.smoke3].forEach((el,i)=>{
    if(!el)return;
    const p=(((now/1000)+i*1.05)%3.2)/3.2;
    el.style.transform=`translate(${p*30}px,${-p*52}px) scale(${.65+p*.95})`;
    el.style.opacity=String(Math.sin(p*Math.PI)*.42);
  });
  requestAnimationFrame(animateAmbient);
}

els.manualForestBtn?.addEventListener("click",runManualForest);
els.autoForestBtn?.addEventListener("click",()=>{state.autoForest=!state.autoForest;addLog(state.autoForest?"Otomatik orman üretimi açıldı.":"Otomatik orman üretimi kapatıldı.");render();});
els.processBtn?.addEventListener("click",queueOneLog);
els.autoFactoryBtn?.addEventListener("click",()=>{state.autoFactory=!state.autoFactory;addLog(state.autoFactory?"Otomatik fabrika açıldı.":"Otomatik fabrika kapatıldı.");refillFactoryQueue();startNextFactoryJob();render();});
els.upgradeFactoryBtn?.addEventListener("click",upgradeFactory);
els.hireBtn?.addEventListener("click",hireWorker);
els.upgradeLodgingBtn?.addEventListener("click",upgradeLodging);
els.buyForkliftBtn?.addEventListener("click",buyForklift);
els.buyLandBtn?.addEventListener("click",buyLand);
els.sellLandBtn?.addEventListener("click",sellLand);
els.pauseSalesBtn?.addEventListener("click",pauseSales);
els.sellAllBtn?.addEventListener("click",sellAll);
els.autoSalesBtn?.addEventListener("click",toggleAutoSales);
els.resetBtn?.addEventListener("click",resetGame);
els.closeUpdateModal?.addEventListener("click",closeUpdateModal);

ensureOrders();
syncForkliftAgents();
for(const plot of state.plots)if(plot.state==="harvested")queueForklift(plot.id);
if(!state.logsHistory.length)addLog("Ahşap Tycoon v1.3 başladı.");
render();showUpdateModalIfNeeded();dispatchForklifts();requestAnimationFrame(animateAmbient);

setInterval(()=>{
  updateGrowth();runAutoForest();dispatchWorkers();dispatchForklifts();
  refillFactoryQueue();startNextFactoryJob();finishFactoryJob();
  processOrders();paySalaries();updateFactoryUi();
  renderPlots();renderOrders();save();
},250);

})();
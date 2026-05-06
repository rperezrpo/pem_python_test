const VARIABLES = __DATA_JSON__;
const DEFAULTS = JSON.parse(JSON.stringify(VARIABLES));

// === Slider configuration ===
const SLIDER_CONFIG = {
  // --- General: Bear pressure ---
  "I_y":           {min:0, max:500,  step:10,   fmt:'int',  section:'general:bear'},
  "N_bears":       {min:0, max:50,   step:1,    fmt:'int',  section:'general:bear'},

  // --- General: Environment modifiers ---
  "P(D_i|food)":   {min:0.5, max:2,  step:0.05, fmt:'mult', section:'general:bear', hideInScopes:['sm']},

  // --- General: Protective measure ---
  "P(M_j)":        {min:0, max:1,    step:0.01, fmt:'pct',  section:'general:measure'},
  "lifespan_j":    {min:1, max:30,   step:1,    fmt:'yr',   section:'general:measure'},

  // --- General: Time horizon ---
  "T":             {min:1, max:50,   step:1,    fmt:'yr',   section:'general:time'},

  // --- General: Distribution of encounters by element type ---
  "s_enc_SL":      {min:0, max:1,    step:0.01, fmt:'pct',  section:'general:encounter-share', share:true, hideInScopes:['sm']},
  "s_enc_LL":      {min:0, max:1,    step:0.01, fmt:'pct',  section:'general:encounter-share', share:true, hideInScopes:['sm']},
  "s_enc_Ag":      {min:0, max:1,    step:0.01, fmt:'pct',  section:'general:encounter-share', share:true, hideInScopes:['sm']},

  // --- Per-element: Small Livestock ---
  "P(D_SL|B,E)":   {min:0, max:1,    step:0.01, fmt:'pct',  section:'SL'},
  "N_SL":          {min:0, max:35000,step:10,   fmt:'int',  section:'SL'},
  "u_SL":          {min:0, max:30,   step:1,    fmt:'int',  section:'SL', hideInScopes:['sm']},
  "s_prot_SL":     {min:0, max:1,    step:0.01, fmt:'pct',  section:'SL'},
  "c_SL":          {min:0, max:1000, step:10,   fmt:'eur',  section:'SL'},
  "c_install_SL":  {min:0, max:500,  step:5,    fmt:'eur',  section:'SL'},
  "c_maintenance_SL":{min:0, max:100, step:1,   fmt:'eur',  section:'SL'},

  // --- Per-element: Large Livestock ---
  "P(D_LL|B,E)":   {min:0, max:1,    step:0.01, fmt:'pct',  section:'LL'},
  "N_LL":          {min:0, max:10000,step:10,    fmt:'int',  section:'LL'},
  "u_LL":          {min:0, max:10,   step:1,    fmt:'int',  section:'LL', hideInScopes:['sm']},
  "s_prot_LL":     {min:0, max:1,    step:0.01, fmt:'pct',  section:'LL'},
  "c_LL":          {min:0, max:5000, step:50,   fmt:'eur',  section:'LL'},
  "c_install_LL":  {min:0, max:1000, step:10,   fmt:'eur',  section:'LL'},
  "c_maintenance_LL":{min:0, max:200, step:1,   fmt:'eur',  section:'LL'},

  // --- Per-element: Agriculture ---
  "P(D_Ag|B,E)":   {min:0, max:1,    step:0.01, fmt:'pct',  section:'Ag'},
  "N_Ag":          {min:0, max:20000,step:10,   fmt:'int',  section:'Ag'},
  "u_Ag":          {min:0, max:30,   step:1,    fmt:'int',  section:'Ag', hideInScopes:['sm']},
  "s_prot_Ag":     {min:0, max:1,    step:0.01, fmt:'pct',  section:'Ag'},
  "c_Ag":          {min:0, max:1500, step:10,   fmt:'eur',  section:'Ag'},
  "c_install_Ag":  {min:0, max:500,  step:5,    fmt:'eur',  section:'Ag'},
  "c_maintenance_Ag":{min:0, max:100, step:1,   fmt:'eur',  section:'Ag'},
};

const GENERAL_SUBSECTIONS = [
  { id: 'time',        label: 'Time horizon' },
  { id: 'bear',        label: 'Bear pressure' },
  { id: 'measure',     label: 'Protective measure' },
  { id: 'encounter-share', label: 'Distribution of encounters by element type' }
];

const ELEMENT_PANELS = [
  { key: 'SL', name: 'Small livestock', tag: 'sheep · goats · poultry', cls: '' },
  { key: 'LL', name: 'Large livestock', tag: 'cattle · horses',         cls: 'large' },
  { key: 'Ag', name: 'Agriculture',     tag: 'beehives · orchards',     cls: 'agriculture' }
];

const ELEMENT_COLOR_VARS = {
  SL: '--element-small',
  LL: '--element-large',
  Ag: '--element-agriculture'
};

const fmt = {
  pct: v => (v*100).toFixed(0) + '%',
  mult: v => '×' + v.toFixed(2),
  int: v => Math.round(v).toString(),
  eur: v => '€' + Math.round(v).toLocaleString(),
  yr: v => v.toFixed(0) + ' yr'
};
const fmtMoney = v => '€' + Math.round(v).toLocaleString();

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function getVar(notation) {
  return VARIABLES.find(v => v.notation === notation);
}
function cssId(n) { return n.replace(/[^a-zA-Z0-9]/g, '_'); }
function elementColor(key) { return cssVar(ELEMENT_COLOR_VARS[key]); }

// === Chart globals ===
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = cssVar('--ink-dim');
Chart.defaults.borderColor = cssVar('--line');

const lineLegendLabels = {
  boxWidth: 42,
  boxHeight: 8,
  padding: 18,
  usePointStyle: true,
  pointStyleWidth: 42,
  generateLabels(chart) {
    const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
    labels.forEach(label => {
      const dataset = chart.data.datasets[label.datasetIndex];
      label.pointStyle = legendLineSample(
        dataset.borderColor,
        dataset.borderDash || [],
        dataset.borderWidth || chart.options.elements.line.borderWidth
      );
    });
    return labels;
  },
  font: { size: 11 }
};

const legendLineSamples = new Map();
function legendLineSample(color, dash = [], lineWidth = 2) {
  const width = 42;
  const height = 10;
  const inset = 4;
  const key = `${color}|${dash.join(',')}|${lineWidth}`;
  if (legendLineSamples.has(key)) return legendLineSamples.get(key);

  const scale = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'butt';
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width - inset, height / 2);
  ctx.stroke();

  legendLineSamples.set(key, canvas);
  return canvas;
}

// === Shared state ===
// One source of truth for all model instances. Sliders on any page write here;
// every page (and the variables table) reads from here.
const state = {};
VARIABLES.forEach(v => { state[v.notation] = Number(v.value); });
state['P(¬M_j)'] = 1 - state['P(M_j)'];

const SCOPES = ['cm', 'sm'];
const USER_SHARE_KEYS = ['s_enc_SL', 's_enc_LL'];
const AUTO_SHARE_KEY = 's_enc_Ag';
const modelInstances = [];

function setSliderValueAll(key) {
  if (!SLIDER_CONFIG[key]) return;
  document.querySelectorAll(`input[data-key="${key}"]`).forEach(inp => {
    inp.value = state[key];
  });
  SCOPES.forEach(scope => {
    const valEl = document.getElementById(`${scope}-val-${cssId(key)}`);
    if (valEl) valEl.textContent = fmt[SLIDER_CONFIG[key].fmt](state[key]);
  });
}

function updateEncounterShares(changedKey) {
  if (!USER_SHARE_KEYS.includes(changedKey)) return;
  const otherKey = USER_SHARE_KEYS.find(k => k !== changedKey);
  const maxForChanged = Math.max(0, 1 - state[otherKey]);
  state[changedKey] = Math.min(Math.max(0, state[changedKey]), maxForChanged);
  state[AUTO_SHARE_KEY] = Math.max(0, 1 - state['s_enc_SL'] - state['s_enc_LL']);
  setSliderValueAll(changedKey);
  setSliderValueAll(AUTO_SHARE_KEY);
}

function resetEncounterSharesFromDefaults() {
  const userSum = USER_SHARE_KEYS.reduce((sum, key) => sum + state[key], 0);
  if (userSum > 1) {
    USER_SHARE_KEYS.forEach(key => { state[key] = state[key] / userSum; });
  }
  state[AUTO_SHARE_KEY] = Math.max(0, 1 - state['s_enc_SL'] - state['s_enc_LL']);
}

resetEncounterSharesFromDefaults();

function recomputeAll() {
  modelInstances.forEach(i => i.recompute());
  updateVariablesTableValues();
  updateScenarioButtonStates();
  recomputeScenarioCard();
}

function resetAll() {
  DEFAULTS.forEach(v => { state[v.notation] = Number(v.value); });
  state['P(¬M_j)'] = 1 - state['P(M_j)'];
  resetEncounterSharesFromDefaults();
  Object.keys(SLIDER_CONFIG).forEach(setSliderValueAll);
  recomputeAll();
}

// === Scenarios ===
// Each row defines (1) the variables it controls and (2) three relative ranges
// (low/middle/high) expressed as fractions of each variable's slider min/max.
// Clicking a level picks a random value inside that fraction window for every
// variable in the row, writes to shared state, and rebroadcasts to all sliders.
const SCENARIO_ROWS = [
  {
    id: 'bear-encounters',
    label: 'Bear Encounters',
    keys: ['I_y', 'N_bears'],
  },
  {
    id: 'measure-cost',
    label: 'Measure Cost',
    keys: ['c_install_SL', 'c_install_LL', 'c_install_Ag',
           'c_maintenance_SL', 'c_maintenance_LL', 'c_maintenance_Ag'],
  },
  {
    id: 'compensation-cost',
    label: 'Compensation Cost',
    keys: ['c_SL', 'c_LL', 'c_Ag'],
  },
  {
    id: 'random-scenario',
    label: 'Random Scenario',
    // null keys means "apply random level to all of the rows above"
    keys: null,
  }
];

// Each level is a factor window applied to the variable's *default* value.
// e.g. low picks a value in [0.10, 0.70] × default, clamped/snapped to slider bounds.
const SCENARIO_LEVELS = {
  low:    { factor: [0, 0.70] },
  middle: { factor: [0.70001, 1.40] },
  high:   { factor: [1.40001, 2.00] },
};

function defaultValueFor(key) {
  const v = DEFAULTS.find(d => d.notation === key);
  return v ? Number(v.value) : null;
}

// Round to the slider's step for clean values, but keep the result inside the
// band's factor window — otherwise step rounding can push a value past the
// band's edge (e.g. raw 70.5 → 70, where 70/50 = 1.40 < high.lo = 1.41) and
// the factor-based active check stops matching the button that was clicked.
function pickInBand(key, level) {
  const cfg = SLIDER_CONFIG[key];
  if (!cfg) return null;
  const def = defaultValueFor(key);
  if (def === null || def === 0) return null;
  const [lo, hi] = SCENARIO_LEVELS[level].factor;
  const factor = lo + Math.random() * (hi - lo);
  const raw = def * factor;
  // Smallest / largest step-aligned values that still fall inside the band.
  const stepLow  = Math.ceil((lo * def - cfg.min) / cfg.step) * cfg.step + cfg.min;
  const stepHigh = Math.floor((hi * def - cfg.min) / cfg.step) * cfg.step + cfg.min;
  if (stepHigh < stepLow) {
    // Band is narrower than one step — pick the closer of the two endpoints.
    return Math.abs(raw - stepLow) <= Math.abs(raw - stepHigh) ? stepLow : stepHigh;
  }
  let rounded = Math.round((raw - cfg.min) / cfg.step) * cfg.step + cfg.min;
  if (rounded < stepLow)  rounded = stepLow;
  if (rounded > stepHigh) rounded = stepHigh;
  return rounded;
}

function applyScenario(rowId, level) {
  if (rowId === 'random-scenario') {
    // Push every non-random row at a random level (could differ per row)
    SCENARIO_ROWS.forEach(row => {
      if (row.id === 'random-scenario') return;
      const levels = ['low', 'middle', 'high'];
      const randomLevel = levels[Math.floor(Math.random() * levels.length)];
      applyKeysAtLevel(row.keys, randomLevel);
    });
  } else {
    const row = SCENARIO_ROWS.find(r => r.id === rowId);
    if (!row || !row.keys) return;
    applyKeysAtLevel(row.keys, level);
  }
  recomputeAll();
}

function applyKeysAtLevel(keys, level) {
  keys.forEach(key => {
    const value = pickInBand(key, level);
    if (value === null) return;
    state[key] = value;
    if (key === 'P(M_j)') state['P(¬M_j)'] = 1 - value;
    setSliderValueAll(key);
  });
}

// Per-element summary chart (lines per element + light-gray net benefit fill)
let scenarioChart = null;

function mountScenarioCard() {
  const canvas = document.getElementById('scenarioChart');
  if (!canvas) return;
  scenarioChart = new Chart(canvas, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtMoney(ctx.raw) } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => fmtMoney(v) }, grid: { color: cssVar('--line') } },
        x: { grid: { display: false }, title: { display: true, text: 'Year', color: cssVar('--ink-dim') } }
      },
      elements: { point: { radius: 2, hoverRadius: 5 }, line: { borderWidth: 2, tension: 0 } }
    }
  });
}

// Smaller line sample for the custom scenario legend (2/3 of the default).
function scenarioLegendSwatch(color, dash = [], lineWidth = 2, fill = false) {
  const width = 28;
  const height = 10;
  const inset = 2;
  const scale = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  if (fill) {
    ctx.fillStyle = color + '40';
    ctx.fillRect(0, height / 2, width - inset, height / 2);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'butt';
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width - inset, height / 2);
  ctx.stroke();
  return canvas;
}

function renderScenarioLegend(elements) {
  const root = document.getElementById('scenario-legend');
  if (!root) return;
  root.innerHTML = '';
  elements.forEach(({name, color}) => {
    const col = document.createElement('div');
    col.className = 'scenario-legend-col';
    col.innerHTML = `
      <div class="scenario-legend-title">${name}</div>
      <div class="scenario-legend-item">
        <span class="scenario-legend-sample" data-kind="dashed"></span>
        <span>Without protection</span>
      </div>
      <div class="scenario-legend-item">
        <span class="scenario-legend-sample" data-kind="solid"></span>
        <span>With protection</span>
      </div>
    `;
    col.querySelector('[data-kind="dashed"]').appendChild(scenarioLegendSwatch(color, [5, 3]));
    col.querySelector('[data-kind="solid"]').appendChild(scenarioLegendSwatch(color, []));
    root.appendChild(col);
  });
  const grayColor = cssVar('--ink-dim');
  const netCol = document.createElement('div');
  netCol.className = 'scenario-legend-col';
  netCol.innerHTML = `
    <div class="scenario-legend-title">Net Benefit</div>
    <div class="scenario-legend-item">
      <span class="scenario-legend-sample" data-kind="net"></span>
      <span>Net benefit</span>
    </div>
  `;
  netCol.querySelector('[data-kind="net"]').appendChild(
    scenarioLegendSwatch(grayColor, [2, 3], 1.5, true)
  );
  root.appendChild(netCol);
}

function recomputeScenarioCard() {
  const tbody = document.getElementById('scenario-metrics');
  if (!tbody || !scenarioChart) return;

  const lambda = computeLambda();
  const T = Math.round(state['T']);
  const labels = Array.from({length: T + 1}, (_, t) => t);

  const elements = ELEMENT_PANELS.map(ep => ({
    ...ep,
    m: modelFor(ep.key, lambda),
    color: elementColor(ep.key),
    ts: null
  }));
  elements.forEach(e => { e.ts = timeSeries(e.m, T); });

  // Aggregate cumulative no-prot, with-prot, and running net across all elements.
  const cumNoProtSeries = labels.map((_, t) => 0);
  const cumProtSeries   = labels.map((_, t) => 0);
  const cumNetSeries    = labels.map((_, t) => 0);
  let runNoProt = 0, runProt = 0;
  for (let t = 0; t <= T; t++) {
    let nYear = 0, pYear = 0;
    elements.forEach(({ts}) => { nYear += ts.noProt[t]; pYear += ts.prot[t]; });
    runNoProt += nYear;
    runProt += pYear;
    cumNoProtSeries[t] = runNoProt;
    cumProtSeries[t] = runProt;
    cumNetSeries[t] = runNoProt - runProt;
  }

  // Aggregated table rows (sum across elements at horizon T)
  const sumLambda = elements.reduce((a, e) => a + e.m.lambda_i, 0);
  const sumNoProtPerYr = elements.reduce((a, e) => a + e.m.noProtPerYr, 0);
  const sumProtPerYr = elements.reduce((a, e) => a + e.m.protPerYr, 0);
  const sumUnprotPerYr = elements.reduce((a, e) => a + e.m.unprotPerYr, 0);
  const sumResidualPerYr = elements.reduce((a, e) => a + e.m.residualPerYr, 0);
  const sumMaintPerYr = elements.reduce((a, e) => a + e.m.maintPerYr, 0);
  const sumInstallCycle = elements.reduce((a, e) => a + e.m.installYr0, 0);
  const cumNoProt = cumNoProtSeries[T];
  const cumProt = cumProtSeries[T];
  const benefit = cumNoProt - cumProt;
  const better = benefit > 0;

  tbody.innerHTML = `
    <tr>
      <td class="label">Expected encounters / year</td>
      <td class="value">${sumLambda.toFixed(2)}</td>
    </tr>
    <tr>
      <td class="label">Annual loss without protection</td>
      <td class="value loss">${fmtMoney(sumNoProtPerYr)} / yr</td>
    </tr>
    <tr>
      <td class="label">Annual cost with protection</td>
      <td class="value">${fmtMoney(sumProtPerYr)} / yr</td>
    </tr>
    <tr>
      <td class="label indent">— Losses from unprotected units</td>
      <td class="value">${fmtMoney(sumUnprotPerYr)} / yr</td>
    </tr>
    <tr>
      <td class="label indent">— Losses from non-maintained infrastructure</td>
      <td class="value">${fmtMoney(sumResidualPerYr)} / yr</td>
    </tr>
    <tr>
      <td class="label indent">— Maintenance</td>
      <td class="value">${fmtMoney(sumMaintPerYr)} / yr</td>
    </tr>
    <tr>
      <td class="label">Installation (per cycle)</td>
      <td class="value">${fmtMoney(sumInstallCycle)}</td>
    </tr>
    <tr>
      <td class="label">Cumulative — no protection</td>
      <td class="value loss">${fmtMoney(cumNoProt)}</td>
    </tr>
    <tr>
      <td class="label">Cumulative — with protection</td>
      <td class="value">${fmtMoney(cumProt)}</td>
    </tr>
    <tr>
      <td class="label">Net benefit at year ${T}</td>
      <td class="value ${better?'savings':'loss'}">${(better?'+':'')+fmtMoney(benefit)}</td>
    </tr>
    <tr>
      <td class="label">Recommendation</td>
      <td class="value"><span class="verdict-pill ${better?'protect':'compensate'}">${better?'Protect':'Compensate'}</span></td>
    </tr>
  `;
  const subEl = document.getElementById('scenario-card-sub');
  if (subEl) subEl.textContent = `Cumulative · ${T}-year horizon`;

  // Chart datasets: per-element no-prot (dashed) + with-prot (solid), in element colour;
  // plus a light-gray net benefit line with fill.
  const datasets = [];
  elements.forEach(({name, color, ts}) => {
    const cumNoProt = [];
    const cumProt = [];
    let rn = 0, rp = 0;
    for (let t = 0; t <= T; t++) {
      rn += ts.noProt[t]; rp += ts.prot[t];
      cumNoProt.push(rn); cumProt.push(rp);
    }
    datasets.push({
      label: `${name} — without protection`,
      data: cumNoProt,
      borderColor: color,
      backgroundColor: color + '14',
      borderDash: [5, 3],
      fill: false
    });
    datasets.push({
      label: `${name} — with protection`,
      data: cumProt,
      borderColor: color,
      backgroundColor: color + '14',
      fill: false
    });
  });
  const grayColor = cssVar('--ink-dim');
  datasets.push({
    label: 'Net benefit',
    data: cumNetSeries,
    borderColor: grayColor,
    backgroundColor: grayColor + '26',
    fill: 'origin',
    borderWidth: 1.5,
    borderDash: [2, 3]
  });

  scenarioChart.data.labels = labels;
  scenarioChart.data.datasets = datasets;
  scenarioChart.update();
  renderScenarioLegend(elements);
}

function buildScenariosPage() {
  const root = document.getElementById('scenario-rows');
  if (!root) return;
  root.innerHTML = '';
  SCENARIO_ROWS.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'scenario-row';
    if (row.id === 'random-scenario') {
      rowEl.classList.add('scenario-row-random');
      rowEl.innerHTML = `
        <div class="scenario-row-label">${row.label}</div>
        <div class="scenario-row-buttons">
          <button type="button" class="scenario-btn generate" data-row="${row.id}" data-level="random">Generate</button>
        </div>
      `;
    } else {
      rowEl.innerHTML = `
        <div class="scenario-row-label">${row.label}</div>
        <div class="scenario-row-buttons">
          <button type="button" class="scenario-btn high"   data-row="${row.id}" data-level="high">High</button>
          <button type="button" class="scenario-btn middle" data-row="${row.id}" data-level="middle">Middle</button>
          <button type="button" class="scenario-btn low"    data-row="${row.id}" data-level="low">Low</button>
        </div>
      `;
    }
    root.appendChild(rowEl);
  });
  root.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyScenario(btn.dataset.row, btn.dataset.level);
    });
  });
  updateScenarioButtonStates();
}

function valueIsInBand(key, level) {
  const cfg = SLIDER_CONFIG[key];
  if (!cfg) return false;
  const def = defaultValueFor(key);
  if (def === null || def === 0) return false;
  const [lo, hi] = SCENARIO_LEVELS[level].factor;
  const factor = state[key] / def;
  return factor >= lo && factor <= hi;
}

function activeLevelForRow(row) {
  if (!row.keys || row.keys.length === 0) return null;
  for (const level of ['low', 'middle', 'high']) {
    if (row.keys.every(key => valueIsInBand(key, level))) return level;
  }
  return null;
}

function updateScenarioButtonStates() {
  const root = document.getElementById('scenario-rows');
  if (!root) return;
  SCENARIO_ROWS.forEach(row => {
    if (row.id === 'random-scenario') return;
    const activeLevel = activeLevelForRow(row);
    ['low', 'middle', 'high'].forEach(level => {
      const btn = root.querySelector(`.scenario-btn[data-row="${row.id}"][data-level="${level}"]`);
      if (btn) btn.classList.toggle('active', level === activeLevel);
    });
  });
}

// === Model math (pure — reads only from shared `state`) ===
function computeLambda() {
  const s = state;
  return s['I_y'] * s['N_bears'] * s['P(D_i|food)'];
}

function modelFor(elementKey, lambda) {
  const s = state;
  const lambda_i = lambda * s['s_enc_' + elementKey];
  const N = s['N_' + elementKey];
  const u = s['u_' + elementKey];
  const c = s['c_' + elementKey];
  const pD = s['P(D_' + elementKey + '|B,E)'];
  const protShare = Math.max(0, Math.min(1, s['s_prot_' + elementKey]));
  const cInst = s['c_install_' + elementKey];
  const expectedUnits = pD * lambda_i * u;

  function scenarioAt(share) {
    const Nprot   = Math.min(Math.round(share * N), N);
    const Nunprot = Math.max(0, N - Nprot);
    const unprotUnits   = Math.min(expectedUnits * (1 - share),                Nunprot);
    const residualUnits = Math.min(expectedUnits * share * s['P(¬M_j)'],       Nprot);
    const unprotPerYr   = unprotUnits   * c;
    const residualPerYr = residualUnits * c;
    const maintPerYr    = s['c_maintenance_' + elementKey] * Nprot;
    const installYr0    = cInst * Nprot;
    return {
      Nprot, Nunprot,
      unprotPerYr, residualPerYr, maintPerYr, installYr0,
      annualPerYr: unprotPerYr + residualPerYr + maintPerYr,
    };
  }

  const noProt = scenarioAt(0);
  const prot   = scenarioAt(protShare);

  return {
    lambda_i,
    noProtPerYr:   noProt.annualPerYr,
    unprotPerYr:   prot.unprotPerYr,
    residualPerYr: prot.residualPerYr,
    maintPerYr:    prot.maintPerYr,
    installYr0:    prot.installYr0,
    protPerYr:     prot.annualPerYr,
    Nprot:         prot.Nprot,
    Nunprot:       prot.Nunprot,
  };
}

function cumInstallByYear(installYr0, t) {
  const L = Math.max(1, Math.round(state['lifespan_j']));
  return installYr0 * (1 + Math.floor(t / L));
}

function installDueInYear(t) {
  const L = Math.max(1, Math.round(state['lifespan_j']));
  return t === 0 || t % L === 0;
}

function timeSeries(model, T) {
  const noProt = [];
  const prot = [];
  const net = [];
  let cumulativeNet = 0;
  for (let t = 0; t <= T; t++) {
    const noProtCost = t === 0 ? 0 : model.noProtPerYr;
    const protCost = (t === 0 ? 0 : model.protPerYr) + (installDueInYear(t) ? model.installYr0 : 0);
    cumulativeNet += noProtCost - protCost;
    noProt.push(noProtCost);
    prot.push(protCost);
    net.push(cumulativeNet);
  }
  return { noProt, prot, net };
}

// === Tabs ===
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tabs button[data-page]');
  const allPageButtons = document.querySelectorAll('[data-page]');
  allPageButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
      tabButtons.forEach(b => b.classList.toggle('active', b.dataset.page === page));
      allPageButtons.forEach(b => {
        if (!b.closest('.tabs')) b.classList.toggle('active', b.dataset.page === page);
      });
    });
  });
}

// === Variables table ===
// Built once at init. Editable (number input) for variables that have a slider
// config; read-only span for derived/auto values. While the user is typing,
// recomputeAll() updates other cells but leaves the focused input alone.
const variablesTableRows = [];

function formatReadOnlyValue(notation, current, fallback) {
  if (current === undefined || current === null || Number.isNaN(current)) {
    return String(fallback ?? '');
  }
  if (notation === 'P(¬M_j)') {
    return Number(Number(current).toFixed(3)).toString();
  }
  const cfg = SLIDER_CONFIG[notation];
  if (cfg && fmt[cfg.fmt]) return fmt[cfg.fmt](current);
  return String(current);
}

function buildVariablesTable() {
  const tbody = document.querySelector('#variables-table tbody');
  if (!tbody) return;
  variablesTableRows.length = 0;
  tbody.textContent = '';

  VARIABLES.forEach(v => {
    const tr = document.createElement('tr');
    const cfg = SLIDER_CONFIG[v.notation];
    const editable = !!cfg && v.notation !== AUTO_SHARE_KEY;
    if (!editable) tr.classList.add('readonly');

    const tdName = document.createElement('td');
    tdName.textContent = v.name || '';

    const tdNotation = document.createElement('td');
    tdNotation.className = 'mono';
    tdNotation.textContent = v.notation || '';

    const tdValue = document.createElement('td');
    tdValue.className = 'mono value-cell';

    let valueEl;
    if (editable) {
      valueEl = document.createElement('input');
      valueEl.type = 'number';
      valueEl.className = 'var-input';
      valueEl.dataset.key = v.notation;
      valueEl.min = cfg.min;
      valueEl.max = cfg.max;
      valueEl.step = cfg.step;
      valueEl.value = state[v.notation];

      valueEl.addEventListener('input', () => {
        const raw = Number(valueEl.value);
        if (Number.isNaN(raw)) return;
        const clamped = Math.max(cfg.min, Math.min(cfg.max, raw));
        state[v.notation] = clamped;
        if (v.notation === 'P(M_j)') state['P(¬M_j)'] = 1 - state[v.notation];
        if (USER_SHARE_KEYS.includes(v.notation)) updateEncounterShares(v.notation);
        setSliderValueAll(v.notation);
        recomputeAll();
      });

      valueEl.addEventListener('blur', () => {
        // On blur, normalise the displayed value to the clamped state value.
        valueEl.value = state[v.notation];
      });
    } else {
      valueEl = document.createElement('span');
      valueEl.className = 'mono-text';
      valueEl.textContent = formatReadOnlyValue(v.notation, state[v.notation], v.value);
    }
    tdValue.appendChild(valueEl);

    const tdDesc = document.createElement('td');
    tdDesc.className = 'desc';
    tdDesc.textContent = v.description || '';

    tr.appendChild(tdName);
    tr.appendChild(tdNotation);
    tr.appendChild(tdValue);
    tr.appendChild(tdDesc);
    tbody.appendChild(tr);

    variablesTableRows.push({ notation: v.notation, valueEl, editable, fallback: v.value });
  });
}

function updateVariablesTableValues() {
  variablesTableRows.forEach(({ notation, valueEl, editable, fallback }) => {
    const cur = state[notation];
    if (editable) {
      if (document.activeElement !== valueEl) {
        valueEl.value = cur;
      }
    } else {
      valueEl.textContent = formatReadOnlyValue(notation, cur, fallback);
    }
  });
}

// === Model instance (DOM + charts only — state is shared) ===
function mountModel(scope) {
  const root = document.getElementById('model-' + scope);
  if (!root) return;
  const $ = id => document.getElementById(scope + '-' + id);

  function renderControl(notation) {
    const cfg = SLIDER_CONFIG[notation];
    const v = getVar(notation);
    if (!v) return '';
    const isAutoShare = notation === 's_enc_Ag';
    const autoShareId = `${scope}-auto-share-s_enc_Ag`;
    const disabledAttr = isAutoShare ? ` disabled aria-describedby="${autoShareId}"` : '';
    const autoNote = isAutoShare
      ? `<span class="control-note" id="${autoShareId}">Calculated from the other encounter shares</span>`
      : '';
    return `
      <div class="control${isAutoShare ? ' control-auto' : ''}" title="${(v.description || '').replace(/"/g, '&quot;')}">
        <div class="control-head">
          <span class="control-label">${v.name}<span class="control-notation">${notation}</span></span>
          <span class="control-value" id="${scope}-val-${cssId(notation)}">${fmt[cfg.fmt](state[notation])}</span>
        </div>
        <input type="range" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${state[notation]}" data-key="${notation}"${disabledAttr} />
        ${autoNote}
      </div>
    `;
  }

  // Build General Context
  const generalGrid = $('general-grid');
  const lambdaBox = document.createElement('div');
  lambdaBox.className = 'lambda-display';
  lambdaBox.innerHTML = `
    <div class="lambda-label">
      Expected encounters per year
      <span class="lambda-formula">${scope === 'sm' ? 'lambda = I_y * N_bears' : 'lambda = I_y * N_bears * food'}</span>
    </div>
    <div class="lambda-value" id="${scope}-lambda-value">-</div>
  `;
  GENERAL_SUBSECTIONS.forEach(sub => {
    const sectionId = 'general:' + sub.id;
    const items = Object.keys(SLIDER_CONFIG).filter(n => {
      const cfg = SLIDER_CONFIG[n];
      return cfg.section === sectionId && !(cfg.hideInScopes && cfg.hideInScopes.includes(scope));
    });
    if (!items.length) return;
    const header = document.createElement('div');
    header.className = 'general-subsection';
    header.textContent = sub.label;
    generalGrid.appendChild(header);
    const row = document.createElement('div');
    row.className = 'general-row general-row-' + sub.id;
    items.forEach(notation => {
      const wrap = document.createElement('div');
      wrap.innerHTML = renderControl(notation);
      row.appendChild(wrap.firstElementChild);
    });
    generalGrid.appendChild(row);
    if (sub.id === 'measure') {
      generalGrid.appendChild(lambdaBox);
    }
  });

  // Per-element panels
  const elementBoard = $('element-board');
  ELEMENT_PANELS.forEach(ep => {
    const items = Object.keys(SLIDER_CONFIG).filter(n => {
      const cfg = SLIDER_CONFIG[n];
      return cfg.section === ep.key && !(cfg.hideInScopes && cfg.hideInScopes.includes(scope));
    });
    const panel = document.createElement('div');
    panel.className = 'element-panel ' + ep.cls;
    panel.innerHTML = `
      <div class="element-panel-head">
        <h3 class="element-panel-title">${ep.name}</h3>
        <span class="element-panel-tag">${ep.tag}</span>
      </div>
      <div class="element-events" id="${scope}-events-${ep.key}">
        <span>Expected encounters / year</span><strong>—</strong>
      </div>
      ${items.map(renderControl).join('')}
    `;
    elementBoard.appendChild(panel);
  });

  // Per-element result cards (table left, chart right)
  const elementCards = $('element-cards');
  ELEMENT_PANELS.forEach(ep => {
    const card = document.createElement('div');
    card.className = 'card element-card ' + ep.cls;
    card.innerHTML = `
      <div class="card-head">
        <h2 class="card-title"><em>${ep.name}</em></h2>
        <span class="card-sub" id="${scope}-el-card-sub-${ep.key}">Per-year · EUR</span>
      </div>
      <div class="element-results-grid">
        <div>
          <table class="metric-table">
            <tbody id="${scope}-el-metrics-${ep.key}"></tbody>
          </table>
        </div>
        <div class="chart-box">
          <canvas id="${scope}-elementChart-${ep.key}"></canvas>
        </div>
      </div>
    `;
    elementCards.appendChild(card);
  });

  // Wire sliders (scoped to this root). All write to shared state and trigger
  // a global recompute so the other page + variables table stay in sync.
  root.querySelectorAll('input[type=range]').forEach(inp => {
    inp.addEventListener('input', e => {
      const key = e.target.dataset.key;
      state[key] = Number(e.target.value);
      if (key === 'P(M_j)') state['P(¬M_j)'] = 1 - state[key];
      if (USER_SHARE_KEYS.includes(key)) updateEncounterShares(key);
      setSliderValueAll(key);
      recomputeAll();
    });
  });

  $('reset-all').addEventListener('click', resetAll);

  // Charts (per-instance — DOM is per-instance even though state is shared)
  const elementCharts = {};
  ELEMENT_PANELS.forEach(ep => {
    elementCharts[ep.key] = new Chart($('elementChart-' + ep.key), {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: lineLegendLabels },
          tooltip: {
            callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtMoney(ctx.raw) }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => fmtMoney(v) }, grid: { color: cssVar('--line') } },
          x: { grid: { display: false }, title: { display: true, text: 'Year', color: cssVar('--ink-dim') } }
        },
        elements: { point: { radius: 2, hoverRadius: 5 }, line: { borderWidth: 2, tension: 0 } }
      }
    });
  });

  const overallChart = new Chart($('overallChart'), {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: lineLegendLabels },
        tooltip: {
          callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtMoney(ctx.raw) }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => fmtMoney(v) }, grid: { color: cssVar('--line') } },
        x: { grid: { display: false }, title: { display: true, text: 'Year', color: cssVar('--ink-dim') } }
      },
      elements: { point: { radius: 3, hoverRadius: 6 }, line: { borderWidth: 2.5, tension: 0 } }
    }
  });

  function applyChartTheme() {
    Object.values(elementCharts).forEach(chart => {
      chart.options.scales.y.grid.color = cssVar('--line');
      chart.options.scales.x.title.color = cssVar('--ink-dim');
    });
    overallChart.options.scales.y.grid.color = cssVar('--line');
    overallChart.options.scales.x.title.color = cssVar('--ink-dim');
    recompute();
  }

  function recompute() {
    const lambda = computeLambda();
    const T = Math.round(state['T']);

    $('lambda-value').textContent = lambda.toFixed(2) + ' / yr';

    const elements = ELEMENT_PANELS.map(ep => ({
      ...ep,
      m: modelFor(ep.key, lambda),
      color: elementColor(ep.key)
    }));

    elements.forEach(({key, m}) => {
      $('events-' + key).innerHTML =
        `<span>Expected encounters / year</span><strong>${m.lambda_i.toFixed(2)}</strong>`;
    });

    const labels = Array.from({length: T+1}, (_, t) => t);
    elements.forEach(({key, name, m, color}) => {
      const cumNoProt = m.noProtPerYr * T;
      const cumProt = cumInstallByYear(m.installYr0, T) + m.protPerYr * T;
      const benefit = cumNoProt - cumProt;
      const better = benefit > 0;

      const tbody = $('el-metrics-' + key);
      tbody.innerHTML = `
        <tr>
          <td class="label">Expected encounters / year</td>
          <td class="value">${m.lambda_i.toFixed(2)}</td>
        </tr>
        <tr>
          <td class="label">Annual loss without protection</td>
          <td class="value loss">${fmtMoney(m.noProtPerYr)} / yr</td>
        </tr>
        <tr>
          <td class="label">Annual cost with protection</td>
          <td class="value">${fmtMoney(m.protPerYr)} / yr</td>
        </tr>
        <tr>
          <td class="label indent">— Losses from unprotected units</td>
          <td class="value">${fmtMoney(m.unprotPerYr)} / yr</td>
        </tr>
        <tr>
          <td class="label indent">— Losses from non-maintained infrastructure</td>
          <td class="value">${fmtMoney(m.residualPerYr)} / yr</td>
        </tr>
        <tr>
          <td class="label indent">— Maintenance</td>
          <td class="value">${fmtMoney(m.maintPerYr)} / yr</td>
        </tr>
        <tr>
          <td class="label">Installation (per cycle)</td>
          <td class="value">${fmtMoney(m.installYr0)}</td>
        </tr>
        <tr>
          <td class="label">Cumulative — no protection</td>
          <td class="value loss">${fmtMoney(cumNoProt)}</td>
        </tr>
        <tr>
          <td class="label">Cumulative — with protection</td>
          <td class="value">${fmtMoney(cumProt)}</td>
        </tr>
        <tr>
          <td class="label">Net benefit at year ${T}</td>
          <td class="value ${better?'savings':'loss'}">${(better?'+':'')+fmtMoney(benefit)}</td>
        </tr>
        <tr>
          <td class="label">Recommendation</td>
          <td class="value"><span class="verdict-pill ${better?'protect':'compensate'}">${better?'Protect':'Compensate'}</span></td>
        </tr>
      `;

      $('el-card-sub-' + key).textContent = `Per-year · ${T}-year horizon`;

      const ts = timeSeries(m, T);
      const inkDim = cssVar('--ink-dim');
      const chart = elementCharts[key];
      chart.data.labels = labels;
      chart.data.datasets = [
        {
          label: 'No protection',
          data: ts.noProt,
          borderColor: inkDim,
          backgroundColor: inkDim + '20',
          borderDash: [5, 3],
          fill: false
        },
        {
          label: 'With protection',
          data: ts.prot,
          borderColor: color,
          backgroundColor: color + '40',
          fill: false
        },
        {
          label: 'Net benefit (no-prot − prot)',
          data: ts.net,
          borderColor: color,
          backgroundColor: color + '18',
          fill: 'origin',
          borderWidth: 1.5,
          borderDash: [2, 3]
        }
      ];
      chart.update();
    });

    const aggNoProt = [], aggProt = [], aggNet = [];
    let cumulativeAggNet = 0;
    for (let t = 0; t <= T; t++) {
      let n = 0, p = 0;
      elements.forEach(({m}) => {
        n += t === 0 ? 0 : m.noProtPerYr;
        p += (t === 0 ? 0 : m.protPerYr) + (installDueInYear(t) ? m.installYr0 : 0);
      });
      cumulativeAggNet += n - p;
      aggNoProt.push(n);
      aggProt.push(p);
      aggNet.push(cumulativeAggNet);
    }
    const dangerColor = cssVar('--accent-danger');
    const successColor = cssVar('--accent-success');
    const accentColor = cssVar('--accent');
    overallChart.data.labels = labels;
    overallChart.data.datasets = [
      {
        label: 'Annual cost — no protection',
        data: aggNoProt,
        borderColor: dangerColor,
        backgroundColor: dangerColor + '14',
        fill: false
      },
      {
        label: 'Annual cost — with protection',
        data: aggProt,
        borderColor: successColor,
        backgroundColor: successColor + '14',
        fill: false
      },
      {
        label: 'Net benefit (no-prot − prot)',
        data: aggNet,
        borderColor: accentColor,
        backgroundColor: accentColor + '1A',
        fill: 'origin',
        borderWidth: 1.5,
        borderDash: [2, 3]
      }
    ];
    overallChart.update();

    // Verdict (shared header element). Both instances write the same value.
    const finalNet = aggNet[T];
    const valueEl = document.getElementById('verdict-value');
    const detailEl = document.getElementById('verdict-detail');
    const labelEl = document.getElementById('verdict-label');
    if (labelEl) labelEl.textContent = `Net Outcome at Year ${T}`;

    let crossover = null;
    let runningNoProt = 0;
    let runningProt = 0;
    for (let t = 0; t <= T; t++) {
      runningNoProt += aggNoProt[t];
      runningProt += aggProt[t];
      if (runningProt < runningNoProt) { crossover = t; break; }
    }

    if (valueEl && detailEl) {
      if (finalNet > 0) {
        valueEl.textContent = '+' + fmtMoney(finalNet);
        valueEl.className = 'verdict-value verdict-savings';
        detailEl.textContent = crossover !== null
          ? `Protection pays off from year ${crossover}`
          : 'Protection is cost-beneficial';
      } else if (finalNet < 0) {
        valueEl.textContent = fmtMoney(finalNet);
        valueEl.className = 'verdict-value verdict-loss';
        detailEl.textContent = 'Compensation is cheaper over this horizon';
      } else {
        valueEl.textContent = '€0';
        valueEl.className = 'verdict-value';
        detailEl.textContent = 'Break-even';
      }
    }

    $('overall-card-sub').textContent = `Per-year · ${T}-year horizon`;
  }

  modelInstances.push({ scope, recompute, applyChartTheme });
  return { recompute, applyChartTheme };
}

// === Theme ===
const THEME_KEY = 'bear-theme';
const themeToggle = document.getElementById('theme-toggle');

function syncThemeToggle() {
  if (!themeToggle) return;
  const theme = document.documentElement.dataset.theme || 'dark';
  const isLight = theme === 'light';
  themeToggle.setAttribute('aria-pressed', isLight ? 'true' : 'false');
  themeToggle.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
  const label = themeToggle.querySelector('.theme-toggle-text');
  if (label) label.textContent = isLight ? 'Theme: Light' : 'Theme: Dark';
}

function applyAllChartThemes() {
  Chart.defaults.color = cssVar('--ink-dim');
  Chart.defaults.borderColor = cssVar('--line');
  modelInstances.forEach(i => i.applyChartTheme());
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    // The theme still changes even if the browser blocks localStorage.
  }
  syncThemeToggle();
  applyAllChartThemes();
}

syncThemeToggle();

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const nextTheme = (document.documentElement.dataset.theme || 'dark') === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  });
}

// === Init ===
setupTabs();
buildVariablesTable();
const tableResetBtn = document.getElementById('table-reset-all');
if (tableResetBtn) tableResetBtn.addEventListener('click', resetAll);
buildScenariosPage();
mountScenarioCard();
mountModel('cm');
mountModel('sm');
recomputeAll();

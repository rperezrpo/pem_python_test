const VARIABLES = __DATA_JSON__;
const DEFAULTS = JSON.parse(JSON.stringify(VARIABLES));

// === Slider configuration ===
const SLIDER_CONFIG = {
  // --- General: Bear pressure ---
  "I_y":           {min:0, max:500,  step:10,   fmt:'int',  section:'general:bear'},
  "N_bears":       {min:0, max:50,  step:1,    fmt:'int',  section:'general:bear'},

  // --- General: Environment modifiers ---
  "P(D_i|food)":   {min:0.5, max:2,  step:0.05, fmt:'mult', section:'general:bear'},

  // --- General: Protective measure ---
  "P(M_j)":        {min:0, max:1,    step:0.01, fmt:'pct',  section:'general:measure'},
  "lifespan_j":    {min:1, max:30,   step:1,    fmt:'yr',   section:'general:measure'},

  // --- General: Time horizon ---
  "T":             {min:1, max:50,   step:1,    fmt:'yr',   section:'general:time'},

  // --- General: Distribution of encounters by element type ---
  "s_enc_SL":      {min:0, max:1,    step:0.01, fmt:'pct',  section:'general:encounter-share', share:true},
  "s_enc_LL":      {min:0, max:1,    step:0.01, fmt:'pct',  section:'general:encounter-share', share:true},
  "s_enc_Ag":      {min:0, max:1,    step:0.01, fmt:'pct',  section:'general:encounter-share', share:true},

  // --- Per-element: Small Livestock ---
  "P(D_SL|B,E)":   {min:0, max:1,    step:0.01, fmt:'pct',  section:'SL'},
  "N_SL":          {min:0, max:35000,step:10,   fmt:'int',  section:'SL'},
  "u_SL":          {min:0, max:30,   step:1,    fmt:'int',  section:'SL'},
  "c_SL":          {min:0, max:1000, step:10,   fmt:'eur',  section:'SL'},
  "s_prot_SL":     {min:0, max:1,    step:0.01, fmt:'pct',  section:'SL'},
  "c_install_SL":  {min:0, max:500,  step:5,    fmt:'eur',  section:'SL'},
  "c_maintenance_SL":{min:0, max:100, step:1,   fmt:'eur',  section:'SL'},

  // --- Per-element: Large Livestock ---
  "P(D_LL|B,E)":   {min:0, max:1,    step:0.01, fmt:'pct',  section:'LL'},
  "N_LL":          {min:0, max:10000,step:10,    fmt:'int',  section:'LL'},
  "u_LL":          {min:0, max:10,   step:1,    fmt:'int',  section:'LL'},
  "c_LL":          {min:0, max:5000, step:50,   fmt:'eur',  section:'LL'},
  "s_prot_LL":     {min:0, max:1,    step:0.01, fmt:'pct',  section:'LL'},
  "c_install_LL":  {min:0, max:1000, step:10,   fmt:'eur',  section:'LL'},
  "c_maintenance_LL":{min:0, max:200, step:1,   fmt:'eur',  section:'LL'},

  // --- Per-element: Agriculture ---
  "P(D_Ag|B,E)":   {min:0, max:1,    step:0.01, fmt:'pct',  section:'Ag'},
  "N_Ag":          {min:0, max:20000,step:10,   fmt:'int',  section:'Ag'},
  "u_Ag":          {min:0, max:30,   step:1,    fmt:'int',  section:'Ag'},
  "c_Ag":          {min:0, max:1500, step:10,   fmt:'eur',  section:'Ag'},
  "s_prot_Ag":     {min:0, max:1,    step:0.01, fmt:'pct',  section:'Ag'},
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
function elementColor(key) {
  return cssVar(ELEMENT_COLOR_VARS[key]);
}

const fmt = {
  pct: v => (v*100).toFixed(0) + '%',
  mult: v => '×' + v.toFixed(2),
  int: v => Math.round(v).toString(),
  eur: v => '€' + Math.round(v).toLocaleString(),
  yr: v => v.toFixed(0) + ' yr'
};
const fmtMoney = v => '€' + Math.round(v).toLocaleString();

const THEME_KEY = 'bear-theme';
const themeToggle = document.getElementById('theme-toggle');

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// === State ===
let state = {};
VARIABLES.forEach(v => { state[v.notation] = Number(v.value); });
state['P(¬M_j)'] = 1 - state['P(M_j)'];
delete state['P(B)'];
delete state['P(E|B)'];

function getVar(notation) {
  return VARIABLES.find(v => v.notation === notation);
}
function cssId(n) { return n.replace(/[^a-zA-Z0-9]/g, '_'); }

function renderControl(notation) {
  const cfg = SLIDER_CONFIG[notation];
  const v = getVar(notation);
  if (!v) return '';
  const isAutoShare = notation === 's_enc_Ag';
  const disabledAttr = isAutoShare ? ' disabled aria-describedby="auto-share-s_enc_Ag"' : '';
  const autoNote = isAutoShare
    ? '<span class="control-note" id="auto-share-s_enc_Ag">Calculated from the other encounter shares</span>'
    : '';
  return `
    <div class="control${isAutoShare ? ' control-auto' : ''}" title="${(v.description || '').replace(/"/g, '&quot;')}">
      <div class="control-head">
        <span class="control-label">${v.name}<span class="control-notation">${notation}</span></span>
        <span class="control-value" id="val-${cssId(notation)}">${fmt[cfg.fmt](state[notation])}</span>
      </div>
      <input type="range" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${state[notation]}" data-key="${notation}"${disabledAttr} />
      ${autoNote}
    </div>
  `;
}

// Build General Context
const generalGrid = document.getElementById('general-grid');
const lambdaBox = document.createElement('div');
lambdaBox.className = 'lambda-display';
lambdaBox.innerHTML = `
  <div class="lambda-label">
    Expected encounters per year
    <span class="lambda-formula">lambda = I_y * N_bears * food</span>
  </div>
  <div class="lambda-value" id="lambda-value">-</div>
`;
GENERAL_SUBSECTIONS.forEach(sub => {
  const sectionId = 'general:' + sub.id;
  const items = Object.keys(SLIDER_CONFIG).filter(n => SLIDER_CONFIG[n].section === sectionId);
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

// Build per-element panels
const elementBoard = document.getElementById('element-board');
ELEMENT_PANELS.forEach(ep => {
  const items = Object.keys(SLIDER_CONFIG).filter(n => SLIDER_CONFIG[n].section === ep.key);
  const panel = document.createElement('div');
  panel.className = 'element-panel ' + ep.cls;
  panel.innerHTML = `
    <div class="element-panel-head">
      <h3 class="element-panel-title">${ep.name}</h3>
      <span class="element-panel-tag">${ep.tag}</span>
    </div>
    <div class="element-events" id="events-${ep.key}">
      <span>Expected encounters / year</span><strong>—</strong>
    </div>
    ${items.map(renderControl).join('')}
  `;
  elementBoard.appendChild(panel);
});

// Build per-element result cards (table left, chart right)
const elementCards = document.getElementById('element-cards');
ELEMENT_PANELS.forEach(ep => {
  const card = document.createElement('div');
  card.className = 'card element-card ' + ep.cls;
  card.innerHTML = `
    <div class="card-head">
      <h2 class="card-title"><em>${ep.name}</em></h2>
      <span class="card-sub" id="el-card-sub-${ep.key}">Per-year · EUR</span>
    </div>
    <div class="element-results-grid">
      <div>
        <table class="metric-table">
          <tbody id="el-metrics-${ep.key}"></tbody>
        </table>
      </div>
      <div class="chart-box">
        <canvas id="elementChart-${ep.key}"></canvas>
      </div>
    </div>
  `;
  elementCards.appendChild(card);
});

// === Encounter share sliders ===
const USER_SHARE_KEYS = ['s_enc_SL', 's_enc_LL'];
const AUTO_SHARE_KEY = 's_enc_Ag';

function setSliderValue(key) {
  const inp = document.querySelector(`input[data-key="${key}"]`);
  if (inp) inp.value = state[key];
  const valEl = document.getElementById('val-' + cssId(key));
  if (valEl) valEl.textContent = fmt[SLIDER_CONFIG[key].fmt](state[key]);
}

function updateEncounterShares(changedKey) {
  if (!USER_SHARE_KEYS.includes(changedKey)) return;
  const otherKey = USER_SHARE_KEYS.find(k => k !== changedKey);
  const maxForChanged = Math.max(0, 1 - state[otherKey]);

  state[changedKey] = Math.min(Math.max(0, state[changedKey]), maxForChanged);
  state[AUTO_SHARE_KEY] = Math.max(0, 1 - state['s_enc_SL'] - state['s_enc_LL']);

  setSliderValue(changedKey);
  setSliderValue(AUTO_SHARE_KEY);
}

function resetEncounterSharesFromDefaults() {
  const userSum = USER_SHARE_KEYS.reduce((sum, key) => sum + state[key], 0);
  if (userSum > 1) {
    USER_SHARE_KEYS.forEach(key => { state[key] = state[key] / userSum; });
  }
  state[AUTO_SHARE_KEY] = Math.max(0, 1 - state['s_enc_SL'] - state['s_enc_LL']);
}

resetEncounterSharesFromDefaults();
[...USER_SHARE_KEYS, AUTO_SHARE_KEY].forEach(setSliderValue);

// === Wire up sliders ===
document.querySelectorAll('input[type=range]').forEach(inp => {
  inp.addEventListener('input', e => {
    const key = e.target.dataset.key;
    state[key] = Number(e.target.value);
    if (key === 'P(M_j)') state['P(¬M_j)'] = 1 - state[key];
    if (USER_SHARE_KEYS.includes(key)) updateEncounterShares(key);
    setSliderValue(key);
    recompute();
  });
});

document.getElementById('reset-all').addEventListener('click', () => {
  DEFAULTS.forEach(v => { state[v.notation] = Number(v.value); });
  state['P(¬M_j)'] = 1 - state['P(M_j)'];
  resetEncounterSharesFromDefaults();
  document.querySelectorAll('input[type=range]').forEach(inp => {
    const k = inp.dataset.key;
    setSliderValue(k);
  });
  recompute();
});

// === Model ===
// Element-level damage probability P(D_i|B,E) is applied downstream per element.
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

  // Compute one scenario (a given protection share). The bear's damaging
  // "appetite" expectedUnits is split between the two pools in proportion to
  // their share of stock: a fraction (1 - share) of attempts target the
  // unprotected pool and always succeed; a fraction `share` target the
  // protected pool and succeed only when the measure has failed (P(¬M_j)).
  // Each pool is then capped by its own available stock.
  // The no-protection baseline is just this same calculation at share = 0.
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

// === Charts ===
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

const elementCharts = {};
ELEMENT_PANELS.forEach(ep => {
  elementCharts[ep.key] = new Chart(document.getElementById('elementChart-' + ep.key), {
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

const overallChart = new Chart(document.getElementById('overallChart'), {
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

function syncThemeToggle() {
  if (!themeToggle) return;
  const theme = document.documentElement.dataset.theme || 'dark';
  const isLight = theme === 'light';
  themeToggle.setAttribute('aria-pressed', isLight ? 'true' : 'false');
  themeToggle.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
  const label = themeToggle.querySelector('.theme-toggle-text');
  if (label) label.textContent = isLight ? 'Theme: Light' : 'Theme: Dark';
}

function applyChartTheme() {
  Chart.defaults.color = cssVar('--ink-dim');
  Chart.defaults.borderColor = cssVar('--line');

  Object.values(elementCharts).forEach(chart => {
    chart.options.scales.y.grid.color = cssVar('--line');
    chart.options.scales.x.title.color = cssVar('--ink-dim');
  });
  overallChart.options.scales.y.grid.color = cssVar('--line');
  overallChart.options.scales.x.title.color = cssVar('--ink-dim');

  // Re-run so dataset colours pick up the theme's CSS-var values.
  if (typeof recompute === 'function') recompute();
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    // The theme still changes even if the browser blocks localStorage.
  }
  syncThemeToggle();
  applyChartTheme();
}

syncThemeToggle();

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const nextTheme = (document.documentElement.dataset.theme || 'dark') === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  });
}

// Cumulative installation outlay through year t.
// Installation is paid at year 0 and re-paid every lifespan_j years (re-investment).
function cumInstallByYear(installYr0, t) {
  const L = Math.max(1, Math.round(state['lifespan_j']));
  return installYr0 * (1 + Math.floor(t / L));
}

function installDueInYear(t) {
  const L = Math.max(1, Math.round(state['lifespan_j']));
  return t === 0 || t % L === 0;
}

// Build per-year cost series plus cumulative net benefit for one element.
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

function recompute() {
  const lambda = computeLambda();
  const T = Math.round(state['T']);

  document.getElementById('lambda-value').textContent = lambda.toFixed(2) + ' / yr';

  const elements = ELEMENT_PANELS.map(ep => ({
    ...ep,
    m: modelFor(ep.key, lambda),
    color: elementColor(ep.key)
  }));

  // Update per-element event count display
  elements.forEach(({key, m}) => {
    document.getElementById('events-' + key).innerHTML =
      `<span>Expected encounters / year</span><strong>${m.lambda_i.toFixed(2)}</strong>`;
  });

  // Per-element tables and charts
  const labels = Array.from({length: T+1}, (_, t) => t);
  elements.forEach(({key, name, m, color}) => {
    const cumNoProt = m.noProtPerYr * T;
    const cumProt = cumInstallByYear(m.installYr0, T) + m.protPerYr * T;
    const benefit = cumNoProt - cumProt;
    const better = benefit > 0;

    const tbody = document.getElementById('el-metrics-' + key);
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

    document.getElementById('el-card-sub-' + key).textContent = `Per-year · ${T}-year horizon`;

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

  // Overall chart: annual total costs plus cumulative net benefit area
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

  // Verdict stays cumulative over the selected horizon.
  const finalNet = aggNet[T];
  const valueEl = document.getElementById('verdict-value');
  const detailEl = document.getElementById('verdict-detail');
  const labelEl = document.getElementById('verdict-label');
  labelEl.textContent = `Net Outcome at Year ${T}`;

  // Find crossover year (where cumulative protected cost first drops below no-protection cost).
  let crossover = null;
  let runningNoProt = 0;
  let runningProt = 0;
  for (let t = 0; t <= T; t++) {
    runningNoProt += aggNoProt[t];
    runningProt += aggProt[t];
    if (runningProt < runningNoProt) { crossover = t; break; }
  }

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

  document.getElementById('overall-card-sub').textContent = `Per-year · ${T}-year horizon`;
}

recompute();

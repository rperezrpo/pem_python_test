const VARIABLES = __DATA_JSON__;
const DEFAULTS = JSON.parse(JSON.stringify(VARIABLES));

// === Slider configuration ===
const SLIDER_CONFIG = {
  // --- General: Bear pressure ---
  "I_y":           {min:0, max:10000,step:50,   fmt:'int',  section:'general:bear'},
  "P(B)":          {min:0, max:1,    step:0.01, fmt:'pct',  section:'general:bear'},
  "P(E|B)":        {min:0, max:1,    step:0.01, fmt:'pct',  section:'general:bear'},

  // --- General: Environment modifiers ---
  "P(D_i|food)":   {min:0.5, max:2,  step:0.05, fmt:'mult', section:'general:environment'},
  "P(D_i|density)":{min:0.5, max:2,  step:0.05, fmt:'mult', section:'general:environment'},

  // --- General: Protective measure ---
  "P(M_j)":        {min:0, max:1,    step:0.01, fmt:'pct',  section:'general:measure'},
  "c_maintenance_j":{min:0, max:100, step:1,    fmt:'eur',  section:'general:measure'},
  "lifespan_j":    {min:1, max:30,   step:1,    fmt:'yr',   section:'general:measure'},

  // --- General: Time horizon ---
  "T":             {min:1, max:20,   step:1,    fmt:'yr',   section:'general:time'},

  // --- Per-element: Small Livestock ---
  "P(D_SL|B,E)":   {min:0, max:1,    step:0.01, fmt:'pct',  section:'SL'},
  "s_SL":          {min:0, max:1,    step:0.01, fmt:'pct',  section:'SL', share:true},
  "N_SL":          {min:0, max:500,  step:1,    fmt:'int',  section:'SL'},
  "u_SL":          {min:0, max:30,   step:1,    fmt:'int',  section:'SL'},
  "c_SL":          {min:0, max:1000, step:10,   fmt:'eur',  section:'SL'},
  "s_prot_SL":     {min:0, max:1,    step:0.01, fmt:'pct',  section:'SL'},
  "c_install_SL":  {min:0, max:500,  step:5,    fmt:'eur',  section:'SL'},

  // --- Per-element: Large Livestock ---
  "P(D_LL|B,E)":   {min:0, max:1,    step:0.01, fmt:'pct',  section:'LL'},
  "s_LL":          {min:0, max:1,    step:0.01, fmt:'pct',  section:'LL', share:true},
  "N_LL":          {min:0, max:200,  step:1,    fmt:'int',  section:'LL'},
  "u_LL":          {min:0, max:10,   step:1,    fmt:'int',  section:'LL'},
  "c_LL":          {min:0, max:5000, step:50,   fmt:'eur',  section:'LL'},
  "s_prot_LL":     {min:0, max:1,    step:0.01, fmt:'pct',  section:'LL'},
  "c_install_LL":  {min:0, max:1000, step:10,   fmt:'eur',  section:'LL'},

  // --- Per-element: Agriculture ---
  "P(D_Ag|B,E)":   {min:0, max:1,    step:0.01, fmt:'pct',  section:'Ag'},
  "s_Ag":          {min:0, max:1,    step:0.01, fmt:'pct',  section:'Ag', share:true},
  "N_Ag":          {min:0, max:200,  step:1,    fmt:'int',  section:'Ag'},
  "u_Ag":          {min:0, max:30,   step:1,    fmt:'int',  section:'Ag'},
  "c_Ag":          {min:0, max:1500, step:10,   fmt:'eur',  section:'Ag'},
  "s_prot_Ag":     {min:0, max:1,    step:0.01, fmt:'pct',  section:'Ag'},
  "c_install_Ag":  {min:0, max:500,  step:5,    fmt:'eur',  section:'Ag'},
};

const GENERAL_SUBSECTIONS = [
  { id: 'bear',        label: 'Bear pressure' },
  { id: 'environment', label: 'Environment modifiers' },
  { id: 'measure',     label: 'Protective measure' },
  { id: 'time',        label: 'Time horizon' }
];

const ELEMENT_PANELS = [
  { key: 'SL', name: 'Small livestock', tag: 'sheep · goats · poultry', cls: '' },
  { key: 'LL', name: 'Large livestock', tag: 'cattle · horses',         cls: 'large' },
  { key: 'Ag', name: 'Agriculture',     tag: 'beehives · orchards',     cls: 'agriculture' }
];

const ELEMENT_COLORS = {
  SL: '#6b8e5a',
  LL: '#c66a3d',
  Ag: '#d4a04a'
};

const fmt = {
  pct: v => (v*100).toFixed(0) + '%',
  mult: v => '×' + v.toFixed(2),
  int: v => Math.round(v).toString(),
  eur: v => '€' + Math.round(v).toLocaleString(),
  yr: v => v.toFixed(0) + ' yr'
};
const fmtMoney = v => '€' + Math.round(v).toLocaleString();

// === State ===
let state = {};
VARIABLES.forEach(v => { state[v.notation] = Number(v.value); });
state['P(¬M_j)'] = 1 - state['P(M_j)'];

function getVar(notation) {
  return VARIABLES.find(v => v.notation === notation);
}
function cssId(n) { return n.replace(/[^a-zA-Z0-9]/g, '_'); }

function renderControl(notation) {
  const cfg = SLIDER_CONFIG[notation];
  const v = getVar(notation);
  if (!v) return '';
  return `
    <div class="control" title="${(v.description || '').replace(/"/g, '&quot;')}">
      <div class="control-head">
        <span class="control-label">${v.name}<span class="control-notation">${notation}</span></span>
        <span class="control-value" id="val-${cssId(notation)}">${fmt[cfg.fmt](state[notation])}</span>
      </div>
      <input type="range" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${state[notation]}" data-key="${notation}" />
    </div>
  `;
}

// Build General Context
const generalGrid = document.getElementById('general-grid');
GENERAL_SUBSECTIONS.forEach(sub => {
  const sectionId = 'general:' + sub.id;
  const items = Object.keys(SLIDER_CONFIG).filter(n => SLIDER_CONFIG[n].section === sectionId);
  if (!items.length) return;
  const header = document.createElement('div');
  header.className = 'general-subsection';
  header.textContent = sub.label;
  generalGrid.appendChild(header);
  items.forEach(notation => {
    const wrap = document.createElement('div');
    wrap.innerHTML = renderControl(notation);
    generalGrid.appendChild(wrap.firstElementChild);
  });
});

// Append a live λ display at the bottom of the general grid
const lambdaBox = document.createElement('div');
lambdaBox.className = 'lambda-display';
lambdaBox.innerHTML = `
  <div class="lambda-label">
    Expected encounters per year on this property
    <span class="lambda-formula">λ = I_y · P(B) · P(E|B) · food · density</span>
  </div>
  <div class="lambda-value" id="lambda-value">—</div>
`;
generalGrid.appendChild(lambdaBox);

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
      <span>Expected events / year</span><strong>—</strong>
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
      <span class="card-sub" id="el-card-sub-${ep.key}">Cumulative · over horizon</span>
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

// === Auto-normalize the share sliders ===
const SHARE_KEYS = ['s_SL', 's_LL', 's_Ag'];

function normalizeShares(changedKey) {
  const current = state[changedKey];
  const others = SHARE_KEYS.filter(k => k !== changedKey);
  const otherSum = others.reduce((a, k) => a + state[k], 0);
  const remaining = Math.max(0, 1 - current);

  if (otherSum > 0) {
    others.forEach(k => {
      state[k] = (state[k] / otherSum) * remaining;
    });
  } else {
    // Distribute the remainder evenly if other shares were 0
    others.forEach(k => { state[k] = remaining / others.length; });
  }
  // Update slider DOM
  others.forEach(k => {
    const inp = document.querySelector(`input[data-key="${k}"]`);
    if (inp) inp.value = state[k];
    const valEl = document.getElementById('val-' + cssId(k));
    if (valEl) valEl.textContent = fmt[SLIDER_CONFIG[k].fmt](state[k]);
  });
}

// === Wire up sliders ===
document.querySelectorAll('input[type=range]').forEach(inp => {
  inp.addEventListener('input', e => {
    const key = e.target.dataset.key;
    state[key] = Number(e.target.value);
    if (key === 'P(M_j)') state['P(¬M_j)'] = 1 - state[key];
    if (SHARE_KEYS.includes(key)) normalizeShares(key);
    document.getElementById('val-' + cssId(key)).textContent = fmt[SLIDER_CONFIG[key].fmt](state[key]);
    recompute();
  });
});

document.getElementById('reset-all').addEventListener('click', () => {
  DEFAULTS.forEach(v => { state[v.notation] = Number(v.value); });
  state['P(¬M_j)'] = 1 - state['P(M_j)'];
  document.querySelectorAll('input[type=range]').forEach(inp => {
    const k = inp.dataset.key;
    inp.value = state[k];
    document.getElementById('val-' + cssId(k)).textContent = fmt[SLIDER_CONFIG[k].fmt](state[k]);
  });
  recompute();
});

// === Model ===
// Element-level damage probability P(D_i|B,E) is applied downstream per element.
function computeLambda() {
  const s = state;
  return s['I_y'] * s['P(B)'] * s['P(E|B)'] * s['P(D_i|food)'] * s['P(D_i|density)'];
}

function modelFor(elementKey, lambda) {
  const s = state;
  const lambda_i = lambda * s['s_' + elementKey];
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
    const maintPerYr    = s['c_maintenance_j'] * Nprot;
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
Chart.defaults.color = '#a39d8d';
Chart.defaults.borderColor = '#2a3530';

const elementCharts = {};
ELEMENT_PANELS.forEach(ep => {
  elementCharts[ep.key] = new Chart(document.getElementById('elementChart-' + ep.key), {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14, font: { size: 11 } } },
        tooltip: {
          callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtMoney(ctx.raw) }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => fmtMoney(v) }, grid: { color: '#2a3530' } },
        x: { grid: { display: false }, title: { display: true, text: 'Year', color: '#a39d8d' } }
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
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14, font: { size: 11 } } },
      tooltip: {
        callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtMoney(ctx.raw) }
      }
    },
    scales: {
      y: { beginAtZero: true, ticks: { callback: v => fmtMoney(v) }, grid: { color: '#2a3530' } },
      x: { grid: { display: false }, title: { display: true, text: 'Year', color: '#a39d8d' } }
    },
    elements: { point: { radius: 3, hoverRadius: 6 }, line: { borderWidth: 2.5, tension: 0 } }
  }
});

// Cumulative installation outlay through year t.
// Installation is paid at year 0 and re-paid every lifespan_j years (re-investment).
function cumInstallByYear(installYr0, t) {
  const L = Math.max(1, Math.round(state['lifespan_j']));
  return installYr0 * (1 + Math.floor(t / L));
}

// Build cumulative time series for one element (no-prot vs prot)
function timeSeries(model, T) {
  const noProt = [];
  const prot = [];
  for (let t = 0; t <= T; t++) {
    noProt.push(model.noProtPerYr * t);
    prot.push(cumInstallByYear(model.installYr0, t) + model.protPerYr * t);
  }
  return { noProt, prot };
}

function recompute() {
  const lambda = computeLambda();
  const T = Math.round(state['T']);

  document.getElementById('lambda-value').textContent = lambda.toFixed(2) + ' / yr';

  const elements = ELEMENT_PANELS.map(ep => ({
    ...ep,
    m: modelFor(ep.key, lambda),
    color: ELEMENT_COLORS[ep.key]
  }));

  // Update per-element event count display
  elements.forEach(({key, m}) => {
    document.getElementById('events-' + key).innerHTML =
      `<span>Expected events / year</span><strong>${m.lambda_i.toFixed(2)}</strong>`;
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
        <td class="label">Expected events / year</td>
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

    document.getElementById('el-card-sub-' + key).textContent = `Cumulative · ${T}-year horizon`;

    const ts = timeSeries(m, T);
    const chart = elementCharts[key];
    chart.data.labels = labels;
    chart.data.datasets = [
      {
        label: 'No protection',
        data: ts.noProt,
        borderColor: color,
        backgroundColor: color + '20',
        borderDash: [5, 3],
        fill: false
      },
      {
        label: 'With protection',
        data: ts.prot,
        borderColor: color,
        backgroundColor: color + '40',
        fill: false
      }
    ];
    chart.update();
  });

  // Overall chart: total no-prot vs total prot vs net benefit area
  const aggNoProt = [], aggProt = [], aggNet = [];
  for (let t = 0; t <= T; t++) {
    let n = 0, p = 0;
    elements.forEach(({m}) => {
      n += m.noProtPerYr * t;
      p += cumInstallByYear(m.installYr0, t) + m.protPerYr * t;
    });
    aggNoProt.push(n);
    aggProt.push(p);
    aggNet.push(n - p);
  }
  overallChart.data.labels = labels;
  overallChart.data.datasets = [
    {
      label: 'Cumulative cost — no protection',
      data: aggNoProt,
      borderColor: '#c66a3d',
      backgroundColor: 'rgba(198, 106, 61, 0.08)',
      fill: false
    },
    {
      label: 'Cumulative cost — with protection',
      data: aggProt,
      borderColor: '#6b8e5a',
      backgroundColor: 'rgba(107, 142, 90, 0.08)',
      fill: false
    },
    {
      label: 'Net benefit (no-prot − prot)',
      data: aggNet,
      borderColor: '#d4a04a',
      backgroundColor: 'rgba(212, 160, 74, 0.10)',
      fill: 'origin',
      borderWidth: 1.5,
      borderDash: [2, 3]
    }
  ];
  overallChart.update();

  // Verdict
  const finalNet = aggNoProt[T] - aggProt[T];
  const valueEl = document.getElementById('verdict-value');
  const detailEl = document.getElementById('verdict-detail');
  const labelEl = document.getElementById('verdict-label');
  labelEl.textContent = `Net Outcome at Year ${T}`;

  // Find crossover year (where aggProt < aggNoProt for the first time)
  let crossover = null;
  for (let t = 0; t <= T; t++) {
    if (aggProt[t] < aggNoProt[t]) { crossover = t; break; }
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

  document.getElementById('overall-card-sub').textContent = `Cumulative · ${T}-year horizon`;
}

recompute();

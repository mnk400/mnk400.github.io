const DATA_BASE = 'https://mnk400.github.io/pipelines/lastfm-stats/processed';
const WRITTEN_DATE = '2026-02';

let useCutoff = true;

interface DriftPoint { month: string; totalPlays: number; [genre: string]: string | number }
interface GenreDriftData {
  topGenres: string[];
  quarterly: DriftPoint[];
  monthly: DriftPoint[];
}

interface TierPoint { month: string; totalPlays: number; tierPct: Record<string, number> }
interface Tier { name: string }
interface TierData { tiers: Tier[]; quarterly: TierPoint[]; monthly: TierPoint[] }

interface ArtistPhase {
  artist: string;
  totalPlays: number;
  peakQuarter: string;
  timeline: { quarter: string; plays: number }[];
}
interface ArtistLifecycleData { phases: ArtistPhase[] }

interface DiscoveryPoint { quarter?: string; month?: string; newArtists: number }
interface DiscoveryData { quarterly: DiscoveryPoint[]; monthly: DiscoveryPoint[] }

interface HourBucket { hour: number; label: string; totalPlays: number }
interface AmAnalysisData {
  meta: { totalScrobbles: number };
  topByBlock: Record<string, { artist: string }[]>;
  hourlyDistribution: HourBucket[];
}

type RenderFn = () => void;
type Resolution = 'quarterly' | 'monthly';

const GENRE_COLORS = [
  '#e06c75', '#61afef', '#c678dd', '#e5c07b', '#56b6c2', '#be5046',
  '#98c379', '#d19a66', '#abb2bf', '#528bff', '#e06c9f', '#7ec699',
  '#c8ae9d', '#d55fde', '#6796e6',
];

const TIER_COLORS: Record<string, string> = {
  obscure: '#7c3aed',
  niche: '#6366f1',
  mid: '#3b82f6',
  popular: '#f59e0b',
  mainstream: '#ef4444',
};

const BLOCK_HOURS: Record<string, string> = {
  'Late Night': '12AM – 5AM',
  'Early Morning': '6AM – 9AM',
  Daytime: '10AM – 4PM',
  Evening: '5PM – 8PM',
  Night: '9PM – 11PM',
};

const cssCache = new Map<string, string>();
function css(prop: string): string {
  let v = cssCache.get(prop);
  if (v === undefined) {
    v = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
    cssCache.set(prop, v);
  }
  return v;
}

function setupCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const r = window.devicePixelRatio || 1;
  canvas.width = width * r;
  canvas.height = height * r;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d')!;
  ctx.scale(r, r);
  return ctx;
}

function debounce(fn: () => void, wait: number) {
  let t: number | undefined;
  return () => {
    if (t !== undefined) clearTimeout(t);
    t = window.setTimeout(fn, wait);
  };
}

async function loadJSON<T>(name: string): Promise<T> {
  const resp = await fetch(`${DATA_BASE}/${name}`);
  return resp.json();
}

function cutoffMonth<T>(series: T[], key: keyof T): T[] {
  if (!useCutoff) return series;
  return series.filter((d) => (d[key] as unknown as string) <= WRITTEN_DATE);
}

function cutoffQuarter<T>(series: T[], key: keyof T): T[] {
  if (!useCutoff) return series;
  const [year, m] = WRITTEN_DATE.split('-');
  const q = Math.floor((parseInt(m) - 1) / 3) + 1;
  const cutQ = `${year}-Q${q}`;
  return series.filter((d) => (d[key] as unknown as string) <= cutQ);
}

interface Padding { top: number; right: number; bottom: number; left: number }
interface Scaffold {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  pad: Padding;
  cw: number;
  ch: number;
}

function chartScaffold(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  maxH: number,
  aspect: number,
): Scaffold {
  const W = container.getBoundingClientRect().width;
  const H = Math.min(maxH, W * aspect);
  const ctx = setupCanvas(canvas, W, H);
  const pad: Padding = { top: 15, right: 10, bottom: 30, left: 36 };
  return { ctx, W, H, pad, cw: W - pad.left - pad.right, ch: H - pad.top - pad.bottom };
}

function drawYAxisGrid(s: Scaffold, color: string, ySteps = 5) {
  const { ctx, pad, W, ch } = s;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= ySteps; i++) {
    const y = pad.top + (ch / ySteps) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
  }
}

function drawYAxisLabels(
  s: Scaffold,
  yMax: number,
  color: string,
  format: (v: number) => string,
  ySteps = 5,
) {
  const { ctx, pad, ch } = s;
  ctx.fillStyle = color;
  ctx.font = '10px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= ySteps; i++) {
    const val = yMax - (yMax / ySteps) * i;
    const y = pad.top + (ch / ySteps) * i;
    ctx.fillText(format(val), pad.left - 5, y);
  }
}

function drawXAxisYears<T>(
  s: Scaffold,
  series: T[],
  getLabel: (d: T) => string,
) {
  const { ctx, pad, cw, H } = s;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const shown = new Set<string>();
  let lastX = -Infinity;
  const minGap = 40;
  series.forEach((d, i) => {
    const year = getLabel(d).slice(0, 4);
    if (shown.has(year)) return;
    const x = pad.left + (i / (series.length - 1)) * cw;
    if (x - lastX < minGap) return;
    shown.add(year);
    ctx.fillText(year, x, H - pad.bottom + 8);
    lastX = x;
  });
}

async function drawGenreDrift(): Promise<RenderFn | null> {
  const container = document.getElementById('genre-drift-chart');
  if (!container) return null;

  const data = await loadJSON<GenreDriftData>('genre-drift.json');
  let resolution: Resolution = 'quarterly';
  let highlighted: string | null = null;

  const canvas = container.querySelector('canvas')!;
  const legendDiv = container.querySelector('.chart-legend') as HTMLElement;

  function render() {
    const minPlays = resolution === 'monthly' ? 20 : 50;
    const series = cutoffMonth(data[resolution], 'month').filter((d) => d.totalPlays >= minPlays);
    if (!series.length) return;

    const genres = data.topGenres;
    const s = chartScaffold(container!, canvas, 360, 0.65);

    // Relative share — genre scores are tag-weighted, so normalize against
    // the sum of genre scores per period.
    const pctData = series.map((d) => {
      const genreSum = genres.reduce((sum, g) => sum + ((d[g] as number) || 0), 0);
      const out: Record<string, number> = {};
      genres.forEach((g) => { out[g] = genreSum ? ((d[g] as number) / genreSum) * 100 : 0; });
      return out;
    });

    let yMax = 0;
    pctData.forEach((d) => genres.forEach((g) => { if (d[g] > yMax) yMax = d[g]; }));
    yMax = Math.ceil(yMax / 5) * 5 + 5;

    s.ctx.clearRect(0, 0, s.W, s.H);
    drawYAxisGrid(s, css('--translucent-low'));
    drawYAxisLabels(s, yMax, css('--sec-text-color'), (v) => `${Math.round(v)}%`);
    drawXAxisYears(s, series, (d) => d.month);

    genres.forEach((genre, gi) => {
      const isHighlighted = highlighted === null || highlighted === genre;
      s.ctx.strokeStyle = GENRE_COLORS[gi];
      s.ctx.lineWidth = highlighted === genre ? 2.5 : 1.2;
      s.ctx.globalAlpha = isHighlighted ? 1 : 0.1;
      s.ctx.beginPath();
      pctData.forEach((d, i) => {
        const x = s.pad.left + (i / (pctData.length - 1)) * s.cw;
        const y = s.pad.top + s.ch - (d[genre] / yMax) * s.ch;
        if (i === 0) s.ctx.moveTo(x, y); else s.ctx.lineTo(x, y);
      });
      s.ctx.stroke();
    });
    s.ctx.globalAlpha = 1;

    legendDiv.innerHTML = '';
    genres.forEach((genre, gi) => {
      const item = document.createElement('span');
      item.className = 'legend-item';
      if (highlighted !== null) {
        item.classList.add(highlighted === genre ? 'active' : 'dimmed');
      }
      item.innerHTML = `<span class="legend-swatch" style="background:${GENRE_COLORS[gi]}"></span>${genre}`;
      item.addEventListener('click', () => {
        highlighted = highlighted === genre ? null : genre;
        render();
      });
      legendDiv.appendChild(item);
    });
  }

  document.getElementById('genre-drift-resolution')?.addEventListener('change', (e) => {
    resolution = (e as CustomEvent).detail.value;
    render();
  });

  render();
  onResize(debounce(render, 150));
  return render;
}

async function drawTierChart(): Promise<RenderFn | null> {
  const container = document.getElementById('tier-chart');
  if (!container) return null;

  const data = await loadJSON<TierData>('mainstream-analysis.json');
  let resolution: Resolution = 'quarterly';
  const tiers = data.tiers.map((t) => t.name);
  const canvas = container.querySelector('canvas')!;
  const legendDiv = container.querySelector('.chart-legend') as HTMLElement;

  function render() {
    const series = cutoffMonth(data[resolution], 'month').filter((d) => d.totalPlays > 0);
    if (!series.length) return;

    const s = chartScaffold(container!, canvas, 320, 0.55);
    s.ctx.clearRect(0, 0, s.W, s.H);
    drawYAxisLabels(s, 100, css('--sec-text-color'), (v) => `${v}%`, 4);
    drawXAxisYears(s, series, (d) => d.month);

    // Stacked area. Iterate tiers from top-of-stack down so each polygon's
    // top edge equals the cumulative sum up to and including that tier.
    const drawOrder = [...tiers].reverse();
    drawOrder.forEach((tier) => {
      s.ctx.fillStyle = TIER_COLORS[tier];
      s.ctx.globalAlpha = 0.7;
      s.ctx.beginPath();

      series.forEach((d, i) => {
        const x = s.pad.left + (i / (series.length - 1)) * s.cw;
        let cumTop = 0;
        for (const t of drawOrder) {
          cumTop += d.tierPct[t] || 0;
          if (t === tier) break;
        }
        const y = s.pad.top + s.ch - (cumTop / 100) * s.ch;
        if (i === 0) s.ctx.moveTo(x, y); else s.ctx.lineTo(x, y);
      });

      for (let i = series.length - 1; i >= 0; i--) {
        const d = series[i];
        const x = s.pad.left + (i / (series.length - 1)) * s.cw;
        let cumBottom = 0;
        for (const t of drawOrder) {
          if (t === tier) break;
          cumBottom += d.tierPct[t] || 0;
        }
        const y = s.pad.top + s.ch - (cumBottom / 100) * s.ch;
        s.ctx.lineTo(x, y);
      }

      s.ctx.closePath();
      s.ctx.fill();
    });
    s.ctx.globalAlpha = 1;

    legendDiv.innerHTML = '';
    tiers.forEach((tier) => {
      const item = document.createElement('span');
      item.className = 'legend-item active';
      item.innerHTML = `<span class="legend-swatch" style="background:${TIER_COLORS[tier]}"></span>${tier}`;
      legendDiv.appendChild(item);
    });
  }

  document.getElementById('tier-resolution')?.addEventListener('change', (e) => {
    resolution = (e as CustomEvent).detail.value;
    render();
  });

  render();
  onResize(debounce(render, 150));
  return render;
}

async function drawArtistLifecycle(): Promise<RenderFn | null> {
  const container = document.getElementById('artist-lifecycle-chart');
  if (!container) return null;

  const data = await loadJSON<ArtistLifecycleData>('artist-lifecycle.json');

  function render() {
    const listDiv = container!.querySelector('.lifecycle-list') as HTMLElement | null;
    if (!listDiv) return;
    listDiv.innerHTML = '';

    const accent = css('--sec-text-color');
    const sec = css('--sec-text-color');

    const artists = data.phases.map((a) => ({
      artist: a.artist,
      totalPlays: a.totalPlays,
      peakQuarter: a.peakQuarter,
      timeline: cutoffQuarter(a.timeline, 'quarter'),
    }));

    let globalMax = 0;
    artists.forEach((a) => a.timeline.forEach((t) => { if (t.plays > globalMax) globalMax = t.plays; }));

    artists.forEach((a) => {
      const row = document.createElement('div');
      row.className = 'lifecycle-row';

      const label = document.createElement('div');
      label.className = 'lifecycle-label';
      label.innerHTML =
        `<span class="lifecycle-name">${a.artist}</span>` +
        `<span class="lifecycle-plays">${a.totalPlays.toLocaleString()} plays</span>`;
      row.appendChild(label);

      const canvasWrap = document.createElement('div');
      canvasWrap.className = 'lifecycle-spark-wrap';
      const canvas = document.createElement('canvas');
      canvasWrap.appendChild(canvas);
      row.appendChild(canvasWrap);
      listDiv.appendChild(row);

      // Defer sparkline draw to next frame so the row has measured width.
      requestAnimationFrame(() => {
        const W = canvasWrap.getBoundingClientRect().width;
        const H = 30;
        const ctx = setupCanvas(canvas, W, H);
        const timeline = a.timeline;
        const barW = Math.max(1, (W / timeline.length) - 1);

        timeline.forEach((t, i) => {
          const x = (i / timeline.length) * W;
          const h = globalMax > 0 ? (t.plays / globalMax) * H : 0;
          ctx.fillStyle = t.quarter === a.peakQuarter ? accent : sec;
          ctx.globalAlpha = t.quarter === a.peakQuarter ? 1 : 0.5;
          ctx.fillRect(x, H - h, barW, h);
        });
        ctx.globalAlpha = 1;
      });
    });
  }

  render();
  return render;
}

async function drawDiscoveryRate(): Promise<RenderFn | null> {
  const container = document.getElementById('discovery-chart');
  if (!container) return null;

  const data = await loadJSON<DiscoveryData>('discovery.json');
  let resolution: Resolution = 'quarterly';
  const canvas = container.querySelector('canvas')!;

  function render() {
    const series = resolution === 'quarterly'
      ? cutoffQuarter(data.quarterly, 'quarter')
      : cutoffMonth(data.monthly, 'month');
    if (!series.length) return;

    const s = chartScaffold(container!, canvas, 320, 0.55);

    let yMax = 0;
    series.forEach((d) => { if (d.newArtists > yMax) yMax = d.newArtists; });
    yMax = Math.ceil(yMax / 10) * 10 + 10;

    s.ctx.clearRect(0, 0, s.W, s.H);
    drawYAxisGrid(s, css('--translucent-low'));
    drawYAxisLabels(s, yMax, css('--sec-text-color'), (v) => String(Math.round(v)));
    drawXAxisYears(s, series, (d) => d.quarter || d.month || '');

    const accent = css('--sec-text-color');

    s.ctx.fillStyle = accent;
    s.ctx.globalAlpha = 0.15;
    s.ctx.beginPath();
    s.ctx.moveTo(s.pad.left, s.pad.top + s.ch);
    series.forEach((d, i) => {
      const x = s.pad.left + (i / (series.length - 1)) * s.cw;
      const y = s.pad.top + s.ch - (d.newArtists / yMax) * s.ch;
      s.ctx.lineTo(x, y);
    });
    s.ctx.lineTo(s.pad.left + s.cw, s.pad.top + s.ch);
    s.ctx.closePath();
    s.ctx.fill();
    s.ctx.globalAlpha = 1;

    s.ctx.strokeStyle = accent;
    s.ctx.lineWidth = 1.5;
    s.ctx.beginPath();
    series.forEach((d, i) => {
      const x = s.pad.left + (i / (series.length - 1)) * s.cw;
      const y = s.pad.top + s.ch - (d.newArtists / yMax) * s.ch;
      if (i === 0) s.ctx.moveTo(x, y); else s.ctx.lineTo(x, y);
    });
    s.ctx.stroke();
  }

  document.getElementById('discovery-resolution')?.addEventListener('change', (e) => {
    resolution = (e as CustomEvent).detail.value;
    render();
  });

  render();
  onResize(debounce(render, 150));
  return render;
}

function drawDayInMusic(data: AmAnalysisData) {
  const container = document.getElementById('day-in-music');
  if (!container) return;

  const blocksDiv = container.querySelector('.time-blocks') as HTMLElement | null;
  if (blocksDiv) {
    const blockOrder = ['Late Night', 'Early Morning', 'Daytime', 'Evening', 'Night'];
    blocksDiv.innerHTML = '';

    blockOrder.forEach((block) => {
      const artists = (data.topByBlock[block] || []).slice(0, 5);
      const el = document.createElement('div');
      el.className = 'time-block';
      el.innerHTML =
        '<div class="time-block__header">' +
        `<span class="time-block__name">${block}</span>` +
        `<span class="time-block__hours">${BLOCK_HOURS[block]}</span>` +
        '</div>' +
        '<div class="time-block__artists">' +
        artists.map((a) => `<span class="time-block__artist">${a.artist}</span>`)
          .join('<span class="time-block__sep">, </span>') +
        '</div>';
      blocksDiv.appendChild(el);
    });
  }

  const barsDiv = container.querySelector('.hourly-bars') as HTMLElement | null;
  const labelsDiv = container.querySelector('.hourly-labels') as HTMLElement | null;
  if (barsDiv && labelsDiv && data.hourlyDistribution) {
    const maxPlays = Math.max(...data.hourlyDistribution.map((h) => h.totalPlays));
    barsDiv.innerHTML = '';
    labelsDiv.innerHTML = '';

    data.hourlyDistribution.forEach((h) => {
      const bar = document.createElement('div');
      bar.className = 'hourly-bar';
      bar.style.height = `${(h.totalPlays / maxPlays) * 100}%`;
      bar.title = `${h.label}: ${h.totalPlays.toLocaleString()} plays`;
      barsDiv.appendChild(bar);

      const label = document.createElement('span');
      label.className = 'hourly-label';
      label.textContent = h.hour % 6 === 0 ? h.label : '';
      labelsDiv.appendChild(label);
    });
  }
}

function populateScrobbleCount(data: AmAnalysisData) {
  const el = document.getElementById('scrobble-count');
  if (!el || !data?.meta?.totalScrobbles) return;
  const rounded = Math.floor(data.meta.totalScrobbles / 1000) * 1000;
  el.textContent = rounded.toLocaleString();
}

// Bundled module — runs once globally. Listeners on document survive DOM
// swaps; per-page state (resize handlers, observer) is recreated on each
// page-load and torn down on each before-swap.
let resizeHandlers: (() => void)[] = [];
let themeObserver: MutationObserver | null = null;

function onResize(handler: () => void) {
  window.addEventListener('resize', handler);
  resizeHandlers.push(handler);
}

function onThemeChange(callback: () => void) {
  themeObserver = new MutationObserver(() => {
    cssCache.clear();
    callback();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}

function teardown() {
  resizeHandlers.forEach((h) => window.removeEventListener('resize', h));
  resizeHandlers = [];
  themeObserver?.disconnect();
  themeObserver = null;
  cssCache.clear();
}

export async function init() {
  if (!document.getElementById('scrobble-count')) return;

  const renders: RenderFn[] = [];

  const amData = await loadJSON<AmAnalysisData>('3am-analysis.json');
  populateScrobbleCount(amData);
  drawDayInMusic(amData);

  const collected = await Promise.all([
    drawGenreDrift(),
    drawTierChart(),
    drawArtistLifecycle(),
    drawDiscoveryRate(),
  ]);
  collected.forEach((r) => { if (r) renders.push(r); });

  document.getElementById('data-range-toggle')?.addEventListener('change', (e) => {
    useCutoff = (e as CustomEvent).detail.value === 'written';
    renders.forEach((fn) => fn());
  });

  onThemeChange(() => renders.forEach((fn) => fn()));
}

// Teardown listener registered once on first import. Idempotent — fires on
// every nav, no-ops when there's nothing to clean up.
document.addEventListener('astro:before-swap', teardown);

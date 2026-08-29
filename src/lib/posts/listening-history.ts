import {
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  type ChartConfiguration,
  type ChartDataset,
  type ChartOptions,
} from 'chart.js';
import { pageSignal, untilSwap } from '../lifecycle.ts';

Chart.register(
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Filler,
);

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
type LineChart = Chart<'line', number[], string>;
type RegisterChart = (chart: LineChart) => LineChart;

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
  let value = cssCache.get(prop);
  if (value === undefined) {
    value = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
    cssCache.set(prop, value);
  }
  return value;
}

function cssNumber(prop: string, fallback: number): number {
  return Number.parseFloat(css(prop)) || fallback;
}

function chartFontFamily(): string {
  return getComputedStyle(document.body).fontFamily;
}

function setupCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d')!;
  ctx.scale(ratio, ratio);
  return ctx;
}

function debounce(fn: () => void, wait: number, signal: AbortSignal) {
  let timer: number | undefined;
  signal.addEventListener('abort', () => {
    if (timer !== undefined) clearTimeout(timer);
  }, { once: true });

  return () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = window.setTimeout(fn, wait);
  };
}

async function loadJSON<T>(name: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${DATA_BASE}/${name}`, { signal });
  if (!response.ok) throw new Error(`Failed to load ${name}: ${response.status}`);
  return response.json();
}

function cutoffMonth<T>(series: T[], key: keyof T): T[] {
  if (!useCutoff) return series;
  return series.filter((point) => (point[key] as unknown as string) <= WRITTEN_DATE);
}

function cutoffQuarter<T>(series: T[], key: keyof T): T[] {
  if (!useCutoff) return series;
  const [year, month] = WRITTEN_DATE.split('-');
  const quarter = Math.floor((parseInt(month) - 1) / 3) + 1;
  const cutoff = `${year}-Q${quarter}`;
  return series.filter((point) => (point[key] as unknown as string) <= cutoff);
}

function withAlpha(color: string, alpha: number): string {
  const hex = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return /^#[\da-f]{6}$/i.test(color) ? `${color}${hex}` : color;
}

interface LineOptionsConfig {
  labels: string[];
  aspectRatio: number;
  yMax: number;
  yStep: number;
  yTick: (value: number) => string;
  showGrid?: boolean;
  stacked?: boolean;
}

function lineChartOptions(config: LineOptionsConfig): ChartOptions<'line'> {
  const textColor = css('--sec-text-color');
  const labels = config.labels;

  return {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: config.aspectRatio,
    animation: false,
    events: [],
    layout: {
      padding: {
        top: cssNumber('--spacing-lg', 15),
        right: cssNumber('--spacing-md', 10),
      },
    },
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        stacked: config.stacked,
        border: { display: false },
        grid: { display: false },
        ticks: {
          autoSkip: false,
          color: textColor,
          font: { family: chartFontFamily(), size: 10 },
          maxRotation: 0,
          minRotation: 0,
          callback: (_value, index) => {
            const year = labels[index]?.slice(0, 4) || '';
            const previousYear = labels[index - 1]?.slice(0, 4);
            return index === 0 || year !== previousYear ? year : '';
          },
        },
      },
      y: {
        stacked: config.stacked,
        beginAtZero: true,
        min: 0,
        max: config.yMax,
        border: { display: false },
        grid: {
          display: config.showGrid ?? true,
          color: css('--translucent-low'),
          lineWidth: 0.5,
        },
        ticks: {
          color: textColor,
          font: { family: chartFontFamily(), size: 10 },
          stepSize: config.yStep,
          callback: (value) => config.yTick(Number(value)),
        },
      },
    },
  };
}

function upsertLineChart(
  chart: LineChart | null,
  canvas: HTMLCanvasElement,
  config: ChartConfiguration<'line', number[], string>,
  registerChart: RegisterChart,
): LineChart {
  if (!chart) return registerChart(new Chart(canvas, config));
  chart.data = config.data;
  chart.options = config.options ?? {};
  chart.update('none');
  return chart;
}

function makeLegendItem(label: string, color: string): [HTMLElement, HTMLElement] {
  const swatch = document.createElement('span');
  swatch.className = 'legend-swatch';
  swatch.style.background = color;

  const text = document.createElement('span');
  text.textContent = label;
  return [swatch, text];
}

async function drawGenreDrift(
  signal: AbortSignal,
  registerChart: RegisterChart,
): Promise<RenderFn | null> {
  const container = document.querySelector<HTMLElement>('[data-genre-drift-chart]');
  if (!container) return null;

  const data = await loadJSON<GenreDriftData>('genre-drift.json', signal);
  let resolution: Resolution = 'quarterly';
  let highlighted: string | null = null;
  let chart: LineChart | null = null;

  const canvas = container.querySelector<HTMLCanvasElement>('canvas');
  const legend = container.querySelector<HTMLElement>('.chart-legend');
  if (!canvas || !legend) return null;
  const canvasElement = canvas;
  const legendElement = legend;

  function render() {
    if (signal.aborted) return;
    const minPlays = resolution === 'monthly' ? 20 : 50;
    const series = cutoffMonth(data[resolution], 'month')
      .filter((point) => point.totalPlays >= minPlays);
    if (!series.length) return;

    const genres = data.topGenres;
    const percentages = series.map((point) => {
      const total = genres.reduce((sum, genre) => sum + ((point[genre] as number) || 0), 0);
      return Object.fromEntries(genres.map((genre) => [
        genre,
        total ? ((point[genre] as number) / total) * 100 : 0,
      ]));
    });

    const highest = Math.max(...percentages.flatMap((point) => genres.map((genre) => point[genre])));
    const yMax = Math.ceil(highest / 5) * 5 + 5;
    const labels = series.map((point) => point.month);
    const datasets: ChartDataset<'line', number[]>[] = genres.map((genre, index) => {
      const active = highlighted === null || highlighted === genre;
      return {
        label: genre,
        data: percentages.map((point) => point[genre]),
        borderColor: withAlpha(GENRE_COLORS[index], active ? 1 : 0.1),
        backgroundColor: GENRE_COLORS[index],
        borderWidth: highlighted === genre ? 2.5 : 1.2,
        pointRadius: 0,
        fill: false,
        tension: 0,
      };
    });

    chart = upsertLineChart(chart, canvasElement, {
      type: 'line',
      data: { labels, datasets },
      options: lineChartOptions({
        labels,
        aspectRatio: 1 / 0.65,
        yMax,
        yStep: yMax / 5,
        yTick: (value) => `${Math.round(value)}%`,
      }),
    }, registerChart);

    legendElement.replaceChildren();
    genres.forEach((genre, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'legend-item';
      if (highlighted !== null) item.classList.add(highlighted === genre ? 'active' : 'dimmed');
      item.setAttribute('aria-pressed', String(highlighted === genre));
      item.setAttribute('aria-label', highlighted === genre ? 'Show all genres' : `Isolate ${genre}`);
      item.append(...makeLegendItem(genre, GENRE_COLORS[index]));
      item.addEventListener('click', () => {
        highlighted = highlighted === genre ? null : genre;
        render();
      });
      legendElement.appendChild(item);
    });
  }

  container.querySelector<HTMLElement>('[data-genre-drift-resolution]')
    ?.addEventListener('change', (event) => {
      resolution = (event as CustomEvent).detail.value;
      render();
    });

  render();
  return render;
}

async function drawTierChart(
  signal: AbortSignal,
  registerChart: RegisterChart,
): Promise<RenderFn | null> {
  const container = document.querySelector<HTMLElement>('[data-tier-chart]');
  if (!container) return null;

  const data = await loadJSON<TierData>('mainstream-analysis.json', signal);
  let resolution: Resolution = 'quarterly';
  let chart: LineChart | null = null;
  const tiers = data.tiers.map((tier) => tier.name);

  const canvas = container.querySelector<HTMLCanvasElement>('canvas');
  const legend = container.querySelector<HTMLElement>('.chart-legend');
  if (!canvas || !legend) return null;
  const canvasElement = canvas;
  const legendElement = legend;

  function render() {
    if (signal.aborted) return;
    const series = cutoffMonth(data[resolution], 'month')
      .filter((point) => point.totalPlays > 0);
    if (!series.length) return;

    const labels = series.map((point) => point.month);
    const drawOrder = [...tiers].reverse();
    const datasets: ChartDataset<'line', number[]>[] = drawOrder.map((tier, index) => ({
      label: tier,
      data: series.map((point) => point.tierPct[tier] || 0),
      borderColor: withAlpha(TIER_COLORS[tier], 0.7),
      backgroundColor: withAlpha(TIER_COLORS[tier], 0.7),
      borderWidth: 0,
      pointRadius: 0,
      fill: true,
      stack: 'tiers',
      order: index,
      tension: 0,
    }));

    chart = upsertLineChart(chart, canvasElement, {
      type: 'line',
      data: { labels, datasets },
      options: lineChartOptions({
        labels,
        aspectRatio: 1 / 0.55,
        yMax: 100,
        yStep: 25,
        yTick: (value) => `${value}%`,
        showGrid: false,
        stacked: true,
      }),
    }, registerChart);

    legendElement.replaceChildren();
    tiers.forEach((tier) => {
      const item = document.createElement('span');
      item.className = 'legend-item legend-item--static active';
      item.append(...makeLegendItem(tier, TIER_COLORS[tier]));
      legendElement.appendChild(item);
    });
  }

  container.querySelector<HTMLElement>('[data-tier-resolution]')
    ?.addEventListener('change', (event) => {
      resolution = (event as CustomEvent).detail.value;
      render();
    });

  render();
  return render;
}

async function drawArtistLifecycle(signal: AbortSignal): Promise<RenderFn | null> {
  const container = document.querySelector<HTMLElement>('[data-artist-lifecycle-chart]');
  if (!container) return null;

  const data = await loadJSON<ArtistLifecycleData>('artist-lifecycle.json', signal);

  function render() {
    if (signal.aborted) return;
    const list = container!.querySelector<HTMLElement>('.lifecycle-list');
    if (!list) return;
    list.replaceChildren();

    const color = css('--sec-text-color');
    const artists = data.phases.map((artist) => ({
      artist: artist.artist,
      totalPlays: artist.totalPlays,
      peakQuarter: artist.peakQuarter,
      timeline: cutoffQuarter(artist.timeline, 'quarter'),
    }));

    const globalMax = Math.max(
      0,
      ...artists.flatMap((artist) => artist.timeline.map((point) => point.plays)),
    );

    artists.forEach((artist) => {
      const row = document.createElement('div');
      row.className = 'lifecycle-row';

      const label = document.createElement('div');
      label.className = 'lifecycle-label';
      const name = document.createElement('span');
      name.className = 'lifecycle-name';
      name.textContent = artist.artist;
      const plays = document.createElement('span');
      plays.className = 'lifecycle-plays';
      plays.textContent = `${artist.totalPlays.toLocaleString()} plays`;
      label.append(name, plays);

      const canvasWrap = document.createElement('div');
      canvasWrap.className = 'lifecycle-spark-wrap';
      const canvas = document.createElement('canvas');
      canvas.setAttribute('role', 'img');
      canvas.setAttribute(
        'aria-label',
        `${artist.artist} quarterly plays. Peak quarter: ${artist.peakQuarter}.`,
      );
      canvasWrap.appendChild(canvas);
      row.append(label, canvasWrap);
      list.appendChild(row);

      requestAnimationFrame(() => {
        if (signal.aborted || !canvas.isConnected) return;
        const width = canvasWrap.getBoundingClientRect().width;
        const height = 30;
        const ctx = setupCanvas(canvas, width, height);
        const barWidth = Math.max(1, (width / artist.timeline.length) - 1);

        artist.timeline.forEach((point, index) => {
          const x = (index / artist.timeline.length) * width;
          const barHeight = globalMax > 0 ? (point.plays / globalMax) * height : 0;
          ctx.fillStyle = color;
          ctx.globalAlpha = point.quarter === artist.peakQuarter ? 1 : 0.5;
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        });
        ctx.globalAlpha = 1;
      });
    });
  }

  render();
  window.addEventListener('resize', debounce(render, 150, signal), { signal });
  return render;
}

async function drawDiscoveryRate(
  signal: AbortSignal,
  registerChart: RegisterChart,
): Promise<RenderFn | null> {
  const container = document.querySelector<HTMLElement>('[data-discovery-chart]');
  if (!container) return null;

  const data = await loadJSON<DiscoveryData>('discovery.json', signal);
  let resolution: Resolution = 'quarterly';
  let chart: LineChart | null = null;

  const canvas = container.querySelector<HTMLCanvasElement>('canvas');
  if (!canvas) return null;
  const canvasElement = canvas;

  function render() {
    if (signal.aborted) return;
    const series = resolution === 'quarterly'
      ? cutoffQuarter(data.quarterly, 'quarter')
      : cutoffMonth(data.monthly, 'month');
    if (!series.length) return;

    const yMax = Math.ceil(Math.max(...series.map((point) => point.newArtists)) / 10) * 10 + 10;
    const labels = series.map((point) => point.quarter || point.month || '');
    const color = css('--sec-text-color');
    const datasets: ChartDataset<'line', number[]>[] = [{
      label: 'New artists',
      data: series.map((point) => point.newArtists),
      borderColor: color,
      backgroundColor: withAlpha(color, 0.15),
      borderWidth: 1.5,
      pointRadius: 0,
      fill: true,
      tension: 0,
    }];

    chart = upsertLineChart(chart, canvasElement, {
      type: 'line',
      data: { labels, datasets },
      options: lineChartOptions({
        labels,
        aspectRatio: 1 / 0.55,
        yMax,
        yStep: yMax / 5,
        yTick: (value) => String(Math.round(value)),
      }),
    }, registerChart);
  }

  container.querySelector<HTMLElement>('[data-discovery-resolution]')
    ?.addEventListener('change', (event) => {
      resolution = (event as CustomEvent).detail.value;
      render();
    });

  render();
  return render;
}

function drawDayInMusic(data: AmAnalysisData) {
  const container = document.querySelector<HTMLElement>('[data-day-in-music]');
  if (!container) return;

  const blocks = container.querySelector<HTMLElement>('.time-blocks');
  if (blocks) {
    const blockOrder = ['Late Night', 'Early Morning', 'Daytime', 'Evening', 'Night'];
    blocks.replaceChildren();

    blockOrder.forEach((block) => {
      const artists = (data.topByBlock[block] || []).slice(0, 5);
      const element = document.createElement('div');
      element.className = 'time-block';

      const header = document.createElement('div');
      header.className = 'time-block__header';
      const name = document.createElement('span');
      name.className = 'time-block__name';
      name.textContent = block;
      const hours = document.createElement('span');
      hours.className = 'time-block__hours';
      hours.textContent = BLOCK_HOURS[block];
      header.append(name, hours);

      const artistList = document.createElement('div');
      artistList.className = 'time-block__artists';
      artists.forEach((artist, index) => {
        if (index > 0) artistList.append(', ');
        const artistName = document.createElement('span');
        artistName.className = 'time-block__artist';
        artistName.textContent = artist.artist;
        artistList.appendChild(artistName);
      });

      element.append(header, artistList);
      blocks.appendChild(element);
    });
  }

  const bars = container.querySelector<HTMLElement>('.hourly-bars');
  const labels = container.querySelector<HTMLElement>('.hourly-labels');
  if (bars && labels && data.hourlyDistribution) {
    const maxPlays = Math.max(...data.hourlyDistribution.map((hour) => hour.totalPlays));
    bars.replaceChildren();
    labels.replaceChildren();

    data.hourlyDistribution.forEach((hour) => {
      const bar = document.createElement('div');
      bar.className = 'hourly-bar';
      bar.style.height = `${(hour.totalPlays / maxPlays) * 100}%`;
      bar.title = `${hour.label}: ${hour.totalPlays.toLocaleString()} plays`;
      bars.appendChild(bar);

      const label = document.createElement('span');
      label.className = 'hourly-label';
      label.textContent = hour.hour % 6 === 0 ? hour.label : '';
      labels.appendChild(label);
    });
  }
}

function populateScrobbleCount(data: AmAnalysisData) {
  const element = document.querySelector<HTMLElement>('[data-scrobble-count]');
  if (!element || !data?.meta?.totalScrobbles) return;
  const rounded = Math.floor(data.meta.totalScrobbles / 1000) * 1000;
  element.textContent = rounded.toLocaleString();
}

function onThemeChange(callback: () => void, signal: AbortSignal) {
  const observer = new MutationObserver(() => {
    cssCache.clear();
    callback();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  signal.addEventListener('abort', () => observer.disconnect(), { once: true });
}

export async function init() {
  const marker = document.querySelector<HTMLElement>('[data-scrobble-count]');
  if (!marker || marker.dataset.listeningHistoryInitialized === 'true') return;
  marker.dataset.listeningHistoryInitialized = 'true';

  const signal = pageSignal();
  const charts = new Set<LineChart>();
  const registerChart: RegisterChart = (chart) => {
    charts.add(chart);
    return chart;
  };

  useCutoff = true;
  untilSwap(() => {
    charts.forEach((chart) => chart.destroy());
    charts.clear();
    cssCache.clear();
  });

  try {
    const amData = await loadJSON<AmAnalysisData>('3am-analysis.json', signal);
    if (signal.aborted) return;
    populateScrobbleCount(amData);
    drawDayInMusic(amData);

    const collected = await Promise.all([
      drawGenreDrift(signal, registerChart),
      drawTierChart(signal, registerChart),
      drawArtistLifecycle(signal),
      drawDiscoveryRate(signal, registerChart),
    ]);
    if (signal.aborted) return;

    const renders = collected.filter((render): render is RenderFn => render !== null);
    document.querySelector<HTMLElement>('[data-listening-range]')
      ?.addEventListener('change', (event) => {
        useCutoff = (event as CustomEvent).detail.value === 'written';
        renders.forEach((render) => render());
      });

    onThemeChange(() => renders.forEach((render) => render()), signal);
  } catch (error) {
    if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
    throw error;
  }
}

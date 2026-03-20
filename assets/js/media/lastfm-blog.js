(function () {
  const DATA_BASE = "https://manik.cc/pipelines/lastfm-stats/processed";
  const WRITTEN_DATE = "2026-02";  // cutoff: data up to this month
  var useCutoff = true;  // start with cutoff on

  function cutoffMonth(series, key) {
    if (!useCutoff) return series;
    return series.filter(function (d) {
      return d[key] <= WRITTEN_DATE;
    });
  }

  function cutoffQuarter(series, key) {
    if (!useCutoff) return series;
    // WRITTEN_DATE "2026-02" → 2026-Q1
    var parts = WRITTEN_DATE.split("-");
    var q = Math.floor((parseInt(parts[1]) - 1) / 3) + 1;
    var cutQ = parts[0] + "-Q" + q;
    return series.filter(function (d) {
      return d[key] <= cutQ;
    });
  }

  // Genre palette — works on light and dark backgrounds
  const GENRE_COLORS = [
    "#e06c75", // indie
    "#61afef", // hip-hop
    "#c678dd", // electronic
    "#e5c07b", // r&b/soul
    "#56b6c2", // pop
    "#be5046", // shoegaze
    "#98c379", // rock
    "#d19a66", // alternative
    "#abb2bf", // lo-fi
    "#528bff", // folk
    "#e06c9f", // singer-songwriter
    "#7ec699", // experimental
    "#c8ae9d", // post-rock
    "#d55fde", // psychedelic
    "#6796e6", // post-punk
  ];

  const TIER_COLORS = {
    obscure: "#7c3aed",
    niche: "#6366f1",
    mid: "#3b82f6",
    popular: "#f59e0b",
    mainstream: "#ef4444",
  };

  const BLOCK_HOURS = {
    "Late Night": "12AM – 5AM",
    "Early Morning": "6AM – 9AM",
    Daytime: "10AM – 4PM",
    Evening: "5PM – 8PM",
    Night: "9PM – 11PM",
  };

  // ── Helpers (from CanvasUtils) ──

  var css = CanvasUtils.css;
  var setupCanvas = CanvasUtils.setupCanvas;
  var debounce = CanvasUtils.debounce;

  async function loadJSON(name) {
    const resp = await fetch(DATA_BASE + "/" + name);
    return resp.json();
  }

  // ── Genre Drift Chart ──

  async function drawGenreDrift() {
    const container = document.getElementById("genre-drift-chart");
    if (!container) return null;

    const data = await loadJSON("genre-drift.json");
    let resolution = "quarterly";

    const controlsDiv = container.querySelector(".chart-controls");
    const canvas = container.querySelector("canvas");
    const legendDiv = container.querySelector(".chart-legend");

    let highlighted = null; // genre name or null

    function render() {
      const minPlays = resolution === "monthly" ? 20 : 50;
      const series = cutoffMonth(data[resolution], "month").filter((d) => d.totalPlays >= minPlays);
      if (!series.length) return;

      const genres = data.topGenres;
      const rect = container.getBoundingClientRect();
      const W = rect.width;
      const H = Math.min(360, W * 0.65);
      const ctx = setupCanvas(canvas, W, H);

      const pad = { top: 15, right: 10, bottom: 30, left: 36 };
      const cw = W - pad.left - pad.right;
      const ch = H - pad.top - pad.bottom;

      // Compute relative share — genre scores are tag-weighted,
      // so normalize against sum of all genre scores per period
      const pctData = series.map((d) => {
        const out = { month: d.month };
        const genreSum = genres.reduce((s, g) => s + (d[g] || 0), 0);
        genres.forEach((g) => {
          out[g] = genreSum ? (d[g] / genreSum) * 100 : 0;
        });
        return out;
      });

      // Y-axis max
      let yMax = 0;
      pctData.forEach((d) => genres.forEach((g) => { if (d[g] > yMax) yMax = d[g]; }));
      yMax = Math.ceil(yMax / 5) * 5 + 5;

      const textColor = css("--text-color");
      const secColor = css("--sec-text-color");
      const gridColor = css("--translucent-low");

      // Clear
      ctx.clearRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;
      const ySteps = 5;
      for (let i = 0; i <= ySteps; i++) {
        const y = pad.top + (ch / ySteps) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(W - pad.right, y);
        ctx.stroke();
      }

      // Y labels
      ctx.fillStyle = secColor;
      ctx.font = "10px -apple-system, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (let i = 0; i <= ySteps; i++) {
        const val = yMax - (yMax / ySteps) * i;
        const y = pad.top + (ch / ySteps) * i;
        ctx.fillText(Math.round(val) + "%", pad.left - 5, y);
      }

      // X labels — show year labels with minimum gap
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const shownYears = new Set();
      let lastLabelX = -Infinity;
      const minLabelGap = 40;
      pctData.forEach((d, i) => {
        const year = d.month.slice(0, 4);
        if (!shownYears.has(year)) {
          const x = pad.left + (i / (pctData.length - 1)) * cw;
          if (x - lastLabelX >= minLabelGap) {
            shownYears.add(year);
            ctx.fillText(year, x, H - pad.bottom + 8);
            lastLabelX = x;
          }
        }
      });

      // Draw lines
      genres.forEach((genre, gi) => {
        const isHighlighted = highlighted === null || highlighted === genre;
        ctx.strokeStyle = GENRE_COLORS[gi];
        ctx.lineWidth = highlighted === genre ? 2.5 : 1.2;
        ctx.globalAlpha = isHighlighted ? 1 : 0.1;
        ctx.beginPath();
        pctData.forEach((d, i) => {
          const x = pad.left + (i / (pctData.length - 1)) * cw;
          const y = pad.top + ch - (d[genre] / yMax) * ch;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // Build legend
      legendDiv.innerHTML = "";
      genres.forEach((genre, gi) => {
        const item = document.createElement("span");
        item.className = "legend-item";
        if (highlighted !== null) {
          item.classList.add(highlighted === genre ? "active" : "dimmed");
        }
        item.innerHTML =
          '<span class="legend-swatch" style="background:' +
          GENRE_COLORS[gi] +
          '"></span>' +
          genre;
        item.addEventListener("click", () => {
          highlighted = highlighted === genre ? null : genre;
          render();
        });
        legendDiv.appendChild(item);
      });
    }

    // Resolution toggle
    if (controlsDiv) {
      initSwitch("genre-drift-resolution", function (val) {
        resolution = val;
        render();
      });
    }

    render();
    window.addEventListener("resize", debounce(render, 150));
    return render;
  }

  // ── Day In Music ──

  async function drawDayInMusic(data) {
    const container = document.getElementById("day-in-music");
    if (!container) return;

    if (!data) data = await loadJSON("3am-analysis.json");

    // Time blocks
    const blocksDiv = container.querySelector(".time-blocks");
    if (blocksDiv) {
      const blockOrder = ["Late Night", "Early Morning", "Daytime", "Evening", "Night"];
      blocksDiv.innerHTML = "";

      blockOrder.forEach((block) => {
        const artists = (data.topByBlock[block] || []).slice(0, 5);
        const el = document.createElement("div");
        el.className = "time-block";
        el.innerHTML =
          '<div class="time-block__header">' +
          '<span class="time-block__name">' + block + "</span>" +
          '<span class="time-block__hours">' + BLOCK_HOURS[block] + "</span>" +
          "</div>" +
          '<div class="time-block__artists">' +
          artists
            .map((a) => '<span class="time-block__artist">' + a.artist + "</span>")
            .join('<span class="time-block__sep">, </span>') +
          "</div>";
        blocksDiv.appendChild(el);
      });
    }

    // Hourly distribution bars
    const barsDiv = container.querySelector(".hourly-bars");
    const labelsDiv = container.querySelector(".hourly-labels");
    if (barsDiv && data.hourlyDistribution) {
      const maxPlays = Math.max(...data.hourlyDistribution.map((h) => h.totalPlays));
      barsDiv.innerHTML = "";
      labelsDiv.innerHTML = "";

      data.hourlyDistribution.forEach((h) => {
        const bar = document.createElement("div");
        bar.className = "hourly-bar";
        bar.style.height = (h.totalPlays / maxPlays) * 100 + "%";
        bar.title = h.label + ": " + h.totalPlays.toLocaleString() + " plays";
        barsDiv.appendChild(bar);

        const label = document.createElement("span");
        label.className = "hourly-label";
        label.textContent = h.hour % 6 === 0 ? h.label : "";
        labelsDiv.appendChild(label);
      });
    }
  }

  // ── Mainstream Tier Chart ──

  async function drawTierChart() {
    const container = document.getElementById("tier-chart");
    if (!container) return null;

    const data = await loadJSON("mainstream-analysis.json");
    let resolution = "quarterly";
    const tiers = data.tiers.map((t) => t.name);

    const canvas = container.querySelector("canvas");
    const legendDiv = container.querySelector(".chart-legend");

    function render() {
      const series = cutoffMonth(data[resolution], "month").filter((d) => d.totalPlays > 0);
      if (!series.length) return;

      const rect = container.getBoundingClientRect();
      const W = rect.width;
      const H = Math.min(320, W * 0.55);
      const ctx = setupCanvas(canvas, W, H);

      const pad = { top: 15, right: 10, bottom: 30, left: 36 };
      const cw = W - pad.left - pad.right;
      const ch = H - pad.top - pad.bottom;

      const textColor = css("--text-color");
      const secColor = css("--sec-text-color");

      ctx.clearRect(0, 0, W, H);

      // Y labels (0–100%)
      ctx.fillStyle = secColor;
      ctx.font = "10px -apple-system, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (let i = 0; i <= 4; i++) {
        const val = 100 - i * 25;
        const y = pad.top + (ch / 4) * i;
        ctx.fillText(val + "%", pad.left - 5, y);
      }

      // X labels with minimum gap
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const shownYears = new Set();
      let lastLabelX = -Infinity;
      const minLabelGap = 40;
      series.forEach((d, i) => {
        const year = d.month.slice(0, 4);
        if (!shownYears.has(year)) {
          const x = pad.left + (i / (series.length - 1)) * cw;
          if (x - lastLabelX >= minLabelGap) {
            shownYears.add(year);
            ctx.fillText(year, x, H - pad.bottom + 8);
            lastLabelX = x;
          }
        }
      });

      // Stacked area — draw from bottom to top
      // Cumulative from bottom: mainstream first (bottom), then popular, mid, niche, obscure
      const drawOrder = [...tiers].reverse();

      drawOrder.forEach((tier) => {
        const color = TIER_COLORS[tier];

        // Compute cumulative baseline + top for this tier
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();

        // Forward pass: top edge
        series.forEach((d, i) => {
          const x = pad.left + (i / (series.length - 1)) * cw;
          let cumTop = 0;
          for (const t of drawOrder) {
            cumTop += d.tierPct[t] || 0;
            if (t === tier) break;
          }
          const y = pad.top + ch - (cumTop / 100) * ch;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        // Backward pass: bottom edge
        for (let i = series.length - 1; i >= 0; i--) {
          const d = series[i];
          const x = pad.left + (i / (series.length - 1)) * cw;
          let cumBottom = 0;
          for (const t of drawOrder) {
            if (t === tier) break;
            cumBottom += d.tierPct[t] || 0;
          }
          const y = pad.top + ch - (cumBottom / 100) * ch;
          ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.fill();
      });

      ctx.globalAlpha = 1;

      // Legend
      legendDiv.innerHTML = "";
      tiers.forEach((tier) => {
        const item = document.createElement("span");
        item.className = "legend-item active";
        item.innerHTML =
          '<span class="legend-swatch" style="background:' +
          TIER_COLORS[tier] +
          '"></span>' +
          tier;
        legendDiv.appendChild(item);
      });
    }

    // Resolution toggle
    initSwitch("tier-resolution", function (val) {
      resolution = val;
      render();
    });

    render();
    window.addEventListener("resize", debounce(render, 150));
    return render;
  }

  // ── Artist Lifecycle Chart ──

  async function drawArtistLifecycle() {
    var container = document.getElementById("artist-lifecycle-chart");
    if (!container) return null;

    var data = await loadJSON("artist-lifecycle.json");

    function render() {
      var listDiv = container.querySelector(".lifecycle-list");
      if (!listDiv) return;
      listDiv.innerHTML = "";

      var accentColor = css("--sec-text-color");
      var secColor = css("--sec-text-color");
      var textColor = css("--text-color");

      // Show phase artists as sparkline rows
      var artists = data.phases.map(function (a) {
        var tl = cutoffQuarter(a.timeline, "quarter");
        return { artist: a.artist, totalPlays: a.totalPlays, peakQuarter: a.peakQuarter, timeline: tl };
      });

      // Find global max for consistent scaling
      var globalMax = 0;
      artists.forEach(function (a) {
        a.timeline.forEach(function (t) {
          if (t.plays > globalMax) globalMax = t.plays;
        });
      });

      artists.forEach(function (a) {
        var row = document.createElement("div");
        row.className = "lifecycle-row";

        // Artist name + total plays
        var label = document.createElement("div");
        label.className = "lifecycle-label";
        label.innerHTML = '<span class="lifecycle-name">' + a.artist + '</span>' +
          '<span class="lifecycle-plays">' + a.totalPlays.toLocaleString() + ' plays</span>';
        row.appendChild(label);

        // Sparkline canvas
        var canvasWrap = document.createElement("div");
        canvasWrap.className = "lifecycle-spark-wrap";
        var canvas = document.createElement("canvas");
        canvasWrap.appendChild(canvas);
        row.appendChild(canvasWrap);

        listDiv.appendChild(row);

        // Draw sparkline after DOM insertion for sizing
        requestAnimationFrame(function () {
          var W = canvasWrap.getBoundingClientRect().width;
          var H = 30;
          var ctx = setupCanvas(canvas, W, H);

          var timeline = a.timeline;
          var barW = Math.max(1, (W / timeline.length) - 1);

          timeline.forEach(function (t, i) {
            var x = (i / timeline.length) * W;
            var h = globalMax > 0 ? (t.plays / globalMax) * H : 0;
            ctx.fillStyle = t.quarter === a.peakQuarter ? accentColor : secColor;
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

  // ── Discovery Rate Chart ──

  async function drawDiscoveryRate() {
    var container = document.getElementById("discovery-chart");
    if (!container) return null;

    var data = await loadJSON("discovery.json");
    var resolution = "quarterly";

    var canvas = container.querySelector("canvas");

    function render() {
      var series = resolution === "quarterly"
        ? cutoffQuarter(data.quarterly, "quarter")
        : cutoffMonth(data.monthly, "month");
      if (!series.length) return;

      var rect = container.getBoundingClientRect();
      var W = rect.width;
      var H = Math.min(320, W * 0.55);
      var ctx = setupCanvas(canvas, W, H);

      var pad = { top: 15, right: 10, bottom: 30, left: 36 };
      var cw = W - pad.left - pad.right;
      var ch = H - pad.top - pad.bottom;

      var secColor = css("--sec-text-color");
      var gridColor = css("--translucent-low");
      var accentColor = css("--sec-text-color");

      // Y-axis max (new artists)
      var yMax = 0;
      series.forEach(function (d) { if (d.newArtists > yMax) yMax = d.newArtists; });
      yMax = Math.ceil(yMax / 10) * 10 + 10;

      ctx.clearRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;
      var ySteps = 5;
      for (var i = 0; i <= ySteps; i++) {
        var y = pad.top + (ch / ySteps) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(W - pad.right, y);
        ctx.stroke();
      }

      // Y labels
      ctx.fillStyle = secColor;
      ctx.font = "10px -apple-system, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (var i = 0; i <= ySteps; i++) {
        var val = yMax - (yMax / ySteps) * i;
        var y = pad.top + (ch / ySteps) * i;
        ctx.fillText(Math.round(val), pad.left - 5, y);
      }

      // X labels — year labels
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      var shownYears = {};
      var lastLabelX = -Infinity;
      var minLabelGap = 40;
      series.forEach(function (d, i) {
        var label = d.quarter || d.month;
        var year = label.slice(0, 4);
        if (!shownYears[year]) {
          var x = pad.left + (i / (series.length - 1)) * cw;
          if (x - lastLabelX >= minLabelGap) {
            shownYears[year] = true;
            ctx.fillText(year, x, H - pad.bottom + 8);
            lastLabelX = x;
          }
        }
      });

      // Area fill
      ctx.fillStyle = accentColor;
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.moveTo(pad.left, pad.top + ch);
      series.forEach(function (d, i) {
        var x = pad.left + (i / (series.length - 1)) * cw;
        var y = pad.top + ch - (d.newArtists / yMax) * ch;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(pad.left + cw, pad.top + ch);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Line
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      series.forEach(function (d, i) {
        var x = pad.left + (i / (series.length - 1)) * cw;
        var y = pad.top + ch - (d.newArtists / yMax) * ch;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Resolution toggle
    initSwitch("discovery-resolution", function (val) {
      resolution = val;
      render();
    });

    render();
    window.addEventListener("resize", debounce(render, 150));
    return render;
  }

  // ── Scrobble count ──

  function populateScrobbleCount(data) {
    const el = document.getElementById("scrobble-count");
    if (!el || !data || !data.meta || !data.meta.totalScrobbles) return;
    const rounded = Math.floor(data.meta.totalScrobbles / 1000) * 1000;
    el.textContent = rounded.toLocaleString();
  }

  // ── Init ──

  document.addEventListener("DOMContentLoaded", function () {
    const renders = [];

    loadJSON("3am-analysis.json").then(function (amData) {
      populateScrobbleCount(amData);
      drawDayInMusic(amData);
    });
    drawGenreDrift().then((r) => r && renders.push(r));
    drawTierChart().then((r) => r && renders.push(r));
    drawArtistLifecycle().then((r) => r && renders.push(r));
    drawDiscoveryRate().then((r) => r && renders.push(r));

    // Data range toggle
    initSwitch("data-range-toggle", function (val) {
      useCutoff = val === "written";
      renders.forEach(function (fn) { fn(); });
    });

    // Re-render canvas charts when theme changes
    CanvasUtils.onThemeChange(function () {
      renders.forEach(function (fn) { fn(); });
    });
  });
})();

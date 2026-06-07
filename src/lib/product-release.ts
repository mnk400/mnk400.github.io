interface ReleaseMeta {
  tag_name?: string;
  published_at?: string;
}

interface CachedRelease {
  t: number;
  d: ReleaseMeta;
}

const TTL_MS = 1000 * 60 * 60 * 6;

function cacheKey(repo: string): string {
  return `release-meta:${repo}`;
}

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const day = 86400000;
  if (diff < day) return 'today';
  if (diff < day * 2) return 'yesterday';
  if (diff < day * 30) return `${Math.round(diff / day)} days ago`;
  if (diff < day * 365) {
    const months = Math.max(1, Math.round(diff / (day * 30)));
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  const years = Math.max(1, Math.round(diff / (day * 365)));
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

function render(el: HTMLElement, data: ReleaseMeta) {
  const version = el.querySelector<HTMLElement>('.product__release-version');
  const date = el.querySelector<HTMLElement>('.product__release-date');
  if (version && data.tag_name) version.textContent = data.tag_name;
  if (date && data.published_at) date.textContent = `updated ${relativeDate(data.published_at)}`;

  const prevMeta = el.previousElementSibling;
  if (prevMeta && prevMeta.classList.contains('product__meta-item')) {
    prevMeta.classList.add('product__meta-item--before-release');
  }
  el.hidden = false;
}

function getCached(repo: string): ReleaseMeta | null {
  try {
    const raw = localStorage.getItem(cacheKey(repo));
    if (!raw) return null;
    const obj = JSON.parse(raw) as CachedRelease;
    if (!obj || !obj.t || Date.now() - obj.t > TTL_MS) return null;
    return obj.d;
  } catch {
    return null;
  }
}

function setCached(repo: string, data: ReleaseMeta) {
  try {
    localStorage.setItem(cacheKey(repo), JSON.stringify({ t: Date.now(), d: data }));
  } catch {}
}

async function loadRelease(el: HTMLElement, repo: string) {
  const cached = getCached(repo);
  if (cached) {
    render(el, cached);
    return;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json() as ReleaseMeta;
    const slim = { tag_name: data.tag_name, published_at: data.published_at };
    setCached(repo, slim);
    render(el, slim);
  } catch {}
}

export function initProductReleaseMeta(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-release-repo]').forEach((el) => {
    if (el.dataset.releaseInitialized === 'true') return;
    el.dataset.releaseInitialized = 'true';

    const repo = el.dataset.releaseRepo;
    if (repo) void loadRelease(el, repo);
  });
}

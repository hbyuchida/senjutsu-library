// YouTube URLの解析(watch / youtu.be / shorts / embed / ID直貼りに対応)
export function parseYouTube(url) {
  if (!url) return null;
  const u = url.trim();
  let id = null;
  let start = 0;
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/watch\?.*v=([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = u.match(p);
    if (m) { id = m[1]; break; }
  }
  if (/^[\w-]{11}$/.test(u)) id = u;
  const t = u.match(/[?&#]t=(\d+h)?(\d+m)?(\d+s?)?/);
  if (t) {
    const h = t[1] ? parseInt(t[1]) : 0;
    const m = t[2] ? parseInt(t[2]) : 0;
    const s = t[3] ? parseInt(t[3]) : 0;
    start = h * 3600 + m * 60 + s;
  }
  return id ? { videoId: id, start } : null;
}

// "3:44" / "1:02:30" / "224" → 秒数
export function parseTimeInput(str) {
  if (!str || !str.trim()) return null;
  const s = str.trim();
  if (s.includes(":")) {
    const parts = s.split(":").map((n) => parseInt(n) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return parts[0] * 60 + parts[1];
  }
  const n = parseInt(s);
  return isNaN(n) ? null : n;
}

export function fmt(sec) {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ===== localStorage 永続化 =====
const KEY = "senjutsu-library-v1";

export function loadState(fallback) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const data = JSON.parse(raw);
    return {
      videos: Array.isArray(data.videos) ? data.videos : fallback.videos,
      phases: Array.isArray(data.phases) ? data.phases : fallback.phases,
      systems: Array.isArray(data.systems) ? data.systems : fallback.systems,
    };
  } catch {
    return fallback;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 容量超過など。保存失敗してもアプリは動作継続
  }
}

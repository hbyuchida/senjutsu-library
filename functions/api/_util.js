// 共有ユーティリティ: DB行↔APIオブジェクト変換、入力バリデーション、JSONレスポンス。

export function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

function safeParseArray(s) {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function rowToVideo(r) {
  return {
    id: r.id,
    videoId: r.video_id,
    title: r.title,
    memo: r.memo || "",
    phase: r.phase || "",
    systems: safeParseArray(r.systems),
    tags: safeParseArray(r.tags),
    start: r.start || 0,
    end: r.end_sec == null ? null : r.end_sec,
    sample: !!r.sample,
    plays: r.plays || 0,
  };
}

// 動画の分類(局面・システム・タグ)を分類マスタ(taxonomy)へ追記する。
// 既存はUNIQUE制約で無視されるため、一覧が常に完全な状態に保たれる。
export async function upsertTaxonomy(env, { phase, systems, tags }) {
  const q = (kind, name) =>
    env.DB.prepare("INSERT OR IGNORE INTO taxonomy (kind,name) VALUES (?,?)").bind(kind, name);
  const stmts = [];
  if (phase) stmts.push(q("phase", phase));
  for (const s of systems || []) if (s) stmts.push(q("system", s));
  for (const t of tags || []) if (t) stmts.push(q("tag", t));
  if (stmts.length) await env.DB.batch(stmts);
}

// 追加/編集の入力を検証して正規化。問題があれば {error} を返す。
export function validateVideoInput(b) {
  const videoId = (b.videoId || "").toString().trim();
  const title = (b.title || "").toString().trim();
  if (!/^[\w-]{11}$/.test(videoId)) return { error: "YouTube動画IDが不正です" };
  if (!title) return { error: "タイトルは必須です" };
  const clampInt = (v, def) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 0 ? n : def;
  };
  const systems = Array.isArray(b.systems) ? b.systems.map(String).map((s) => s.slice(0, 40)).slice(0, 20) : [];
  const tags = Array.isArray(b.tags) ? b.tags.map(String).map((s) => s.slice(0, 40)).slice(0, 30) : [];
  return {
    value: {
      videoId,
      title: title.slice(0, 200),
      memo: (b.memo || "").toString().slice(0, 1000),
      phase: (b.phase || "").toString().slice(0, 60),
      systems: JSON.stringify(systems),
      tags: JSON.stringify(tags),
      start: clampInt(b.start, 0),
      end: b.end == null || b.end === "" ? null : clampInt(b.end, null),
    },
  };
}

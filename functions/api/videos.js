// GET  /api/videos  … 一覧(公開・全訪問者が同じ共有データ)
// POST /api/videos  … 追加(公開・誰でも投稿できる)
import { json, rowToVideo, validateVideoInput, upsertTaxonomy } from "./_util.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare("SELECT * FROM videos ORDER BY created_at DESC, id DESC")
    .all();
  return json({ videos: results.map(rowToVideo) });
}

export async function onRequestPost({ env, request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "リクエスト形式が不正です" }, 400);
  }
  const { error, value } = validateVideoInput(body);
  if (error) return json({ error }, 400);

  const now = Date.now();
  const res = await env.DB
    .prepare(
      "INSERT INTO videos (video_id,title,memo,phase,systems,tags,start,end_sec,sample,created_at) VALUES (?,?,?,?,?,?,?,?,0,?)"
    )
    .bind(value.videoId, value.title, value.memo, value.phase, value.systems, value.tags, value.start, value.end, now)
    .run();

  // 新しい局面・システム・タグを分類マスタにも登録(一覧を完全に保つ)
  await upsertTaxonomy(env, {
    phase: value.phase,
    systems: JSON.parse(value.systems),
    tags: JSON.parse(value.tags),
  });

  const row = await env.DB.prepare("SELECT * FROM videos WHERE id=?").bind(res.meta.last_row_id).first();
  return json({ video: rowToVideo(row) }, 201);
}

// PUT    /api/videos/:id … 編集(管理者のみ)
// DELETE /api/videos/:id … 削除(管理者のみ)
import { json, rowToVideo, validateVideoInput } from "../_util.js";
import { isAdmin } from "../_auth.js";

export async function onRequestPut(context) {
  const { env, request, params } = context;
  if (!(await isAdmin(context))) return json({ error: "管理者ログインが必要です" }, 401);

  const id = parseInt(params.id, 10);
  if (!Number.isInteger(id)) return json({ error: "IDが不正です" }, 400);

  const existing = await env.DB.prepare("SELECT id FROM videos WHERE id=?").bind(id).first();
  if (!existing) return json({ error: "対象が見つかりません" }, 404);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "リクエスト形式が不正です" }, 400);
  }
  const { error, value } = validateVideoInput(body);
  if (error) return json({ error }, 400);

  await env.DB
    .prepare(
      "UPDATE videos SET video_id=?, title=?, memo=?, phase=?, systems=?, tags=?, start=?, end_sec=? WHERE id=?"
    )
    .bind(value.videoId, value.title, value.memo, value.phase, value.systems, value.tags, value.start, value.end, id)
    .run();

  const row = await env.DB.prepare("SELECT * FROM videos WHERE id=?").bind(id).first();
  return json({ video: rowToVideo(row) });
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  if (!(await isAdmin(context))) return json({ error: "管理者ログインが必要です" }, 401);

  const id = parseInt(params.id, 10);
  if (!Number.isInteger(id)) return json({ error: "IDが不正です" }, 400);

  await env.DB.prepare("DELETE FROM videos WHERE id=?").bind(id).run();
  return json({ ok: true });
}

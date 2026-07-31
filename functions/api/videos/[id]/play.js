// POST /api/videos/:id/play … 再生数を1増やす(公開・認証不要)。人気ランキング用。
import { json } from "../../_util.js";

export async function onRequestPost({ env, params }) {
  const id = parseInt(params.id, 10);
  if (!Number.isInteger(id)) return json({ error: "IDが不正です" }, 400);
  await env.DB.prepare("UPDATE videos SET plays = COALESCE(plays,0) + 1 WHERE id=?").bind(id).run();
  return json({ ok: true });
}

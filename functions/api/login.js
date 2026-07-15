// POST /api/login … パスコード照合。成功でHttpOnly署名クッキーを発行。
import { json } from "./_util.js";
import { createToken, sessionCookie, timingSafeEqual, SESSION_TTL_SEC } from "./_auth.js";

export async function onRequestPost({ env, request }) {
  if (!env.ADMIN_PASSCODE || !env.SESSION_SECRET) {
    return json({ error: "サーバー側の管理者設定が未完了です" }, 500);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const pass = (body.passcode || "").toString();
  if (!timingSafeEqual(pass, env.ADMIN_PASSCODE)) {
    return json({ error: "パスコードが違います" }, 401);
  }
  const token = await createToken(env.SESSION_SECRET);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token, SESSION_TTL_SEC) });
}

// POST /api/logout … クッキーを失効させる。
import { json } from "./_util.js";
import { COOKIE_NAME } from "./_auth.js";

export async function onRequestPost() {
  return json({ ok: true }, 200, {
    "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
  });
}

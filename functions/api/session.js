// GET /api/session … 現在のブラウザが管理者ログイン済みか返す。
import { json } from "./_util.js";
import { isAdmin } from "./_auth.js";

export async function onRequestGet(context) {
  return json({ admin: await isAdmin(context) });
}

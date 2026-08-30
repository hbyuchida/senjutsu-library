// GET    /api/articles/:id … 単体取得(本文つき・公開)
// PUT    /api/articles/:id … 編集(管理者のみ)
// DELETE /api/articles/:id … 削除(管理者のみ)
import { json } from "../_util.js";
import { isAdmin } from "../_auth.js";
import { rowToArticle } from "../articles.js";

export async function onRequestGet(context) {
  const { env, params } = context;
  const id = parseInt(params.id, 10);
  if (!Number.isInteger(id)) return json({ error: "IDが不正です" }, 400);
  const row = await env.DB.prepare("SELECT * FROM articles WHERE id=?").bind(id).first();
  if (!row) return json({ error: "記事が見つかりません" }, 404);
  // 下書きは管理者だけが見られる(公開前の記事が外から読めないようにする)
  if (row.status === "draft" && !(await isAdmin(context).catch(() => false))) {
    return json({ error: "記事が見つかりません" }, 404);
  }
  return json({ article: rowToArticle(row, true) });
}

export async function onRequestPut(context) {
  const { env, request, params } = context;
  if (!(await isAdmin(context))) return json({ error: "管理者ログインが必要です" }, 401);
  const id = parseInt(params.id, 10);
  if (!Number.isInteger(id)) return json({ error: "IDが不正です" }, 400);
  const existing = await env.DB.prepare("SELECT id, type, body, status FROM articles WHERE id=?").bind(id).first();
  if (!existing) return json({ error: "記事が見つかりません" }, 404);

  let b;
  try { b = await request.json(); } catch { return json({ error: "リクエスト形式が不正です" }, 400); }
  const type = b.type === "post" || b.type === "link" ? b.type : existing.type;
  const title = (b.title || "").toString().trim().slice(0, 200);
  if (!title) return json({ error: "タイトルは必須です" }, 400);
  // status が送られてこない場合は今の状態を維持する
  const status =
    b.status === "draft" || b.status === "published" ? b.status : existing.status === "draft" ? "draft" : "published";
  const url = (b.url || "").toString().trim().slice(0, 2000);
  // 公開する記事はタイトルと要約の文字数を必須にする(下書きは書きかけを許す)
  if (status === "published") {
    if (title.length < 10) return json({ error: "タイトルは10文字以上で入力してください" }, 400);
    const ex = (b.excerpt || "").toString().trim();
    if (ex.length < 10) return json({ error: "要約・説明は10文字以上で入力してください" }, 400);
  }

  // 下書きは書きかけで保存できるようにし、公開するときだけURLを必須にする
  if (type === "link" && status !== "draft" && !/^https?:\/\//i.test(url)) {
    return json({ error: "http(s)から始まるURLを入力してください" }, 400);
  }

  await env.DB
    .prepare("UPDATE articles SET type=?,title=?,url=?,image=?,excerpt=?,body=?,tags=?,status=? WHERE id=?")
    .bind(
      type, title, url,
      (b.image || "").toString().slice(0, 2000),
      (b.excerpt || "").toString().slice(0, 600),
      // body が送られてこなかった場合は既存の本文を残す。
      // (本文を持たない一覧データから保存され、記事が消える事故を防ぐ)
      // 空文字が明示的に送られたときは、意図した削除として反映する。
      type === "post"
        ? (b.body === undefined || b.body === null ? existing.body || "" : String(b.body)).slice(0, 40000)
        : "",
      JSON.stringify(Array.isArray(b.tags) ? b.tags.map(String).slice(0, 20) : []),
      status,
      id
    )
    .run();
  const row = await env.DB.prepare("SELECT * FROM articles WHERE id=?").bind(id).first();
  return json({ article: rowToArticle(row, true) });
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  if (!(await isAdmin(context))) return json({ error: "管理者ログインが必要です" }, 401);
  const id = parseInt(params.id, 10);
  if (!Number.isInteger(id)) return json({ error: "IDが不正です" }, 400);
  await env.DB.prepare("DELETE FROM articles WHERE id=?").bind(id).run();
  return json({ ok: true });
}

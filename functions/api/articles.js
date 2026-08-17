// GET  /api/articles … 一覧(公開)
// POST /api/articles … 作成(管理者のみ)。type=link または post
import { json } from "./_util.js";
import { isAdmin } from "./_auth.js";

function rowToArticle(r, full = false) {
  const base = {
    id: r.id,
    type: r.type || "link",
    title: r.title,
    url: r.url || "",
    image: r.image || "",
    excerpt: r.excerpt || "",
    tags: safeArr(r.tags),
    createdAt: r.created_at,
    status: r.status === "draft" ? "draft" : "published",
  };
  if (full) base.body = r.body || "";
  return base;
}
function safeArr(s) {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}
export { rowToArticle };

// 下書きは管理者にだけ見せる。一般の訪問者・検索エンジンには公開記事だけを返す。
export async function onRequestGet(context) {
  const { env } = context;
  const admin = await isAdmin(context).catch(() => false);
  const sql = admin
    ? "SELECT id,type,title,url,image,excerpt,tags,created_at,status FROM articles ORDER BY created_at DESC, id DESC"
    : "SELECT id,type,title,url,image,excerpt,tags,created_at,status FROM articles WHERE status='published' ORDER BY created_at DESC, id DESC";
  const { results } = await env.DB.prepare(sql).all();
  return json({ articles: results.map((r) => rowToArticle(r)) });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!(await isAdmin(context))) return json({ error: "管理者ログインが必要です" }, 401);
  let b;
  try { b = await request.json(); } catch { return json({ error: "リクエスト形式が不正です" }, 400); }

  const type = b.type === "post" ? "post" : "link";
  const title = (b.title || "").toString().trim().slice(0, 200);
  if (!title) return json({ error: "タイトルは必須です" }, 400);

  const status = b.status === "draft" ? "draft" : "published";
  const url = (b.url || "").toString().trim().slice(0, 2000);
  // 下書きは書きかけで保存できるようにし、公開するときだけURLを必須にする
  if (type === "link" && status !== "draft" && !/^https?:\/\//i.test(url)) {
    return json({ error: "http(s)から始まるURLを入力してください" }, 400);
  }
  const now = Date.now();
  const res = await env.DB
    .prepare("INSERT INTO articles (type,title,url,image,excerpt,body,tags,created_at,status) VALUES (?,?,?,?,?,?,?,?,?)")
    .bind(
      type, title, url,
      (b.image || "").toString().slice(0, 2000),
      (b.excerpt || "").toString().slice(0, 600),
      type === "post" ? (b.body || "").toString().slice(0, 40000) : "",
      JSON.stringify(Array.isArray(b.tags) ? b.tags.map(String).slice(0, 20) : []),
      now,
      status
    )
    .run();
  const row = await env.DB.prepare("SELECT * FROM articles WHERE id=?").bind(res.meta.last_row_id).first();
  return json({ article: rowToArticle(row, true) }, 201);
}

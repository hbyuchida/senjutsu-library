// GET /api/og?url=... … 外部URLのOGP(タイトル・画像・説明)を取得(管理者のみ)。
// リンク記事のカードを自動で埋めるために使う。
import { json } from "./_util.js";
import { isAdmin } from "./_auth.js";

function meta(html, prop) {
  // og:xxx / name=xxx の content を属性順に依存せず拾う
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeEntities(m[1]);
  }
  return "";
}
function decodeEntities(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}

export async function onRequestGet(context) {
  const { request } = context;
  if (!(await isAdmin(context))) return json({ error: "管理者ログインが必要です" }, 401);
  const url = new URL(request.url).searchParams.get("url") || "";
  if (!/^https?:\/\//i.test(url)) return json({ error: "URLが不正です" }, 400);

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SenjutsuBot/1.0)" },
      redirect: "follow",
    });
    clearTimeout(timer);
    const html = (await res.text()).slice(0, 300000);
    let title = meta(html, "og:title") || meta(html, "twitter:title");
    if (!title) {
      const t = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      title = t ? decodeEntities(t[1].trim()) : "";
    }
    let image = meta(html, "og:image") || meta(html, "twitter:image");
    if (image && image.startsWith("//")) image = "https:" + image;
    if (image && image.startsWith("/")) {
      try { image = new URL(image, url).href; } catch { /* noop */ }
    }
    const description = meta(html, "og:description") || meta(html, "description") || meta(html, "twitter:description");
    return json({ title, image, description });
  } catch {
    return json({ title: "", image: "", description: "", error: "取得できませんでした(手動で入力してください)" });
  }
}

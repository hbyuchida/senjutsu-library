// /sitemap.xml を自動生成する。
// 記事は管理画面から増えるため、静的ファイルだと追加のたびに更新が必要になる。
// ここで都度DBを見て組み立てれば、新しい記事が自動でサイトマップに載る。
//
// 外部リンク記事(type=link)は中身が外部サイトにあり、このサイト側には
// 独自の本文が無いので載せない(内容の薄いページを登録させない)。

const DEFAULT_ORIGIN = "https://senjutsu-library.pages.dev";

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const iso = (ms) => {
  const n = Number(ms);
  if (!n || Number.isNaN(n)) return null;
  const d = new Date(n);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

export async function onRequestGet({ env }) {
  const origin = env.SITE_ORIGIN || DEFAULT_ORIGIN;

  const urls = [
    { loc: "/", changefreq: "weekly", priority: "1.0" },
    { loc: "/shorts", changefreq: "weekly", priority: "0.8" },
    { loc: "/articles", changefreq: "weekly", priority: "0.8" },
    { loc: "/about", changefreq: "monthly", priority: "0.3" },
    { loc: "/privacy", changefreq: "yearly", priority: "0.1" },
  ];

  try {
    // 下書き(status='draft')は未公開なので載せない
    const { results } = await env.DB.prepare(
      "SELECT id, created_at FROM articles WHERE type = 'post' AND status = 'published' ORDER BY created_at DESC LIMIT 1000"
    ).all();
    for (const a of results || []) {
      urls.push({
        loc: `/article/${a.id}`,
        lastmod: iso(a.created_at),
        changefreq: "monthly",
        priority: "0.7",
      });
    }
  } catch {
    // DBが読めなくても固定ページ分のサイトマップは返す
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n` +
          `    <loc>${esc(origin + u.loc)}</loc>\n` +
          (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : "") +
          `    <changefreq>${u.changefreq}</changefreq>\n` +
          `    <priority>${u.priority}</priority>\n` +
          `  </url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

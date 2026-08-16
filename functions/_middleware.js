// 検索エンジン向けのHTML加工。
//
// このサイトはReactのSPAで、素のHTMLは <div id="root"></div> だけ。
// クローラーが最初に受け取るページに文字が無いと登録されにくいので、
// HTMLを返すときだけ HTMLRewriter で
//   ・ページごとの title / description / canonical / OGP(項目4)
//   ・本文(動画一覧などの実テキスト)(項目2)
// を差し込む。埋め込む本文はReactが表示する内容と同じものなので、
// 検索エンジンと利用者に別物を見せる「クローキング」にはあたらない。

// 独自ドメインに移行したら Pages の環境変数 SITE_ORIGIN を設定するだけで切り替わる。
// (public/robots.txt と public/sitemap.xml のURLも合わせて更新する)
const DEFAULT_ORIGIN = "https://senjutsu-library.pages.dev";

const SITE_NAME = "戦術ライブラリ";
const OG_IMAGE = "/icon-512.png";

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// 記事本文(Markdown想定)から説明文用の抜粋を作る
function excerptFrom(text, max = 120) {
  const plain = String(text || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // 画像
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // リンクは文字だけ残す
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

// ページごとのタイトルと説明文
function metaFor(path) {
  if (path === "/articles") {
    return {
      title: `記事 | ハンドボールの戦術・指導の読みもの - ${SITE_NAME}`,
      description:
        "ハンドボールの戦術や指導について書いた記事の一覧です。セットオフェンス、ディフェンスシステム、練習への落とし込みなどをまとめています。",
    };
  }
  if (path === "/shorts") {
    return {
      title: `ショート再生 | ハンドボール戦術クリップを連続再生 - ${SITE_NAME}`,
      description:
        "ハンドボールの戦術クリップ(8分以内)を、ショート動画のように次々と自動再生。セットオフェンス・ディフェンス・速攻の要点を短時間で見返せます。",
    };
  }
  if (path === "/about") {
    return {
      title: `運営者情報・お問い合わせ | ${SITE_NAME}`,
      description:
        "ハンドボール戦術動画の整理サービス「戦術ライブラリ」の運営者情報とお問い合わせ先です。",
    };
  }
  if (path === "/privacy") {
    return {
      title: `プライバシーポリシー | ${SITE_NAME}`,
      description: `${SITE_NAME}における個人情報・Cookie・アクセス解析の取り扱いについて。`,
    };
  }
  return {
    title: `${SITE_NAME} | ハンドボール戦術動画をタグで整理`,
    description:
      "YouTubeのハンドボール戦術動画を局面・システム・タグで整理して見返せる無料の戦術ライブラリ。セットオフェンス、6:0や5:1などのディフェンス、速攻の戦術動画をまとめています。",
  };
}

// 記事一覧に差し込む本文
async function articlesBodyHtml(env, meta) {
  let list = [];
  try {
    const { results } = await env.DB.prepare(
      "SELECT id,type,title,excerpt,tags FROM articles ORDER BY created_at DESC, id DESC LIMIT 200"
    ).all();
    list = results || [];
  } catch {
    /* 見出しだけでも出す */
  }
  const items = list
    .map(
      (a) =>
        `<li><h3>${esc(a.title)}</h3>${a.excerpt ? `<p>${esc(a.excerpt)}</p>` : ""}</li>`
    )
    .join("");
  return `<div id="seo-content"><h1>記事一覧</h1><p>${esc(meta.description)}</p>${
    items ? `<ul>${items}</ul>` : ""
  }</div>`;
}

// トップ/ショートに差し込む本文。動画のタイトル・メモ・分類がそのまま
// ページのテキストになるので、検索に拾われる手がかりが生まれる。
async function bodyHtml(env, path, meta) {
  let videos = [];
  try {
    const { results } = await env.DB.prepare(
      "SELECT title, memo, phase, systems, tags, start, end_sec FROM videos ORDER BY created_at DESC, id DESC LIMIT 100"
    ).all();
    videos = results || [];
  } catch {
    // DBが読めなくても、見出しだけは出しておく
  }

  // ショートは「指定範囲が8分以内」の動画だけを扱うので、本文もそれに合わせる
  if (path === "/shorts") {
    videos = videos.filter((v) => {
      const end = v.end_sec == null || v.end_sec === "null" ? null : Number(v.end_sec);
      if (end == null || Number.isNaN(end)) return false;
      const len = end - (Number(v.start) || 0);
      return len > 0 && len <= 8 * 60;
    });
  }

  const parse = (s) => {
    try {
      const v = JSON.parse(s);
      return Array.isArray(v) ? v.map(String) : [];
    } catch {
      return [];
    }
  };

  const items = videos
    .map((v) => {
      const cls = [v.phase, ...parse(v.systems), ...parse(v.tags)].filter(Boolean);
      return `<li><h3>${esc(v.title)}</h3>${v.memo ? `<p>${esc(v.memo)}</p>` : ""}${
        cls.length ? `<p>${cls.map((c) => esc(c)).join(" / ")}</p>` : ""
      }</li>`;
    })
    .join("");

  const heading =
    path === "/shorts"
      ? "ハンドボール戦術クリップ(ショート再生)"
      : "ハンドボール戦術動画ライブラリ";

  return `<div id="seo-content"><h1>${esc(heading)}</h1><p>${esc(
    meta.description
  )}</p>${items ? `<ul>${items}</ul>` : ""}</div>`;
}

export async function onRequest(context) {
  const res = await context.next();

  // HTML以外(API・画像・sitemap など)はそのまま返す
  const type = res.headers.get("content-type") || "";
  if (!type.includes("text/html")) return res;

  const url = new URL(context.request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const origin = context.env.SITE_ORIGIN || DEFAULT_ORIGIN;

  // 記事詳細(/article/123)は記事ごとに内容が違うので、DBを見てメタ情報を組み立てる
  const articleId = path.match(/^\/article\/(\d+)$/)?.[1];
  let article = null;
  if (articleId) {
    try {
      article = await context.env.DB.prepare(
        "SELECT id,type,title,excerpt,body,image FROM articles WHERE id=?"
      )
        .bind(articleId)
        .first();
    } catch {
      /* 取れなければ既定のメタ情報のまま */
    }
  }

  const meta = article
    ? {
        title: `${article.title} | ${SITE_NAME}`,
        description:
          article.excerpt || excerptFrom(article.body) || metaFor("/articles").description,
      }
    : metaFor(path);
  const canonical = origin + (path === "/" ? "/" : path);

  // 記事は og:type を article にし、アイキャッチがあればそれを使う
  const ogType = article && article.type === "post" ? "article" : "website";
  const ogImage = article && article.image ? article.image : origin + OG_IMAGE;

  // 外部リンクを紹介するだけの記事は、このサイト側に独自の本文が無い。
  // 検索結果に内容の薄いページを出さないよう登録対象から外す。
  const noindex =
    article && article.type === "link"
      ? `\n    <meta name="robots" content="noindex,follow" />`
      : "";

  const head = `
    <link rel="canonical" href="${esc(canonical)}" />${noindex}
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="${esc(SITE_NAME)}" />
    <meta property="og:title" content="${esc(meta.title)}" />
    <meta property="og:description" content="${esc(meta.description)}" />
    <meta property="og:url" content="${esc(canonical)}" />
    <meta property="og:image" content="${esc(ogImage)}" />
    <meta property="og:locale" content="ja_JP" />
    <meta name="twitter:card" content="${article && article.image ? "summary_large_image" : "summary"}" />
    <meta name="twitter:title" content="${esc(meta.title)}" />
    <meta name="twitter:description" content="${esc(meta.description)}" />
    <meta name="twitter:image" content="${esc(ogImage)}" />`;

  // 中身のあるページだけ本文を差し込む(規約ページなどは元のままで十分)
  let body = "";
  if (path === "/" || path === "/shorts") {
    body = await bodyHtml(context.env, path, meta);
  } else if (path === "/articles") {
    body = await articlesBodyHtml(context.env, meta);
  } else if (article && article.type === "post") {
    body = `<div id="seo-content"><h1>${esc(article.title)}</h1><p>${esc(
      excerptFrom(article.body, 2000)
    )}</p></div>`;
  }

  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(meta.title);
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        el.setAttribute("content", meta.description);
      },
    })
    .on("head", {
      element(el) {
        el.append(head, { html: true });
      },
    })
    .on("#root", {
      element(el) {
        // Reactが起動すると中身を置き換えるため、利用者の見た目は変わらない。
        if (body) el.setInnerContent(body, { html: true });
      },
    })
    .transform(res);
}

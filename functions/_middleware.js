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

// Google Search Console の所有権確認。
// HTMLファイル方式(/google….html)とHTMLタグ方式の両方を用意しておく。
// 確認が完了したあとも消さないこと(消すと所有権の確認が解除される)。
const VERIFY_PATH = "/google4834d1d49fbb0669.html";
const GOOGLE_SITE_VERIFICATION = "nxnaRThR18DeBjiMHG53PrE8__irRV9TDD6I9mOmnCs";

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
      "SELECT id,type,title,excerpt,tags FROM articles WHERE status='published' ORDER BY created_at DESC, id DESC LIMIT 200"
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

// 構造化データ(JSON-LD)。検索結果にサムネイル付きで出る可能性を高める。
// 動画は VideoObject、記事は Article、階層は BreadcrumbList で伝える。
// </script> がそのまま入るとスクリプトが途中で閉じてしまうため必ず打ち消す。
const jsonScript = (obj) =>
  `\n    <script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;

const ytThumb = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
const ytWatch = (id, start) =>
  `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ""}`;
// ISO 8601 の再生時間(例: 95秒 → PT1M35S)
const isoDuration = (sec) => {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  return `PT${Math.floor(s / 60)}M${s % 60}S`;
};

async function jsonLd(env, { path, origin, canonical, meta, article }) {
  const crumbs = (items) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: origin + it.path,
    })),
  });

  // 記事ページ: Article + パンくず(下書きと外部リンク記事は出さない)
  if (article) {
    if (article.status === "draft" || article.type !== "post") return "";
    let out = jsonScript({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: String(article.title || "").slice(0, 110),
      description: meta.description,
      image: article.image ? [article.image] : [origin + OG_IMAGE],
      datePublished: article.created_at ? new Date(Number(article.created_at)).toISOString() : undefined,
      author: { "@type": "Person", name: SITE_NAME },
      publisher: { "@type": "Organization", name: SITE_NAME },
      mainEntityOfPage: canonical,
      keywords: (() => {
        try {
          const t = JSON.parse(article.tags || "[]");
          return Array.isArray(t) ? t.join(", ") : undefined;
        } catch {
          return undefined;
        }
      })(),
    });
    out += jsonScript(
      crumbs([
        { name: "ホーム", path: "/" },
        { name: "記事", path: "/articles" },
        { name: article.title, path: `/article/${article.id}` },
      ])
    );
    return out;
  }

  // トップ / ショート: 掲載している動画を VideoObject の一覧として伝える
  if (path === "/" || path === "/shorts") {
    let videos = [];
    try {
      const { results } = await env.DB.prepare(
        "SELECT video_id,title,memo,start,end_sec,created_at FROM videos ORDER BY created_at DESC, id DESC LIMIT 30"
      ).all();
      videos = results || [];
    } catch {
      /* 動画が取れなければ構造化データは省く */
    }
    if (path === "/shorts") {
      videos = videos.filter((v) => {
        const end = v.end_sec == null || v.end_sec === "null" ? null : Number(v.end_sec);
        if (end == null || Number.isNaN(end)) return false;
        const len = end - (Number(v.start) || 0);
        return len > 0 && len <= 8 * 60;
      });
    }
    let out = "";
    if (videos.length) {
      out += jsonScript({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: meta.title,
        itemListElement: videos.slice(0, 20).map((v, i) => {
          const end = v.end_sec == null || v.end_sec === "null" ? null : Number(v.end_sec);
          const len = end != null ? end - (Number(v.start) || 0) : null;
          return {
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "VideoObject",
              name: String(v.title || "").slice(0, 110),
              description: (v.memo || v.title || "").slice(0, 300),
              thumbnailUrl: [ytThumb(v.video_id)],
              uploadDate: v.created_at ? new Date(Number(v.created_at)).toISOString() : undefined,
              duration: len && len > 0 ? isoDuration(len) : undefined,
              embedUrl: `https://www.youtube.com/embed/${v.video_id}`,
              contentUrl: ytWatch(v.video_id, Number(v.start) || 0),
            },
          };
        }),
      });
    }
    if (path === "/") {
      out += jsonScript({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: `${origin}/`,
        description: meta.description,
        inLanguage: "ja",
      });
    } else {
      out += jsonScript(crumbs([{ name: "ホーム", path: "/" }, { name: "ショート", path: "/shorts" }]));
    }
    return out;
  }

  if (path === "/articles") {
    return jsonScript(crumbs([{ name: "ホーム", path: "/" }, { name: "記事", path: "/articles" }]));
  }
  return "";
}

export async function onRequest(context) {
  const res = await context.next();

  // HTML以外(API・画像・sitemap など)はそのまま返す
  const type = res.headers.get("content-type") || "";
  if (!type.includes("text/html")) return res;

  const url = new URL(context.request.url);

  // 拡張子付きのパスの扱い。
  // 画像やrobots.txtなど実在する静的ファイルは、上のContent-Type判定で既に返っている。
  // ここに来る「拡張子付き + HTML」は、存在しないファイルにSPAのindex.htmlが
  // 返されている状態(ソフト404)。全URLが200を返すサイトだと、Googleは
  // 所有権確認で「でたらめなファイル名」を試したときも200が返るため、
  // 確認ファイルの内容を信用せず失敗させる。実在しないものは404を返す。
  if (/\.[a-z0-9]+$/i.test(url.pathname)) {
    // 所有権確認ファイルとトップのindex.htmlはそのまま通す
    if (url.pathname === VERIFY_PATH || url.pathname === "/index.html") return res;
    return new Response("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const path = url.pathname.replace(/\/+$/, "") || "/";
  const origin = context.env.SITE_ORIGIN || DEFAULT_ORIGIN;

  // 記事詳細(/article/123)は記事ごとに内容が違うので、DBを見てメタ情報を組み立てる
  const articleId = path.match(/^\/article\/(\d+)$/)?.[1];
  let article = null;
  if (articleId) {
    try {
      article = await context.env.DB.prepare(
        "SELECT id,type,title,excerpt,body,image,tags,created_at,status FROM articles WHERE id=?"
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

  // 検索結果に出したくないページ:
  //  ・外部リンクを紹介するだけの記事(このサイト側に独自の本文が無い)
  //  ・下書き(未公開)
  const noindex =
    article && (article.type === "link" || article.status === "draft")
      ? `\n    <meta name="robots" content="noindex,follow" />`
      : "";

  const head = `
    <meta name="google-site-verification" content="${esc(GOOGLE_SITE_VERIFICATION)}" />
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
    <meta name="twitter:image" content="${esc(ogImage)}" />${await jsonLd(context.env, {
      path,
      origin,
      canonical,
      meta,
      article,
    })}`;

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

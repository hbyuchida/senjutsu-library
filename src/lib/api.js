// 共有DB(Cloudflare D1 + Pages Functions)とやり取りするAPIクライアント。
// クッキー(管理者セッション)を送るため credentials: "same-origin" を付ける。

async function req(path, options = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* 本文なし */
  }
  if (!res.ok) {
    const msg = (data && data.error) || `通信エラー (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  listVideos: () => req("/api/videos").then((d) => d.videos),
  getVideo: (id) => req(`/api/videos/${id}`).then((d) => d.video),
  addVideo: (v) => req("/api/videos", { method: "POST", body: JSON.stringify(v) }).then((d) => d.video),
  updateVideo: (id, v) =>
    req(`/api/videos/${id}`, { method: "PUT", body: JSON.stringify(v) }).then((d) => d.video),
  deleteVideo: (id) => req(`/api/videos/${id}`, { method: "DELETE" }),
  playVideo: (id) => req(`/api/videos/${id}/play`, { method: "POST" }),
  session: () => req("/api/session").then((d) => d.admin),
  login: (passcode) => req("/api/login", { method: "POST", body: JSON.stringify({ passcode }) }),
  logout: () => req("/api/logout", { method: "POST" }),

  // 分類マスタ(局面・システム・タグ)
  taxonomy: () => req("/api/taxonomy"),
  addTaxonomy: (kind, name) =>
    req("/api/taxonomy", { method: "POST", body: JSON.stringify({ kind, name }) }),
  renameTaxonomy: (kind, oldName, newName) =>
    req("/api/taxonomy", { method: "PUT", body: JSON.stringify({ kind, oldName, newName }) }),
  deleteTaxonomy: (kind, name) =>
    req("/api/taxonomy", { method: "DELETE", body: JSON.stringify({ kind, name }) }),

  // 記事(リンク / 直接執筆)
  listArticles: () => req("/api/articles").then((d) => d.articles),
  getArticle: (id) => req(`/api/articles/${id}`).then((d) => d.article),
  addArticle: (a) => req("/api/articles", { method: "POST", body: JSON.stringify(a) }).then((d) => d.article),
  updateArticle: (id, a) => req(`/api/articles/${id}`, { method: "PUT", body: JSON.stringify(a) }).then((d) => d.article),
  deleteArticle: (id) => req(`/api/articles/${id}`, { method: "DELETE" }),
  fetchOg: (url) => req(`/api/og?url=${encodeURIComponent(url)}`),
};

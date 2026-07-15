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
  addVideo: (v) => req("/api/videos", { method: "POST", body: JSON.stringify(v) }).then((d) => d.video),
  updateVideo: (id, v) =>
    req(`/api/videos/${id}`, { method: "PUT", body: JSON.stringify(v) }).then((d) => d.video),
  deleteVideo: (id) => req(`/api/videos/${id}`, { method: "DELETE" }),
  session: () => req("/api/session").then((d) => d.admin),
  login: (passcode) => req("/api/login", { method: "POST", body: JSON.stringify({ passcode }) }),
  logout: () => req("/api/logout", { method: "POST" }),
};

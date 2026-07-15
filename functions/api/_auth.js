// 管理者セッション: HMAC-SHA256署名付きトークンをHttpOnlyクッキーに保存。
// 秘密(SESSION_SECRET)はサーバー環境変数のみ。ブラウザには一切出ないので改ざん不可。

const COOKIE = "sb_admin";
const TTL_MS = 1000 * 60 * 60 * 12; // 12時間
export const COOKIE_NAME = COOKIE;
export const SESSION_TTL_SEC = Math.floor(TTL_MS / 1000);

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes) {
  const arr = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(str) {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return b64urlEncode(sig);
}
export function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createToken(secret) {
  const payload = b64urlEncode(enc.encode(JSON.stringify({ exp: Date.now() + TTL_MS })));
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}
export async function verifyToken(token, secret) {
  if (!token || !secret || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expected = await hmac(secret, payload);
  if (!timingSafeEqual(sig, expected)) return false;
  try {
    const obj = JSON.parse(dec.decode(b64urlToBytes(payload)));
    return typeof obj.exp === "number" && obj.exp > Date.now();
  } catch {
    return false;
  }
}

export function getCookie(request, name) {
  const h = request.headers.get("Cookie") || "";
  for (const part of h.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

export async function isAdmin(context) {
  const secret = context.env.SESSION_SECRET;
  const token = getCookie(context.request, COOKIE);
  return await verifyToken(token, secret);
}

export function sessionCookie(token, maxAgeSec) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`;
}

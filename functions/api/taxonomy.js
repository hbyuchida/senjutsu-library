// 分類マスタ(局面・システム・タグ)の一覧と管理。
// GET    … 一覧(公開。チップ表示に使う)
// POST   … 追加(管理者のみ)
// PUT    … 名称変更(管理者のみ。全動画のphase/systems/tagsにも反映)
// DELETE … 削除(管理者のみ。全動画からも取り除く)
import { json } from "./_util.js";
import { isAdmin } from "./_auth.js";

const KINDS = ["phase", "system", "tag"];
const COL = { system: "systems", tag: "tags" };

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT kind, name FROM taxonomy ORDER BY id").all();
  const out = { phases: [], systems: [], tags: [] };
  for (const r of results) {
    if (r.kind === "phase") out.phases.push(r.name);
    else if (r.kind === "system") out.systems.push(r.name);
    else if (r.kind === "tag") out.tags.push(r.name);
  }
  return json(out);
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!(await isAdmin(context))) return json({ error: "管理者ログインが必要です" }, 401);
  const b = await readJson(request);
  const kind = String(b.kind || "");
  const name = String(b.name || "").trim().slice(0, 60);
  if (!KINDS.includes(kind)) return json({ error: "種別が不正です" }, 400);
  if (!name) return json({ error: "名称を入力してください" }, 400);
  await env.DB.prepare("INSERT OR IGNORE INTO taxonomy (kind,name) VALUES (?,?)").bind(kind, name).run();
  return json({ ok: true });
}

export async function onRequestPut(context) {
  const { env, request } = context;
  if (!(await isAdmin(context))) return json({ error: "管理者ログインが必要です" }, 401);
  const b = await readJson(request);
  const kind = String(b.kind || "");
  const oldName = String(b.oldName || "");
  const newName = String(b.newName || "").trim().slice(0, 60);
  if (!KINDS.includes(kind)) return json({ error: "種別が不正です" }, 400);
  if (!oldName || !newName) return json({ error: "名称が不正です" }, 400);
  if (oldName === newName) return json({ ok: true });

  // 同名が既にあれば古い方を消してマージ、なければ改名
  const exists = await env.DB.prepare("SELECT id FROM taxonomy WHERE kind=? AND name=?").bind(kind, newName).first();
  if (exists) {
    await env.DB.prepare("DELETE FROM taxonomy WHERE kind=? AND name=?").bind(kind, oldName).run();
  } else {
    await env.DB.prepare("UPDATE taxonomy SET name=? WHERE kind=? AND name=?").bind(newName, kind, oldName).run();
  }
  await applyToVideos(env, kind, oldName, newName);
  return json({ ok: true });
}

export async function onRequestDelete(context) {
  const { env, request } = context;
  if (!(await isAdmin(context))) return json({ error: "管理者ログインが必要です" }, 401);
  const b = await readJson(request);
  const kind = String(b.kind || "");
  const name = String(b.name || "");
  if (!KINDS.includes(kind) || !name) return json({ error: "指定が不正です" }, 400);
  await env.DB.prepare("DELETE FROM taxonomy WHERE kind=? AND name=?").bind(kind, name).run();
  await applyToVideos(env, kind, name, null); // null=削除
  return json({ ok: true });
}

// 全動画へ名称変更(newName指定)または削除(newName=null)を反映
async function applyToVideos(env, kind, oldName, newName) {
  if (kind === "phase") {
    if (newName === null) {
      await env.DB.prepare("UPDATE videos SET phase='' WHERE phase=?").bind(oldName).run();
    } else {
      await env.DB.prepare("UPDATE videos SET phase=? WHERE phase=?").bind(newName, oldName).run();
    }
    return;
  }
  const col = COL[kind]; // "systems" | "tags"(固定の許可リスト)
  const { results } = await env.DB.prepare(`SELECT id, ${col} AS arr FROM videos`).all();
  const stmts = [];
  for (const r of results) {
    let arr;
    try { arr = JSON.parse(r.arr || "[]"); } catch { arr = []; }
    if (!Array.isArray(arr) || !arr.includes(oldName)) continue;
    let next;
    if (newName === null) {
      next = arr.filter((x) => x !== oldName);
    } else {
      next = [];
      for (const x of arr) {
        const v = x === oldName ? newName : x;
        if (!next.includes(v)) next.push(v);
      }
    }
    stmts.push(env.DB.prepare(`UPDATE videos SET ${col}=? WHERE id=?`).bind(JSON.stringify(next), r.id));
  }
  if (stmts.length) await env.DB.batch(stmts);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

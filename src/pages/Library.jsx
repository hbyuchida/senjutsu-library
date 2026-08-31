import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { parseYouTube, parseTimeInput, fmt } from "../lib/utils";
import { api } from "../lib/api";
import { NineMeterArc, Chip, AddChip, AdSlot, TabNav, SponsorBanner } from "../components/shared";

// YouTube IFrame Player API を一度だけ読み込む(連続再生で終了を検知するため)
let ytPromise = null;
function loadYT() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytPromise) return ytPromise;
  ytPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (typeof prev === "function") prev(); resolve(window.YT); };
    if (!document.getElementById("yt-iframe-api")) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(s);
    }
  });
  return ytPromise;
}

// タイトルとメモの最低文字数(内容が分かる説明を必ず入れてもらうため)
const MIN_LEN = 10;

// 一度に表示する件数(「もっと見る」で増やす)
const PAGE_N = 24;

// 絞り込みタブ。局面・システムは専用の列、それ以外は動画の tags に入る。
const FILTER_TABS = [
  { key: "phase", label: "局面" },
  { key: "system", label: "システム" },
  { key: "team", label: "チーム" },
  { key: "national", label: "代表" },
  { key: "player", label: "選手" },
  { key: "tag", label: "タグ" },
];

// 残りがあるときだけ出す「もっと見る」ボタン
function MoreButton({ shown, total, onMore }) {
  if (shown >= total) return null;
  const rest = total - shown;
  return (
    <div className="more-wrap">
      <button className="more-btn" onClick={() => onMore(Math.min(shown + PAGE_N, total))}>
        もっと見る（残り {rest} 本）
      </button>
    </div>
  );
}

// 入力中に「あと何文字か」が分かるようにする
function CharCount({ value }) {
  const n = (value || "").trim().length;
  const ok = n >= MIN_LEN;
  return (
    <span className={`char-count ${ok ? "ok" : ""}`}>
      {ok ? `${n}文字` : `あと${MIN_LEN - n}文字`}
    </span>
  );
}

function VideoCard({ v, isAdmin, onPlay, onEdit, onDelete }) {
  const thumb = `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`;
  const range =
    v.start || v.end ? `${fmt(v.start || 0)}${v.end ? ` – ${fmt(v.end)}` : " –"}` : "全編";
  return (
    <div className="video-card">
      <button className="thumb-btn" onClick={() => onPlay(v)}>
        <img src={thumb} alt={v.title} loading="lazy" />
        <div className="thumb-overlay">
          <div className="play-circle">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="#fff">
              <path d="M6 4l10 6-10 6V4z" />
            </svg>
          </div>
        </div>
        <span className="time-badge">⏱ {range}</span>
      </button>
      <div className="card-body">
        <div className="card-head">
          <h3 className="card-title">{v.title}</h3>
          {isAdmin && (
            <div className="card-admin-actions">
              <button className="edit-btn" aria-label="編集" onClick={() => onEdit(v)}>✎</button>
              <button className="delete-btn" aria-label="削除" onClick={() => onDelete(v)}>✕</button>
            </div>
          )}
        </div>
        {v.memo && <p className="card-memo">{v.memo}</p>}
        <div className="tag-row">
          <span className="tag-phase">{v.phase}</span>
          {v.systems.map((s) => <span key={s} className="tag-system">{s}</span>)}
          {v.tags.map((t) => <span key={t} className="tag-free">#{t}</span>)}
          {v.sample && <span className="tag-sample">サンプル</span>}
        </div>
      </div>
    </div>
  );
}

// 連続再生対応プレーヤー。終了(または指定終了時刻)で自動的に次へ進む。
function PlayerModal({ queue, index, onIndex, autoplay, setAutoplay, onCount, onClose }) {
  const v = queue[index];
  const mountRef = useRef(null);
  const autoplayRef = useRef(autoplay); autoplayRef.current = autoplay;
  const idxRef = useRef(index); idxRef.current = index;
  const lenRef = useRef(queue.length); lenRef.current = queue.length;

  useEffect(() => {
    if (!v) return;
    let player = null, poll = null, cancelled = false;
    const container = mountRef.current;
    onCount(v.id);
    const onEnd = () => {
      if (autoplayRef.current && idxRef.current < lenRef.current - 1) onIndex(idxRef.current + 1);
    };
    loadYT().then((YT) => {
      if (cancelled || !container) return;
      container.innerHTML = "";
      const host = document.createElement("div");
      host.style.width = "100%"; host.style.height = "100%";
      container.appendChild(host);
      const pv = { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1, start: v.start || 0 };
      if (v.end != null) pv.end = v.end;
      player = new YT.Player(host, {
        videoId: v.videoId,
        playerVars: pv,
        events: {
          onReady: (e) => e.target.playVideo(),
          onStateChange: (e) => { if (e.data === YT.PlayerState.ENDED) onEnd(); },
        },
      });
      // end 指定時は ENDED ではなく PAUSED で止まるためポーリングで検知
      if (v.end != null) {
        poll = setInterval(() => {
          try {
            const t = player.getCurrentTime && player.getCurrentTime();
            if (typeof t === "number" && t >= v.end - 0.4) onEnd();
          } catch { /* 未準備 */ }
        }, 400);
      }
    });
    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      try { if (player && player.destroy) player.destroy(); } catch { /* 破棄済 */ }
      if (container) container.innerHTML = "";
    };
  }, [v && v.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!v) return null;
  const upNext = queue.slice(index + 1, index + 5);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="player-modal" onClick={(e) => e.stopPropagation()}>
        <div className="player-frame"><div ref={mountRef} className="player-yt" /></div>
        <div className="player-info">
          <div className="player-head">
            <div>
              <h3 className="player-title">{v.title}</h3>
              {v.memo && <p className="player-memo">{v.memo}</p>}
            </div>
            <button className="close-btn" onClick={onClose}>閉じる</button>
          </div>
          <div className="player-controls">
            <button className="pc-btn" disabled={index === 0} onClick={() => onIndex(index - 1)}>← 前へ</button>
            <label className="pc-auto">
              <input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} />
              連続再生
            </label>
            <button className="pc-btn" disabled={index >= queue.length - 1} onClick={() => onIndex(index + 1)}>次へ →</button>
          </div>
          {upNext.length > 0 && (
            <div className="up-next">
              <p className="up-next-label">次はこれ</p>
              <div className="up-next-list">
                {upNext.map((n, i) => (
                  <button key={n.id} className="up-next-item" onClick={() => onIndex(index + 1 + i)}>
                    <img src={`https://img.youtube.com/vi/${n.videoId}/mqdefault.jpg`} alt="" loading="lazy" />
                    <span className="up-next-title">{n.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <AdSlot variant="banner" />
        </div>
      </div>
    </div>
  );
}

// 追加・編集 兼用フォーム
function VideoForm({ mode, initial, onSubmit, onClose, phases, systems, onAddPhase, onAddSystem }) {
  const editing = mode === "edit";
  const [url, setUrl] = useState(
    initial ? `https://www.youtube.com/watch?v=${initial.videoId}` : ""
  );
  const [title, setTitle] = useState(initial?.title || "");
  const [memo, setMemo] = useState(initial?.memo || "");
  const [phase, setPhase] = useState(initial?.phase || phases[0]);
  const [selSystems, setSelSystems] = useState(initial?.systems || []);
  const [tags, setTags] = useState(initial ? (initial.tags || []).join(", ") : "");
  const [startStr, setStartStr] = useState(
    initial && initial.start ? fmt(initial.start) : ""
  );
  const [endStr, setEndStr] = useState(initial && initial.end ? fmt(initial.end) : "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const parsed = parseYouTube(url);
  const toggleSystem = (s) =>
    setSelSystems((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const submit = async () => {
    if (!parsed) { setErr("YouTubeのURLを確認してください(watch / youtu.be / shorts に対応)"); return; }
    if (title.trim().length < MIN_LEN) {
      setErr(`タイトルは${MIN_LEN}文字以上で入力してください(現在 ${title.trim().length} 文字)`); return;
    }
    if (memo.trim().length < MIN_LEN) {
      setErr(`メモは${MIN_LEN}文字以上で入力してください(現在 ${memo.trim().length} 文字)`); return;
    }
    const start = startStr ? parseTimeInput(startStr) : parsed.start || 0;
    const end = endStr ? parseTimeInput(endStr) : null;
    const payload = {
      videoId: parsed.videoId,
      title: title.trim(),
      memo: memo.trim(),
      phase,
      systems: selSystems,
      tags: tags.split(/[,、\s]+/).map((t) => t.trim()).filter(Boolean),
      start: start || 0,
      end,
    };
    setErr("");
    setBusy(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (e) {
      setErr(e.message || "保存に失敗しました");
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop top" onClick={onClose}>
      <div className="form-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="form-title">{editing ? "動画を編集" : "動画を追加"}</h2>

        <label className="field">
          <span className="field-label">YouTube URL</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... (t=指定も読み取ります)"
          />
          {parsed && (
            <span className="field-hint">
              ✓ 動画ID: {parsed.videoId}
              {parsed.start ? ` / 開始 ${fmt(parsed.start)} をURLから取得` : ""}
            </span>
          )}
        </label>

        <label className="field">
          <span className="field-label">
            タイトル（{MIN_LEN}文字以上）
            <CharCount value={title} />
          </span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 5:1に対するポスト連動" />
        </label>

        <div className="field-row">
          <label className="field">
            <span className="field-label">開始 (3:44 か 秒数)</span>
            <input value={startStr} onChange={(e) => setStartStr(e.target.value)} placeholder="0:00" />
          </label>
          <label className="field">
            <span className="field-label">終了 (任意)</span>
            <input value={endStr} onChange={(e) => setEndStr(e.target.value)} placeholder="5:30" />
          </label>
        </div>

        <div className="chip-group">
          <span className="field-label">局面</span>
          <div className="chip-wrap">
            {phases.map((p) => (
              <Chip key={p} label={p} active={phase === p} onClick={() => setPhase(p)} tone="orange" />
            ))}
            <AddChip onAdd={(v) => { onAddPhase(v); setPhase(v); }} placeholder="新しい局面" />
          </div>
        </div>

        <div className="chip-group">
          <span className="field-label">システム (複数可)</span>
          <div className="chip-wrap">
            {systems.map((s) => (
              <Chip key={s} label={s} active={selSystems.includes(s)} onClick={() => toggleSystem(s)} />
            ))}
            <AddChip
              onAdd={(v) => { onAddSystem(v); setSelSystems((prev) => [...prev, v]); }}
              placeholder="新しいシステム"
            />
          </div>
        </div>

        <label className="field">
          <span className="field-label">フリータグ (カンマ・スペース区切り)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="例: U-12, バルサ, クロス" />
        </label>

        <label className="field">
          <span className="field-label">
            メモ・説明（{MIN_LEN}文字以上）
            <CharCount value={memo} />
          </span>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} placeholder="注目ポイント、練習への落とし込みなど" />
        </label>

        {err && <p className="form-error">{err}</p>}

        <div className="form-actions">
          <button className="cancel-btn" onClick={onClose} disabled={busy}>キャンセル</button>
          <button className="primary-btn" style={{ marginLeft: 0 }} onClick={submit} disabled={busy}>
            {busy ? "保存中…" : editing ? "更新する" : "ライブラリに追加"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginModal({ onLogin, onClose }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!pass) { setErr("パスコードを入力してください"); return; }
    setErr("");
    setBusy(true);
    try {
      await onLogin(pass);
      onClose();
    } catch (e) {
      setErr(e.message || "ログインに失敗しました");
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop top" onClick={onClose}>
      <div className="form-modal login-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="form-title">管理者ログイン</h2>
        <p className="login-note">動画の編集・削除には管理者パスコードが必要です。</p>
        <label className="field">
          <span className="field-label">パスコード</span>
          <input
            type="password"
            autoFocus
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="••••••••"
          />
        </label>
        {err && <p className="form-error">{err}</p>}
        <div className="form-actions">
          <button className="cancel-btn" onClick={onClose} disabled={busy}>キャンセル</button>
          <button className="primary-btn" style={{ marginLeft: 0 }} onClick={submit} disabled={busy}>
            {busy ? "確認中…" : "ログイン"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== タグ管理(管理者) =====
function TagRow({ kind, name, tone, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const commit = async () => {
    const nv = val.trim();
    if (!nv || nv === name) { setEditing(false); setVal(name); return; }
    setBusy(true); setErr("");
    try { await onRename(kind, name, nv); setEditing(false); }
    catch (e) { setErr(e.message || "変更に失敗しました"); setBusy(false); }
  };
  const del = async () => {
    if (!window.confirm(`「${name}」を削除しますか?この分類は全ての動画から取り除かれます。`)) return;
    setBusy(true); setErr("");
    try { await onDelete(kind, name); }
    catch (e) { setErr(e.message || "削除に失敗しました"); setBusy(false); }
  };

  if (editing) {
    return (
      <span className="tagmgr-row tagmgr-editing">
        <input
          autoFocus className="chip-input" value={val} disabled={busy}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setEditing(false); setVal(name); }
          }}
        />
        <button className="chip-confirm" onClick={commit} disabled={busy}>✓</button>
        <button className="tagmgr-x" onClick={() => { setEditing(false); setVal(name); }} disabled={busy}>×</button>
        {err && <span className="tagmgr-err">{err}</span>}
      </span>
    );
  }
  return (
    <span className={`chip tagmgr-chip ${tone === "orange" ? "orange" : ""}`}>
      <span className="tagmgr-name">{name}</span>
      <button className="tagmgr-edit" aria-label="名称変更" onClick={() => setEditing(true)} disabled={busy}>✎</button>
      <button className="tagmgr-del" aria-label="削除" onClick={del} disabled={busy}>✕</button>
    </span>
  );
}

function TagSection({ kind, label, items, tone, onAdd, onRename, onDelete }) {
  const [newVal, setNewVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const add = async () => {
    const v = newVal.trim();
    if (!v) return;
    setBusy(true); setErr("");
    try { await onAdd(kind, v); setNewVal(""); }
    catch (e) { setErr(e.message || "追加に失敗しました"); }
    finally { setBusy(false); }
  };
  return (
    <div className="tagmgr-section">
      <h3 className="tagmgr-sec-label">{label}</h3>
      <div className="tagmgr-items">
        {items.length === 0 && <span className="tagmgr-empty">なし</span>}
        {items.map((name) => (
          <TagRow key={name} kind={kind} name={name} tone={tone} onRename={onRename} onDelete={onDelete} />
        ))}
      </div>
      <div className="tagmgr-add">
        <input
          className="chip-input" value={newVal} disabled={busy}
          placeholder={`${label}を追加`}
          onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
        />
        <button className="chip-confirm" onClick={add} disabled={busy}>＋ 追加</button>
      </div>
      {err && <p className="form-error">{err}</p>}
    </div>
  );
}

function TagManager({ taxonomy, onAdd, onRename, onDelete, onClose }) {
  return (
    <div className="modal-backdrop top" onClick={onClose}>
      <div className="form-modal tagmgr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tagmgr-head">
          <h2 className="form-title">タグ管理</h2>
          <button className="cancel-btn" onClick={onClose}>閉じる</button>
        </div>
        <p className="login-note">
          局面・システム・タグの追加・名称変更(✎)・削除(✕)ができます。
          名称変更と削除は、その分類を持つ全ての動画にも反映されます。
        </p>
        <TagSection kind="phase" label="局面" items={taxonomy.phases} tone="orange"
          onAdd={onAdd} onRename={onRename} onDelete={onDelete} />
        <TagSection kind="system" label="システム" items={taxonomy.systems}
          onAdd={onAdd} onRename={onRename} onDelete={onDelete} />
        <TagSection kind="tag" label="タグ" items={taxonomy.tags}
          onAdd={onAdd} onRename={onRename} onDelete={onDelete} />
      </div>
    </div>
  );
}

export default function Library() {
  const [videos, setVideos] = useState([]);
  const [taxo, setTaxo] = useState({ phases: [], systems: [], tags: [], teams: [], nationals: [], players: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showTagMgr, setShowTagMgr] = useState(false);
  const [filterTab, setFilterTab] = useState("phase"); // 絞り込みタブ
  // 「もっと見る」の表示件数。全件を一度に描画すると重いため少しずつ出す。
  const [shownFiltered, setShownFiltered] = useState(PAGE_N);
  const [shownAll, setShownAll] = useState(PAGE_N);

  // フォーム用の局面・システム候補(セッション中に追加したものを即時表示するため)
  const [extraPhases, setExtraPhases] = useState([]);
  const [extraSystems, setExtraSystems] = useState([]);

  const [selPhases, setSelPhases] = useState([]);
  const [selSystems, setSelSystems] = useState([]);
  const [selTags, setSelTags] = useState([]);
  const [query, setQuery] = useState("");
  const [player, setPlayer] = useState(null); // { queue, index }
  const [autoplay, setAutoplay] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [list, tx, admin] = await Promise.all([
          api.listVideos(),
          api.taxonomy().catch(() => ({ phases: [], systems: [], tags: [] })),
          api.session().catch(() => false),
        ]);
        if (!alive) return;
        setVideos(list);
        setTaxo(tx);
        setIsAdmin(admin);
      } catch (e) {
        if (alive) setLoadError(e.message || "読み込みに失敗しました");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // 分類マスタ + 動画を再取得(タグ管理の変更後などに使う)
  const refreshData = async () => {
    const [list, tx] = await Promise.all([api.listVideos(), api.taxonomy()]);
    setVideos(list);
    setTaxo(tx);
  };

  const uniq = (arr) => [...new Set(arr)];
  // チップはマスタ(taxonomy)を源泉にしつつ、動画に存在する値も念のため統合
  const phases = useMemo(
    () => uniq([...taxo.phases, ...videos.map((v) => v.phase).filter(Boolean), ...extraPhases]),
    [taxo, videos, extraPhases]
  );
  const systems = useMemo(
    () => uniq([...taxo.systems, ...videos.flatMap((v) => v.systems), ...extraSystems]),
    [taxo, videos, extraSystems]
  );
  const teams = useMemo(() => uniq(taxo.teams || []), [taxo]);
  const nationals = useMemo(() => uniq(taxo.nationals || []), [taxo]);
  const players = useMemo(() => uniq(taxo.players || []), [taxo]);
  // チーム・代表・選手として登録済みの名前は「タグ」タブから除く
  const special = useMemo(
    () => new Set([...teams, ...nationals, ...players]),
    [teams, nationals, players]
  );
  const allTags = useMemo(
    () => uniq([...taxo.tags, ...videos.flatMap((v) => v.tags)]).filter((t) => !special.has(t)),
    [taxo, videos, special]
  );

  // 選択中のタブに出すチップ
  const tabItems = useMemo(() => {
    if (filterTab === "phase") return phases;
    if (filterTab === "system") return systems;
    if (filterTab === "team") return teams;
    if (filterTab === "national") return nationals;
    if (filterTab === "player") return players;
    return allTags;
  }, [filterTab, phases, systems, teams, nationals, players, allTags]);

  // タブに何個選択中かをバッジで出す(隠れたタブの絞り込みに気づけるように)
  const tabSelectedCount = (key) => {
    if (key === "phase") return selPhases.length;
    if (key === "system") return selSystems.length;
    const list =
      key === "team" ? teams : key === "national" ? nationals : key === "player" ? players : allTags;
    return selTags.filter((t) => list.includes(t)).length;
  };

  const addPhase = (v) => setExtraPhases((prev) => (prev.includes(v) ? prev : [...prev, v]));
  const addSystem = (v) => setExtraSystems((prev) => (prev.includes(v) ? prev : [...prev, v]));

  const toggle = (setter) => (val) =>
    setter((prev) => (prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]));

  const filtered = videos.filter((v) => {
    if (selPhases.length && !selPhases.includes(v.phase)) return false;
    if (selSystems.length && !selSystems.every((s) => v.systems.includes(s))) return false;
    if (selTags.length && !selTags.every((t) => v.tags.includes(t))) return false;
    if (query && !(v.title + v.memo).toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  // 絞り込みを変えたら表示件数を最初に戻す
  useEffect(() => {
    setShownFiltered(PAGE_N);
  }, [selPhases, selSystems, selTags, query]);

  const clearAll = () => { setSelPhases([]); setSelSystems([]); setSelTags([]); setQuery(""); };
  const filterActive = selPhases.length || selSystems.length || selTags.length || query;

  // トップ(絞り込みなし)は「新着5」と「人気5」だけを見せ、他は絞り込みで表示する
  const HOME_N = 5;
  const newest = videos.slice(0, HOME_N); // APIがcreated_at降順で返すため先頭が新着
  const popular = useMemo(
    () => [...videos].sort((a, b) => (b.plays || 0) - (a.plays || 0) || a.id - b.id).slice(0, HOME_N),
    [videos]
  );

  // ---- 操作ハンドラ ----
  const handleAdd = async (payload) => {
    const v = await api.addVideo(payload);
    setVideos((prev) => [v, ...prev]);
  };
  const handleUpdate = async (payload) => {
    const v = await api.updateVideo(editingVideo.id, payload);
    setVideos((prev) => prev.map((x) => (x.id === v.id ? v : x)));
  };
  const handleDelete = async (video) => {
    if (!window.confirm(`「${video.title}」を削除しますか?この操作は取り消せません。`)) return;
    try {
      await api.deleteVideo(video.id);
      setVideos((prev) => prev.filter((x) => x.id !== video.id));
    } catch (e) {
      alert(e.message || "削除に失敗しました");
    }
  };
  // 再生数カウント(人気ランキング用・失敗しても無視)。連続再生の各動画で呼ばれる
  const countPlay = (id) => {
    api.playVideo(id).catch(() => {});
    setVideos((prev) => prev.map((x) => (x.id === id ? { ...x, plays: (x.plays || 0) + 1 } : x)));
  };
  // クリックした動画を先頭に、関連度(局面・システム・タグの一致)順で並べた連続再生キューを作る
  const buildQueue = (start) => {
    const score = (x) => {
      let s = 0;
      if (x.phase && x.phase === start.phase) s += 2;
      s += x.systems.filter((y) => start.systems.includes(y)).length * 2;
      s += x.tags.filter((y) => start.tags.includes(y)).length;
      return s;
    };
    const others = videos.filter((x) => x.id !== start.id).sort((a, b) => score(b) - score(a));
    return [start, ...others];
  };
  const handlePlay = (video) => {
    setPlayer({ queue: buildQueue(video), index: 0 });
  };
  const handleLogin = async (passcode) => {
    await api.login(passcode);
    setIsAdmin(true);
  };
  const handleLogout = async () => {
    await api.logout().catch(() => {});
    setIsAdmin(false);
  };

  // タグ管理(管理者)。変更後はマスタと動画を再取得して画面に反映
  const handleAddTaxo = async (kind, name) => { await api.addTaxonomy(kind, name); await refreshData(); };
  const handleRenameTaxo = async (kind, oldName, newName) => { await api.renameTaxonomy(kind, oldName, newName); await refreshData(); };
  const handleDeleteTaxo = async (kind, name) => {
    await api.deleteTaxonomy(kind, name);
    // 削除された分類が絞り込みに残らないよう解除
    setSelPhases((p) => p.filter((x) => x !== name));
    setSelSystems((p) => p.filter((x) => x !== name));
    setSelTags((p) => p.filter((x) => x !== name));
    await refreshData();
  };

  // 一度に全件描画すると重いので、少しずつ表示して「もっと見る」で足していく
  const shownFilteredList = filtered.slice(0, shownFiltered);
  const gridItems = [];
  shownFilteredList.forEach((v, i) => {
    gridItems.push({ type: "video", v, key: `v-${v.id}` });
    if ((i + 1) % 6 === 0 && i + 1 < shownFilteredList.length) gridItems.push({ type: "ad", key: `ad-${i}` });
  });

  // トップの「すべての動画」用。全件並ぶため、絞り込み結果(6件ごと)より
  // 広告の間隔を広げて、広告だらけの画面にならないようにする。
  const allItems = useMemo(() => {
    const items = [];
    const list = videos.slice(0, shownAll);
    list.forEach((v, i) => {
      items.push({ type: "video", v, key: `a-${v.id}` });
      if ((i + 1) % 12 === 0 && i + 1 < list.length) items.push({ type: "ad", key: `aad-${i}` });
    });
    return items;
  }, [videos, shownAll]);

  return (
    <>
      <div className="admin-bar container">
        {isAdmin ? (
          <>
            <span className="admin-badge">● 管理者モード</span>
            <button className="admin-link" onClick={() => setShowTagMgr(true)}>タグ管理</button>
            <button className="admin-link" onClick={handleLogout}>ログアウト</button>
          </>
        ) : (
          <button className="admin-link" onClick={() => setShowLogin(true)}>管理者ログイン</button>
        )}
      </div>

      <div className="container"><TabNav /></div>

      <header className="site-header">
        <div className="arc"><NineMeterArc width={340} /></div>
        <p className="eyebrow">HANDBALL TACTICS LIBRARY</p>
        <h1 className="site-title">戦術ライブラリ</h1>
        <p className="site-sub">YouTubeの戦術動画を、局面・システム・タグで整理して見返す。</p>
      </header>

      <div className="container ad-wrap"><SponsorBanner /></div>

      <section className="container filters">
        {/* 絞り込みタブ。項目が増えても1行に収まるよう、選んだ種別のチップだけを出す */}
        <div className="filter-tabs">
          {FILTER_TABS.map((t) => {
            const n = tabSelectedCount(t.key);
            return (
              <button
                key={t.key}
                className={`filter-tab ${filterTab === t.key ? "active" : ""} ${n ? "has-sel" : ""}`}
                onClick={() => setFilterTab(t.key)}
              >
                {t.label}
                {n > 0 && <span className="filter-tab-badge">{n}</span>}
              </button>
            );
          })}
        </div>

        <div className="filter-row">
          <div className="chip-scroll">
            {tabItems.length === 0 ? (
              // 読み込み中に「まだありません」と出ると誤解を招くため文言を分ける
              <span className="filter-empty">{loading ? "読み込み中…" : "この分類はまだありません"}</span>
            ) : filterTab === "phase" ? (
              tabItems.map((p) => (
                <Chip key={p} label={p} active={selPhases.includes(p)} onClick={() => toggle(setSelPhases)(p)} tone="orange" />
              ))
            ) : filterTab === "system" ? (
              tabItems.map((s) => (
                <Chip key={s} label={s} active={selSystems.includes(s)} onClick={() => toggle(setSelSystems)(s)} />
              ))
            ) : (
              // タグ・チーム・代表・選手は、動画側ではどれも tags に入っているので同じ扱い
              tabItems.map((t) => (
                <Chip key={t} label={`#${t}`} active={selTags.includes(t)} onClick={() => toggle(setSelTags)(t)} />
              ))
            )}
          </div>
        </div>
        <div className="filter-actions">
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="タイトル・メモを検索"
          />
          {filterActive ? <button className="clear-btn" onClick={clearAll}>絞り込み解除</button> : null}
          <button className="primary-btn" onClick={() => setAdding(true)}>＋ 動画を追加</button>
        </div>
      </section>

      <div className="container"><div className="court-line" /></div>

      <main className="container main-area">
        {loading ? (
          <div className="empty-state">
            <NineMeterArc width={180} color="rgba(242,238,230,0.25)" />
            <p>読み込み中…</p>
          </div>
        ) : loadError ? (
          <div className="empty-state">
            <NineMeterArc width={180} color="rgba(242,238,230,0.25)" />
            <p>読み込みに失敗しました: {loadError}</p>
          </div>
        ) : filterActive ? (
          <>
            <p className="count-label">{filtered.length} / {videos.length} 本</p>
            {filtered.length === 0 ? (
              <div className="empty-state">
                <NineMeterArc width={180} color="rgba(242,238,230,0.25)" />
                <p>該当する動画がありません。絞り込みを解除するか、「＋ 動画を追加」から登録できます。</p>
              </div>
            ) : (
              <div className="grid">
                {gridItems.map((item) =>
                  item.type === "video" ? (
                    <VideoCard
                      key={item.key}
                      v={item.v}
                      isAdmin={isAdmin}
                      onPlay={handlePlay}
                      onEdit={setEditingVideo}
                      onDelete={handleDelete}
                    />
                  ) : (
                    <AdSlot key={item.key} variant="card" />
                  )
                )}
              </div>
            )}
            <MoreButton shown={shownFiltered} total={filtered.length} onMore={setShownFiltered} />
          </>
        ) : videos.length === 0 ? (
          <div className="empty-state">
            <NineMeterArc width={180} color="rgba(242,238,230,0.25)" />
            <p>まだ動画がありません。「＋ 動画を追加」から登録できます。</p>
          </div>
        ) : (
          <>
            <section className="home-section">
              <h2 className="home-heading">🆕 新着</h2>
              <div className="grid">
                {newest.map((v) => (
                  <VideoCard key={`n-${v.id}`} v={v} isAdmin={isAdmin}
                    onPlay={handlePlay} onEdit={setEditingVideo} onDelete={handleDelete} />
                ))}
              </div>
            </section>
            <section className="home-section">
              <h2 className="home-heading">🔥 人気</h2>
              <div className="grid">
                {popular.map((v) => (
                  <VideoCard key={`p-${v.id}`} v={v} isAdmin={isAdmin}
                    onPlay={handlePlay} onEdit={setEditingVideo} onDelete={handleDelete} />
                ))}
              </div>
            </section>
            <section className="home-section">
              <h2 className="home-heading">📚 すべての動画 <span className="home-count">{videos.length}本</span></h2>
              <div className="grid">
                {allItems.map((item) =>
                  item.type === "video" ? (
                    <VideoCard key={item.key} v={item.v} isAdmin={isAdmin}
                      onPlay={handlePlay} onEdit={setEditingVideo} onDelete={handleDelete} />
                  ) : (
                    <AdSlot key={item.key} variant="card" />
                  )
                )}
              </div>
              <MoreButton shown={shownAll} total={videos.length} onMore={setShownAll} />
            </section>
            <p className="home-hint">
              上の<strong>局面・システム・タグ</strong>で絞り込むと、目的の動画を探しやすくなります。
              短いクリップを次々に見たい方は<Link to="/shorts" className="home-hint-link">ショート ▶</Link>もどうぞ。
            </p>
          </>
        )}
      </main>

      <footer className="container site-footer">
        <AdSlot variant="banner" />
        <nav className="footer-links">
          <Link to="/about">運営者情報・お問い合わせ</Link>
          <Link to="/privacy">プライバシーポリシー</Link>
        </nav>
        <p className="footer-note">
          ※ 登録した動画は全員で共有されます。追加はどなたでも可能で、編集・削除は管理者のみが行えます。
        </p>
      </footer>

      {player && (
        <PlayerModal
          queue={player.queue}
          index={player.index}
          onIndex={(i) => setPlayer((p) => (p ? { ...p, index: i } : p))}
          autoplay={autoplay}
          setAutoplay={setAutoplay}
          onCount={countPlay}
          onClose={() => setPlayer(null)}
        />
      )}
      {adding && (
        <VideoForm
          mode="add"
          onSubmit={handleAdd}
          onClose={() => setAdding(false)}
          phases={phases}
          systems={systems}
          onAddPhase={addPhase}
          onAddSystem={addSystem}
        />
      )}
      {editingVideo && (
        <VideoForm
          mode="edit"
          initial={editingVideo}
          onSubmit={handleUpdate}
          onClose={() => setEditingVideo(null)}
          phases={phases}
          systems={systems}
          onAddPhase={addPhase}
          onAddSystem={addSystem}
        />
      )}
      {showLogin && <LoginModal onLogin={handleLogin} onClose={() => setShowLogin(false)} />}
      {showTagMgr && (
        <TagManager
          taxonomy={{ phases, systems, tags: allTags }}
          onAdd={handleAddTaxo}
          onRename={handleRenameTaxo}
          onDelete={handleDeleteTaxo}
          onClose={() => setShowTagMgr(false)}
        />
      )}
    </>
  );
}

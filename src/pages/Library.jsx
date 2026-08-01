import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { parseYouTube, parseTimeInput, fmt } from "../lib/utils";
import { api } from "../lib/api";
import { NineMeterArc, Chip, AddChip, AdSlot, TabNav } from "../components/shared";

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

function PlayerModal({ v, onClose }) {
  if (!v) return null;
  const params = new URLSearchParams({ autoplay: "1", rel: "0" });
  if (v.start) params.set("start", String(v.start));
  if (v.end) params.set("end", String(v.end));
  const src = `https://www.youtube.com/embed/${v.videoId}?${params.toString()}`;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="player-modal" onClick={(e) => e.stopPropagation()}>
        <div className="player-frame">
          <iframe
            src={src}
            title={v.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="player-info">
          <div className="player-head">
            <div>
              <h3 className="player-title">{v.title}</h3>
              {v.memo && <p className="player-memo">{v.memo}</p>}
            </div>
            <button className="close-btn" onClick={onClose}>閉じる</button>
          </div>
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
    if (!title.trim()) { setErr("タイトルを入力してください"); return; }
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
          <span className="field-label">タイトル</span>
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
          <span className="field-label">メモ (任意)</span>
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
  const [taxo, setTaxo] = useState({ phases: [], systems: [], tags: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showTagMgr, setShowTagMgr] = useState(false);

  // フォーム用の局面・システム候補(セッション中に追加したものを即時表示するため)
  const [extraPhases, setExtraPhases] = useState([]);
  const [extraSystems, setExtraSystems] = useState([]);

  const [selPhases, setSelPhases] = useState([]);
  const [selSystems, setSelSystems] = useState([]);
  const [selTags, setSelTags] = useState([]);
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState(null);
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
  const allTags = useMemo(
    () => uniq([...taxo.tags, ...videos.flatMap((v) => v.tags)]),
    [taxo, videos]
  );

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
  const handlePlay = (video) => {
    setPlaying(video);
    // 再生数をカウント(人気ランキング用・失敗しても無視)
    api.playVideo(video.id).catch(() => {});
    setVideos((prev) => prev.map((x) => (x.id === video.id ? { ...x, plays: (x.plays || 0) + 1 } : x)));
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

  const gridItems = [];
  filtered.forEach((v, i) => {
    gridItems.push({ type: "video", v, key: `v-${v.id}` });
    if ((i + 1) % 6 === 0) gridItems.push({ type: "ad", key: `ad-${i}` });
  });

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

      <div className="container ad-wrap"><AdSlot variant="banner" /></div>

      <section className="container filters">
        <div className="filter-row">
          <span className="filter-label">局面</span>
          <div className="chip-scroll">
            {phases.map((p) => (
              <Chip key={p} label={p} active={selPhases.includes(p)} onClick={() => toggle(setSelPhases)(p)} tone="orange" />
            ))}
          </div>
        </div>
        <div className="filter-row">
          <span className="filter-label">システム</span>
          <div className="chip-scroll">
            {systems.map((s) => (
              <Chip key={s} label={s} active={selSystems.includes(s)} onClick={() => toggle(setSelSystems)(s)} />
            ))}
          </div>
        </div>
        {allTags.length > 0 && (
          <div className="filter-row">
            <span className="filter-label">タグ</span>
            <div className="chip-scroll">
              {allTags.map((t) => (
                <Chip key={t} label={`#${t}`} active={selTags.includes(t)} onClick={() => toggle(setSelTags)(t)} />
              ))}
            </div>
          </div>
        )}
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
            <p className="home-hint">
              全 {videos.length} 本。上の<strong>局面・システム・タグ</strong>で絞り込むと、他の動画も表示されます。
              もっと見たい方は上部の<Link to="/shorts" className="home-hint-link">ショート ▶</Link>もどうぞ。
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

      {playing && <PlayerModal v={playing} onClose={() => setPlaying(null)} />}
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

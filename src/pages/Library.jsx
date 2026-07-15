import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { parseYouTube, parseTimeInput, fmt } from "../lib/utils";
import { INITIAL_PHASES, INITIAL_SYSTEMS } from "../lib/data";
import { api } from "../lib/api";
import { NineMeterArc, Chip, AddChip, AdSlot } from "../components/shared";

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

export default function Library() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // フォーム用の局面・システム候補(初期値 + 動画から抽出 + セッション中に追加したもの)
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
        const [list, admin] = await Promise.all([api.listVideos(), api.session().catch(() => false)]);
        if (!alive) return;
        setVideos(list);
        setIsAdmin(admin);
      } catch (e) {
        if (alive) setLoadError(e.message || "読み込みに失敗しました");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const uniq = (arr) => [...new Set(arr)];
  const phases = useMemo(
    () => uniq([...INITIAL_PHASES, ...videos.map((v) => v.phase).filter(Boolean), ...extraPhases]),
    [videos, extraPhases]
  );
  const systems = useMemo(
    () => uniq([...INITIAL_SYSTEMS, ...videos.flatMap((v) => v.systems), ...extraSystems]),
    [videos, extraSystems]
  );
  const allTags = useMemo(() => uniq(videos.flatMap((v) => v.tags)), [videos]);

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
  const handleLogin = async (passcode) => {
    await api.login(passcode);
    setIsAdmin(true);
  };
  const handleLogout = async () => {
    await api.logout().catch(() => {});
    setIsAdmin(false);
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
            <button className="admin-link" onClick={handleLogout}>ログアウト</button>
          </>
        ) : (
          <button className="admin-link" onClick={() => setShowLogin(true)}>管理者ログイン</button>
        )}
      </div>

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
          {phases.map((p) => (
            <Chip key={p} label={p} active={selPhases.includes(p)} onClick={() => toggle(setSelPhases)(p)} tone="orange" />
          ))}
        </div>
        <div className="filter-row">
          <span className="filter-label">システム</span>
          {systems.map((s) => (
            <Chip key={s} label={s} active={selSystems.includes(s)} onClick={() => toggle(setSelSystems)(s)} />
          ))}
        </div>
        {allTags.length > 0 && (
          <div className="filter-row">
            <span className="filter-label">タグ</span>
            {allTags.map((t) => (
              <Chip key={t} label={`#${t}`} active={selTags.includes(t)} onClick={() => toggle(setSelTags)(t)} />
            ))}
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
        ) : (
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
                      onPlay={setPlaying}
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
    </>
  );
}

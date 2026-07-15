import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { parseYouTube, parseTimeInput, fmt, loadState, saveState } from "../lib/utils";
import { INITIAL_PHASES, INITIAL_SYSTEMS, SEED } from "../lib/data";
import { NineMeterArc, Chip, AddChip, AdSlot } from "../components/shared";

function VideoCard({ v, onPlay, onDelete }) {
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
          <button className="delete-btn" aria-label="削除" onClick={() => onDelete(v.id)}>✕</button>
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

function AddForm({ onAdd, onClose, phases, systems, onAddPhase, onAddSystem }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [phase, setPhase] = useState(phases[0]);
  const [selSystems, setSelSystems] = useState([]);
  const [tags, setTags] = useState("");
  const [startStr, setStartStr] = useState("");
  const [endStr, setEndStr] = useState("");
  const [err, setErr] = useState("");

  const parsed = parseYouTube(url);
  const toggleSystem = (s) =>
    setSelSystems((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const submit = () => {
    if (!parsed) { setErr("YouTubeのURLを確認してください(watch / youtu.be / shorts に対応)"); return; }
    if (!title.trim()) { setErr("タイトルを入力してください"); return; }
    const start = startStr ? parseTimeInput(startStr) : parsed.start || 0;
    const end = endStr ? parseTimeInput(endStr) : null;
    onAdd({
      id: Date.now(),
      videoId: parsed.videoId,
      title: title.trim(),
      memo: memo.trim(),
      phase,
      systems: selSystems,
      tags: tags.split(/[,、\s]+/).map((t) => t.trim()).filter(Boolean),
      start: start || 0,
      end,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop top" onClick={onClose}>
      <div className="form-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="form-title">動画を追加</h2>

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
          <button className="cancel-btn" onClick={onClose}>キャンセル</button>
          <button className="primary-btn" style={{ marginLeft: 0 }} onClick={submit}>ライブラリに追加</button>
        </div>
      </div>
    </div>
  );
}

export default function Library() {
  const [state, setState] = useState(() =>
    loadState({ videos: SEED, phases: INITIAL_PHASES, systems: INITIAL_SYSTEMS })
  );
  const { videos, phases, systems } = state;

  const [selPhases, setSelPhases] = useState([]);
  const [selSystems, setSelSystems] = useState([]);
  const [selTags, setSelTags] = useState([]);
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState(null);
  const [adding, setAdding] = useState(false);

  // 変更のたびにlocalStorageへ保存
  useEffect(() => { saveState(state); }, [state]);

  const setVideos = (fn) => setState((prev) => ({ ...prev, videos: typeof fn === "function" ? fn(prev.videos) : fn }));
  const addPhase = (v) => setState((prev) => (prev.phases.includes(v) ? prev : { ...prev, phases: [...prev.phases, v] }));
  const addSystem = (v) => setState((prev) => (prev.systems.includes(v) ? prev : { ...prev, systems: [...prev.systems, v] }));

  const allTags = useMemo(() => {
    const s = new Set();
    videos.forEach((v) => v.tags.forEach((t) => s.add(t)));
    return [...s];
  }, [videos]);

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

  const gridItems = [];
  filtered.forEach((v, i) => {
    gridItems.push({ type: "video", v, key: `v-${v.id}` });
    if ((i + 1) % 6 === 0) gridItems.push({ type: "ad", key: `ad-${i}` });
  });

  return (
    <>
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
          <AddChip onAdd={addPhase} placeholder="新しい局面" />
        </div>
        <div className="filter-row">
          <span className="filter-label">システム</span>
          {systems.map((s) => (
            <Chip key={s} label={s} active={selSystems.includes(s)} onClick={() => toggle(setSelSystems)(s)} />
          ))}
          <AddChip onAdd={addSystem} placeholder="新しいシステム" />
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
                  onPlay={setPlaying}
                  onDelete={(id) => setVideos((prev) => prev.filter((x) => x.id !== id))}
                />
              ) : (
                <AdSlot key={item.key} variant="card" />
              )
            )}
          </div>
        )}
      </main>

      <footer className="container site-footer">
        <AdSlot variant="banner" />
        <nav className="footer-links">
          <Link to="/about">運営者情報・お問い合わせ</Link>
          <Link to="/privacy">プライバシーポリシー</Link>
        </nav>
        <p className="footer-note">
          ※ 登録した動画はお使いのブラウザ内(localStorage)に保存されます。別の端末・ブラウザには引き継がれません。
        </p>
      </footer>

      {playing && <PlayerModal v={playing} onClose={() => setPlaying(null)} />}
      {adding && (
        <AddForm
          onAdd={(v) => setVideos((prev) => [v, ...prev])}
          onClose={() => setAdding(false)}
          phases={phases}
          systems={systems}
          onAddPhase={addPhase}
          onAddSystem={addSystem}
        />
      )}
    </>
  );
}

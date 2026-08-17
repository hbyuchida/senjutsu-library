import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { fmt } from "../lib/utils";
import { renderMarkdown } from "../lib/markdown";
import { NineMeterArc, AdSlot, TabNav } from "../components/shared";

function fmtDate(ms) {
  try {
    const d = new Date(ms);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch { return ""; }
}

const RELATED_MAX = 6;

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, "");

// 記事のタグと動画の分類を突き合わせる。
// 「ユーゴ」のようにタグとシステムの両方に存在する言葉があるため、
// 動画側はタグ・システム・局面をまとめて対象にする。
// 表記ゆれ(記事「3:2:1」↔ 動画「3:2:1 DF」)も拾えるよう部分一致も許す。
function matchCount(article, video) {
  const targets = [...(video.tags || []), ...(video.systems || []), video.phase]
    .filter(Boolean)
    .map(norm);
  let n = 0;
  for (const raw of article.tags || []) {
    const t = norm(raw);
    if (t.length < 2) continue;
    if (targets.some((x) => x === t || x.includes(t) || t.includes(x))) n++;
  }
  return n;
}

// タグが一致する動画を、一致数が多い順・新しい順で取り出す
function pickRelated(article, videos) {
  if (!article || !(article.tags || []).length) return [];
  return videos
    .map((v) => ({ v, n: matchCount(article, v) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || (b.v.createdAt || 0) - (a.v.createdAt || 0) || b.v.id - a.v.id)
    .slice(0, RELATED_MAX)
    .map((x) => x.v);
}

// 記事から動画を見るための簡易プレーヤー。
// ライブラリ側のプレーヤーは連続再生・再生数計測と結びついているため、
// ここでは指定区間を再生するだけの軽い作りにしている。
function RelatedPlayer({ v, onClose }) {
  if (!v) return null;
  const params = new URLSearchParams({ autoplay: "1", rel: "0", playsinline: "1" });
  if (v.start) params.set("start", String(v.start));
  if (v.end != null) params.set("end", String(v.end));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="player-modal" onClick={(e) => e.stopPropagation()}>
        <div className="player-frame">
          <iframe
            src={`https://www.youtube.com/embed/${v.videoId}?${params.toString()}`}
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
        </div>
      </div>
    </div>
  );
}

function RelatedVideos({ videos, onPlay }) {
  if (!videos.length) return null;
  return (
    <section className="related-videos">
      <h2 className="related-title">この記事に関連する動画</h2>
      <div className="grid">
        {videos.map((v) => (
          <div className="video-card" key={v.id}>
            <button className="thumb-btn" onClick={() => onPlay(v)}>
              <img
                src={`https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`}
                alt={v.title}
                loading="lazy"
              />
              <div className="thumb-overlay">
                <div className="play-circle">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="#fff">
                    <path d="M6 4l10 6-10 6V4z" />
                  </svg>
                </div>
              </div>
              <span className="time-badge">
                ⏱ {v.start || v.end != null
                  ? `${fmt(v.start || 0)}${v.end != null ? ` – ${fmt(v.end)}` : " –"}`
                  : "全編"}
              </span>
            </button>
            <div className="card-body">
              <h3 className="card-title">{v.title}</h3>
              <div className="tag-row">
                {v.phase && <span className="tag-phase">{v.phase}</span>}
                {(v.systems || []).map((s) => <span key={s} className="tag-system">{s}</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Article() {
  const { id } = useParams();
  const [a, setA] = useState(null);
  const [related, setRelated] = useState([]);
  const [playing, setPlaying] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setRelated([]);
    setPlaying(null);
    (async () => {
      try {
        const art = await api.getArticle(id);
        if (!alive) return;
        setA(art);
        // 関連動画は本文より重要度が低いので、失敗しても記事表示は続ける
        try {
          const videos = await api.listVideos();
          if (alive) setRelated(pickRelated(art, videos));
        } catch {
          /* 関連動画なしで表示 */
        }
      } catch (e) {
        if (alive) setErr(e.message || "読み込みに失敗しました");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  return (
    <>
      <div className="admin-bar container" />
      <div className="container"><TabNav /></div>

      <main className="container article-page">
        {loading ? (
          <div className="empty-state"><NineMeterArc width={180} color="rgba(242,238,230,0.25)" /><p>読み込み中…</p></div>
        ) : err || !a ? (
          <div className="empty-state">
            <NineMeterArc width={180} color="rgba(242,238,230,0.25)" />
            <p>{err || "記事が見つかりません"}</p>
            <Link className="shorts-link" to="/articles">記事一覧へ戻る</Link>
          </div>
        ) : a.type === "link" ? (
          <div className="empty-state">
            <p>この記事は外部サイトの記事です。</p>
            <a className="primary-btn" href={a.url} target="_blank" rel="noopener noreferrer">記事を開く ↗</a>
          </div>
        ) : (
          <article className="post">
            <p className="post-back"><Link to="/articles">← 記事一覧</Link></p>
            {a.status === "draft" && (
              <p className="draft-notice">下書き（未公開）です。この記事はあなたにだけ表示され、検索にも出ません。</p>
            )}
            <h1 className="post-title">{a.title}</h1>
            <div className="post-meta">
              <span className="art-date">{fmtDate(a.createdAt)}</span>
              {a.tags.map((t) => <span key={t} className="art-tag">#{t}</span>)}
            </div>
            {a.image && <img className="post-hero" src={a.image} alt="" />}
            <div className="post-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(a.body) }} />
            <RelatedVideos videos={related} onPlay={setPlaying} />
            <div className="ad-wrap"><AdSlot variant="banner" /></div>
            <p className="post-back"><Link to="/articles">← 記事一覧へ戻る</Link></p>
          </article>
        )}
      </main>

      {playing && <RelatedPlayer v={playing} onClose={() => setPlaying(null)} />}
    </>
  );
}

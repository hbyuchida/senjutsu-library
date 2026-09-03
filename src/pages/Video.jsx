import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { fmt } from "../lib/utils";
import { NineMeterArc, AdSlot, TabNav, ShareButton, SponsorBanner } from "../components/shared";

// 共有されたリンクを開いたときに最初に見る画面。
// 動画をすぐ再生でき、そこからライブラリへ回遊してもらう。
export default function Video() {
  const { id } = useParams();
  const [v, setV] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setRelated([]);
    (async () => {
      try {
        const video = await api.getVideo(id);
        if (!alive) return;
        setV(video);
        api.playVideo(id).catch(() => {}); // 再生数(人気順に使う)。失敗しても無視
        try {
          const all = await api.listVideos();
          if (!alive) return;
          // 同じ局面・システム・タグを持つ動画を関連として出す
          const keys = new Set([video.phase, ...(video.systems || []), ...(video.tags || [])].filter(Boolean));
          setRelated(
            all
              .filter((x) => x.id !== video.id)
              .map((x) => ({
                x,
                n: [x.phase, ...(x.systems || []), ...(x.tags || [])].filter((k) => keys.has(k)).length,
              }))
              .filter((r) => r.n > 0)
              .sort((a, b) => b.n - a.n || b.x.id - a.x.id)
              .slice(0, 6)
              .map((r) => r.x)
          );
        } catch {
          /* 関連なしで表示 */
        }
      } catch (e) {
        if (alive) setErr(e.message || "読み込みに失敗しました");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const params = new URLSearchParams({ autoplay: "1", rel: "0", playsinline: "1" });
  if (v?.start) params.set("start", String(v.start));
  if (v?.end != null) params.set("end", String(v.end));

  return (
    <>
      <div className="admin-bar container" />
      <div className="container"><TabNav /></div>
      <div className="container ad-wrap"><SponsorBanner /></div>

      <main className="container video-page">
        {loading ? (
          <div className="empty-state"><NineMeterArc width={180} color="rgba(242,238,230,0.25)" /><p>読み込み中…</p></div>
        ) : err || !v ? (
          <div className="empty-state">
            <NineMeterArc width={180} color="rgba(242,238,230,0.25)" />
            <p>{err || "動画が見つかりません"}</p>
            <Link className="shorts-link" to="/">ライブラリへ戻る</Link>
          </div>
        ) : (
          <>
            <p className="post-back"><Link to="/">← ライブラリ</Link></p>
            <div className="video-frame">
              <iframe
                src={`https://www.youtube.com/embed/${v.videoId}?${params.toString()}`}
                title={v.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="video-head">
              <h1 className="video-title">{v.title}</h1>
              <ShareButton
                title={v.title}
                text={`${v.title}｜戦術ライブラリ`}
                label="🔗 共有"
                className="share-btn primary"
              />
            </div>

            <div className="tag-row">
              <span className="time-badge plain">
                ⏱ {v.start || v.end != null ? `${fmt(v.start || 0)}${v.end != null ? ` – ${fmt(v.end)}` : " –"}` : "全編"}
              </span>
              {v.phase && <span className="tag-phase">{v.phase}</span>}
              {(v.systems || []).map((s) => <span key={s} className="tag-system">{s}</span>)}
              {(v.tags || []).map((t) => <span key={t} className="tag-free">#{t}</span>)}
            </div>

            {v.memo && <p className="video-memo">{v.memo}</p>}

            <div className="ad-wrap"><AdSlot variant="banner" /></div>

            {related.length > 0 && (
              <section className="related-videos">
                <h2 className="related-title">関連する動画</h2>
                <div className="grid">
                  {related.map((r) => (
                    <Link className="video-card" key={r.id} to={`/video/${r.id}`}>
                      <span className="thumb-btn">
                        <img src={`https://img.youtube.com/vi/${r.videoId}/hqdefault.jpg`} alt={r.title} loading="lazy" />
                      </span>
                      <span className="card-body">
                        <span className="card-title">{r.title}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="container site-footer">
        <AdSlot variant="banner" />
      </footer>
    </>
  );
}

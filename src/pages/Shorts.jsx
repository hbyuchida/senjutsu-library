import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fmt } from "../lib/utils";
import { api } from "../lib/api";
import { TabNav } from "../components/shared";

// 8分(480秒)以内の「指定範囲」だけを対象にする。
// 指定範囲 = start〜end。end 未設定(全編)の動画は長さ不明のため対象外。
const MAX_SEC = 8 * 60;
const clipLen = (v) => (v.end != null ? v.end - (v.start || 0) : null);
const qualifies = (v) => {
  const len = clipLen(v);
  return len != null && len > 0 && len <= MAX_SEC;
};

// YouTube IFrame Player API を一度だけ読み込む
let ytPromise = null;
function loadYT() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytPromise) return ytPromise;
  ytPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve(window.YT);
    };
    if (!document.getElementById("yt-iframe-api")) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(s);
    }
  });
  return ytPromise;
}

export default function Shorts() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);

  const containerRef = useRef(null);
  const slideRefs = useRef([]);
  const mountRef = useRef(null); // アクティブスライド内のプレーヤー設置場所
  const playerRef = useRef(null);
  const listRef = useRef([]);
  const activeIndexRef = useRef(0);
  const mutedRef = useRef(true);

  listRef.current = videos;
  activeIndexRef.current = activeIndex;
  mutedRef.current = muted;

  // 対象動画を取得(8分以内・指定範囲あり)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await api.listVideos();
        if (!alive) return;
        setVideos(list.filter(qualifies));
      } catch (e) {
        if (alive) setLoadError(e.message || "読み込みに失敗しました");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 指定インデックスへ移動。アクティブを即時反映しつつ、その位置へスクロール。
  // (手動スクロール時は IntersectionObserver がアクティブを追従する)
  const goTo = useCallback((idx) => {
    const n = listRef.current.length;
    if (!n) return;
    const i = ((idx % n) + n) % n;
    setActiveIndex(i);
    const el = slideRefs.current[i];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const advance = useCallback(() => {
    goTo(activeIndexRef.current + 1);
  }, [goTo]);

  // スクロール位置からアクティブスライドを判定(スクロールrootのIntersectionObserverは
  // 環境により発火しないことがあるため、scrollTop から確実に算出する)
  useEffect(() => {
    if (loading || videos.length === 0) return;
    const root = containerRef.current;
    if (!root) return;
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const h = root.clientHeight || 1;
        const i = Math.round(root.scrollTop / h);
        const clamped = Math.max(0, Math.min(videos.length - 1, i));
        setActiveIndex((prev) => (prev === clamped ? prev : clamped));
      });
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [loading, videos.length]);

  // アクティブスライドにプレーヤーを生成し、終了で自動送り
  useEffect(() => {
    if (loading || videos.length === 0) return;
    const v = videos[activeIndex];
    if (!v) return;

    let player = null;
    let poll = null;
    let cancelled = false;
    // React が直接管理するのは mountRef のコンテナのみ。
    // YT.Player はこのコンテナ内に命令的に足した子要素を iframe へ置換するため、
    // React の再描画と DOM 操作が衝突しない(removeChild エラーを防ぐ)。
    const container = mountRef.current;

    loadYT().then((YT) => {
      if (cancelled || !container) return;
      const host = document.createElement("div");
      host.style.width = "100%";
      host.style.height = "100%";
      container.appendChild(host);
      player = new YT.Player(host, {
        videoId: v.videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          start: v.start || 0,
          end: v.end,
          mute: 1, // 自動再生を確実にするため常にミュートで開始
        },
        events: {
          onReady: (e) => {
            playerRef.current = e.target;
            if (!mutedRef.current) e.target.unMute();
            e.target.playVideo();
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) advance();
          },
        },
      });
      // end 指定時は ENDED ではなく PAUSED で止まるためポーリングで検知
      poll = setInterval(() => {
        try {
          const t = player.getCurrentTime && player.getCurrentTime();
          if (typeof t === "number" && v.end != null && t >= v.end - 0.4) advance();
        } catch {
          /* プレーヤー未準備 */
        }
      }, 300);
    });

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      try {
        if (player && player.destroy) player.destroy();
      } catch {
        /* 破棄済み */
      }
      // 命令的に足した子(iframe)を除去。React はコンテナしか知らないので手動で片付ける
      if (container) container.innerHTML = "";
      if (playerRef.current === player) playerRef.current = null;
    };
  }, [activeIndex, videos, loading, advance]);

  // ミュート切替を現在のプレーヤーへ即時反映
  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      const p = playerRef.current;
      try {
        if (p) next ? p.mute() : p.unMute();
      } catch {
        /* noop */
      }
      return next;
    });
  };

  // キーボードで上下送り
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); goTo(activeIndexRef.current + 1); }
      if (e.key === "ArrowUp") { e.preventDefault(); goTo(activeIndexRef.current - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo]);

  return (
    <div className="shorts-page">
      <div className="shorts-topbar">
        <TabNav />
        {videos.length > 0 && (
          <div className="shorts-tools">
            <span className="shorts-count">
              {activeIndex + 1} / {videos.length}
            </span>
            <button className="shorts-mute" onClick={toggleMute} aria-label={muted ? "音を出す" : "ミュート"}>
              {muted ? "🔇 ミュート中" : "🔊 音あり"}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="shorts-empty">
          <p>読み込み中…</p>
        </div>
      ) : loadError ? (
        <div className="shorts-empty">
          <p>読み込みに失敗しました: {loadError}</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="shorts-empty">
          <h2>再生できる動画がまだありません</h2>
          <p>
            このタブには、開始〜終了の指定範囲が<strong>8分以内</strong>の動画だけが並びます。
            <br />
            <Link className="shorts-link" to="/">ライブラリ</Link>で動画の「終了」時間を設定して登録すると、ここに表示されます。
          </p>
        </div>
      ) : (
        <div className="shorts-feed" ref={containerRef}>
          {videos.map((v, i) => {
            const isActive = i === activeIndex;
            const thumb = `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`;
            return (
              <section
                key={v.id}
                className="shorts-slide"
                data-index={i}
                ref={(el) => (slideRefs.current[i] = el)}
              >
                <div className="shorts-stage">
                  <div className="shorts-frame">
                    {isActive ? (
                      <div ref={mountRef} className="shorts-yt" />
                    ) : (
                      <button
                        className="shorts-thumb"
                        onClick={() => goTo(i)}
                        style={{ backgroundImage: `url(${thumb})` }}
                        aria-label={`${v.title} を再生`}
                      >
                        <span className="shorts-play">▶</span>
                      </button>
                    )}
                  </div>
                  <div className="shorts-meta">
                    <h3 className="shorts-title">{v.title}</h3>
                    <div className="shorts-tags">
                      <span className="shorts-badge">⏱ {fmt(v.start || 0)}–{fmt(v.end)}</span>
                      {v.phase && <span className="shorts-badge orange">{v.phase}</span>}
                      {v.systems.map((s) => (
                        <span key={s} className="shorts-badge">{s}</span>
                      ))}
                      {v.tags.map((t) => (
                        <span key={t} className="shorts-badge dim">#{t}</span>
                      ))}
                    </div>
                    {v.memo && <p className="shorts-memo">{v.memo}</p>}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

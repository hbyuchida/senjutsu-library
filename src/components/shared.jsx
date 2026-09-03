import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

// ライブラリ / ショート(自動再生)を切り替えるタブ
export function TabNav() {
  return (
    <nav className="tab-nav">
      <NavLink to="/" end className={({ isActive }) => `tab-link ${isActive ? "active" : ""}`}>
        ライブラリ
      </NavLink>
      <NavLink to="/shorts" className={({ isActive }) => `tab-link ${isActive ? "active" : ""}`}>
        ショート ▶
      </NavLink>
      <NavLink to="/articles" className={({ isActive }) => `tab-link ${isActive ? "active" : ""}`}>
        記事 ✎
      </NavLink>
    </nav>
  );
}

// クリップボードへコピー。新しいAPIが使えない/拒否される環境があるため、
// 古い execCommand も試す。どちらも駄目なら false を返す。
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* 次の方法を試す */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// 共有ボタン。押すと共有先を選ぶシートを開く。
//
// X と LINE は共有用URLがあるので直接その画面を開ける。
// Instagram はリンク共有用のURLが提供されていないため、
// 「コピーしてストーリーやDMに貼る」形にしている(仕様上これが唯一の方法)。
//
// シートは画面中央に固定表示する。再生モーダルは overflow:hidden なので、
// 内側に出すとメニューが切れてしまうため。
const shareTargets = (url, text) => [
  {
    key: "x",
    label: "𝕏 でポスト",
    href: `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    key: "line",
    label: "LINEで送る",
    href: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
];

export function ShareButton({ url, title, text, label = "共有", className = "share-btn" }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState("");
  const [shown, setShown] = useState("");

  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const shareText = text || title || "";

  const copy = async () => {
    if (await copyText(shareUrl)) {
      setDone("コピーしました");
      setTimeout(() => { setDone(""); setOpen(false); }, 1400);
    } else {
      setShown(shareUrl); // コピーできない環境では手で選べるようにする
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text: shareText, url: shareUrl });
      setOpen(false);
    } catch (e) {
      if (!e || e.name !== "AbortError") copy();
    }
  };

  const close = () => { setOpen(false); setDone(""); setShown(""); };

  return (
    <>
      <button className={className} onClick={() => setOpen(true)} aria-label="共有する">
        {label}
      </button>

      {open && (
        <div className="share-sheet-backdrop" onClick={close}>
          <div className="share-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="share-sheet-head">
              <h3 className="share-sheet-title">共有する</h3>
              <button className="share-close" onClick={close} aria-label="閉じる">✕</button>
            </div>

            {shareTargets(shareUrl, shareText).map((t) => (
              <a
                key={t.key}
                className={`share-item ${t.key}`}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
              >
                {t.label}
              </a>
            ))}

            <button className="share-item copy" onClick={copy}>
              📋 リンクをコピー
            </button>
            <p className="share-note">
              Instagramはリンクを直接送る仕組みがないため、コピーしてストーリーやDMに貼り付けてください。
            </p>

            {typeof navigator !== "undefined" && navigator.share && (
              <button className="share-item other" onClick={nativeShare}>
                📱 その他のアプリで共有
              </button>
            )}

            {done && <p className="share-done">{done}</p>}
            {shown && (
              <div className="share-fallback">
                <input readOnly value={shown} onFocus={(e) => e.target.select()} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// スポンサーバナー(ヘッダー下)。
// リンク先が決まったら SPONSOR_URL にURLを入れると、クリックで開くようになる。
const SPONSOR_URL = "https://note.com/handball_family";

export function SponsorBanner() {
  const img = (
    <img
      className="sponsor-img"
      src="/sponsor-handball-next.webp"
      alt="スポンサー 株式会社ハンドボールネクスト"
      width="1200"
      height="312"
    />
  );
  return (
    <div className="sponsor-banner">
      {/* 広告であることが分かるよう「PR」を表示する(料金表の掲載条件・ステマ規制対応) */}
      <span className="sponsor-pr">PR</span>
      {SPONSOR_URL ? (
        <a href={SPONSOR_URL} target="_blank" rel="noopener noreferrer sponsored">{img}</a>
      ) : (
        img
      )}
    </div>
  );
}

// 9mライン(破線アーク)モチーフ
export function NineMeterArc({ width = 220, color = "rgba(242,238,230,0.55)" }) {
  return (
    <svg width={width} height={width * 0.36} viewBox="0 0 220 80" fill="none" aria-hidden="true">
      <path
        d="M 5 80 A 105 105 0 0 1 215 80"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray="14 10"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Chip({ label, active, onClick, tone }) {
  return (
    <button className={`chip ${tone === "orange" ? "orange" : ""} ${active ? "active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

// ＋を押すと入力欄に変わるマスタ追加チップ
export function AddChip({ onAdd, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const commit = () => {
    const v = val.trim();
    if (v) onAdd(v);
    setVal("");
    setEditing(false);
  };
  if (!editing) {
    return (
      <button className="chip chip-add" onClick={() => setEditing(true)}>
        ＋ 追加
      </button>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <input
        autoFocus
        className="chip-input"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setVal(""); setEditing(false); }
        }}
        placeholder={placeholder}
      />
      <button className="chip-confirm" onClick={commit}>✓</button>
    </span>
  );
}

// =====================================================================
// 広告スロット
// AdSense審査通過後: index.html の <head> にAdSenseスクリプトを貼り、
// このコンポーネントの中身を <ins class="adsbygoogle"> ユニットに差し替える。
// public/ads.txt の更新も忘れずに。
// =====================================================================
export function AdSlot({ variant = "banner" }) {
  if (variant === "card") {
    return (
      <Link className="ad-slot card-ad" to="/sponsor">
        <span className="ad-tag">SPONSOR</span>
        <p className="ad-lead">スポンサーバナー募集中</p>
        <p className="ad-size">300×250 など</p>
        <p className="ad-note">この枠に掲載しませんか？ ＞ 詳しく見る</p>
      </Link>
    );
  }
  return (
    <Link className="ad-slot" to="/sponsor">
      <span className="ad-tag">SPONSOR</span>
      <span className="ad-lead">スポンサーバナー募集中</span>
      <span className="ad-size">レスポンシブ 320×50〜728×90</span>
      <span className="ad-note">この枠に掲載しませんか？ ＞ 詳しく見る</span>
    </Link>
  );
}

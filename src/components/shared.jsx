import { useState } from "react";
import { NavLink } from "react-router-dom";

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

// 共有ボタン。
// スマホは標準の共有メニュー(LINE・Instagram等が並ぶ)を開き、
// 対応していないPCではURLをコピーする。
export function ShareButton({ url, title, text, label = "共有", className = "share-btn" }) {
  const [done, setDone] = useState("");
  const [shown, setShown] = useState("");

  const share = async () => {
    const shareUrl = url || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (e) {
        // 利用者が閉じただけの場合は何もしない
        if (e && e.name === "AbortError") return;
        // 共有が使えなかったときはコピーに切り替える
      }
    }
    if (await copyText(shareUrl)) {
      setDone("リンクをコピーしました");
      setTimeout(() => setDone(""), 2000);
    } else {
      // コピーもできない環境では、URLを表示して手で選べるようにする
      setShown(shareUrl);
    }
  };

  return (
    <span className="share-wrap">
      <button className={className} onClick={share} aria-label="この動画を共有">
        {label}
      </button>
      {done && <span className="share-toast">{done}</span>}
      {shown && (
        <span className="share-fallback">
          <input readOnly value={shown} onFocus={(e) => e.target.select()} />
          <button className="share-close" onClick={() => setShown("")} aria-label="閉じる">✕</button>
        </span>
      )}
    </span>
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
export function AdSlot({ variant = "banner", label = "スポンサー" }) {
  if (variant === "card") {
    return (
      <div className="ad-slot card-ad">
        <span className="ad-tag">AD</span>
        <p>{label}枠(300×250 など)</p>
        <p className="ad-note">AdSense導入時にこのカードを広告ユニットに差し替え</p>
      </div>
    );
  }
  return (
    <div className="ad-slot">
      <span className="ad-tag">AD</span>
      <p>{label}バナー枠(レスポンシブ 320×50〜728×90)</p>
    </div>
  );
}

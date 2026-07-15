import { useState } from "react";

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

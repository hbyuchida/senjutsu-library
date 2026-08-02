import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { renderMarkdown } from "../lib/markdown";
import { NineMeterArc, AdSlot, TabNav } from "../components/shared";

function fmtDate(ms) {
  try {
    const d = new Date(ms);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch { return ""; }
}

export default function Article() {
  const { id } = useParams();
  const [a, setA] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const art = await api.getArticle(id);
        if (alive) setA(art);
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
            <h1 className="post-title">{a.title}</h1>
            <div className="post-meta">
              <span className="art-date">{fmtDate(a.createdAt)}</span>
              {a.tags.map((t) => <span key={t} className="art-tag">#{t}</span>)}
            </div>
            {a.image && <img className="post-hero" src={a.image} alt="" />}
            <div className="post-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(a.body) }} />
            <div className="ad-wrap"><AdSlot variant="banner" /></div>
            <p className="post-back"><Link to="/articles">← 記事一覧へ戻る</Link></p>
          </article>
        )}
      </main>
    </>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { NineMeterArc, AdSlot, TabNav, SponsorBanner } from "../components/shared";

function fmtDate(ms) {
  try {
    const d = new Date(ms);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

// タイトルと要約の最低文字数(動画フォームと合わせる)
const MIN_LEN = 10;

// 入力中に「あと何文字か」が分かるようにする
function CharCount({ value }) {
  const n = (value || "").trim().length;
  const ok = n >= MIN_LEN;
  return (
    <span className={`char-count ${ok ? "ok" : ""}`}>
      {ok ? `${n}文字` : `あと${MIN_LEN - n}文字`}
    </span>
  );
}

function ArticleCard({ a, isAdmin, onEdit, onDelete }) {
  const inner = (
    <>
      <div className="art-thumb">
        {a.image ? <img src={a.image} alt="" loading="lazy" /> : <span className="art-thumb-ph">{a.type === "post" ? "✎" : "🔗"}</span>}
        <span className="art-badge">{a.type === "post" ? "記事" : "リンク"}</span>
        {a.status === "draft" && <span className="art-badge draft">下書き</span>}
      </div>
      <div className="art-body">
        <h3 className="art-title">{a.title}</h3>
        {a.excerpt && <p className="art-excerpt">{a.excerpt}</p>}
        <div className="art-foot">
          <span className="art-date">{fmtDate(a.createdAt)}</span>
          {a.tags.map((t) => <span key={t} className="art-tag">#{t}</span>)}
        </div>
      </div>
    </>
  );
  return (
    <div className={`art-card ${a.status === "draft" ? "is-draft" : ""}`}>
      {/* 下書きのリンク記事はURLが未入力のことがあるので、記事ページで確認できるようにする */}
      {a.type === "post" || a.status === "draft" ? (
        <Link className="art-link" to={`/article/${a.id}`}>{inner}</Link>
      ) : (
        <a className="art-link" href={a.url} target="_blank" rel="noopener noreferrer">{inner}</a>
      )}
      {isAdmin && (
        <div className="art-admin">
          <button className="edit-btn" aria-label="編集" onClick={() => onEdit(a)}>✎</button>
          <button className="delete-btn" aria-label="削除" onClick={() => onDelete(a)}>✕</button>
        </div>
      )}
    </div>
  );
}

function ArticleForm({ initial, onSubmit, onClose }) {
  const editing = !!initial;
  const isDraft = initial?.status === "draft";
  const [mode, setMode] = useState(initial?.type || "link");
  const [url, setUrl] = useState(initial?.url || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [image, setImage] = useState(initial?.image || "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt || "");
  const [body, setBody] = useState(initial?.body || "");
  const [tags, setTags] = useState(initial ? (initial.tags || []).join(", ") : "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);

  const grabOg = async () => {
    if (!/^https?:\/\//i.test(url)) { setErr("http(s)から始まるURLを入力してください"); return; }
    setErr(""); setFetching(true);
    try {
      const og = await api.fetchOg(url);
      if (og.title && !title) setTitle(og.title);
      if (og.title) setTitle((t) => t || og.title);
      if (og.image) setImage(og.image);
      if (og.description && !excerpt) setExcerpt(og.description);
      if (!og.title && !og.image) setErr("自動取得できませんでした。タイトルなどを手入力してください。");
    } catch (e) {
      setErr(e.message || "取得に失敗しました");
    } finally {
      setFetching(false);
    }
  };

  // status: "draft"(下書き保存) または "published"(公開)
  const submit = async (status) => {
    if (!title.trim()) { setErr("タイトルを入力してください"); return; }
    // 下書きは書きかけで保存できるようにし、公開するときだけ文字数を必須にする
    if (status === "published") {
      if (title.trim().length < MIN_LEN) {
        setErr(`タイトルは${MIN_LEN}文字以上で入力してください(現在 ${title.trim().length} 文字)`); return;
      }
      if (excerpt.trim().length < MIN_LEN) {
        setErr(`要約・説明は${MIN_LEN}文字以上で入力してください(現在 ${excerpt.trim().length} 文字)`); return;
      }
    }
    // 下書きは書きかけで保存できるよう、URLの必須チェックは公開時だけ行う
    if (status === "published" && mode === "link" && !/^https?:\/\//i.test(url)) {
      setErr("http(s)から始まるURLを入力してください"); return;
    }
    const payload = {
      type: mode,
      title: title.trim(),
      url: mode === "link" ? url.trim() : "",
      image: image.trim(),
      excerpt: excerpt.trim(),
      body: mode === "post" ? body : "",
      tags: tags.split(/[,、\s]+/).map((t) => t.trim()).filter(Boolean),
      status,
    };
    setErr(""); setBusy(true);
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
        <h2 className="form-title">{editing ? "記事を編集" : "記事を追加"}</h2>

        <div className="art-mode">
          <button className={`art-mode-btn ${mode === "link" ? "active" : ""}`} onClick={() => setMode("link")}>🔗 リンクを貼る</button>
          <button className={`art-mode-btn ${mode === "post" ? "active" : ""}`} onClick={() => setMode("post")}>✎ 直接書く</button>
        </div>

        {mode === "link" && (
          <label className="field">
            <span className="field-label">記事のURL</span>
            <div className="field-inline">
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
              <button className="cancel-btn" onClick={grabOg} disabled={fetching}>{fetching ? "取得中…" : "自動取得"}</button>
            </div>
            <span className="field-hint">URLを入れて「自動取得」でタイトル・画像を読み込みます</span>
          </label>
        )}

        <label className="field">
          <span className="field-label">
            タイトル（{MIN_LEN}文字以上）
            <CharCount value={title} />
          </span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 6:0ディフェンスの崩し方" />
        </label>

        {mode === "post" ? (
          <label className="field">
            <span className="field-label">本文(Markdown可: ## 見出し / - 箇条書き / **太字** / [文字](URL))</span>
            <textarea className="art-editor" value={body} onChange={(e) => setBody(e.target.value)} rows={12} placeholder="ここに記事を書きます。" />
          </label>
        ) : (
          <label className="field">
            <span className="field-label">サムネイル画像URL(任意)</span>
            <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://.../image.jpg" />
          </label>
        )}

        <label className="field">
          <span className="field-label">
            要約・説明（{MIN_LEN}文字以上）
            <CharCount value={excerpt} />
          </span>
          <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} placeholder="一覧に表示される短い説明" />
        </label>

        <label className="field">
          <span className="field-label">タグ(カンマ・スペース区切り)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="例: 6:0, 崩し, 初心者向け" />
        </label>

        {err && <p className="form-error">{err}</p>}
        <div className="form-actions">
          <button className="cancel-btn" onClick={onClose} disabled={busy}>キャンセル</button>
          <button className="draft-btn" onClick={() => submit("draft")} disabled={busy}>
            {busy ? "保存中…" : "下書き保存"}
          </button>
          <button className="primary-btn" style={{ marginLeft: 0 }} onClick={() => submit("published")} disabled={busy}>
            {busy ? "保存中…" : isDraft ? "公開する" : editing ? "更新する" : "公開する"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Articles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [list, admin] = await Promise.all([api.listArticles(), api.session().catch(() => false)]);
        if (!alive) return;
        setArticles(list);
        setIsAdmin(admin);
      } catch (e) {
        if (alive) setLoadError(e.message || "読み込みに失敗しました");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const handleAdd = async (payload) => {
    const a = await api.addArticle(payload);
    setArticles((prev) => [a, ...prev]);
  };
  const handleUpdate = async (payload) => {
    const a = await api.updateArticle(editing.id, payload);
    setArticles((prev) => prev.map((x) => (x.id === a.id ? a : x)));
  };
  // 一覧のデータには本文(body)が含まれていない。そのまま編集フォームへ渡すと
  // 本文が空のまま保存され、書いた記事が消えてしまう。
  // 編集を開くときは必ず本文つきの記事を取り直す。
  const openEdit = async (a) => {
    try {
      setEditing(await api.getArticle(a.id));
    } catch (e) {
      alert(`記事の読み込みに失敗しました。本文が消えるのを防ぐため編集を中止します。\n${e.message || ""}`);
    }
  };
  const handleDelete = async (a) => {
    if (!window.confirm(`「${a.title}」を削除しますか?`)) return;
    try {
      await api.deleteArticle(a.id);
      setArticles((prev) => prev.filter((x) => x.id !== a.id));
    } catch (e) {
      alert(e.message || "削除に失敗しました");
    }
  };

  return (
    <>
      <div className="admin-bar container" />
      <div className="container"><TabNav /></div>

      <header className="site-header">
        <div className="arc"><NineMeterArc width={340} /></div>
        <p className="eyebrow">HANDBALL TACTICS ・ ARTICLES</p>
        <h1 className="site-title">戦術記事</h1>
        <p className="site-sub">戦術の解説記事や、参考になる記事リンクをまとめる。</p>
      </header>

      <div className="container ad-wrap"><SponsorBanner /></div>

      {isAdmin && (
        <div className="container art-toolbar">
          <span className="admin-badge">● 管理者モード</span>
          <button className="primary-btn" onClick={() => setAdding(true)}>＋ 記事を追加</button>
        </div>
      )}

      <main className="container main-area">
        {loading ? (
          <div className="empty-state"><NineMeterArc width={180} color="rgba(242,238,230,0.25)" /><p>読み込み中…</p></div>
        ) : loadError ? (
          <div className="empty-state"><NineMeterArc width={180} color="rgba(242,238,230,0.25)" /><p>読み込みに失敗しました: {loadError}</p></div>
        ) : articles.length === 0 ? (
          <div className="empty-state">
            <NineMeterArc width={180} color="rgba(242,238,230,0.25)" />
            <p>まだ記事がありません。{isAdmin ? "「＋ 記事を追加」から、リンクの共有や記事の執筆ができます。" : "管理者が記事を追加すると、ここに並びます。"}</p>
          </div>
        ) : (
          <div className="art-grid">
            {articles.map((a) => (
              <ArticleCard key={a.id} a={a} isAdmin={isAdmin} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      <footer className="container site-footer">
        <nav className="footer-links">
          <Link to="/">ライブラリ</Link>
          <Link to="/about">運営者情報・お問い合わせ</Link>
          <Link to="/privacy">プライバシーポリシー</Link>
        </nav>
      </footer>

      {adding && <ArticleForm onSubmit={handleAdd} onClose={() => setAdding(false)} />}
      {editing && <ArticleForm initial={editing} onSubmit={handleUpdate} onClose={() => setEditing(null)} />}
    </>
  );
}

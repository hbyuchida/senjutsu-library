import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { NineMeterArc, TabNav, SponsorBanner } from "../components/shared";

// スポンサー募集のご案内ページ。広告枠から遷移してくる。
// 掲載数はDBの実数を出す(古い数字を載せたままにしないため)。
export default function Sponsor() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [videos, taxo] = await Promise.all([api.listVideos(), api.taxonomy()]);
        if (!alive) return;
        const shorts = videos.filter((v) => v.end != null && v.end - (v.start || 0) > 0 && v.end - (v.start || 0) <= 480);
        setStats({
          videos: videos.length,
          shorts: shorts.length,
          players: (taxo.players || []).length,
          teams: (taxo.teams || []).length + (taxo.nationals || []).length,
        });
      } catch {
        /* 数字が出せなくてもページは表示する */
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <>
      <div className="admin-bar container" />
      <div className="container"><TabNav /></div>

      <header className="site-header">
        <div className="arc"><NineMeterArc width={340} /></div>
        <p className="eyebrow">SPONSOR</p>
        <h1 className="site-title">スポンサー募集中</h1>
        <p className="site-sub">ハンドボールに関わる方へ、戦術ライブラリへの掲載のご案内です。</p>
      </header>

      <main className="container doc-page sponsor-page">
        <section className="sp-lead">
          <p>
            「戦術ライブラリ」は、YouTubeのハンドボール戦術動画を
            <strong>局面・システム・チーム・代表・選手</strong>で整理して見返せる無料サービスです。
            指導者・選手・保護者の方にご利用いただいています。
          </p>
          <p>
            このサイトは広告収入で運営しておらず、<strong>スポンサー様のご支援で無料公開を続けています。</strong>
          </p>
        </section>

        {stats && (
          <section className="sp-stats">
            <div className="sp-stat"><span className="sp-num">{stats.videos}</span><span className="sp-label">掲載動画</span></div>
            <div className="sp-stat"><span className="sp-num">{stats.shorts}</span><span className="sp-label">ショート対象</span></div>
            <div className="sp-stat"><span className="sp-num">{stats.players}</span><span className="sp-label">選手タグ</span></div>
            <div className="sp-stat"><span className="sp-num">{stats.teams}</span><span className="sp-label">チーム・代表</span></div>
          </section>
        )}

        <h2>掲載イメージ</h2>
        <p>ヘッダー直下に、下記のようなバナーを掲載します（現在のスポンサー様の実例です）。</p>
        <div className="sp-example"><SponsorBanner /></div>

        <h2>掲載場所とバナーサイズ</h2>
        <ul>
          <li>
            <strong>ヘッダー直下バナー</strong>…ライブラリ・記事ページの最上部。最も目に入る位置です。<br />
            <span className="sp-size">推奨サイズ 1200×312px（横長・比率およそ3.8:1）／PNG・WebP</span>
          </li>
          <li>
            <strong>一覧内バナー</strong>…動画一覧の途中に挟み込む形で表示されます。<br />
            <span className="sp-size">レスポンシブ 320×50〜728×90px</span>
          </li>
          <li>
            <strong>カード枠</strong>…動画カードと同じ大きさで一覧に並びます。<br />
            <span className="sp-size">300×250px など</span>
          </li>
          <li>
            <strong>再生画面バナー</strong>…動画を再生した画面の下部に表示されます。<br />
            <span className="sp-size">レスポンシブ 320×50〜728×90px</span>
          </li>
        </ul>
        <p>バナーの制作が難しい場合は、ロゴをお預かりしてこちらで作成することもできます。</p>

        <h2>ご支援いただけると</h2>
        <ul>
          <li>ハンドボールに関心の高い層（指導者・選手・保護者）に直接届きます。</li>
          <li>バナーからは自社サイト・SNS・採用ページなど、ご希望のURLへ移動できます。</li>
          <li>掲載期間・掲載位置はご相談のうえ決定します。</li>
        </ul>

        <h2>掲載料金</h2>
        <p className="sp-todo">
          ※ここに料金プランを記載してください（例：月額◯◯円／期間◯ヶ月〜　など）。
        </p>

        <h2>お申し込み・お問い合わせ</h2>
        <p>
          掲載をご検討いただける場合は、下記よりお気軽にご連絡ください。
          掲載内容やバナーの制作についてもご相談いただけます。
        </p>
        <p className="sp-todo">
          ※ここに連絡先（メールアドレス・XのDM・お問い合わせフォームのURLなど）を記載してください。
        </p>
        <p>
          <Link className="shorts-link" to="/about">運営者情報はこちら</Link>
        </p>

        <h2>掲載についてのお願い</h2>
        <ul>
          <li>ハンドボールおよびスポーツに関わる内容を優先して掲載します。</li>
          <li>公序良俗に反するもの、誤解を招く表現を含むものはお断りする場合があります。</li>
        </ul>

        <p className="sp-back"><Link to="/">← ライブラリへ戻る</Link></p>
      </main>
    </>
  );
}

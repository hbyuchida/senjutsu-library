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

        <h2>掲載枠と月額料金</h2>
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr><th>掲載枠</th><th>位置・特徴</th><th>月額(税込)</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>ヘッダー下バナー</td>
                <td>トップ最上部。全訪問者の目に入る一等地</td>
                <td className="sp-price">8,000円</td>
              </tr>
              <tr>
                <td>動画再生画面下バナー</td>
                <td>動画視聴直後に表示。注目度が高い</td>
                <td className="sp-price">6,500円</td>
              </tr>
              <tr>
                <td>一覧内カード型広告</td>
                <td>動画カードに混ざる自然な表示形式</td>
                <td className="sp-price">4,000円</td>
              </tr>
              <tr>
                <td>フッターバナー</td>
                <td>全ページ下部。お試しに最適な入門枠</td>
                <td className="sp-price">3,000円</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>長期契約割引・オプション</h2>
        <ul>
          <li><strong>3ヶ月契約</strong>…月額より <strong>5% OFF</strong></li>
          <li><strong>6ヶ月契約</strong>…月額より <strong>10% OFF</strong></li>
          <li><strong>12ヶ月契約</strong>…月額より <strong>15% OFF</strong></li>
          <li><strong>バナー制作代行</strong>…入稿バナーの制作もご相談ください（別途お見積り）</li>
        </ul>

        <h2>掲載条件</h2>
        <ul>
          <li>
            入稿形式：画像（PNG / JPG）＋リンク先URL<br />
            <span className="sp-size">バナー（横長）は 728×90 または 320×100、カード型は 300×250 を推奨</span>
          </li>
          <li>お申し込みからおおむね5営業日以内に掲載を開始し、掲載URLとスクリーンショットをご報告します。</li>
          <li>お支払い：請求書払い（銀行振込・掲載開始月の前払い）。振込手数料はご負担をお願いします。</li>
          <li>掲載広告には「PR」表記を付けさせていただきます。</li>
          <li>公序良俗に反する内容、当サイトの読者層（特に小中学生の選手や関係者）にふさわしくない内容はお断りする場合があります。</li>
        </ul>

        <h2>お申し込み・お問い合わせ</h2>
        <p>掲載をご検討いただける場合は、下記よりお気軽にご連絡ください。</p>
        <ul className="sp-contact">
          <li><strong>運営</strong>：内田 康博</li>
          <li>
            <strong>メール</strong>：
            <a href="mailto:hb.yuchida@gmail.com">hb.yuchida@gmail.com</a>
          </li>
          <li>
            <strong>X</strong>：
            <a href="https://x.com/yatch22m" target="_blank" rel="noopener noreferrer">@yatch22m</a>
          </li>
        </ul>
        <p>
          <Link className="shorts-link" to="/about">運営者情報はこちら</Link>
        </p>

        <p className="sp-back"><Link to="/">← ライブラリへ戻る</Link></p>
      </main>
    </>
  );
}

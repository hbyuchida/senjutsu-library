import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { NineMeterArc, TabNav, SponsorBanner, AdSlot, ShareButton } from "../components/shared";

// サービス紹介ページ。SNSやnoteからの入口・指導者への紹介用。
// 数字はDBの実数を出す(紹介文と中身がずれないように)。
export default function Guide() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [videos, taxo] = await Promise.all([api.listVideos(), api.taxonomy()]);
        if (!alive) return;
        const shorts = videos.filter(
          (v) => v.end != null && v.end - (v.start || 0) > 0 && v.end - (v.start || 0) <= 480
        );
        const classes =
          (taxo.phases || []).length + (taxo.systems || []).length + (taxo.teams || []).length +
          (taxo.nationals || []).length + (taxo.players || []).length + (taxo.tags || []).length;
        setStats({ videos: videos.length, shorts: shorts.length, classes });
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
      <div className="container ad-wrap"><SponsorBanner /></div>

      <header className="site-header">
        <div className="arc"><NineMeterArc width={340} /></div>
        <p className="eyebrow">HANDBALL TACTICS LIBRARY</p>
        <h1 className="site-title">戦術ライブラリとは</h1>
        <p className="site-sub">ハンドボールの戦術動画を、見返せる形に整理する無料サービス。</p>
      </header>

      <main className="container guide-page">
        <section className="gd-hero">
          <p className="gd-problem">
            「あの戦術の動画、どこで見たっけ？」<br />
            YouTubeで見つけた良い動画も、あとで探そうとすると見つかりません。
          </p>
          <p className="gd-answer">
            戦術ライブラリは、動画を<strong>局面・システム・チーム・代表・選手</strong>で整理し、
            <strong>見たいときにすぐ引き出せる</strong>ようにするサービスです。
            登録不要・すべて無料で使えます。
          </p>
          <div className="gd-cta">
            <Link className="gd-btn primary" to="/">ライブラリを見る</Link>
            <Link className="gd-btn" to="/shorts">ショートで見る ▶</Link>
          </div>
        </section>

        {stats && (
          <section className="sp-stats">
            <div className="sp-stat"><span className="sp-num">{stats.videos}</span><span className="sp-label">掲載動画</span></div>
            <div className="sp-stat"><span className="sp-num">{stats.shorts}</span><span className="sp-label">ショート対象</span></div>
            <div className="sp-stat"><span className="sp-num">{stats.classes}</span><span className="sp-label">分類タグ</span></div>
            <div className="sp-stat"><span className="sp-num">0円</span><span className="sp-label">利用料</span></div>
          </section>
        )}

        <h2>できること</h2>

        <div className="gd-feature">
          <h3>① タグで探せる</h3>
          <p>
            「3:2:1ディフェンスの動画だけ見たい」「あの選手のプレー集が見たい」——
            局面・システム・チーム・代表・選手・タグから絞り込めます。
            動画のどこから見るか（開始・終了時間）も登録できるので、
            <strong>長い試合動画でも本題だけを見返せます。</strong>
          </p>
        </div>

        <div className="gd-feature">
          <h3>② ショートで流し見できる</h3>
          <p>
            8分以内の短いクリップだけを集めて、<strong>スワイプで次々と自動再生</strong>します。
            順番はランダムなので、開くたびに違う戦術に出会えます。全画面表示にも対応しています。
            移動時間や練習の合間に、気軽に見るのに向いています。
          </p>
          <p><Link className="shorts-link" to="/shorts">ショートを試す ▶</Link></p>
        </div>

        <div className="gd-feature">
          <h3>③ 記事で理解を深められる</h3>
          <p>
            「ユーゴとは何か」といった戦術の解説記事を掲載しています。
            記事の下には<strong>同じタグの動画が自動で並ぶ</strong>ので、
            文章で理解してから映像で確認できます。
          </p>
          <p><Link className="shorts-link" to="/articles">記事を読む ✎</Link></p>
        </div>

        <div className="gd-feature">
          <h3>④ 仲間に共有できる</h3>
          <p>
            動画ごとにURLがあり、X・LINEですぐ共有できます。
            「この動きを次の練習でやりたい」と、チームメイトや部員に送るのに使えます。
          </p>
        </div>

        <div className="ad-wrap"><AdSlot variant="banner" /></div>

        <h2>使い方は3ステップ</h2>
        <ol className="gd-steps">
          <li><strong>開く</strong>…登録もログインも不要です。そのまま使えます。</li>
          <li><strong>絞り込む</strong>…上部のタブから、見たい局面やシステム、選手を選びます。</li>
          <li><strong>再生する</strong>…サムネイルを押すとその場で再生。連続再生にも対応しています。</li>
        </ol>

        <h2>動画は誰でも追加できます</h2>
        <p>
          「この動画も入れてほしい」と思ったら、<strong>どなたでも追加できます。</strong>
          YouTubeのURLとタイトル・説明を入れるだけです。
          みんなで作る図書館のようなイメージで運営しています。
          （誤った内容や不適切な投稿を防ぐため、編集・削除は管理者のみが行えます）
        </p>

        <h2>スマホのホーム画面に置けます</h2>
        <p>
          アプリのように使えます。スマホでサイトを開き、ブラウザのメニューから
          「ホーム画面に追加」を選んでください。次からは1タップで開けます。
        </p>

        <section className="gd-final">
          <h2>まずは覗いてみてください</h2>
          <p>すべて無料です。会員登録もありません。</p>
          <div className="gd-cta">
            <Link className="gd-btn primary" to="/">ライブラリを見る</Link>
            <ShareButton
              title="戦術ライブラリ"
              text="ハンドボールの戦術動画をタグで整理して見返せるサイト｜戦術ライブラリ"
              label="🔗 紹介する"
              className="gd-btn"
            />
          </div>
        </section>

        <p className="sp-back">
          <Link to="/about">運営者情報</Link>　/　<Link to="/sponsor">スポンサー募集</Link>
        </p>
      </main>

      <footer className="container site-footer">
        <AdSlot variant="banner" />
      </footer>
    </>
  );
}

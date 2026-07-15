# 戦術ライブラリ (senjutsu-library)

YouTubeのハンドボール戦術動画を局面・システム・タグで整理して見返せるWebアプリ。

## 構成
- React 18 + Vite + react-router-dom
- データはブラウザのlocalStorageに保存(サーバー不要)
- Cloudflare Pages でのデプロイを想定

## Cloudflare Pages ビルド設定
- Build command: `npm run build`
- Build output directory: `dist`

## 広告(AdSense)導入箇所
1. `index.html` の head 内コメント部分に AdSense スクリプトを貼る
2. `src/components/shared.jsx` の `AdSlot` の中身を広告ユニットに差し替える
3. `public/ads.txt` に AdSense 管理画面で表示される1行を貼る

詳細は同梱の手順書を参照。

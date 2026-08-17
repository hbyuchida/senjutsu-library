// Google Search Console の所有権確認ファイル。
//
// public/ に置いた .html ファイルは、Cloudflare Pages の仕様で
// 拡張子なしURL(/google4834d1d49fbb0669)へ308リダイレクトされてしまう。
// リダイレクト先の中身は正しいものの、確認が失敗する可能性があるため、
// Functions で同じパスを直接返してリダイレクトを起こさないようにする。
//
// 所有権の確認が完了した後もファイルは残しておくこと(消すと確認が解除される)。
const CONTENT = "google-site-verification: google4834d1d49fbb0669.html";

export function onRequestGet() {
  return new Response(CONTENT, {
    headers: {
      // 実際にアップロードした .html ファイルと同じ形で返す
      "Content-Type": "text/html; charset=utf-8",
      // 確認をやり直したときに古い内容が使われないよう、キャッシュさせない。
      // (デプロイ伝播中に一度アプリのHTMLが返り、確認が失敗したことがあるため)
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

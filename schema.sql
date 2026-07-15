-- 戦術ライブラリ 共有DB (Cloudflare D1)
-- videos: 全訪問者で共有する動画一覧。追加は誰でも、編集/削除は管理者のみ(APIで制御)。

CREATE TABLE IF NOT EXISTS videos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id   TEXT    NOT NULL,
  title      TEXT    NOT NULL,
  memo       TEXT    DEFAULT '',
  phase      TEXT    DEFAULT '',
  systems    TEXT    DEFAULT '[]',   -- JSON配列
  tags       TEXT    DEFAULT '[]',   -- JSON配列
  start      INTEGER DEFAULT 0,
  end_sec    INTEGER,                -- NULL可(終了指定なし)
  sample     INTEGER DEFAULT 0,      -- 0/1
  created_at INTEGER NOT NULL        -- エポックms
);

CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos (created_at DESC);

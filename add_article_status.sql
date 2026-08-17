-- 記事に下書き状態を追加する。
-- status: 'published'(公開) | 'draft'(下書き)
-- 既存の記事は全て公開済みとして扱うため既定値は 'published'。
ALTER TABLE articles ADD COLUMN status TEXT NOT NULL DEFAULT 'published';

CREATE INDEX IF NOT EXISTS idx_articles_status ON articles (status, created_at DESC);

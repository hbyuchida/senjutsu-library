CREATE TABLE IF NOT EXISTS taxonomy (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(kind, name)
);

INSERT OR IGNORE INTO taxonomy (kind,name) VALUES
('phase','セットオフェンス'),
('phase','セットディフェンス'),
('phase','速攻'),
('phase','戻りの守備'),
('phase','GK・その他'),
('system','6:0 DF'),
('system','5:1 DF'),
('system','3:2:1 DF'),
('system','マンツーマン'),
('system','2ライン攻撃'),
('system','サイド展開'),
('system','ポストプレー'),
('system','7人'),
('system','パラレル'),
('system','ユーゴ'),
('tag','解説'),
('tag','世界基準'),
('tag','ユーゴ'),
('tag','組織攻撃'),
('tag','バルサ'),
('tag','戦術分析'),
('tag','2-2'),
('tag','サイドイン'),
('tag','サイドアウト'),
('tag','サイドシュート');

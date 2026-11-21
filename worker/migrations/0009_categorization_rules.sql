-- 0009: user-owned "contains text -> category" rules for fast entry.
CREATE TABLE IF NOT EXISTS categorization_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  match_text TEXT NOT NULL,
  category_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categorization_rules_user ON categorization_rules(user_id);

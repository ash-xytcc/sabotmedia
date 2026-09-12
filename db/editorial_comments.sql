CREATE TABLE IF NOT EXISTS editorial_comments (
  id TEXT PRIMARY KEY,
  native_content_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL DEFAULT '',
  author_email TEXT NOT NULL DEFAULT '',
  author_display_name TEXT NOT NULL DEFAULT '',
  author_role TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'comment',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_editorial_comments_native_content
ON editorial_comments(native_content_id, created_at);

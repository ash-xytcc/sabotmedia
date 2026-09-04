CREATE TABLE IF NOT EXISTS episode_destination_state (
  episode_id TEXT NOT NULL,
  destination TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  remote_id TEXT NOT NULL DEFAULT '',
  remote_url TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  override_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (episode_id, destination)
);

CREATE TABLE IF NOT EXISTS episode_publish_jobs (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL,
  destination TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  idempotency_key TEXT NOT NULL UNIQUE,
  depends_on_id TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  available_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS episode_publish_job_results (
  job_id TEXT PRIMARY KEY,
  result_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_episode_jobs_status_available
  ON episode_publish_jobs(status, available_at);
CREATE INDEX IF NOT EXISTS idx_episode_jobs_episode
  ON episode_publish_jobs(episode_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_episode_destination_episode
  ON episode_destination_state(episode_id, updated_at DESC);

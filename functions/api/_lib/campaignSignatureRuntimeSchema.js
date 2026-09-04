const REQUIRED_SIGNATURE_COLUMNS = [
  ['signer_type', "TEXT NOT NULL DEFAULT 'individual'"],
  ['display_name', "TEXT NOT NULL DEFAULT ''"],
  ['affiliation', "TEXT NOT NULL DEFAULT ''"],
  ['organization_name', "TEXT NOT NULL DEFAULT ''"],
  ['contact_name', "TEXT NOT NULL DEFAULT ''"],
  ['role', "TEXT NOT NULL DEFAULT ''"],
  ['website', "TEXT NOT NULL DEFAULT ''"],
  ['public_statement', "TEXT NOT NULL DEFAULT ''"],
  ['email', "TEXT NOT NULL DEFAULT ''"],
  ['email_hash', "TEXT NOT NULL DEFAULT ''"],
  ['status', "TEXT NOT NULL DEFAULT 'pending_email'"],
  ['verification_method', "TEXT NOT NULL DEFAULT 'email'"],
  ['verification_token_hash', 'TEXT'],
  ['verification_expires_at', 'TEXT'],
  ['verified_at', 'TEXT'],
  ['management_token_hash', 'TEXT'],
  ['management_created_at', 'TEXT'],
  ['published_at', 'TEXT'],
  ['revoked_at', 'TEXT'],
  ['moderation_note', "TEXT NOT NULL DEFAULT ''"],
  ['duplicate_flags_json', "TEXT NOT NULL DEFAULT '[]'"],
  ['abuse_flags_json', "TEXT NOT NULL DEFAULT '[]'"],
  ['website_domain_match', 'INTEGER'],
  ['created_at', "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"],
  ['updated_at', "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"],
]

export async function ensureCampaignSignatureRuntimeSchema(db) {
  const info = await db.prepare('PRAGMA table_info(campaign_signatures)').all()
  const rows = Array.isArray(info?.results) ? info.results : []
  if (!rows.length) return

  const existing = new Set(rows.map((row) => String(row?.name || '')))
  for (const [name, definition] of REQUIRED_SIGNATURE_COLUMNS) {
    if (existing.has(name)) continue
    await db.prepare(`ALTER TABLE campaign_signatures ADD COLUMN ${name} ${definition}`).run()
  }

  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaign_signatures_campaign_status ON campaign_signatures(campaign_id, status, created_at DESC)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaign_signatures_email_hash ON campaign_signatures(campaign_id, email_hash, created_at DESC)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaign_signatures_verify ON campaign_signatures(verification_token_hash)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaign_signatures_manage ON campaign_signatures(management_token_hash)').run()
}

import fs from 'node:fs'

function edit(path, pairs) {
  let s = fs.readFileSync(path, 'utf8')
  for (const [a,b] of pairs) {
    if (!s.includes(a)) throw new Error(`anchor missing: ${path}: ${a.slice(0,80)}`)
    s = s.replace(a,b)
  }
  fs.writeFileSync(path,s)
}

edit('functions/api/_lib/campaignSignatures.js', [
  ["  for (const sql of statements) await db.prepare(sql).run()\n}", "  for (const sql of statements) await db.prepare(sql).run()\n  try { await db.prepare(\"ALTER TABLE campaign_signatures ADD COLUMN public_statement TEXT NOT NULL DEFAULT ''\").run() } catch {}\n}"],
  ["  const website = safeWebsite(input.website)\n", "  const website = safeWebsite(input.website)\n  const publicStatement = clean(input.publicStatement, 1200)\n"],
  ["id, campaign_id, signer_type, display_name, affiliation, organization_name, contact_name, role, website, email, email_hash,", "id, campaign_id, signer_type, display_name, affiliation, organization_name, contact_name, role, website, public_statement, email, email_hash,"],
  [") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_email', 'email', ?, ?, NULL, NULL, ?, ?, ?, ?, ?)`)", ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_email', 'email', ?, ?, NULL, NULL, ?, ?, ?, ?, ?)` )"],
  [".bind(id, campaignId, signerType, displayName, affiliation, organizationName, contactName, role, website, email, emailHash,", ".bind(id, campaignId, signerType, displayName, affiliation, organizationName, contactName, role, website, publicStatement, email, emailHash,"],
  ["  const organizationName = patch.organizationName === undefined ? row.organization_name : clean(patch.organizationName, 220)\n  const now = new Date().toISOString()", "  const organizationName = patch.organizationName === undefined ? row.organization_name : clean(patch.organizationName, 220)\n  const publicStatement = patch.publicStatement === undefined ? row.public_statement : clean(patch.publicStatement, 1200)\n  const now = new Date().toISOString()"],
  ["SET display_name = ?, affiliation = ?, organization_name = ?, status = ?", "SET display_name = ?, affiliation = ?, organization_name = ?, public_statement = ?, status = ?"],
  [".bind(displayName, affiliation, organizationName, status, revoke ? now", ".bind(displayName, affiliation, organizationName, publicStatement, status, revoke ? now"],
  ["  const website = patch.website === undefined ? row.website : safeWebsite(patch.website)\n  await db.prepare(`UPDATE campaign_signatures SET status = ?, display_name = ?, affiliation = ?, organization_name = ?, role = ?, website = ?, moderation_note = ?", "  const website = patch.website === undefined ? row.website : safeWebsite(patch.website)\n  const publicStatement = patch.publicStatement === undefined ? row.public_statement : clean(patch.publicStatement, 1200)\n  await db.prepare(`UPDATE campaign_signatures SET status = ?, display_name = ?, affiliation = ?, organization_name = ?, role = ?, website = ?, public_statement = ?, moderation_note = ?"],
  [".bind(nextStatus, displayName, affiliation, organizationName, role, website, clean(patch.moderationNote", ".bind(nextStatus, displayName, affiliation, organizationName, role, website, publicStatement, clean(patch.moderationNote"],
  ["SELECT id, signer_type, display_name, affiliation, organization_name, role, website, published_at", "SELECT id, signer_type, display_name, affiliation, organization_name, role, website, public_statement, published_at"],
  ["    website: row.website,\n    publishedAt: row.published_at,", "    website: row.website,\n    publicStatement: row.public_statement || '',\n    publishedAt: row.published_at,"],
  ["    website: row.website,\n    ...(includeEmail ? { email: row.email } : {}),", "    website: row.website,\n    publicStatement: row.public_statement || '',\n    ...(includeEmail ? { email: row.email } : {}),"],
  ["'role','website','email','verification_method'", "'role','website','public_statement','email','verification_method'"]
])

edit('db/campaign_signatures.sql', [["  website TEXT NOT NULL DEFAULT '',\n  email TEXT NOT NULL,", "  website TEXT NOT NULL DEFAULT '',\n  public_statement TEXT NOT NULL DEFAULT '',\n  email TEXT NOT NULL,"]])

edit('src/components/CampaignSignaturesAdmin.jsx', [
  ["website: item.website || '' }))", "website: item.website || '', publicStatement: item.publicStatement || '' }))"],
  ["      {item.website ? <><dt>Website</dt><dd><a href={item.website} target=\"_blank\" rel=\"noreferrer\">{item.website}</a></dd></> : null}\n", "      {item.website ? <><dt>Website</dt><dd><a href={item.website} target=\"_blank\" rel=\"noreferrer\">{item.website}</a></dd></> : null}\n      {item.publicStatement ? <><dt>Public statement</dt><dd><blockquote>{item.publicStatement}</blockquote></dd></> : null}\n"],
  ["<EditField label=\"Website\" value={draft.website} onChange={(website) => setDraft((current) => ({ ...current, website }))} />", "<EditField label=\"Website\" value={draft.website} onChange={(website) => setDraft((current) => ({ ...current, website }))} /><label className=\"campaign-signature-admin__statement\"><span>Public statement</span><textarea maxLength={1200} rows={5} value={draft.publicStatement || ''} onChange={(event) => setDraft((current) => ({ ...current, publicStatement: event.target.value }))} /></label>"]
])

edit('src/campaign-signatures.css', [
  [".campaign-signature-field input,.campaign-signature-manage input,.campaign-signature-admin__edit input", ".campaign-signature-field input,.campaign-signature-field textarea,.campaign-signature-manage input,.campaign-signature-manage textarea,.campaign-signature-admin__edit input,.campaign-signature-admin__edit textarea"],
  [".campaign-signature-honeypot{", ".campaign-signature-field--statement small{justify-self:end;font-size:.72rem;opacity:.65}.campaign-signature-statement{margin:.55rem 0 0;padding:.55rem .7rem;border-left:3px solid currentColor;font-size:.92rem}.campaign-signature-statement p{margin:0}.campaign-signature-admin__statement{grid-column:1/-1;display:grid;gap:.2rem}.campaign-signature-admin__statement textarea{min-height:110px}.campaign-signature-honeypot{"]
])

console.log('done')

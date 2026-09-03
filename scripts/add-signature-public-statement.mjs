import fs from 'node:fs'

function patch(path, replacements) {
  let text = fs.readFileSync(path, 'utf8')
  for (const [before, after] of replacements) {
    if (!text.includes(before)) throw new Error(`missing anchor in ${path}: ${before.slice(0,100)}`)
    text = text.replace(before, after)
  }
  fs.writeFileSync(path, text)
}

patch('functions/api/_lib/campaignSignatures.js', [
  ["      website TEXT NOT NULL DEFAULT '',\n      email TEXT NOT NULL,", "      website TEXT NOT NULL DEFAULT '',\n      public_statement TEXT NOT NULL DEFAULT '',\n      email TEXT NOT NULL,"],
  ["  for (const sql of statements) await db.prepare(sql).run()\n}", "  for (const sql of statements) await db.prepare(sql).run()\n  try { await db.prepare(\"ALTER TABLE campaign_signatures ADD COLUMN public_statement TEXT NOT NULL DEFAULT ''\").run() } catch { /* already migrated */ }\n}"],
  ["  const website = safeWebsite(input.website)\n", "  const website = safeWebsite(input.website)\n  const publicStatement = clean(input.publicStatement, 1200)\n"],
  ["    id, campaign_id, signer_type, display_name, affiliation, organization_name, contact_name, role, website, email, email_hash,\n", "    id, campaign_id, signer_type, display_name, affiliation, organization_name, contact_name, role, website, public_statement, email, email_hash,\n"],
  ["  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_email', 'email', ?, ?, NULL, NULL, ?, ?, ?, ?, ?)`)
    .bind(id, campaignId, signerType, displayName, affiliation, organizationName, contactName, role, website, email, emailHash,", "  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_email', 'email', ?, ?, NULL, NULL, ?, ?, ?, ?, ?)`)
    .bind(id, campaignId, signerType, displayName, affiliation, organizationName, contactName, role, website, publicStatement, email, emailHash,"],
  ["  const organizationName = patch.organizationName === undefined ? row.organization_name : clean(patch.organizationName, 220)\n  const now", "  const organizationName = patch.organizationName === undefined ? row.organization_name : clean(patch.organizationName, 220)\n  const publicStatement = patch.publicStatement === undefined ? row.public_statement : clean(patch.publicStatement, 1200)\n  const now"],
  ["UPDATE campaign_signatures SET display_name = ?, affiliation = ?, organization_name = ?, status = ?", "UPDATE campaign_signatures SET display_name = ?, affiliation = ?, organization_name = ?, public_statement = ?, status = ?"],
  [".bind(displayName, affiliation, organizationName, status, revoke ? now", ".bind(displayName, affiliation, organizationName, publicStatement, status, revoke ? now"],
  ["SELECT id, signer_type, display_name, affiliation, organization_name, role, website, published_at", "SELECT id, signer_type, display_name, affiliation, organization_name, role, website, public_statement, published_at"],
  ["  const website = patch.website === undefined ? row.website : safeWebsite(patch.website)\n", "  const website = patch.website === undefined ? row.website : safeWebsite(patch.website)\n  const publicStatement = patch.publicStatement === undefined ? row.public_statement : clean(patch.publicStatement, 1200)\n"],
  ["SET status = ?, display_name = ?, affiliation = ?, organization_name = ?, role = ?, website = ?, moderation_note", "SET status = ?, display_name = ?, affiliation = ?, organization_name = ?, role = ?, website = ?, public_statement = ?, moderation_note"],
  [".bind(nextStatus, displayName, affiliation, organizationName, role, website, clean(patch.moderationNote", ".bind(nextStatus, displayName, affiliation, organizationName, role, website, publicStatement, clean(patch.moderationNote"],
  ["'role','website','email','verification_method'", "'role','website','public_statement','email','verification_method'"],
  ["    website: row.website,\n    publishedAt", "    website: row.website,\n    publicStatement: row.public_statement || '',\n    publishedAt"],
  ["    website: row.website,\n    ...(includeEmail", "    website: row.website,\n    publicStatement: row.public_statement || '',\n    ...(includeEmail"],
])

patch('db/campaign_signatures.sql', [
  ["  website TEXT NOT NULL DEFAULT '',\n  email TEXT NOT NULL,", "  website TEXT NOT NULL DEFAULT '',\n  public_statement TEXT NOT NULL DEFAULT '',\n  email TEXT NOT NULL,"],
])

patch('src/components/CampaignSignatures.jsx', [
  ["website: '', company: '', formStartedAt", "website: '', publicStatement: '', company: '', formStartedAt"],
  ["website: '', company: '', formStartedAt: Date.now() })", "website: '', publicStatement: '', company: '', formStartedAt: Date.now() })"],
  ["            <Field label=\"Email address\" type=\"email\" required value={form.email} onChange={(value) => patch('email', value)} />", "            <Field label=\"Email address\" type=\"email\" required value={form.email} onChange={(value) => patch('email', value)} />\n            <label className=\"campaign-signature-field\"><span>Public statement (optional)</span><textarea rows=\"5\" maxLength=\"1200\" value={form.publicStatement} onChange={(event) => patch('publicStatement', event.target.value)} placeholder=\"Optional message to appear with your name if the signature is approved.\" /><small>{form.publicStatement.length}/1200</small></label>"],
  ["{item.signerType === 'organization' && item.role ? <small>{item.role}</small> : null}</div></li>", "{item.signerType === 'organization' && item.role ? <small>{item.role}</small> : null}{item.publicStatement ? <blockquote><p>“{item.publicStatement}”</p></blockquote> : null}</div></li>"],
  ["<label><span>Affiliation</span><input value={managed.affiliation || ''}", "<label><span>Affiliation</span><input value={managed.affiliation || ''}"],
  ["<div className=\"campaign-signature-manage__actions\"><button type=\"button\" onClick={() => saveManaged({ displayName: managed.displayName, affiliation: managed.affiliation })}", "<label><span>Public statement</span><textarea rows=\"4\" maxLength=\"1200\" value={managed.publicStatement || ''} onChange={(event) => setManaged((item) => ({ ...item, publicStatement: event.target.value }))} /></label><div className=\"campaign-signature-manage__actions\"><button type=\"button\" onClick={() => saveManaged({ displayName: managed.displayName, affiliation: managed.affiliation, publicStatement: managed.publicStatement })}"],
])

patch('src/components/CampaignSignaturesAdmin.jsx', [
  ["website: item.website || '' }))", "website: item.website || '', publicStatement: item.publicStatement || '' }))"],
  ["{item.affiliation ? <><dt>Affiliation</dt><dd>{item.affiliation}</dd></> : null}", "{item.affiliation ? <><dt>Affiliation</dt><dd>{item.affiliation}</dd></> : null}{item.publicStatement ? <><dt>Public statement</dt><dd><blockquote>{item.publicStatement}</blockquote></dd></> : null}"],
  ["<EditField label=\"Website\" value={draft.website} onChange={(website) => setDraft((current) => ({ ...current, website }))} /><div>", "<EditField label=\"Website\" value={draft.website} onChange={(website) => setDraft((current) => ({ ...current, website }))} /><label><span>Public statement</span><textarea rows=\"5\" maxLength=\"1200\" value={draft.publicStatement || ''} onChange={(event) => setDraft((current) => ({ ...current, publicStatement: event.target.value }))} /></label><div>"],
])

patch('src/campaign-signatures.css', [
  [".campaign-signature-field input,.campaign-signature-manage input,.campaign-signature-admin__edit input{", ".campaign-signature-field input,.campaign-signature-field textarea,.campaign-signature-manage input,.campaign-signature-manage textarea,.campaign-signature-admin__edit input,.campaign-signature-admin__edit textarea{"],
  [".campaign-signature-group li small{margin-top:.2rem;opacity:.7}", ".campaign-signature-group li small{margin-top:.2rem;opacity:.7}.campaign-signature-group blockquote{margin:.65rem 0 0;padding:.55rem .7rem;border-left:3px solid currentColor;font-size:.9rem}.campaign-signature-group blockquote p{margin:0}"],
])

console.log('public statement support applied')

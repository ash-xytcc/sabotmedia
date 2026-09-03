import fs from 'node:fs'

function edit(path, fn) {
  const before = fs.readFileSync(path, 'utf8')
  const after = fn(before)
  if (after === before) throw new Error(`No changes applied to ${path}`)
  fs.writeFileSync(path, after)
}
function swap(text, before, after, label) {
  if (!text.includes(before)) throw new Error(`Missing ${label || before.slice(0,80)}`)
  return text.replace(before, after)
}

edit('functions/api/_lib/campaignSignatures.js', (text) => {
  text = swap(text,
`    const exists = await db.prepare('SELECT id FROM campaign_signatures WHERE id = ? LIMIT 1').bind(id).first()
    if (exists) continue
    const now = new Date().toISOString()
    await db.prepare(\`INSERT INTO campaign_signatures (
      id, campaign_id, signer_type, display_name, affiliation, organization_name, contact_name, role, website,
      email, email_hash, status, verification_method, verified_at, published_at, duplicate_flags_json, abuse_flags_json, created_at, updated_at
    ) VALUES (?, ?, 'organization', ?, ?, ?, '', '', ?, '', ?, 'approved', 'verified_manual', ?, ?, '[]', '[]', ?, ?)\`)
      .bind(id, campaignId, displayName, clean(item?.location, 180), displayName, safeWebsite(item?.url), await sha256(\`manual:\${campaignId}:\${legacyId}\`), now, now, now, now).run()`,
`    const existingById = await db.prepare('SELECT id FROM campaign_signatures WHERE id = ? LIMIT 1').bind(id).first()
    const existingByName = await db.prepare(\`SELECT id FROM campaign_signatures WHERE campaign_id = ? AND verification_method = 'verified_manual' AND lower(COALESCE(NULLIF(organization_name, ''), display_name)) = lower(?) LIMIT 1\`).bind(campaignId, displayName).first()
    if (existingById || existingByName) continue
    const now = new Date().toISOString()
    const signerType = item?.signerType === 'individual' ? 'individual' : 'organization'
    const organizationName = signerType === 'organization' ? displayName : ''
    await db.prepare(\`INSERT INTO campaign_signatures (
      id, campaign_id, signer_type, display_name, affiliation, organization_name, contact_name, role, website,
      email, email_hash, status, verification_method, verified_at, published_at, duplicate_flags_json, abuse_flags_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, '', '', ?, '', ?, 'approved', 'verified_manual', ?, ?, '[]', '[]', ?, ?)\`)
      .bind(id, campaignId, signerType, displayName, clean(item?.location, 180), organizationName, safeWebsite(item?.url), await sha256(\`manual:\${campaignId}:\${legacyId}\`), now, now, now, now).run()`, 'manual import')

  text = swap(text, `  const managementToken = randomSecret(32)\n  const now = new Date().toISOString()`, `  const now = new Date().toISOString()`, 'premature management token')
  text = swap(text,
`  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_email', 'email', ?, ?, ?, ?, ?, ?, ?, ?, ?)\`)
    .bind(id, campaignId, signerType, displayName, affiliation, organizationName, contactName, role, website, email, emailHash,
      await sha256(verificationToken), expiresAt, await sha256(managementToken), now, JSON.stringify(duplicateFlags), JSON.stringify(abuseFlags), websiteDomainMatch == null ? null : (websiteDomainMatch ? 1 : 0), now, now).run()

  return { accepted: true, id, email, verificationToken, managementToken, expiresAt }`,
`  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_email', 'email', ?, ?, NULL, NULL, ?, ?, ?, ?, ?)\`)
    .bind(id, campaignId, signerType, displayName, affiliation, organizationName, contactName, role, website, email, emailHash,
      await sha256(verificationToken), expiresAt, JSON.stringify(duplicateFlags), JSON.stringify(abuseFlags), websiteDomainMatch == null ? null : (websiteDomainMatch ? 1 : 0), now, now).run()

  return { accepted: true, id, email, verificationToken, expiresAt }`, 'submission token storage')
  text = swap(text,
`  await db.prepare(\`UPDATE campaign_signatures SET status = 'awaiting_moderation', verification_token_hash = NULL, verification_expires_at = NULL, verified_at = ?, updated_at = ? WHERE id = ? AND verification_token_hash = ?\`)
    .bind(now, now, row.id, tokenHash).run()
  return getPrivateSignature(db, row.id)`,
`  const managementToken = randomSecret(32)
  await db.prepare(\`UPDATE campaign_signatures SET status = 'awaiting_moderation', verification_token_hash = NULL, verification_expires_at = NULL, verified_at = ?, management_token_hash = ?, management_created_at = ?, updated_at = ? WHERE id = ? AND verification_token_hash = ?\`)
    .bind(now, await sha256(managementToken), now, now, row.id, tokenHash).run()
  return { ...(await getPrivateSignature(db, row.id)), managementToken }`, 'verification transition')
  return text
})

edit('functions/api/campaign-signatures.js', (text) => {
  text = swap(text,
`        const manageUrl = \`\${origin}/campaigns/\${campaign.slug}?manage-signature=\${encodeURIComponent(result.managementToken)}#signatories\`
        await sendSignatureEmail(context.env, {
          to: result.email,
          subject: \`Verify your signature: \${campaign.shortTitle || campaign.title}\`,
          text: \`Thanks for signing. Verify control of this email address here:\\n\\n\${verifyUrl}\\n\\nVerification does not publish your signature. After verification it goes to the Sabot moderation queue.\\n\\nPrivate management link:\\n\${manageUrl}\`,
        })`,
`        await sendSignatureEmail(context.env, {
          to: result.email,
          subject: \`Verify your signature: \${campaign.shortTitle || campaign.title}\`,
          text: \`Thanks for signing. Verify control of this email address here:\\n\\n\${verifyUrl}\\n\\nVerification does not publish your signature. After verification it goes to the Sabot moderation queue.\`,
        })`, 'submission email')
  text = swap(text,
`    await sendSignatureEmail(context.env, {
      to: item.email,
      subject: \`Signature verified: \${campaign?.shortTitle || campaign?.title || 'Sabot open letter'}\`,
      text: \`Your email address is verified. Your signature is now awaiting moderation and is not public yet.\\n\\nCampaign: \${origin}/campaigns/\${campaign?.slug || ''}#signatories\`,
    }).catch(() => {})`,
`    const manageUrl = \`\${origin}/campaigns/\${campaign?.slug || ''}#manage-signature=\${encodeURIComponent(item.managementToken || '')}\`
    await sendSignatureEmail(context.env, {
      to: item.email,
      subject: \`Signature verified: \${campaign?.shortTitle || campaign?.title || 'Sabot open letter'}\`,
      text: \`Your email address is verified. Your signature is now awaiting moderation and is not public yet.\\n\\nPrivate management link (keep this link private):\\n\${manageUrl}\`,
    }).catch(() => {})`, 'verification email')
  return text
})

edit('src/components/CampaignSignatures.jsx', (text) => {
  text = swap(text, `  const manageToken = useMemo(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('manage-signature') || '', [])`, `  const manageToken = useMemo(() => {\n    if (typeof window === 'undefined') return ''\n    const match = String(window.location.hash || '').match(/^#manage-signature=(.+)$/)\n    if (!match) return ''\n    try { return decodeURIComponent(match[1]) } catch { return '' }\n  }, [])`, 'fragment management token')
  text = swap(text, `    loadManagedSignature(manageToken).then((result) => setManaged(result.item)).catch(() => setManaged(null))`, `    loadManagedSignature(manageToken).then((result) => { setManaged(result.item); window.requestAnimationFrame(() => document.getElementById('signatories')?.scrollIntoView({ block: 'start' })) }).catch(() => setManaged(null))`, 'management scroll')
  return text
})

edit('functions/api/native-translations.js', (text) => {
  text = swap(text, `    const content = await resolveContent(db, contentId, slug)\n\n    if (!content) return json({ ok: false, error: 'content not found' }, 404)`, `    let content = await resolveContent(db, contentId, slug)\n    const bundledForRequestedSlug = bundledTranslationsForSlug(slug || content?.slug)\n    if (!content && slug && bundledForRequestedSlug.length) content = { id: \`bundled:\${slug}\`, slug, title: '' }\n\n    if (!content) return json({ ok: false, error: 'content not found' }, 404)`, 'bundled-only content fallback')
  text = swap(text, `    const storedTranslations = await listTranslations(db, content.id, {\n      includeUnpublished: permission.canEdit && url.searchParams.get('includeUnpublished') === '1',\n    })\n    const bundledTranslations = bundledTranslationsForSlug(content.slug)`, `    const storedTranslations = String(content.id).startsWith('bundled:') ? [] : await listTranslations(db, content.id, {\n      includeUnpublished: permission.canEdit && url.searchParams.get('includeUnpublished') === '1',\n    })\n    const bundledTranslations = bundledForRequestedSlug.length ? bundledForRequestedSlug : bundledTranslationsForSlug(content.slug)`, 'bundled merge')
  return text
})

edit('src/publicTranslationSelector.js', (text) => {
  text = swap(text, `const ORIGINAL_HERO_ATTR = 'data-sabot-original-hero'`, `const ORIGINAL_HERO_ATTR = 'data-sabot-original-hero'\nconst ORIGINAL_META_ATTR = 'data-sabot-original-content'`, 'translation meta marker')
  text = swap(text, `function restoreOriginalHero() {`, `function applyTranslatedMeta(body, title) {\n  const pairs = [\n    ['meta[property="og:image"]', body?.socialImage || body?.heroImage],\n    ['meta[name="twitter:image"]', body?.socialImage || body?.heroImage],\n    ['meta[property="og:title"]', title],\n    ['meta[name="twitter:title"]', title],\n    ['meta[name="description"]', body?.seoDescription],\n    ['meta[property="og:description"]', body?.seoDescription],\n  ]\n  for (const [selector, value] of pairs) {\n    if (!value) continue\n    const node = document.querySelector(selector)\n    if (!node) continue\n    if (!node.hasAttribute(ORIGINAL_META_ATTR)) node.setAttribute(ORIGINAL_META_ATTR, node.getAttribute('content') || '')\n    node.setAttribute('content', String(value))\n  }\n}\n\nfunction restoreOriginalMeta() {\n  document.querySelectorAll(\`[\${ORIGINAL_META_ATTR}]\`).forEach((node) => {\n    node.setAttribute('content', node.getAttribute(ORIGINAL_META_ATTR) || '')\n    node.removeAttribute(ORIGINAL_META_ATTR)\n  })\n}\n\nfunction restoreOriginalHero() {`, 'translated social metadata')
  text = swap(text, `  applyTranslatedHero(body)\n\n  document.documentElement.lang = translation.code`, `  applyTranslatedHero(body)\n  applyTranslatedMeta(body, title)\n\n  document.documentElement.lang = translation.code`, 'apply social metadata')
  text = swap(text, `      restoreOriginalHero()\n      document.documentElement.removeAttribute(LOCAL_TRANSLATION_ATTR)`, `      restoreOriginalHero()\n      restoreOriginalMeta()\n      document.documentElement.removeAttribute(LOCAL_TRANSLATION_ATTR)`, 'restore social metadata')
  return text
})

edit('functions/api/_lib/nativePublicTranslations.js', (text) => {
  text = swap(text, `      heroImageAlt: String(translation.heroImageAlt || translation.hero_image_alt || input.heroImageAlt || input.hero_image_alt || ''),`, `      heroImageAlt: String(translation.heroImageAlt || translation.hero_image_alt || input.heroImageAlt || input.hero_image_alt || ''),\n      socialImage: String(translation.socialImage || translation.social_image || input.socialImage || input.social_image || ''),`, 'translation social image model')
  text = swap(text, `      heroImageAlt: strings.heroImageAlt,`, `      heroImageAlt: strings.heroImageAlt,\n      socialImage: strings.socialImage,`, 'Weblate social image')
  return text
})

edit('functions/api/_lib/bundledNativeTranslations.js', (text) => swap(text, `        heroImage: '/campaigns/autistici-inventati/graphics/a-network-called-resistance-it.svg',`, `        heroImage: '/campaigns/autistici-inventati/graphics/a-network-called-resistance-it.svg',\n        socialImage: '/campaigns/autistici-inventati/graphics/a-network-called-resistance-it.png',`, 'Italian social image'))
edit('functions/api/_lib/bundledCampaignSignatureSeeds.js', (text) => {
  text = swap(text, `{ id: 'signer-eric-gallager', name: 'Eric Gallager', location: 'New Hampshire, USA' }`, `{ id: 'signer-eric-gallager', name: 'Eric Gallager', location: 'New Hampshire, USA', signerType: 'individual' }`, 'Eric signer type')
  return swap(text, `{ id: 'signer-jeremy-smith', name: 'Jeremy Beausoleil Smith', location: 'Oregon, USA' }`, `{ id: 'signer-jeremy-smith', name: 'Jeremy Beausoleil Smith', location: 'Oregon, USA', signerType: 'individual' }`, 'Jeremy signer type')
})

console.log('hardening v2 applied')

import fs from 'node:fs'

function patch(path, replacements) {
  let text = fs.readFileSync(path, 'utf8')
  for (const [before, after] of replacements) {
    if (!text.includes(before)) throw new Error(`Missing patch anchor in ${path}: ${before.slice(0, 120)}`)
    text = text.replace(before, after)
  }
  fs.writeFileSync(path, text)
}

patch('functions/api/_lib/campaignSignatures.js', [
  [
    "    const exists = await db.prepare('SELECT id FROM campaign_signatures WHERE id = ? LIMIT 1').bind(id).first()\n    if (exists) continue\n    const now = new Date().toISOString()\n    await db.prepare(`INSERT INTO campaign_signatures (\n      id, campaign_id, signer_type, display_name, affiliation, organization_name, contact_name, role, website,\n      email, email_hash, status, verification_method, verified_at, published_at, duplicate_flags_json, abuse_flags_json, created_at, updated_at\n    ) VALUES (?, ?, 'organization', ?, ?, ?, '', '', ?, '', ?, 'approved', 'verified_manual', ?, ?, '[]', '[]', ?, ?)` )",
    "    const existingById = await db.prepare('SELECT id FROM campaign_signatures WHERE id = ? LIMIT 1').bind(id).first()\n    const existingByName = await db.prepare(`SELECT id FROM campaign_signatures WHERE campaign_id = ? AND verification_method = 'verified_manual' AND lower(COALESCE(NULLIF(organization_name, ''), display_name)) = lower(?) LIMIT 1`).bind(campaignId, displayName).first()\n    if (existingById || existingByName) continue\n    const now = new Date().toISOString()\n    const signerType = item?.signerType === 'individual' ? 'individual' : 'organization'\n    const organizationName = signerType === 'organization' ? displayName : ''\n    await db.prepare(`INSERT INTO campaign_signatures (\n      id, campaign_id, signer_type, display_name, affiliation, organization_name, contact_name, role, website,\n      email, email_hash, status, verification_method, verified_at, published_at, duplicate_flags_json, abuse_flags_json, created_at, updated_at\n    ) VALUES (?, ?, ?, ?, ?, ?, '', '', ?, '', ?, 'approved', 'verified_manual', ?, ?, '[]', '[]', ?, ?)` )"
  ],
  [
    ".bind(id, campaignId, displayName, clean(item?.location, 180), displayName, safeWebsite(item?.url), await sha256(`manual:${campaignId}:${legacyId}`), now, now, now, now).run()",
    ".bind(id, campaignId, signerType, displayName, clean(item?.location, 180), organizationName, safeWebsite(item?.url), await sha256(`manual:${campaignId}:${legacyId}`), now, now, now, now).run()"
  ],
  [
    "  const managementToken = randomSecret(32)\n  const now = new Date().toISOString()",
    "  const now = new Date().toISOString()"
  ],
  [
    "    status, verification_method, verification_token_hash, verification_expires_at, management_token_hash, management_created_at,\n    duplicate_flags_json, abuse_flags_json, website_domain_match, created_at, updated_at\n  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_email', 'email', ?, ?, ?, ?, ?, ?, ?, ?, ?)` )\n    .bind(id, campaignId, signerType, displayName, affiliation, organizationName, contactName, role, website, email, emailHash,\n      await sha256(verificationToken), expiresAt, await sha256(managementToken), now, JSON.stringify(duplicateFlags), JSON.stringify(abuseFlags), websiteDomainMatch == null ? null : (websiteDomainMatch ? 1 : 0), now, now).run()\n\n  return { accepted: true, id, email, verificationToken, managementToken, expiresAt }",
    "    status, verification_method, verification_token_hash, verification_expires_at, management_token_hash, management_created_at,\n    duplicate_flags_json, abuse_flags_json, website_domain_match, created_at, updated_at\n  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_email', 'email', ?, ?, NULL, NULL, ?, ?, ?, ?, ?)` )\n    .bind(id, campaignId, signerType, displayName, affiliation, organizationName, contactName, role, website, email, emailHash,\n      await sha256(verificationToken), expiresAt, JSON.stringify(duplicateFlags), JSON.stringify(abuseFlags), websiteDomainMatch == null ? null : (websiteDomainMatch ? 1 : 0), now, now).run()\n\n  return { accepted: true, id, email, verificationToken, expiresAt }"
  ],
  [
    "  const now = new Date().toISOString()\n  const row = await db.prepare(`SELECT * FROM campaign_signatures WHERE verification_token_hash = ? AND status = 'pending_email' LIMIT 1`).bind(tokenHash).first()\n  if (!row || !row.verification_expires_at || Date.parse(row.verification_expires_at) <= Date.now()) throw httpError('This verification link is invalid or expired.', 400)\n  await db.prepare(`UPDATE campaign_signatures SET status = 'awaiting_moderation', verification_token_hash = NULL, verification_expires_at = NULL, verified_at = ?, updated_at = ? WHERE id = ? AND verification_token_hash = ?`)\n    .bind(now, now, row.id, tokenHash).run()\n  return getPrivateSignature(db, row.id)",
    "  const now = new Date().toISOString()\n  const row = await db.prepare(`SELECT * FROM campaign_signatures WHERE verification_token_hash = ? AND status = 'pending_email' LIMIT 1`).bind(tokenHash).first()\n  if (!row || !row.verification_expires_at || Date.parse(row.verification_expires_at) <= Date.now()) throw httpError('This verification link is invalid or expired.', 400)\n  const managementToken = randomSecret(32)\n  await db.prepare(`UPDATE campaign_signatures SET status = 'awaiting_moderation', verification_token_hash = NULL, verification_expires_at = NULL, verified_at = ?, management_token_hash = ?, management_created_at = ?, updated_at = ? WHERE id = ? AND verification_token_hash = ?`)\n    .bind(now, await sha256(managementToken), now, now, row.id, tokenHash).run()\n  return { ...(await getPrivateSignature(db, row.id)), managementToken }"
  ],
])

patch('functions/api/campaign-signatures.js', [
  [
    "        const manageUrl = `${origin}/campaigns/${campaign.slug}?manage-signature=${encodeURIComponent(result.managementToken)}#signatories`\n        await sendSignatureEmail(context.env, {\n          to: result.email,\n          subject: `Verify your signature: ${campaign.shortTitle || campaign.title}`,\n          text: `Thanks for signing. Verify control of this email address here:\\n\\n${verifyUrl}\\n\\nVerification does not publish your signature. After verification it goes to the Sabot moderation queue.\\n\\nPrivate management link:\\n${manageUrl}`,\n        })",
    "        await sendSignatureEmail(context.env, {\n          to: result.email,\n          subject: `Verify your signature: ${campaign.shortTitle || campaign.title}`,\n          text: `Thanks for signing. Verify control of this email address here:\\n\\n${verifyUrl}\\n\\nVerification does not publish your signature. After verification it goes to the Sabot moderation queue.`,\n        })"
  ],
  [
    "    await sendSignatureEmail(context.env, {\n      to: item.email,\n      subject: `Signature verified: ${campaign?.shortTitle || campaign?.title || 'Sabot open letter'}`,\n      text: `Your email address is verified. Your signature is now awaiting moderation and is not public yet.\\n\\nCampaign: ${origin}/campaigns/${campaign?.slug || ''}#signatories`,\n    }).catch(() => {})",
    "    const manageUrl = `${origin}/campaigns/${campaign?.slug || ''}#manage-signature=${encodeURIComponent(item.managementToken || '')}`\n    await sendSignatureEmail(context.env, {\n      to: item.email,\n      subject: `Signature verified: ${campaign?.shortTitle || campaign?.title || 'Sabot open letter'}`,\n      text: `Your email address is verified. Your signature is now awaiting moderation and is not public yet.\\n\\nPrivate management link (keep this link private):\\n${manageUrl}`,\n    }).catch(() => {})"
  ],
])

patch('src/components/CampaignSignatures.jsx', [
  [
    "  const manageToken = useMemo(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('manage-signature') || '', [])",
    "  const manageToken = useMemo(() => {\n    if (typeof window === 'undefined') return ''\n    const match = String(window.location.hash || '').match(/^#manage-signature=(.+)$/)\n    if (!match) return ''\n    try { return decodeURIComponent(match[1]) } catch { return '' }\n  }, [])"
  ],
  [
    "    loadManagedSignature(manageToken).then((result) => setManaged(result.item)).catch(() => setManaged(null))",
    "    loadManagedSignature(manageToken).then((result) => { setManaged(result.item); window.requestAnimationFrame(() => document.getElementById('signatories')?.scrollIntoView({ block: 'start' })) }).catch(() => setManaged(null))"
  ],
])

patch('functions/api/native-translations.js', [
  [
    "    const content = await resolveContent(db, contentId, slug)\n\n    if (!content) return json({ ok: false, error: 'content not found' }, 404)",
    "    let content = await resolveContent(db, contentId, slug)\n    const bundledForRequestedSlug = bundledTranslationsForSlug(slug || content?.slug)\n    if (!content && slug && bundledForRequestedSlug.length) content = { id: `bundled:${slug}`, slug, title: '' }\n\n    if (!content) return json({ ok: false, error: 'content not found' }, 404)"
  ],
  [
    "    const storedTranslations = await listTranslations(db, content.id, {\n      includeUnpublished: permission.canEdit && url.searchParams.get('includeUnpublished') === '1',\n    })\n    const bundledTranslations = bundledTranslationsForSlug(content.slug)",
    "    const storedTranslations = String(content.id).startsWith('bundled:') ? [] : await listTranslations(db, content.id, {\n      includeUnpublished: permission.canEdit && url.searchParams.get('includeUnpublished') === '1',\n    })\n    const bundledTranslations = bundledForRequestedSlug.length ? bundledForRequestedSlug : bundledTranslationsForSlug(content.slug)"
  ],
])

patch('src/publicTranslationSelector.js', [
  [
    "const ORIGINAL_HERO_ATTR = 'data-sabot-original-hero'",
    "const ORIGINAL_HERO_ATTR = 'data-sabot-original-hero'\nconst ORIGINAL_META_ATTR = 'data-sabot-original-content'"
  ],
  [
    "function restoreOriginalHero() {",
    "function applyTranslatedMeta(body, title) {\n  const pairs = [\n    ['meta[property=\\\"og:image\\\"]', body?.socialImage || body?.heroImage],\n    ['meta[name=\\\"twitter:image\\\"]', body?.socialImage || body?.heroImage],\n    ['meta[property=\\\"og:title\\\"]', title],\n    ['meta[name=\\\"twitter:title\\\"]', title],\n    ['meta[name=\\\"description\\\"]', body?.seoDescription],\n    ['meta[property=\\\"og:description\\\"]', body?.seoDescription],\n  ]\n  for (const [selector, value] of pairs) {\n    if (!value) continue\n    const node = document.querySelector(selector)\n    if (!node) continue\n    if (!node.hasAttribute(ORIGINAL_META_ATTR)) node.setAttribute(ORIGINAL_META_ATTR, node.getAttribute('content') || '')\n    node.setAttribute('content', String(value))\n  }\n}\n\nfunction restoreOriginalMeta() {\n  document.querySelectorAll(`[${ORIGINAL_META_ATTR}]`).forEach((node) => {\n    node.setAttribute('content', node.getAttribute(ORIGINAL_META_ATTR) || '')\n    node.removeAttribute(ORIGINAL_META_ATTR)\n  })\n}\n\nfunction restoreOriginalHero() {"
  ],
  [
    "  applyTranslatedHero(body)\n\n  document.documentElement.lang = translation.code",
    "  applyTranslatedHero(body)\n  applyTranslatedMeta(body, title)\n\n  document.documentElement.lang = translation.code"
  ],
  [
    "      restoreOriginalHero()\n      document.documentElement.removeAttribute(LOCAL_TRANSLATION_ATTR)",
    "      restoreOriginalHero()\n      restoreOriginalMeta()\n      document.documentElement.removeAttribute(LOCAL_TRANSLATION_ATTR)"
  ],
])

patch('functions/api/_lib/nativePublicTranslations.js', [
  [
    "      heroImageAlt: String(translation.heroImageAlt || translation.hero_image_alt || input.heroImageAlt || input.hero_image_alt || ''),",
    "      heroImageAlt: String(translation.heroImageAlt || translation.hero_image_alt || input.heroImageAlt || input.hero_image_alt || ''),\n      socialImage: String(translation.socialImage || translation.social_image || input.socialImage || input.social_image || ''),"
  ],
  [
    "      heroImageAlt: strings.heroImageAlt,",
    "      heroImageAlt: strings.heroImageAlt,\n      socialImage: strings.socialImage,"
  ],
])

patch('functions/api/_lib/bundledNativeTranslations.js', [
  [
    "        heroImage: '/campaigns/autistici-inventati/graphics/a-network-called-resistance-it.svg',",
    "        heroImage: '/campaigns/autistici-inventati/graphics/a-network-called-resistance-it.svg',\n        socialImage: '/campaigns/autistici-inventati/graphics/a-network-called-resistance-it.png',"
  ],
])

patch('functions/api/_lib/bundledCampaignSignatureSeeds.js', [
  ["{ id: 'signer-eric-gallager', name: 'Eric Gallager', location: 'New Hampshire, USA' }", "{ id: 'signer-eric-gallager', name: 'Eric Gallager', location: 'New Hampshire, USA', signerType: 'individual' }"],
  ["{ id: 'signer-jeremy-smith', name: 'Jeremy Beausoleil Smith', location: 'Oregon, USA' }", "{ id: 'signer-jeremy-smith', name: 'Jeremy Beausoleil Smith', location: 'Oregon, USA', signerType: 'individual' }"],
])

console.log('security + localization hardening applied')

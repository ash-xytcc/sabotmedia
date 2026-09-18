import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { bundledTranslationsForSlug } from '../functions/api/_lib/bundledNativeTranslations.js'
import { signatureSeedsForCampaign } from '../functions/api/_lib/bundledCampaignSignatureSeeds.js'
import { compareEmailAndWebsiteDomain } from '../functions/api/_lib/campaignSignatures.js'

const signatureLib = fs.readFileSync(new URL('../functions/api/_lib/campaignSignatures.js', import.meta.url), 'utf8')
const signatureApi = fs.readFileSync(new URL('../functions/api/campaign-signatures.js', import.meta.url), 'utf8')
const publicUi = fs.readFileSync(new URL('../src/components/CampaignSignatures.jsx', import.meta.url), 'utf8')
const adminUi = fs.readFileSync(new URL('../src/components/CampaignSignaturesAdmin.jsx', import.meta.url), 'utf8')
const translationApi = fs.readFileSync(new URL('../functions/api/native-translations.js', import.meta.url), 'utf8')
const selector = fs.readFileSync(new URL('../src/publicTranslationSelector.js', import.meta.url), 'utf8')
const campaignPage = fs.readFileSync(new URL('../src/components/CampaignPage.jsx', import.meta.url), 'utf8')

function italian() {
  return bundledTranslationsForSlug('a-network-called-resistance').find((item) => item.languageCode === 'it')
}

test('1. submission verifies into moderation before approval can publish', () => {
  assert.match(signatureLib, /'pending_email'/)
  assert.match(signatureLib, /status = 'awaiting_moderation'/)
  assert.match(signatureLib, /const actions = \{ approve: 'approved'/)
  assert.match(signatureLib, /WHERE campaign_id = \? AND status = 'approved'/)
})

test('2. unverified signatures cannot appear publicly', () => {
  assert.match(signatureLib, /status TEXT NOT NULL DEFAULT 'pending_email'/)
  assert.doesNotMatch(signatureLib.match(/export async function listPublicSignatures[\s\S]*?\n\}/)?.[0] || '', /pending_email/)
})

test('3. rejected verified signatures remain non-public', () => {
  assert.match(signatureLib, /reject: 'rejected'/)
  assert.match(signatureLib, /WHERE campaign_id = \? AND status = 'approved'/)
})

test('4. organization submissions still require moderation', () => {
  assert.match(signatureLib, /signerType = input\.signerType === 'organization'/)
  assert.match(signatureLib, /status = 'awaiting_moderation'/)
  assert.match(signatureLib, /Email verification is required before approval/)
})

test('5. duplicates are retained as moderation signals, not silently approved', () => {
  assert.match(signatureLib, /duplicateRows/)
  assert.match(signatureLib, /repeat_email/)
  assert.match(adminUi, /Moderation signals/)
  assert.match(adminUi, /Signals never approve or reject a signer automatically/)
})

test('6. abuse controls include honeypot, rate limit and realistic completion timing', () => {
  assert.match(signatureLib, /website_confirm/)
  assert.match(signatureLib, /consumeRateLimit/)
  assert.match(signatureLib, /fast_completion/)
  assert.match(publicUi, /campaign-signature-honeypot/)
  assert.doesNotMatch(publicUi, /recaptcha|turnstile/i)
})

test('7. moderator bulk approval exists', () => {
  assert.match(signatureLib, /bulkModerateSignatures/)
  assert.match(adminUi, /Bulk approve/)
  assert.match(signatureApi, /action === 'bulk'/)
})

test('8. moderators can remove already published signatures', () => {
  assert.match(signatureLib, /revoke: 'revoked'/)
  assert.match(adminUi, /Remove \/ revoke/)
  assert.match(signatureLib, /published_at = \?/)
})

test('9. signers can revoke their own signature with a private fragment token', () => {
  assert.match(signatureLib, /patch\.revoke === true/)
  assert.match(signatureLib, /management_token_hash = CASE WHEN \? = 'revoked' THEN NULL/)
  assert.match(signatureApi, /#manage-signature=/)
  assert.match(publicUi, /window\.location\.hash/)
  assert.doesNotMatch(signatureApi, /\?manage-signature=/)
})

test('10. existing manual A/I signers are preserved and typed', () => {
  const seeds = signatureSeedsForCampaign('autistici-inventati')
  assert.equal(seeds.length, 13)
  assert.equal(seeds.find((item) => item.name === 'Eric Gallager')?.signerType, 'individual')
  assert.equal(seeds.find((item) => item.name === 'Jeremy Beausoleil Smith')?.signerType, 'individual')
  assert.match(signatureLib, /verified_manual/)
  assert.match(signatureLib, /existingByName/)
})

test('11. Italian interview is complete, cleaned and keeps all 23 numbered questions', () => {
  const item = italian()
  assert.ok(item)
  assert.equal(item.languageLabel, 'Italiano')
  const html = item.translation.bodyHtml
  const questions = [...html.matchAll(/<h3>(\d+)\./g)].map((match) => Number(match[1]))
  assert.deepEqual(questions, Array.from({ length: 23 }, (_, index) => index + 1))
  assert.doesNotMatch(html, /consocenza|&#039;|&quot;/)
  assert.match(html, /"Non siamo niente\. Saremo tutto\."/)
})

test('12. language switching keeps the same article route and identity', () => {
  const item = italian()
  assert.ok(item)
  assert.match(translationApi, /\/post\/\$\{encodeURIComponent\(String\(slug \|\| ''\)\)\}\?lang=/)
  assert.match(selector, /^function slugFromPath|function slugFromPath/m)
  assert.match(selector, /\/post\//)
  assert.match(translationApi, /bundled:\$\{slug\}/)
  assert.doesNotMatch(campaignPage, /a-network-called-resistance-it/)
})

test('13. English remains canonical/original and can be restored unchanged', () => {
  assert.match(translationApi, /current: \{ code: 'en', label: 'English' \}/)
  assert.match(selector, /restoreOriginalHero\(\)/)
  assert.match(selector, /restoreOriginalMeta\(\)/)
  assert.match(selector, /document\.documentElement\.lang = 'en'/)
})

test('14. Italian hero and social image are separate from English assets', () => {
  const item = italian()
  assert.equal(item.translation.heroImage, '/campaigns/autistici-inventati/graphics/a-network-called-resistance-it.svg')
  assert.equal(item.translation.socialImage, '/campaigns/autistici-inventati/graphics/a-network-called-resistance-it.png')
  assert.ok(fs.existsSync(new URL('../public/campaigns/autistici-inventati/graphics/a-network-called-resistance-it.svg', import.meta.url)))
  assert.ok(fs.existsSync(new URL('../public/campaigns/autistici-inventati/graphics/a-network-called-resistance-it.png', import.meta.url)))
  assert.match(selector, /body\?\.socialImage \|\| body\?\.heroImage/)
})

test('organization domain comparison is only a signal and handles common host variants', () => {
  assert.equal(compareEmailAndWebsiteDomain('contact@example.org', 'https://example.org/about'), true)
  assert.equal(compareEmailAndWebsiteDomain('contact@mail.example.org', 'https://www.example.org'), true)
  assert.equal(compareEmailAndWebsiteDomain('contact@unrelated.net', 'https://example.org'), false)
})

import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { blankCampaign, CAMPAIGN_SECTION_KEYS } from '../src/lib/campaignDeadline.js'
import { normalizeCampaign } from '../functions/api/_lib/campaigns.js'

const admin = fs.readFileSync(new URL('../src/components/CampaignAdminPage.jsx', import.meta.url), 'utf8')
const page = fs.readFileSync(new URL('../src/components/CampaignPage.jsx', import.meta.url), 'utf8')
const editor = fs.readFileSync(new URL('../src/components/NativeContentBridgePage.jsx', import.meta.url), 'utf8')
const api = fs.readFileSync(new URL('../functions/api/campaigns.js', import.meta.url), 'utf8')
const revisions = fs.readFileSync(new URL('../functions/api/campaign-revisions.js', import.meta.url), 'utf8')
const model = fs.readFileSync(new URL('../functions/api/_lib/campaigns.js', import.meta.url), 'utf8')
const backup = fs.readFileSync(new URL('../src/lib/systemBackup.js', import.meta.url), 'utf8')

test('post editor loads every D1 campaign instead of a hard-coded option', () => {
  assert.match(editor, /loadCampaigns\(\{ includeDrafts: true \}\)/)
  assert.match(editor, /campaignOptions\.map/)
  assert.match(editor, /value=\{campaign\.slug\}/)
  assert.doesNotMatch(editor, /<option value="autistici-inventati"/)
})

test('campaign drafts save before opening an authenticated public preview', () => {
  assert.match(admin, /Save \+ Preview/)
  assert.match(admin, /save\(\{ previewWindow \}\)/)
  assert.match(admin, /\?preview=1/)
  assert.match(page, /includeDrafts: previewDraft/)
})

test('campaign editor protects dirty work and keeps revision history in D1', () => {
  assert.match(admin, /beforeunload/)
  assert.match(admin, /Unsaved changes/)
  assert.match(admin, /Discard the unsaved campaign changes/)
  assert.match(admin, /Revision History/)
  assert.match(api, /saveCampaignRevision\(db, existing, 'before:save'\)/)
  assert.match(api, /saveCampaignRevision\(db, saved/)
  assert.match(revisions, /databaseUnavailable\('campaign revision reads'\)/)
  assert.match(revisions, /databaseUnavailable\('campaign revision restore'\)/)
  assert.match(model, /CREATE TABLE IF NOT EXISTS campaign_revisions/)
  assert.doesNotMatch(admin, /localStorage/)
})

test('section visibility, headings, and order persist for generic campaigns', () => {
  const blank = blankCampaign()
  assert.deepEqual(blank.sectionOrder, CAMPAIGN_SECTION_KEYS)
  assert.deepEqual(blank.hiddenSections, [])
  const normalized = normalizeCampaign({ title: 'Test', sectionOrder: ['social', 'reporting'], hiddenSections: ['faq', 'bogus'], sectionTitles: { reporting: 'Read this', bogus: 'No' } })
  assert.deepEqual(normalized.sectionOrder.slice(0, 2), ['social', 'reporting'])
  assert.deepEqual(normalized.hiddenSections, ['faq'])
  assert.deepEqual(normalized.sectionTitles, { reporting: 'Read this' })
  assert.match(admin, /Page Sections/)
  assert.match(page, /campaign-section-flow/)
  assert.match(page, /OrderedCampaignSections order=\{sectionOrder\}/)
  assert.match(page, /Children\.toArray\(children\)\.sort/)
  assert.doesNotMatch(page, /style=\{sectionStyle/)
  assert.match(page, /visibleSections\.map/)
})

test('campaign imagery reuses the persistent Media Library picker', () => {
  assert.match(admin, /MediaPickerModal/)
  assert.match(admin, /Choose from Media/)
  assert.match(admin, /Choose Campaign Media/)
  assert.match(admin, /mediaTarget\.section === 'graphics'/)
})

test('campaign revisions are included in verified system backups', () => {
  assert.match(backup, /campaignRevisions/)
  assert.match(backup, /fetchCampaignRevisionsForBackup/)
  assert.match(backup, /schemaVersion:\s*8/)
})

import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const page = fs.readFileSync(new URL('../src/components/CampaignPage.jsx', import.meta.url), 'utf8')
const model = fs.readFileSync(new URL('../functions/api/_lib/campaigns.js', import.meta.url), 'utf8')
const endpoint = fs.readFileSync(new URL('../functions/api/campaigns.js', import.meta.url), 'utf8')
const manifest = fs.readFileSync(new URL('../functions/api/_lib/aiCampaignGraphics.js', import.meta.url), 'utf8')

test('campaign media kit uses campaign graphics only', () => {
  assert.match(page, /const graphics = useMemo\(\(\) => campaign\?\.graphics \|\| \[\], \[campaign\]\)/)
  assert.doesNotMatch(page, /function mergeGraphics\(/)
  assert.doesNotMatch(page, /id: `piece-\$\{piece\.id \|\| piece\.slug\}`/)
})

test('bundled A\/I campaign-kit graphics migrate into persisted campaign graphics', () => {
  assert.match(model, /AI_CAMPAIGN_GRAPHICS_SEED/)
  assert.match(model, /graphics: AI_CAMPAIGN_GRAPHICS_SEED/)
  assert.match(model, /mergeAiCampaignGraphics\(next\.graphics\)/)
  assert.match(model, /current\.push\(item\)/)
  assert.match(model, /'sourceUrl'/)
  assert.match(manifest, /campaignKitGraphics = legacyGraphics\.filter/)
  assert.match(manifest, /!item\.imageUrl\.includes\('\/featured-image\.'\)/)
  assert.match(manifest, /export const AI_CAMPAIGN_GRAPHICS_SEED = \[\.\.\.sept4Quotes, \.\.\.campaignKitGraphics\]/)
  assert.match(manifest, /export const AI_CAMPAIGN_GRAPHICS = \[\]/)
})

test('new A\/I graphics are promoted ahead of existing graphics when saved', () => {
  assert.match(endpoint, /prependNewGraphics\(item\.graphics, existing\.graphics\)/)
  assert.match(endpoint, /return \[\.\.\.fresh\.reverse\(\), \.\.\.rest\]/)
})

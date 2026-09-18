import assert from 'node:assert/strict'
import fs from 'node:fs'

const page = fs.readFileSync('src/components/CampaignPage.jsx', 'utf8')
const sections = fs.readFileSync('src/lib/campaignSections.js', 'utf8')
const ai = fs.readFileSync('functions/api/_lib/aiCampaignPublic.js', 'utf8')

assert.match(sections, /key: 'officialsLetter'/)
assert.match(page, /showSection\('officialsLetter'\)/)
assert.match(page, /id="officialsLetter"/)
assert.match(page, /defaultLabel="Write to officials"/)
assert.match(page, /item\.id !== individualLetter\?\.resourceId/)
assert.match(ai, /individualLetter: \{ resourceId: pdfResource\.id/)
assert.match(ai, /Download the individual letter template/)
assert.doesNotMatch(page, /Use the organizational letter or the individual template/)

console.log('campaign officials letter action checks passed')

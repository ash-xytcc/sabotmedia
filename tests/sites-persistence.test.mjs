import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const client = fs.readFileSync(new URL('../src/lib/siteDomains.js', import.meta.url), 'utf8')
const component = fs.readFileSync(new URL('../src/components/SitesAdminPage.jsx', import.meta.url), 'utf8')
const api = fs.readFileSync(new URL('../functions/api/sites.js', import.meta.url), 'utf8')

test('sites client has no localStorage persistence fallback', () => {
  assert.doesNotMatch(client, /localStorage|SITES_STORAGE_KEY/)
  assert.match(client, /\/api\/sites/)
  assert.match(client, /data\.mode !== 'd1'/)
})

test('sites API fails closed without BF_DB and creates its schema idempotently', () => {
  assert.match(api, /BF_DB is not bound/)
  assert.match(api, /CREATE TABLE IF NOT EXISTS site_domains/)
  assert.match(api, /resolvePublicSitePermission/)
})

test('sites UI states the Cloudflare custom-domain boundary explicitly', () => {
  assert.match(component, /Workers &amp; Pages/)
  assert.match(component, /Custom domains/)
  assert.match(component, /sabot\.media/)
  assert.match(component, /does not configure or verify Cloudflare, DNS, TLS, redirects/)
  assert.match(component, /planning notes entered by an administrator/)
  assert.match(api, /isValidHostname/)
  assert.match(api, /canonical sabot\.media registry record cannot be deleted/)
})

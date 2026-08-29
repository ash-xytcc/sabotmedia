import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { isPublicCampaignPath, onRequest } from '../functions/_middleware.js'

const visibility = fs.readFileSync(new URL('../src/config/campaignVisibility.js', import.meta.url), 'utf8')
const routes = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const topbar = fs.readFileSync(new URL('../src/components/PublicationTopbar.jsx', import.meta.url), 'utf8')
const footer = fs.readFileSync(new URL('../src/components/PublicationFooter.jsx', import.meta.url), 'utf8')

test('A/I campaign launch links are hidden behind an explicit temporary flag', () => {
  assert.match(visibility, /SHOW_AI_CAMPAIGN_LINKS\s*=\s*false/)
  assert.match(topbar, /SHOW_AI_CAMPAIGN_LINKS\s*\?\s*<Link/)
  assert.match(footer, /SHOW_AI_CAMPAIGN_LINKS\s*\?\s*<Link/)
})

test('hiding launch links does not remove the direct campaign route', () => {
  assert.match(routes, /path=\{publicRoutes\.aiCampaign\}/)
  assert.match(routes, /<CampaignPage\s*\/>/)
})

test('campaign deep links receive the app shell even while launch links are hidden', async () => {
  assert.equal(isPublicCampaignPath('/campaigns/autistici-inventati'), true)
  assert.equal(isPublicCampaignPath('/campaigns/autistici-inventati/'), true)
  assert.equal(isPublicCampaignPath('/campaigning/autistici-inventati'), false)

  let fetchedPath = ''
  const response = await onRequest({
    request: new Request('https://sabot.media/campaigns/autistici-inventati'),
    env: {
      ASSETS: {
        fetch: async (request) => {
          fetchedPath = new URL(request.url).pathname
          return new Response('<!doctype html><title>Sabot Media</title>', {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          })
        },
      },
    },
    next: async () => new Response('not found', { status: 404 }),
  })

  assert.equal(response.status, 200)
  assert.equal(fetchedPath, '/index.html')
  assert.match(await response.text(), /Sabot Media/)
})

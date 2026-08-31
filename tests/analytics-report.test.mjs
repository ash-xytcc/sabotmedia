import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveNamedQueries } from '../functions/api/analytics/reportQueries.js'
import { resolvePageTitle } from '../functions/api/analytics/report.js'

test('analytics report preserves named result sections regardless of promise timing', async () => {
  const result = await resolveNamedQueries({
    summary: Promise.resolve({ views: 12 }),
    daily: new Promise((resolve) => setTimeout(() => resolve([{ day: '2026-08-27' }]), 5)),
    topPages: Promise.resolve([{ path: '/post/example' }]),
    referrers: Promise.resolve([{ referrer: 'example.org' }]),
    campaigns: Promise.resolve([{ label: 'summer-tour' }]),
    sources: Promise.resolve([{ label: 'External referral' }]),
  })

  assert.deepEqual(result.summary, { views: 12 })
  assert.equal(result.daily[0].day, '2026-08-27')
  assert.equal(result.topPages[0].path, '/post/example')
  assert.equal(result.referrers[0].referrer, 'example.org')
  assert.equal(result.campaigns[0].label, 'summer-tour')
  assert.equal(result.sources[0].label, 'External referral')
})

test('analytics report resolves current native titles by canonical path', () => {
  const titles = new Map([['example-story', 'Current Editorial Title']])
  assert.equal(resolvePageTitle({ path: '/post/example-story', title: 'Stale Page Title | Sabot Media' }, titles), 'Current Editorial Title')
  assert.equal(resolvePageTitle({ path: '/', title: 'Stale Page Title | Sabot Media' }, titles), 'Homepage')
  assert.equal(resolvePageTitle({ path: '/unknown-route', title: '' }, titles), 'Unknown Route')
})

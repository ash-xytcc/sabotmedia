import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const rail = fs.readFileSync(new URL('../src/components/AdminRail.jsx', import.meta.url), 'utf8')
const palette = fs.readFileSync(new URL('../src/components/AdminCommandPalette.jsx', import.meta.url), 'utf8')

for (const route of ['analytics', 'taxonomy', 'qa', 'siteHealth', 'backup', 'auditLog', 'sites', 'users']) {
  test(`admin rail exposes ${route} when capability permits it`, () => {
    assert.match(rail, new RegExp(`adminRoutes\\.${route}`))
  })
}

test('admin rail awaits the asynchronous site registry', () => {
  assert.match(rail, /const sites = await loadSites\(\)/)
  assert.doesNotMatch(rail, /useState\(\(\) => loadSites\(\)\)/)
})

test('navigation uses real Users and Access instead of advisory Editor Roles', () => {
  assert.match(rail, /Users & Access/)
  assert.doesNotMatch(rail, /Editor Roles|adminRoutes\.roles/)
  assert.doesNotMatch(palette, /Editor Roles|adminRoutes\.roles/)
})

test('command palette exposes operational backend routes without obsolete architecture screens', () => {
  for (const route of ['analytics', 'taxonomy', 'sites', 'users']) {
    assert.match(palette, new RegExp(`adminRoutes\\.${route}`))
  }
  assert.doesNotMatch(palette, /adminRoutes\.platformMap|Platform Map/)
})

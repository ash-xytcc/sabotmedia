import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const rail = fs.readFileSync(new URL('../src/components/AdminRail.jsx', import.meta.url), 'utf8')
const palette = fs.readFileSync(new URL('../src/components/AdminCommandPalette.jsx', import.meta.url), 'utf8')

for (const route of ['analytics', 'taxonomy', 'roles', 'qa', 'siteHealth', 'backup', 'auditLog', 'sites']) {
  test(`admin rail exposes ${route}`, () => {
    assert.match(rail, new RegExp(`adminRoutes\\.${route}`))
  })
}

test('admin rail awaits the asynchronous site registry', () => {
  assert.match(rail, /const sites = await loadSites\(\)/)
  assert.doesNotMatch(rail, /useState\(\(\) => loadSites\(\)\)/)
})

test('new menu does not advertise fake user creation', () => {
  assert.doesNotMatch(rail, />User<\/Link>/)
})

test('command palette exposes operational backend routes without obsolete Platform Map', () => {
  for (const route of ['analytics', 'taxonomy', 'roles', 'sites']) {
    assert.match(palette, new RegExp(`adminRoutes\\.${route}`))
  }
  assert.doesNotMatch(palette, /adminRoutes\.platformMap|Platform Map/)
})

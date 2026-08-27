import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const routes = fs.readFileSync(new URL('../src/routing/routes.js', import.meta.url), 'utf8')

const required = {
  analytics: 'AnalyticsPage',
  taxonomy: 'TaxonomyAdminPage',
  roles: 'EditorRolesPage',
  platformMap: 'PlatformMapPage',
}

for (const [key, component] of Object.entries(required)) {
  test(`${key} has a canonical wp-admin route and protected component`, () => {
    assert.match(routes, new RegExp(`${key}: '/wp-admin/`))
    assert.match(app, new RegExp(`path=\\{adminRoutes\\.${key}\\} element=\\{protect\\(<${component}`))
  })
}

test('legacy ops aliases redirect instead of falling through', () => {
  for (const alias of ['/analytics', '/taxonomy', '/roles', '/platform-map']) {
    assert.match(app, new RegExp(`path="${alias}"`))
  }
})

import fs from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

const taxonomy = fs.readFileSync(new URL('../src/components/TaxonomyAdminPage.jsx', import.meta.url), 'utf8')
const roles = fs.readFileSync(new URL('../src/components/EditorRolesPage.jsx', import.meta.url), 'utf8')

test('taxonomy uses the current admin shell instead of legacy project-page chrome', () => {
  assert.match(taxonomy, /<AdminFrame>/)
  assert.match(taxonomy, /wp-admin-screen/)
  assert.match(taxonomy, /wp-screen-header/)
  assert.match(taxonomy, /wp-meta-box/)
  assert.match(taxonomy, /wp-posts-table/)
  assert.doesNotMatch(taxonomy, /project-hero/)
  assert.doesNotMatch(taxonomy, /archive-controls/)
})

test('editor roles uses the current admin shell and states its authorization boundary', () => {
  assert.match(roles, /<AdminFrame>/)
  assert.match(roles, /wp-admin-screen/)
  assert.match(roles, /wp-screen-header/)
  assert.match(roles, /wp-meta-box/)
  assert.match(roles, /wp-posts-table/)
  assert.match(roles, /do not independently grant or revoke access/)
  assert.doesNotMatch(roles, /project-hero/)
  assert.doesNotMatch(roles, /archive-controls/)
})

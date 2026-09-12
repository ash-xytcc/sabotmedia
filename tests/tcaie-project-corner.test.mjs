import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { findPublicProject, resolveArchiveProject } from '../src/lib/projectCatalog.js'
import { getPublicPageMeta } from '../src/lib/publicPageRegistry.js'

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const page = fs.readFileSync(new URL('../src/components/TcaieProjectPage.jsx', import.meta.url), 'utf8')

test('TCAIE has a canonical shareable project corner', () => {
  assert.match(app, /path="\/tcaie" element=\{<TcaieProjectPage pieces=\{pieces\} \/>\}/)
  assert.match(app, /'\/tcaie': \['The Child and Its Enemies'/)
  assert.match(app, /return <Navigate to="\/tcaie" replace \/>/)
})

test('TCAIE is registered as a static public route for direct Cloudflare requests', () => {
  assert.deepEqual(getPublicPageMeta('/tcaie'), {
    id: 'tcaie',
    label: 'The Child and Its Enemies',
    path: '/tcaie',
    family: 'content',
  })
})

test('TCAIE project corner uses the canonical project identity and podcast feed', () => {
  assert.equal(findPublicProject('tcaie')?.slug, 'the-child-and-its-enemies')
  assert.match(page, /findPublicProject\('the-child-and-its-enemies'\)/)
  assert.match(page, /\/feeds\/podcasts\/the-child-and-its-enemies\.xml/)
  assert.match(page, /resolveArchiveProject/)
  assert.match(page, /Everything from TCAIE/)
})

test('TCAIE classification still recognizes show identity for project-corner inclusion', () => {
  const project = resolveArchiveProject({
    type: 'podcast',
    title: 'Episode 9',
    bodyHtml: '<p>The Child and Its Enemies is a youth liberation podcast.</p>',
  }, 'podcast')

  assert.equal(project.slug, 'the-child-and-its-enemies')
})

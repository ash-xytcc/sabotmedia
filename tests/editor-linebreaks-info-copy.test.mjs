import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { publicInfoCopy, getPublicInfoField } from '../src/content/publicInfoCopy.js'

const classicEditorSource = await readFile(new URL('../src/lib/classicEditorBody.js', import.meta.url), 'utf8')
const bridgeSource = await readFile(new URL('../src/components/NativeContentBridgePage.jsx', import.meta.url), 'utf8')
const infoPageSource = await readFile(new URL('../src/components/PublicInfoPage.jsx', import.meta.url), 'utf8')

test('visual editor preserves browser-created DIV block boundaries', () => {
  assert.match(classicEditorSource, /if \(tag === 'div'\)/)
  assert.match(classicEditorSource, /return `<div>\$\{children\}<\/div>`/)
  assert.doesNotMatch(classicEditorSource, /if \(tag === 'div'\)[\s\S]{0,320}return children\s*\n\s*}/)
  assert.match(bridgeSource, /editor\.innerHTML/)
  assert.match(bridgeSource, /classicEditorBodyToHtml\(draft\.body \|\| ''\)/)
})

test('rewritten info pages use fresh versioned fields instead of stale v1 content', () => {
  for (const page of ['about', 'contact', 'submit', 'support']) {
    assert.ok(publicInfoCopy[page]?.body?.length > 250, `${page} should have substantial current copy`)
    assert.equal(getPublicInfoField(page, 'body'), `info.${page}.body.v2`)
  }

  assert.match(publicInfoCopy.about.body, /open collective of radical media makers/i)
  assert.match(publicInfoCopy.about.body, /Grays Harbor/i)
  assert.match(publicInfoCopy.contact.body, /tips@sabot\.media/)
  assert.match(publicInfoCopy.submit.body, /You do not need a journalism degree/i)
  assert.match(publicInfoCopy.support.body, /help it circulate/i)
  assert.match(infoPageSource, /getPublicInfoField/)
})

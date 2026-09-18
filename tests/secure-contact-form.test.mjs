import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const form = fs.readFileSync(new URL('../src/components/SecureContactForm.jsx', import.meta.url), 'utf8')
const infoPage = fs.readFileSync(new URL('../src/components/PublicInfoPage.jsx', import.meta.url), 'utf8')
const publicKey = fs.readFileSync(new URL('../public/keys/info-sabot-media.asc', import.meta.url), 'utf8')
const securityCopy = fs.readFileSync(new URL('../src/lib/editableContentRegistry.js', import.meta.url), 'utf8')

test('contact page keeps ordinary addresses as mail links and places encrypted contact under info', () => {
  assert.match(infoPage, /defaultHref="mailto:info@sabot\.media"/)
  assert.match(infoPage, /<SecureContactForm \/>/)
  for (const address of ['tips', 'submit', 'press', 'support']) {
    assert.match(infoPage, new RegExp(`${address}@sabot\\.media`))
  }
  assert.doesNotMatch(infoPage, /security@sabot\.media/)
})

test('secure contact pins and verifies the info public key before encryption', () => {
  assert.match(form, /3166FF411CC871E72D15344CAC268457855E57BA/)
  assert.match(form, /fingerprint !== EXPECTED_FINGERPRINT/)
  assert.match(form, /identity\.includes\('info@sabot\.media'\)/)
  assert.match(form, /encryptionKeys: publicKey/)
  assert.match(form, /mailto:info@sabot\.media/)
  assert.match(publicKey, /BEGIN PGP PUBLIC KEY BLOCK/)
  assert.doesNotMatch(publicKey, /BEGIN PGP PRIVATE KEY BLOCK/)
})

test('security guidance publishes only the canonical info encryption identity', () => {
  assert.match(securityCopy, /Sabot Media <info@sabot\.media>/)
  assert.match(securityCopy, /3166 FF41 1CC8 71E7 2D15 344C AC26 8457 855E 57BA/)
  assert.match(securityCopy, /AC268457855E57BA/)
  assert.doesNotMatch(securityCopy, /security@sabot\.media/)
  assert.doesNotMatch(securityCopy, /55D4 995F 3C93 E0B4/)
})

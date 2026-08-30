import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const form = fs.readFileSync(new URL('../src/components/SecureContactForm.jsx', import.meta.url), 'utf8')
const infoPage = fs.readFileSync(new URL('../src/components/PublicInfoPage.jsx', import.meta.url), 'utf8')
const publicKey = fs.readFileSync(new URL('../public/keys/info-sabot-media.asc', import.meta.url), 'utf8')

test('contact page keeps ordinary addresses as mail links and places encrypted contact under info', () => {
  assert.match(infoPage, /href="mailto:info@sabot\.media"/)
  assert.match(infoPage, /<SecureContactForm \/>/)
  for (const address of ['tips', 'submit', 'press', 'security', 'support']) {
    assert.match(infoPage, new RegExp(`${address}@sabot\\.media`))
  }
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

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [main, runtime, css] = await Promise.all([
  readFile(new URL('../src/main.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/audioLabStandalone.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/audio-lab-standalone.css', import.meta.url), 'utf8'),
])

test('AudioLab admin links open the named dedicated studio window', () => {
  assert.match(runtime, /sabot-audiolab-studio/)
  assert.match(runtime, /searchParams\.set\(STUDIO_PARAM, '1'\)/)
  assert.match(runtime, /window\.open\(url\.href, STUDIO_WINDOW_NAME/)
  assert.match(runtime, /window\.location\.assign\(url\.href\)/)
})

test('standalone AudioLab removes admin chrome and owns the whole viewport', () => {
  assert.match(css, /\.wp-admin-topbar,[\s\S]*?\.admin-rail[\s\S]*?display:\s*none\s*!important/)
  assert.match(css, /\.audio-lab-page[\s\S]*?width:\s*100vw\s*!important[\s\S]*?height:\s*100dvh\s*!important/)
  assert.match(css, /\.audio-lab-multitrack-inner[\s\S]*?repeat\(var\(--al-track-count, 1\),\s*minmax\(132px, 1fr\)\)/)
  assert.match(runtime, /querySelectorAll\(':scope > \.audio-lab-multitrack-row'\)/)
})

test('standalone AudioLab authority loads after earlier AudioLab layout CSS', () => {
  const dialogAuthority = main.indexOf("import './audio-lab-dialog-track-focus.css'")
  const standaloneAuthority = main.indexOf("import './audio-lab-standalone.css'")
  const runtime = main.indexOf("import './audioLabStandalone.js'")
  assert.ok(dialogAuthority >= 0 && standaloneAuthority > dialogAuthority && runtime > standaloneAuthority)
})

import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const panel = fs.readFileSync(new URL('../src/components/PublicAccessibilityPanel.jsx', import.meta.url), 'utf8')
const css = fs.readFileSync(new URL('../src/public-accessibility.css', import.meta.url), 'utf8')

test('text size scales each visible text node from its original computed size and resets cleanly', () => {
  assert.match(panel, /createTreeWalker\(main, NodeFilter\.SHOW_TEXT\)/)
  assert.match(panel, /window\.getComputedStyle\(element\)\.fontSize/)
  assert.match(panel, /size === 'larger' \? 1\.3 : 1\.15/)
  assert.match(panel, /--sabot-a11y-scaled-font-size/)
  assert.match(panel, /data-sabot-a11y-scaled/)
  assert.match(panel, /removeProperty\('--sabot-a11y-base-font-size'\)/)
  assert.match(css, /font-size: var\(--sabot-a11y-scaled-font-size\) !important/)
  assert.doesNotMatch(css, /font-size: 16px !important|font-size: 18px !important/)
})

test('reading width settings cover public page shells beyond article templates', () => {
  assert.match(css, /data-sabot-a11y-reading-width="narrow"[^}]+width: min\(calc\(100% - 2rem\), 46rem\)/s)
  assert.match(css, /data-sabot-a11y-reading-width="wide"[^}]+width: min\(calc\(100% - 2rem\), 76rem\)/s)
  assert.match(css, /\.public-route-shell #main-content > :where\(main, article, section, \.page, \.piece-page/)
})

test('contrast modes set readable text and link colors throughout public content', () => {
  assert.match(css, /data-sabot-a11y-contrast="on"[^}]+background: #000 !important/s)
  assert.match(css, /data-sabot-a11y-contrast="on"[^}]+color: #fff !important/s)
  assert.match(css, /data-sabot-a11y-contrast="on"[^}]+color: #ffdc55 !important/s)
  assert.match(css, /data-sabot-a11y-low-glare="on"[^}]+background: #171411 !important/s)
  assert.match(css, /data-sabot-a11y-low-glare="on"[^}]+color: #f0e5d4 !important/s)
  assert.match(css, /data-sabot-a11y-low-glare="on"[^}]+color: #f0c96a !important/s)
})

test('plain type, reduced motion, and available image descriptions have concrete behavior', () => {
  assert.match(css, /data-sabot-a11y-plain-reading="on"[^}]+font-family: system-ui/s)
  assert.match(css, /html\[data-sabot-a11y-reduced-motion="on"\][\s\S]+animation-duration: \.001ms !important/)
  assert.match(panel, /note\.textContent = `Image description: \$\{alt\}`/)
  assert.match(panel, /Show available image descriptions/)
  assert.match(panel, /Plain sans-serif type/)
})

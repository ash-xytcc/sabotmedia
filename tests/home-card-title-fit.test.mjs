import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const legacyCss = fs.readFileSync(new URL('../src/public-card-title-fit.css', import.meta.url), 'utf8')
const overlayCss = fs.readFileSync(new URL('../src/public-card-overlay-v2.css', import.meta.url), 'utf8')
const runtime = fs.readFileSync(new URL('../src/publicTypeRuntimeFix.js', import.meta.url), 'utf8')
const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
const homepage = fs.readFileSync(new URL('../src/components/NativeUpdatesPage.jsx', import.meta.url), 'utf8')
const overlayComponent = fs.readFileSync(new URL('../src/components/HomeOverlayCard.jsx', import.meta.url), 'utf8')

test('overlay mode leaves the legacy publication card DOM entirely', () => {
  assert.match(homepage, /if \(hasImage && titleDisplay === 'overlay'\)/)
  assert.match(homepage, /HomeOverlayCard item=\{item\} variant="hero"/)
  assert.match(homepage, /HomeOverlayCard item=\{item\} variant="recent"/)
  assert.match(overlayComponent, /home-overlay-card__content/)
  assert.match(overlayComponent, /home-overlay-card__title/)
  assert.doesNotMatch(overlayComponent, /publication-post-card__overlay/)
  assert.doesNotMatch(overlayComponent, /publication-hero-card__overlay/)
})

test('isolated overlay cards are content-height and never line-clamped', () => {
  assert.match(overlayCss, /\.home-overlay-card\s*\{[\s\S]*height:\s*auto/)
  assert.match(overlayCss, /\.home-overlay-card__link\s*\{[\s\S]*overflow:\s*visible/)
  assert.match(overlayCss, /\.home-overlay-card__content\s*\{[\s\S]*height:\s*auto[\s\S]*overflow:\s*visible/)
  assert.match(overlayCss, /\.home-overlay-card__title\s*\{[\s\S]*max-height:\s*none[\s\S]*-webkit-line-clamp:\s*unset/)
  assert.match(overlayCss, /home-overlay-card--recent \.home-overlay-card__content[\s\S]*padding:\s*clamp/)
})

test('new isolated overlay stylesheet loads after all legacy homepage card rules', () => {
  assert.ok(main.indexOf("./public-card-overlay-v2.css") > main.indexOf("./public-card-title-fit.css"))
  assert.ok(main.indexOf("./public-card-overlay-v2.css") > main.indexOf("./sitewide-mobile-polish.css"))
})

test('hidden and below modes retain the established publication card paths', () => {
  assert.match(homepage, /publication-post-card publication-post-card--title-\$\{titleDisplay\}/)
  assert.match(homepage, /publication-hero-card publication-hero-card--title-\$\{titleDisplay\}/)
  assert.match(homepage, /titleDisplay === 'hidden'/)
  assert.match(homepage, /titleDisplay === 'below'/)
})

test('legacy fallback remains scoped and runtime cannot accidentally target the new v2 classes', () => {
  assert.match(legacyCss, /publication-post-card--title-overlay/)
  assert.match(runtime, /function setHomepageOverlayTitles\(\)/)
  assert.doesNotMatch(runtime, /home-overlay-card/)
})

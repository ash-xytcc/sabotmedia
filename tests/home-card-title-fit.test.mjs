import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const css = fs.readFileSync(new URL('../src/public-card-title-fit.css', import.meta.url), 'utf8')
const runtime = fs.readFileSync(new URL('../src/publicTypeRuntimeFix.js', import.meta.url), 'utf8')
const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
const homepage = fs.readFileSync(new URL('../src/components/NativeUpdatesPage.jsx', import.meta.url), 'utf8')

test('overlay title cards size from visible content instead of a fixed aspect ratio', () => {
  assert.match(css, /publication-post-card--title-overlay/)
  assert.match(css, /publication-hero-card--title-overlay/)
  assert.match(css, /aspect-ratio:\s*auto\s*!important/)
  assert.match(css, /grid-auto-rows:\s*auto\s*!important/)
  assert.match(css, /publication-post-card--title-overlay[\s\S]*publication-post-card__overlay[\s\S]*position:\s*relative\s*!important/)
  assert.match(css, /publication-hero-card--title-overlay[\s\S]*publication-hero-card__overlay[\s\S]*position:\s*relative\s*!important/)
})

test('overlay content creates real image space and cannot be vertically clipped', () => {
  assert.match(css, /publication-post-card--title-overlay[\s\S]*publication-post-card__link[\s\S]*overflow:\s*visible\s*!important/)
  assert.match(css, /publication-post-card--title-overlay[\s\S]*publication-post-card__overlay[\s\S]*padding-top:\s*clamp/)
  assert.match(css, /publication-hero-card--title-overlay[\s\S]*publication-hero-card__overlay[\s\S]*padding-top:\s*clamp/)
  assert.match(css, /max-height:\s*none\s*!important/)
})

test('visible overlay headlines are never line-clamped', () => {
  assert.match(css, /publication-post-card--title-overlay h2[\s\S]*-webkit-line-clamp:\s*unset\s*!important/)
  assert.match(css, /publication-hero-card--title-overlay h1[\s\S]*-webkit-line-clamp:\s*unset\s*!important/)
  assert.match(css, /overflow:\s*visible\s*!important/)
})

test('runtime applies inline-important flow geometry after render so later legacy CSS cannot clip titles', () => {
  assert.match(runtime, /function setHomepageOverlayTitles\(\)/)
  assert.match(runtime, /publication-post-card--title-overlay/)
  assert.match(runtime, /publication-hero-card--title-overlay/)
  assert.match(runtime, /important\(grid, 'grid-auto-rows', 'auto'\)/)
  assert.match(runtime, /important\(card, 'aspect-ratio', 'auto'\)/)
  assert.match(runtime, /important\(card, 'min-height', '0'\)/)
  assert.match(runtime, /important\(link, 'overflow', 'visible'\)/)
  assert.match(runtime, /important\(overlay, 'height', 'auto'\)/)
  assert.match(runtime, /important\(overlay, 'padding-top', config\.topPad\)/)
  assert.match(runtime, /important\(title, '-webkit-line-clamp', 'unset'\)/)
  assert.match(runtime, /important\(title, 'max-width', '100%'\)/)
  assert.match(runtime, /setHomepageOverlayTitles\(\)/)
})

test('title-fit rules load after the final mobile authority and remain scoped to overlay mode', () => {
  assert.ok(main.indexOf("./public-card-title-fit.css") > main.indexOf("./sitewide-mobile-polish.css"))
  assert.ok(main.indexOf("./publicTypeRuntimeFix.js") > main.indexOf("./public-card-title-fit.css"))
  assert.match(homepage, /publication-post-card--title-\$\{titleDisplay\}/)
  assert.match(homepage, /publication-hero-card--title-\$\{titleDisplay\}/)
  assert.doesNotMatch(css, /publication-post-card--title-hidden[\s\S]*aspect-ratio:\s*auto/)
})

import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
import assert from 'node:assert/strict'
import { startCourseServer } from './helpers/course-browser-server.mjs'
import { seed } from '../public/guides/become-the-thousand-servers/lms/model.js'
import { KEY } from '../public/guides/become-the-thousand-servers/lms/progress.js'
const { server, origin } = await startCourseServer(),
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const url = origin + '/guides/become-the-thousand-servers/',
  errors = []
try {
  const context = await browser.newContext(),
    page = await context.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(url)
  await page.waitForSelector('[data-export]:visible')
  assert.equal(await page.locator('.course-map>li').count(), 13)
  await page.locator('.course-map a[href="#map-your-dependencies"]').click()
  await page.locator('#map-your-dependencies [data-notes]').fill('Browser verification note')
  await page.locator('#map-your-dependencies [data-practical]').check()
  await page.locator('#map-your-dependencies [data-complete]').click()
  const form = page.locator('[data-activity="dependency-choice"]')
  await form.locator('input[value="person"]').check()
  await form.locator('button[type="submit"]').click()
  assert.match(await form.locator('[data-feedback]').textContent(), /Completed/)
  await page.reload()
  await page.waitForSelector('#map-your-dependencies [data-notes]:visible')
  assert.equal(
    await page.locator('#map-your-dependencies [data-notes]').inputValue(),
    'Browser verification note',
  )
  assert.equal(await form.locator('input[value="person"]').isChecked(), true)
  await page.goto(url + '#tools')
  await page.locator('[data-backup]').click()
  await page.waitForFunction(() => document.querySelector('[data-recovery-code]').value.startsWith('sabot1.'))
  const code = await page.locator('[data-recovery-code]').inputValue()
  const second = await browser.newContext(),
    p2 = await second.newPage()
  p2.on('pageerror', (e) => errors.push(e.message))
  await p2.goto(url + '#tools')
  await p2.locator('[data-restore]').click()
  await p2.locator('[data-recovery-code]').fill(code)
  p2.on('dialog', (d) => d.accept())
  await p2.locator('[data-fetch-recovery]').click()
  await p2.waitForFunction(() =>
    document.querySelector('[data-message]').textContent.includes('Progress restored'),
  )
  const state = await p2.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY)
  assert.equal(state.notes['map-your-dependencies'], 'Browser verification note')
  assert.ok(state.completedLessons.includes('map-your-dependencies'))
  const nojs = await browser.newContext({ javaScriptEnabled: false }),
    plain = await nojs.newPage()
  await plain.goto(url)
  assert.equal(await plain.locator('.course-unit:visible').count(), 25)
  assert.equal(await plain.locator('[data-unit="real-backup"]').isVisible(), true)
  assert.match(await plain.locator('body').textContent(), /A backup that has never been restored is a theory/)
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }),
    phone = await mobile.newPage()
  await phone.goto(url + '#map-your-dependencies')
  await phone.waitForSelector('#map-your-dependencies [data-notes]:visible')
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  assert.equal(await phone.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto')
  await phone.screenshot({ path: '/tmp/course-mobile.png', fullPage: true })
  await page.goto(url)
  await page.screenshot({ path: '/tmp/course-desktop.png', fullPage: false })
  // Keyboard interaction uses native controls, including ordered and matching activities.
  await phone.goto(url + '#read-dns')
  const match = phone.locator('[data-activity="dns-match"] select').first()
  await match.focus()
  await phone.keyboard.press('ArrowDown')
  await phone.keyboard.press('Enter')
  assert.notEqual(await match.inputValue(), '')
  assert.deepEqual(errors, [])
  console.log(
    'Browser acceptance passed: 13 guide sections, lesson actions, reload, activity persistence, encrypted restore in second clean profile, no-JS full reading, mobile overflow, reduced motion, keyboard matching.',
  )
} finally {
  await browser.close()
  await new Promise((resolve) => server.close(resolve))
}

import fs from 'node:fs/promises'
import path from 'node:path'
import { publicPageRegistry } from '../src/lib/publicPageRegistry.js'

const root = process.cwd()
const rootIndex = await fs.readFile(path.join(root, 'index.html'), 'utf8')

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fallback(title, description) {
  return `<noscript data-sabot-static-noscript>
    <style>
      [data-sabot-static-noscript] .ns-wrap{box-sizing:border-box;max-width:860px;margin:0 auto;padding:24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65;color:#111;background:#fff}
      [data-sabot-static-noscript] *{box-sizing:border-box}
      [data-sabot-static-noscript] nav{border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:28px}
      [data-sabot-static-noscript] nav a{margin-right:14px}
      [data-sabot-static-noscript] a{color:inherit;text-decoration-thickness:.1em}
      [data-sabot-static-noscript] .ns-note{padding:12px;border:1px solid #777;background:#f4f4f4}
    </style>
    <div class="ns-wrap">
      <nav aria-label="Plain HTML navigation"><strong><a href="/">Sabot Media</a></strong> <a href="/archive">Archive</a> <a href="/campaigns">Campaigns</a> <a href="/investigations">Investigations</a> <a href="/collections">Collections</a> <a href="/publications">Publications</a> <a href="/updates">Updates</a> <a href="/about">About</a> <a href="/contact">Contact</a> <a href="/feeds">Feeds</a></nav>
      <main>
        <p class="ns-note">JavaScript is disabled. This is the plain HTML reading view.</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
        <p><a href="/archive">Browse all public published posts</a></p>
      </main>
    </div>
  </noscript>`
}

function stripFallback(html) {
  return String(html).replace(/\n?\s*<noscript data-sabot-static-noscript>[\s\S]*?<\/noscript>/i, '')
}

function routeDescription(page) {
  const descriptions = {
    search: 'Search Sabot Media. With JavaScript disabled, use the archive and your browser find function.',
    collections: 'Sabot Media collections and grouped public work.',
    campaigns: 'Sabot Media campaigns and campaign reporting.',
    'ai-campaign': 'Sabot Media coverage and campaign material about Autistici/Inventati.',
    'ai-campaign-coverage': 'Coverage archive for the Autistici/Inventati campaign.',
    investigations: 'Sabot Media investigations, evidence logs, source records, and ongoing reporting.',
    'ai-investigation': 'The reporting map, evidence trail, and source record behind Sabot Media’s Autistici/Inventati investigation.',
    feeds: 'RSS and other ways to follow Sabot Media without relying on a social platform.',
    gallery: 'Sabot Media gallery and visual archive. Image-heavy material may be limited in the plain HTML view.',
    updates: 'Latest Sabot Media updates.',
    press: 'Press information and public-facing Sabot Media materials.',
    publications: 'Sabot Media publications and longer-form work.',
    about: 'About Sabot Media.',
    contact: 'Contact Sabot Media.',
    submit: 'Submission information for Sabot Media.',
    support: 'Ways to support Sabot Media.',
    security: 'Security guidance and public OpenPGP information for contacting Sabot Media.',
  }
  return descriptions[page.id] || `${page.label} on Sabot Media.`
}

async function ensureRoute(page) {
  if (!page?.path || page.path === '/' || page.path === '/archive') return false
  const route = page.path.replace(/^\/+|\/+$/g, '')
  if (!route) return false
  const dir = path.join(root, route)
  const file = path.join(dir, 'index.html')
  const existing = await fs.stat(file).catch(() => null)
  if (existing?.isFile()) return false

  await fs.mkdir(dir, { recursive: true })
  let html = stripFallback(rootIndex)
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(page.label)} | Sabot Media</title>`)
  html = html.replace('</body>', `    ${fallback(page.label, routeDescription(page))}\n  </body>`)
  await fs.writeFile(file, html)
  return true
}

let generated = 0
for (const page of publicPageRegistry) {
  if (await ensureRoute(page)) generated += 1
}

// /projects is a legacy public URL that redirects to the archive in the interactive app.
const projectsPage = { id: 'projects', label: 'Projects', path: '/projects' }
if (await ensureRoute(projectsPage)) generated += 1

// Every published article receives all of its public aliases/templates from the same generated source.
const postRoot = path.join(root, 'post')
for (const family of ['piece', 'print']) await fs.rm(path.join(root, family), { recursive: true, force: true })
try {
  const slugs = await fs.readdir(postRoot)
  for (const slug of slugs) {
    const source = path.join(postRoot, slug, 'index.html')
    const stat = await fs.stat(source).catch(() => null)
    if (!stat?.isFile()) continue

    for (const destination of [
      path.join(root, 'piece', slug, 'index.html'),
      path.join(root, 'print', slug, 'index.html'),
      path.join(root, 'post', slug, 'print', 'index.html'),
    ]) {
      await fs.mkdir(path.dirname(destination), { recursive: true })
      await fs.copyFile(source, destination)
    }
  }
} catch {
  // No generated post directory means there are no public snapshot articles to alias.
}

console.log(`Completed no-JS route coverage from publicPageRegistry: ${generated} missing static routes generated, plus article aliases and print routes.`)

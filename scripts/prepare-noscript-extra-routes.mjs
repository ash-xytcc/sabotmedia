import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const rootIndex = await fs.readFile(path.join(root, 'index.html'), 'utf8')

const routes = {
  projects: ['Projects', 'Sabot Media projects and ongoing bodies of work. Published reporting remains available through the archive.'],
  collections: ['Collections', 'Sabot Media collections and grouped public work. Published reporting remains available through the archive.'],
  investigations: ['Investigations', 'Sabot Media investigations, evidence logs, source records, and ongoing reporting. Individual investigation pages may provide their own plain HTML view.'],
  'aberdeen-local-1312-gallery': ['Gallery', 'Sabot Media gallery and visual archive. Image-heavy material may be limited in the plain HTML view.'],
}

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
      <nav aria-label="Plain HTML navigation"><strong><a href="/">Sabot Media</a></strong> <a href="/archive">Archive</a> <a href="/campaigns">Campaigns</a> <a href="/projects">Projects</a> <a href="/investigations">Investigations</a> <a href="/about">About</a> <a href="/contact">Contact</a> <a href="/feeds">Feeds</a></nav>
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

async function writeRoute(route, title, description) {
  const dir = path.join(root, route)
  await fs.rm(dir, { recursive: true, force: true })
  await fs.mkdir(dir, { recursive: true })
  let html = stripFallback(rootIndex)
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)} | Sabot Media</title>`)
  html = html.replace('</body>', `    ${fallback(title, description)}\n  </body>`)
  await fs.writeFile(path.join(dir, 'index.html'), html)
}

for (const [route, [title, description]] of Object.entries(routes)) {
  await writeRoute(route, title, description)
}

// Support both historical public article URL families without requiring JavaScript.
const postRoot = path.join(root, 'post')
const pieceRoot = path.join(root, 'piece')
await fs.rm(pieceRoot, { recursive: true, force: true })
try {
  const slugs = await fs.readdir(postRoot)
  for (const slug of slugs) {
    const source = path.join(postRoot, slug, 'index.html')
    const stat = await fs.stat(source).catch(() => null)
    if (!stat?.isFile()) continue
    const destDir = path.join(pieceRoot, slug)
    await fs.mkdir(destDir, { recursive: true })
    await fs.copyFile(source, path.join(destDir, 'index.html'))
  }
} catch {
  // No generated post directory means there are no public snapshot articles to alias.
}

console.log(`Prepared ${Object.keys(routes).length} additional no-JS top-level routes and /piece article aliases.`)

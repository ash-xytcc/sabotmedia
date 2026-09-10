const MARKER = 'Choosing publishing software is a separate decision from choosing a host.'

const choices = `Choosing publishing software is a separate decision from choosing a host. A host keeps a site reachable; a CMS or publishing system determines how you write, organize, import, export and maintain the publication. Compare both before paying for anything. A friendly host with the wrong software is still the wrong destination.

Software options worth comparing:

Colophon — Best fit when you want publishing software shaped around independent publications, editorial collectives, archives, podcasts, campaigns and translations. Its browser/PWA edition is local-first, so you can start a publication without an account, domain or server and deal with hosting later. Sabot Media uses and contributes to Colophon, which is maintained as a separate GPL-licensed project. We include it because it fits this use case, not because it is the only answer. For a NoBlogs/WXR archive, verify the current import or conversion path before choosing it as the destination.

WriteFreely — A deliberately small publishing platform for blogs and writing, with ActivityPub support. Consider it when you want a lightweight writing-focused site rather than a large general-purpose CMS. Verify current import support for your archive before committing.

WordPress — The most direct choice for a NoBlogs WXR export because NoBlogs used WordPress and this recovery pathway is tested around WordPress’s own export/import model. Managed hosting can make setup quite easy; manual self-hosting asks you to maintain the web server, PHP, database, updates and backups. Its enormous theme/plugin ecosystem can be useful, but every added dependency becomes another thing somebody must understand and maintain.

Ghost — Publishing software centered on professional publications, newsletters and memberships. Consider it when those editorial and subscription workflows are central. Check its current migration tooling, hosting requirements and export path against your archive before choosing it.

Grav — A flat-file CMS that stores content in files rather than requiring a SQL database for the core site. Consider it when you want a comparatively lightweight conventional website and prefer file-based content. Verify conversion from WordPress/WXR and the features you need first.

Coming from NoBlogs? If your immediate priority is recovering a WXR archive with the fewest unknowns, WordPress remains the direct path covered by this course. Colophon is worth evaluating when you want a local-first independent-media workflow and are willing to verify the migration path. For any destination, test one representative post, page, author/category case and media item before moving the whole publication. Do not choose software from a feature list alone; prove that you can import, back up, restore and leave it again.`

const references = [
  {title:'Colophon',url:'https://github.com/colophon-hub/colophon',note:'Free, self-hostable publishing software; browser/PWA mode is local-first.'},
  {title:'WriteFreely',url:'https://writefreely.org/',note:'Lightweight publishing platform with ActivityPub support.'},
  {title:'WordPress',url:'https://wordpress.org/',note:'General-purpose publishing CMS and the direct WXR destination covered by this recovery pathway.'},
  {title:'Ghost',url:'https://ghost.org/',note:'Publishing platform centered on publications, newsletters and memberships.'},
  {title:'Grav',url:'https://getgrav.org/',note:'Flat-file CMS; verify migration support and required features before committing.'},
]

function mergeSources(existing = []) {
  const out = [...existing]
  for (const item of references) if (!out.some((source) => source.url === item.url)) out.push(item)
  return out
}

export function withCmsChoices(input) {
  if (!input || input.slug !== 'become-the-thousand-servers' || !Array.isArray(input.modules)) return input
  let changed = false
  const modules = input.modules.map((module) => {
    if (module.id !== 'blog-destination' || String(module.body || '').includes(MARKER)) return module
    changed = true
    return {...module, body: `${String(module.body || '').trim()}\n\n${choices}`, sources: mergeSources(module.sources)}
  })
  return changed ? {...input, modules} : input
}

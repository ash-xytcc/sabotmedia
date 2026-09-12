import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import { getImportedImage } from '../lib/getImportedImage'
import { loadPublishedNativePieces, mergeNativeAndImportedPieces } from '../lib/nativePublicFeed'
import { useWordPressPieces } from '../lib/useWordPressPieces'
import { splitDisplayTitle } from '../lib/content'
import { buildPublicPostPath } from '../lib/publicSiteRouting'
import { findPublicProject, resolveArchiveProject } from '../lib/projectCatalog'

const TCAIE_PROJECT = findPublicProject('the-child-and-its-enemies')
const TCAIE_FEED = '/feeds/podcasts/the-child-and-its-enemies.xml'

function normalizeType(piece) {
  const raw = String(piece?.type || piece?.contentType || '').toLowerCase()
  if (raw.includes('podcast') || raw.includes('audio')) return 'podcast'
  if (raw.includes('comic')) return 'comic'
  if (raw.includes('zine')) return 'zine'
  if (raw.includes('newsletter')) return 'newsletter'
  if (raw.includes('print') || piece?.hasPrintAssets) return 'print'
  return 'article'
}

function formatLabel(type) {
  switch (type) {
    case 'podcast': return 'Podcast'
    case 'comic': return 'Comic'
    case 'zine': return 'Zine'
    case 'newsletter': return 'Newsletter'
    case 'print': return 'Print'
    default: return 'Article'
  }
}

function resolveCanonicalSlug(piece) {
  return String(piece?.slug || piece?.nativeSlug || piece?.canonicalSlug || piece?.id || '').trim()
}

function normalizeProjectPiece(piece) {
  const type = normalizeType(piece)
  const project = resolveArchiveProject(piece, type)
  if (project?.slug !== TCAIE_PROJECT?.slug) return null

  const display = typeof splitDisplayTitle === 'function'
    ? splitDisplayTitle(piece)
    : { title: piece?.title || piece?.slug || 'Untitled', subtitle: piece?.subtitle || '' }
  const slug = resolveCanonicalSlug(piece)
  if (!slug) return null

  return {
    id: piece?.id || slug,
    slug,
    title: display?.title || piece?.title || slug,
    excerpt: piece?.excerpt || display?.subtitle || '',
    format: formatLabel(type),
    publishedAt: piece?.publishedAt || '',
    publishedDateLabel: piece?.publishedDateLabel || '',
    imageUrl: String(piece?.featuredImage || getImportedImage(piece) || '').trim(),
    href: buildPublicPostPath(slug),
  }
}

function ProjectCard({ item }) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasImage = item.imageUrl && !imageFailed

  return (
    <article className="archive-card">
      <Link className="archive-card__media" to={item.href} aria-label={item.title}>
        {hasImage ? (
          <div className="archive-card__image">
            <img
              className="archive-card__image-el"
              src={item.imageUrl}
              alt=""
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          </div>
        ) : (
          <div className="archive-card__image archive-card__image--fallback" aria-hidden="true" />
        )}
        <div className="archive-card__overlay">
          <span className="archive-card__project-kicker">The Child and Its Enemies</span>
          <h3 className="archive-card__title">{item.title}</h3>
        </div>
      </Link>

      <div className="archive-card__body">
        <div className="archive-card__meta">
          <Link className="archive-card__project-link" to="/tcaie">TCAIE</Link>
          <span aria-hidden="true">·</span>
          <span>{item.format}</span>
          {item.publishedDateLabel ? <><span aria-hidden="true">·</span><span>{item.publishedDateLabel}</span></> : null}
        </div>
        {item.excerpt ? <p className="archive-card__excerpt">{item.excerpt}</p> : null}
        <div className="archive-card__actions">
          <Link className="button button--primary" to={item.href}>{item.format === 'Podcast' ? 'Listen / read' : 'Open'}</Link>
        </div>
      </div>
    </article>
  )
}

export function TcaieProjectPage({ pieces = [] }) {
  const [nativePieces, setNativePieces] = useState([])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const loaded = await loadPublishedNativePieces()
      if (!cancelled) setNativePieces(loaded)
    }
    boot()
    return () => { cancelled = true }
  }, [])

  const wordpressFeed = useWordPressPieces(pieces)
  const livePieces = wordpressFeed.pieces || pieces

  const projectPieces = useMemo(() => {
    return mergeNativeAndImportedPieces(Array.isArray(livePieces) ? livePieces : [], nativePieces)
      .map(normalizeProjectPiece)
      .filter(Boolean)
      .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
  }, [livePieces, nativePieces])

  const project = TCAIE_PROJECT || {
    name: 'The Child and Its Enemies',
    format: 'podcast',
    description: 'A youth-liberation podcast about queer and neurodivergent life, anarchy, autonomy, and the worlds young people build against adult control.',
    logoUrl: '/project-logos/the-child-and-its-enemies.svg',
  }

  return (
    <main className="page public-search-page archive-page tcaie-project-page">
      <PublicationTopbar />

      <section className="project-hero archive-page__hero">
        <div className="archive-project-group__identity-row">
          {project.logoUrl ? (
            <div className="archive-project-logo" aria-hidden="true">
              <img src={project.logoUrl} alt="" />
            </div>
          ) : null}
          <div className="archive-project-group__identity">
            <p className="archive-project-group__format">Sabot Media project / {project.format}</p>
            <h1>{project.name}</h1>
            <p>{project.description}</p>
          </div>
        </div>
        <div className="project-hero__meta">
          <span>{projectPieces.length} {projectPieces.length === 1 ? 'piece' : 'pieces'}</span>
          <span>Everything TCAIE in one place</span>
        </div>
        <div className="archive-card__actions">
          <a className="button button--primary" href={TCAIE_FEED}>Podcast RSS</a>
          <Link className="button" to="/feeds">All Sabot feeds</Link>
        </div>
      </section>

      <section className="archive-results" aria-labelledby="tcaie-archive-title">
        <header className="archive-results__header">
          <div className="archive-results__identity-row">
            <div>
              <p className="archive-results__eyebrow">Project archive</p>
              <h2 id="tcaie-archive-title">Everything from TCAIE</h2>
            </div>
          </div>
          <p className="archive-results__summary">Newest first · episodes, posts, and related project material</p>
        </header>

        {projectPieces.length ? (
          <div className="archive-card-grid">
            {projectPieces.map((item) => <ProjectCard key={item.id} item={item} />)}
          </div>
        ) : (
          <div className="archive-empty-state">
            <h3>Nothing is filed here yet.</h3>
            <p>The project corner is live, but no published TCAIE material is currently available from the archive feed.</p>
          </div>
        )}
      </section>

      <PublicationFooter />
    </main>
  )
}

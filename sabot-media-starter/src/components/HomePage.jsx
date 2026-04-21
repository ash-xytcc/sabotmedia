import { Link } from 'react-router-dom'

function ProjectCard({ name, count }) {
  return (
    <article className="project-card">
      <div className="project-card__eyebrow">Project</div>
      <h3>{name}</h3>
      <p>{count} imported piece{count === 1 ? '' : 's'}</p>
    </article>
  )
}

function PieceCard({ piece }) {
  return (
    <article className="piece-card">
      <div className="piece-card__meta">
        <span>{piece.primaryProject}</span>
        <span>{piece.type}</span>
      </div>
      <h3>
        <Link to={`/piece/${piece.slug}`}>{piece.title}</Link>
      </h3>
      {piece.excerpt && <p>{piece.excerpt}</p>}
      <div className="piece-card__footer">
        <span>{piece.publishedDateLabel}</span>
        {piece.hasPrintAssets && <span>print</span>}
      </div>
    </article>
  )
}

export function HomePage({ featured, latest, projectMap }) {
  return (
    <main className="page page-home">
      <section className="hero hero--featured">
        <div className="hero__content">
          <div className="hero__eyebrow">Featured drop</div>
          <h1>{featured?.title ?? 'Sabot Media'}</h1>
          {featured?.subtitle && <p className="hero__subtitle">{featured.subtitle}</p>}
          <div className="hero__meta">
            <span>{featured?.primaryProject}</span>
            <span>{featured?.type}</span>
            <span>{featured?.publishedDateLabel}</span>
          </div>
          <p className="hero__excerpt">{featured?.excerpt}</p>
          {featured && (
            <div className="hero__actions">
              <Link className="button button--primary" to={`/piece/${featured.slug}`}>Read</Link>
              <Link className="button" to={`/piece/${featured.slug}?mode=experience`}>Experience</Link>
              <Link className="button button--accent" to={`/piece/${featured.slug}/print`}>Print</Link>
            </div>
          )}
        </div>
        <div className="hero__stack" aria-hidden="true">
          <div className="stack-card stack-card--top" />
          <div className="stack-card stack-card--mid" />
          <div className="stack-card stack-card--bot" />
        </div>
      </section>

      <section className="content-section" id="drops">
        <div className="section-heading">
          <h2>Latest drops</h2>
          <p>Imported from the NoBlogs archive and ready for cleanup, upgrade, or print routing.</p>
        </div>
        <div className="piece-grid">
          {latest.map((piece) => <PieceCard key={piece.id} piece={piece} />)}
        </div>
      </section>

      <section className="content-section" id="projects">
        <div className="section-heading">
          <h2>Project lenses</h2>
          <p>One system. Multiple project expressions. Less platform sprawl, more signal.</p>
        </div>
        <div className="project-grid">
          {projectMap.map((project) => (
            <ProjectCard key={project.name} name={project.name} count={project.count} />
          ))}
        </div>
      </section>

      <section className="content-section content-section--about" id="about">
        <div className="manifesto-card">
          <div className="manifesto-card__eyebrow">System direction</div>
          <h2>Import first. Upgrade later.</h2>
          <p>
            This shell is built to absorb the old archive immediately. Imported posts render cleanly in reading mode,
            with optional experience and print treatments layered on later for the pieces worth special handling.
          </p>
        </div>
      </section>
    </main>
  )
}

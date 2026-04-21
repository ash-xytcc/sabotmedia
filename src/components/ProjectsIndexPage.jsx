import { Link } from 'react-router-dom'
import { getProjectMeta } from '../lib/content'
import { getProjectTheme } from '../lib/projectTheme'

function ProjectIndexCard({ project }) {
  const meta = getProjectMeta(project.slug)
  const theme = getProjectTheme(project.slug)

  return (
    <article className={`project-index-card ${theme.className}`}>
      <div className="project-index-card__eyebrow">{theme.accent}</div>
      <h2>
        <Link to={`/projects/${project.slug}`}>{meta.name}</Link>
      </h2>
      <p className="project-index-card__description">{meta.description}</p>
      <div className="project-index-card__meta">
        <span>{project.count} pieces</span>
        <span>archive view</span>
      </div>
      <div className="project-index-card__actions">
        <Link className="button button--primary" to={`/projects/${project.slug}`}>
          enter project
        </Link>
      </div>
    </article>
  )
}

export function ProjectsIndexPage({ projectMap }) {
  return (
    <main className="page projects-index-page">
      <section className="project-hero">
        <div className="project-hero__eyebrow">federation / lenses / routes</div>
        <h1>Projects</h1>
        <p className="project-hero__description">
          Sabot Media is not one stream. It is a federation of smaller publishing routes,
          each with its own emphasis, rhythm, and medium.
        </p>
        <div className="project-hero__meta">
          <span>{projectMap.length} project lenses</span>
          <span>archive + native-ready structure</span>
        </div>
      </section>

      <section className="section-heading">
        <p>Browse by project</p>
        <h2>Publishing routes</h2>
      </section>

      <section className="project-index-grid">
        {projectMap.map((project) => (
          <ProjectIndexCard key={project.slug} project={project} />
        ))}
      </section>
    </main>
  )
}

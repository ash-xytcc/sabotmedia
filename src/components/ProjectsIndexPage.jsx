import { Link } from 'react-router-dom'
import { getProjectMeta } from '../lib/content'
import { getProjectTheme } from '../lib/projectTheme'
import { EditableText } from './EditableText'
import { usePublicEdit } from './PublicEditContext'
import { getConfiguredBlock } from '../lib/publicConfig'

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
  const { effectiveConfig } = usePublicEdit()
  const heroBlock = getConfiguredBlock(effectiveConfig, 'projects.hero')
  const indexBlock = getConfiguredBlock(effectiveConfig, 'projects.index')

  return (
    <main className="page projects-index-page">
      <section className="project-hero">
        <EditableText as="div" className="project-hero__eyebrow" field={heroBlock?.eyebrowField || 'projects.hero.eyebrow'}>
          federation / lenses / routes
        </EditableText>
        <EditableText as="h1" field={heroBlock?.titleField || 'projects.hero.title'}>
          Projects
        </EditableText>
        <EditableText as="p" className="project-hero__description" field={heroBlock?.descriptionField || 'projects.hero.description'}>
          Sabot Media is not one stream. It is a federation of smaller publishing routes, each with its own emphasis, rhythm, and medium.
        </EditableText>
        <div className="project-hero__meta">
          <span>{projectMap.length} project lenses</span>
          <span>archive + native-ready structure</span>
        </div>
      </section>

      <section className="section-heading">
        <EditableText as="p" field={indexBlock?.eyebrowField || 'projects.index.eyebrow'}>
          Browse by project
        </EditableText>
        <EditableText as="h2" field={indexBlock?.titleField || 'projects.index.title'}>
          Publishing routes
        </EditableText>
      </section>

      <section className="project-index-grid">
        {projectMap.map((project) => (
          <ProjectIndexCard key={project.slug} project={project} />
        ))}
      </section>
    </main>
  )
}

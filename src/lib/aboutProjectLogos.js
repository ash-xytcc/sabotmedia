import { GLARING_EXAMPLES_LOGO_URL } from './glaringExamplesLogo'

const ABOUT_PROJECT_LOGO_OVERRIDES = {
  'glaring-examples': GLARING_EXAMPLES_LOGO_URL,
  'the-sabotuers': '/project-logos/the-sabotuers.svg',
}

export function getAboutProjectLogo(project) {
  if (!project?.slug) return project?.logoUrl || ''
  return ABOUT_PROJECT_LOGO_OVERRIDES[project.slug] || project.logoUrl || ''
}

export const publicRoutes = Object.freeze({
  post: '/post/:slug',
  archive: '/archive',
  project: '/project/:slug',
  projectsLegacy: '/projects/:slug',
  about: '/about',
  security: '/security',
  contact: '/contact',
  support: '/support',
  submit: '/submit',
  print: '/print/:slug',
  printLegacy: '/piece/:slug/print',
  zine: '/zine/:slug',
})

export const adminRoutes = Object.freeze({
  dashboard: '/wp-admin',
  posts: '/wp-admin/posts',
  media: '/wp-admin/media',
  projects: '/wp-admin/projects',
  printlab: '/wp-admin/printlab',
  settings: '/wp-admin/settings',
})

export const routeRedirects = Object.freeze([
  { from: '/admin', to: adminRoutes.dashboard },
  { from: '/content', to: adminRoutes.posts },
  { from: '/media', to: adminRoutes.media },
  { from: '/projects/:slug', to: publicRoutes.project },
  { from: '/printlab', to: adminRoutes.printlab },
  { from: '/settings', to: adminRoutes.settings },
])

export function postPath(slug) {
  return `/post/${slug}`
}

export function projectPath(slug) {
  return `/project/${slug}`
}

export function printPath(slug) {
  return `/print/${slug}`
}

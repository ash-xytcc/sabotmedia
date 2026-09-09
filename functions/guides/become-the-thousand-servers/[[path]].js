import { readCourse } from '../../api/_lib/courseStore.js'
import { getBoundDb } from '../../api/_lib/database.js'
import { listContributors, sharedQuestion } from '../../api/_lib/courseContributors.js'
import {
  renderCourse,
  shell,
  esc,
  prose,
  BASE,
} from '../../../public/guides/become-the-thousand-servers/lms/render.js'
import { SLUG } from '../../../public/guides/become-the-thousand-servers/lms/model.js'
const response = (html, status = 200) =>
  new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive',
      'referrer-policy': 'no-referrer',
    },
  })
export async function onRequest(context) {
  const path = new URL(context.request.url).pathname.slice(BASE.length).replace(/\/$/, '')
  if (path.startsWith('lms/') || path === 'course-backend.js') return context.next()
  if (!['GET', 'HEAD'].includes(context.request.method)) return response('Method not allowed', 405)
  const db = getBoundDb(context)
  if (!db)
    return response(
      shell(
        'Course unavailable',
        '<h1>Course temporarily unavailable</h1><p>Please try again later. Browser progress is unaffected.</p>',
      ),
      503,
    )
  try {
    const contributors = await listContributors(db)
    if (!path || path === 'index.html') {
      const c = await readCourse(db, SLUG)
      return c
        ? response(renderCourse(c, contributors))
        : response(shell('Course unavailable', '<h1>Course is not currently published.</h1>'), 404)
    }
    const match = path.match(/^contributors\/([a-z0-9-]+)(\/private)?$/)
    if (!match) return response(shell('Not found', '<h1>Page not found</h1>'), 404)
    const project = contributors.find((p) => p.id === match[1])
    if (!project) return response(shell('Not found', '<h1>Page not found</h1>'), 404)
    const scope = match[2] ? 'private' : 'edit'
    let published = null
    if (scope === 'edit') {
      const row = await db
        .prepare('SELECT published_json FROM course_contributors WHERE id=?')
        .bind(project.id)
        .first()
      published = JSON.parse(row?.published_json || 'null')
    }
    const publicBody = published
      ? `<h2>${esc(sharedQuestion)}</h2>${prose(published.sharedAnswer)}${published.questions.map((q) => `<h2>${esc(q.question)}</h2>${prose(q.answer)}`).join('')}<h2>Each One, Teach One</h2>${prose(published.exercise)}`
      : '<p>No contribution has been published yet.</p>'
    const body = `<div data-contributor="${esc(project.id)}" data-scope="${scope}"><h1>${scope === 'private' ? 'Private Comms' : esc(project.name)}</h1>${scope === 'private' ? '<p>Private to this project and the Sabot editorial team. Your project sign-in opens both your contribution and this conversation.</p>' : `${publicBody}<p><a href="${BASE}contributors/${project.id}/private">Private Comms</a></p>`}<noscript><p>Editing and Private Comms require JavaScript for the authenticated workspace. Public contributions remain readable without it.</p></noscript><p data-message role="status"></p><form data-login hidden><h2>${scope === 'private' ? 'Unlock Private Comms' : 'Edit contribution'}</h2><label>${scope === 'private' ? 'Project password' : 'Project password'}<input data-password type="password" autocomplete="current-password" required maxlength="500"></label><button>Unlock workspace</button></form><form data-edit-form hidden><div data-edit-fields></div><button>Save contribution</button><button type="button" data-logout>End contributor session</button><button type="button" data-history>Revision history</button></form><div data-revisions></div><details data-admin hidden><summary>Contributor access</summary><p>One project password opens its contribution editor and Private Comms with the Sabot editorial team. Other projects cannot access this workspace. Staff use their existing SabotPress sign-in.</p><label>Project password<input data-edit-password type="password" autocomplete="new-password" minlength="20"></label><p>Use at least 20 characters. Resetting this password revokes existing contributor sessions.</p><button data-credentials>Set project password</button><button data-disable>Disable contributor access</button></details></div><script type="module" src="${BASE}lms/contributor.js?v=20260909-access"></script>`
    return response(shell(scope === 'private' ? 'Private Comms' : project.name, body))
  } catch {
    return response(
      shell(
        'Course unavailable',
        '<h1>Course temporarily unavailable</h1><p>Please try again later. Browser progress is unaffected.</p>',
      ),
      503,
    )
  }
}

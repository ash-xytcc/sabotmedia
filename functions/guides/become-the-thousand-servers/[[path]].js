import { readCourse } from '../../api/_lib/courseStore.js'
import { getBoundDb } from '../../api/_lib/database.js'
import { listContributors, listPublishedContributions, sharedQuestion } from '../../api/_lib/courseContributors.js'
import { renderCourse, shell, esc, prose, BASE } from '../../../public/guides/become-the-thousand-servers/lms/render.js'
import { renderOfflineEdition } from '../../../public/guides/become-the-thousand-servers/lms/offline.js'
import { SLUG, publicCourse, seed } from '../../../public/guides/become-the-thousand-servers/lms/model.js'
import { participatingContributor } from '../../../public/guides/become-the-thousand-servers/lms/participation.js'

const headers = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex, nofollow, noarchive',
  'referrer-policy': 'no-referrer',
}
const response = (html, status = 200, extra = {}) => new Response(String(html), {status,headers:{...headers,...extra}})
const canonicalCourse = () => publicCourse(structuredClone(seed))
const renderCanonicalCourse = () => response(renderCourse(canonicalCourse(), []))
const renderCanonicalOffline = () => response(renderOfflineEdition(canonicalCourse(), []), 200, {
  'content-disposition': `attachment; filename="become-the-thousand-servers-${String(seed.contentVersion || 'current').replace(/[^a-z0-9._-]+/gi,'-')}.html"`,
})
const publishedContributions = async (db) => {
  if (!db) return []
  try {
    return await listPublishedContributions(db)
  } catch {
    // Public reading must never depend on outreach/review storage being healthy.
    return []
  }
}

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname.slice(BASE.length).replace(/\/$/, '')
  if (path.startsWith('lms/') || path === 'course-backend.js') return context.next()
  if (!['GET','HEAD'].includes(context.request.method)) return response('Method not allowed',405)

  // The published course must remain readable even when D1, contributor records,
  // or editorial backend state are unavailable. The repository seed is the
  // canonical public fallback and contains the complete published manuscript.
  const db = getBoundDb(context)
  if (!db) {
    if (!path || path === 'index.html') return renderCanonicalCourse()
    if (path === 'offline' || path === 'offline.html') return renderCanonicalOffline()
  }

  try {
    if (!path || path === 'index.html') {
      const [c, contributions] = await Promise.all([readCourse(db,SLUG), publishedContributions(db)])
      return response(renderCourse(c || canonicalCourse(), contributions))
    }
    if (path === 'offline' || path === 'offline.html') {
      const [c, contributions] = await Promise.all([readCourse(db,SLUG), publishedContributions(db)])
      const course = c || canonicalCourse()
      return response(renderOfflineEdition(course,contributions),200,{
        'content-disposition': `attachment; filename="become-the-thousand-servers-${String(course.contentVersion || 'current').replace(/[^a-z0-9._-]+/gi,'-')}.html"`,
      })
    }
    if (!db) return response(shell('Not found','<h1>Page not found</h1>'),404)

    const match = path.match(/^contributors\/([a-z0-9-]+)(\/private)?$/)
    if (!match) return response(shell('Not found','<h1>Page not found</h1>'),404)
    const projectId = match[1]
    if (!participatingContributor(projectId)) return response(shell('Not found','<h1>Page not found</h1>'),404)
    const contributors = await listContributors(db)
    const project = contributors.find((p)=>p.id===projectId) || null
    const scope = match[2] ? 'private' : 'edit'
    let published = null
    if (project && scope === 'edit') {
      const row = await db.prepare('SELECT published_json FROM course_contributors WHERE id=?').bind(projectId).first()
      published = JSON.parse(row?.published_json || 'null')
    }
    const publicBody = published ? `<h2>${esc(sharedQuestion)}</h2>${prose(published.sharedAnswer)}${published.questions.map((q)=>`<h2>${esc(q.question)}</h2>${prose(q.answer)}`).join('')}<h2>Each One, Teach One</h2>${prose(published.exercise)}` : '<p>No contribution has been published yet.</p>'
    const heading = scope === 'private' ? 'Private Comms' : published ? project.name : 'Contributor workspace'
    const body = `<div data-contributor="${esc(projectId)}" data-scope="${scope}"><h1>${esc(heading)}</h1>${scope==='private'?'<p>Private to this project and the Sabot editorial team. Your project sign-in opens both your contribution and this conversation.</p>':`${publicBody}<p><a href="${BASE}contributors/${projectId}/private">Private Comms</a></p>`}<noscript><p>Editing and Private Comms require JavaScript for the authenticated workspace. Public contributions remain readable without it.</p></noscript><p data-message role="status"></p><form data-login hidden><h2>${scope==='private'?'Unlock Private Comms':'Edit contribution'}</h2><label>Project password<input data-password type="password" autocomplete="current-password" required maxlength="500"></label><button>Unlock workspace</button></form><form data-edit-form hidden><div data-edit-fields></div><button>Save contribution</button><button type="button" data-logout>End contributor session</button><button type="button" data-history>Revision history</button></form><div data-revisions></div><details data-admin hidden><summary>Contributor access</summary><p>One project password opens its contribution editor and Private Comms with the Sabot editorial team. Other projects cannot access this workspace. Editors use their existing SabotPress sign-in.</p><label>Project password<input data-edit-password type="password" autocomplete="new-password" minlength="20"></label><p>Use at least 20 characters. Resetting this password revokes existing contributor sessions.</p><button data-credentials>Set project password</button><button data-disable>Disable contributor access</button></details></div><script type="module" src="${BASE}lms/contributor.js?v=review-2"></script>`
    return response(shell(heading,body))
  } catch {
    if (!path || path === 'index.html') return renderCanonicalCourse()
    if (path === 'offline' || path === 'offline.html') return renderCanonicalOffline()
    return response(shell('Course unavailable','<h1>Course temporarily unavailable</h1><p>Please try again later.</p>'),503)
  }
}

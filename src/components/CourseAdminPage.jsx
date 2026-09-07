import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { createCourse, deleteCourse, listCourses, loadCourseContent, saveCourseContent } from '../lib/courseContentApi'

const COURSES_HOME = '/wp-admin/pages?courses=1'
const SEEDED_SLUG = 'become-the-thousand-servers'

function clone(value) { return JSON.parse(JSON.stringify(value)) }
function courseEditUrl(slug) { return `/wp-admin/pages?course=${encodeURIComponent(slug)}` }
function publicCourseUrl(slug) { return slug === SEEDED_SLUG ? '/guides/become-the-thousand-servers/' : `/guides/${slug}/` }
function slugify(value = '') { return String(value).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') }

export function CourseAdminPage() {
  const location = useLocation()
  const slug = new URLSearchParams(location.search).get('course') || ''
  return slug ? <CourseEditor slug={slug} /> : <CoursesIndex />
}

function CoursesIndex() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('Loading courses…')
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')

  async function refresh() {
    try {
      const data = await listCourses()
      setItems(data.items || [])
      setStatus(`${(data.items || []).length} course${(data.items || []).length === 1 ? '' : 's'}`)
    } catch (error) { setStatus(error.message) }
  }
  useEffect(() => { refresh() }, [])

  function updateTitle(value) {
    setTitle(value)
    if (!slug || slug === slugify(title)) setSlug(slugify(value))
  }

  async function addCourse(event) {
    event.preventDefault()
    const cleanTitle = title.trim()
    const cleanSlug = slugify(slug || title)
    if (!cleanTitle || !cleanSlug) return
    setStatus('Creating course…')
    try {
      await createCourse({
        slug: cleanSlug, title: cleanTitle, subtitle:'', deck:'', intro:'', taskHeading:'Start with the problem you are trying to solve', taskIntro:'',
        contentVersion:'working-1', status:'draft', lessons:[],
      })
      navigate(courseEditUrl(cleanSlug))
    } catch (error) { setStatus(error.message) }
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <div><h1>Courses</h1><p className="description">Build and maintain self-paced field courses. Editorial content is stored in D1; learner progress stays in each learner’s browser.</p></div>
          <button className="button button--primary" type="button" onClick={() => setCreating((value) => !value)}>{creating ? 'Cancel' : 'Add Course'}</button>
        </div>
        <p className="description" aria-live="polite">{status}</p>
        {creating ? (
          <section className="wp-meta-box">
            <h2>New course</h2>
            <form onSubmit={addCourse}>
              <p><label>Title<br/><input className="large-text" value={title} onChange={(e) => updateTitle(e.target.value)} autoFocus /></label></p>
              <p><label>Slug<br/><input className="large-text" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} /></label></p>
              <p className="description">The slug becomes the course identifier. Keep it short and boring. URLs are one of the few places where boring is a virtue.</p>
              <button className="button button--primary" type="submit">Create course</button>
            </form>
          </section>
        ) : null}
        <section className="wp-meta-box">
          <table className="content-table wp-posts-table">
            <thead><tr><th>Course</th><th>Status</th><th>Lessons</th><th>Updated</th></tr></thead>
            <tbody>{items.map((item) => (
              <tr key={item.slug}>
                <td><strong className="content-table__title">{item.title}</strong><div className="wp-row-actions"><Link to={courseEditUrl(item.slug)}>Edit</Link>{item.slug === SEEDED_SLUG ? <a href={publicCourseUrl(item.slug)} target="_blank" rel="noreferrer">View</a> : null}</div><code>{item.slug}</code></td>
                <td>{item.status || 'draft'}</td><td>{item.lessons ?? 0}</td><td>{item.updatedAt || 'default seed'}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      </main>
    </AdminFrame>
  )
}

function CourseEditor({ slug }) {
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [status, setStatus] = useState('Loading course…')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setCourse(null)
    loadCourseContent(slug).then((data) => {
      if (cancelled) return
      setCourse(clone(data.item))
      setStatus(data.source === 'd1' ? `Loaded saved course${data.updatedAt ? ` · ${data.updatedAt}` : ''}` : 'Loaded seeded course. Save once to create its editable D1 record.')
    }).catch((error) => { if (!cancelled) setStatus(error.message) })
    return () => { cancelled = true }
  }, [slug])

  function patchCourse(field, value) { setCourse((current) => ({ ...current, [field]: value })) }
  function patchLesson(index, field, value) { setCourse((current) => { const next = clone(current); next.lessons[index][field] = value; return next }) }
  function resourcesText(resources = []) { return resources.map((r) => [r.title, r.url, r.note].filter(Boolean).join(' | ')).join('\n') }
  function parseResources(text = '') { return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => { const [title='',url='',...rest] = line.split('|').map((part) => part.trim()); return { title, url, note:rest.join(' | ') } }) }

  function addLesson() {
    setCourse((current) => {
      const next = clone(current)
      const number = next.lessons.length + 1
      next.lessons.push({ slug:`lesson-${number}`, number, title:`Lesson ${number}`, difficulty:'Beginner', time:'', status:'working draft', learn:'', do:'', test:'', teach:'', resources:[] })
      return next
    })
  }
  function removeLesson(index) {
    if (!window.confirm(`Delete lesson ${index + 1}?`)) return
    setCourse((current) => {
      const next = clone(current)
      next.lessons.splice(index, 1)
      next.lessons = next.lessons.map((lesson, i) => ({ ...lesson, number:i + 1 }))
      return next
    })
  }

  async function save() {
    if (!course || saving) return
    setSaving(true); setStatus('Saving…')
    try { const data = await saveCourseContent(course); setCourse(clone(data.item)); setStatus(`Saved${data.updatedAt ? ` · ${data.updatedAt}` : ''}`) }
    catch (error) { setStatus(error.message) }
    finally { setSaving(false) }
  }

  async function removeCourse() {
    if (slug === SEEDED_SLUG || !window.confirm(`Delete “${course?.title || slug}”? This cannot be undone.`)) return
    try { await deleteCourse(slug); navigate(COURSES_HOME) } catch (error) { setStatus(error.message) }
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <div><p className="description"><Link to={COURSES_HOME}>Courses</Link></p><h1>{course?.title || slug}</h1><p className="description">Edit course copy and lesson content. Learner progress is a separate local-only system.</p></div>
          <div className="review-card__actions"><Link className="button" to={COURSES_HOME}>All Courses</Link>{slug === SEEDED_SLUG ? <a className="button" href={publicCourseUrl(slug)} target="_blank" rel="noreferrer">View course</a> : null}<button className="button button--primary" type="button" onClick={save} disabled={!course || saving}>{saving ? 'Saving…' : 'Save course'}</button></div>
        </div>
        <p className="description" aria-live="polite">{status}</p>
        {!course ? null : <>
          <section className="wp-meta-box">
            <h2>Course settings and home copy</h2>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'12px'}}><label>Title<input className="large-text" value={course.title || ''} onChange={(e) => patchCourse('title', e.target.value)} /></label><label>Status<select value={course.status || 'draft'} onChange={(e) => patchCourse('status', e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label></div>
            <p><label>Slug<br/><input className="large-text" value={course.slug || ''} readOnly /></label></p>
            <p><label>Subtitle<br/><input className="large-text" value={course.subtitle || ''} onChange={(e) => patchCourse('subtitle', e.target.value)} /></label></p>
            <p><label>Deck<br/><input className="large-text" value={course.deck || ''} onChange={(e) => patchCourse('deck', e.target.value)} /></label></p>
            <p><label>Introduction<br/><textarea className="large-text" rows="7" value={course.intro || ''} onChange={(e) => patchCourse('intro', e.target.value)} /></label></p>
            <p><label>Problem-navigation heading<br/><input className="large-text" value={course.taskHeading || ''} onChange={(e) => patchCourse('taskHeading', e.target.value)} /></label></p>
            <p><label>Problem-navigation explanation<br/><textarea className="large-text" rows="3" value={course.taskIntro || ''} onChange={(e) => patchCourse('taskIntro', e.target.value)} /></label></p>
            <p><label>Content version<br/><input value={course.contentVersion || ''} onChange={(e) => patchCourse('contentVersion', e.target.value)} /></label></p>
          </section>
          <div className="wp-screen-header"><div><h2>Lessons</h2><p className="description">{course.lessons.length} lessons</p></div><button className="button" type="button" onClick={addLesson}>Add Lesson</button></div>
          {course.lessons.map((lesson,index) => (
            <details className="wp-meta-box" key={`${lesson.slug}-${index}`} open={index === 0}>
              <summary><strong>Lesson {index + 1}: {lesson.title}</strong> · {lesson.status}</summary>
              <div style={{paddingTop:'1rem'}}>
                <p><label>Title<br/><input className="large-text" value={lesson.title || ''} onChange={(e) => patchLesson(index,'title',e.target.value)} /></label></p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'12px'}}><label>Slug<input value={lesson.slug || ''} onChange={(e) => patchLesson(index,'slug',slugify(e.target.value))} /></label><label>Status<input value={lesson.status || ''} onChange={(e) => patchLesson(index,'status',e.target.value)} /></label><label>Difficulty<input value={lesson.difficulty || ''} onChange={(e) => patchLesson(index,'difficulty',e.target.value)} /></label><label>Approx. time<input value={lesson.time || ''} onChange={(e) => patchLesson(index,'time',e.target.value)} /></label></div>
                {['learn','do','test','teach'].map((field) => <p key={field}><label><strong>{field[0].toUpperCase()+field.slice(1)}</strong><br/><textarea className="large-text" rows="8" value={lesson[field] || ''} onChange={(e) => patchLesson(index,field,e.target.value)} placeholder={`Write the ${field} section here…`} /></label></p>)}
                <p><label><strong>Resources</strong><br/><span className="description">One per line: Title | URL | note</span><br/><textarea className="large-text" rows="5" value={resourcesText(lesson.resources)} onChange={(e) => patchLesson(index,'resources',parseResources(e.target.value))} /></label></p>
                <button className="button" type="button" onClick={() => removeLesson(index)}>Delete lesson</button>
              </div>
            </details>
          ))}
          <div className="review-card__actions" style={{marginTop:'18px'}}><button className="button button--primary" type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save course'}</button>{slug !== SEEDED_SLUG ? <button className="button" type="button" onClick={removeCourse}>Delete course</button> : null}</div>
        </>}
      </main>
    </AdminFrame>
  )
}

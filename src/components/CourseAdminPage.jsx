import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { loadCourseContent, saveCourseContent } from '../lib/courseContentApi'

const COURSE_URL = '/guides/become-the-thousand-servers/'

function clone(value) { return JSON.parse(JSON.stringify(value)) }

export function CourseAdminPage() {
  const [course, setCourse] = useState(null)
  const [status, setStatus] = useState('Loading course…')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadCourseContent().then((data) => {
      if (cancelled) return
      setCourse(clone(data.item))
      setStatus(data.source === 'd1' ? `Loaded saved course${data.updatedAt ? ` · ${data.updatedAt}` : ''}` : 'Loaded default course. Save once to create the editable D1 record.')
    }).catch((error) => { if (!cancelled) setStatus(error.message) })
    return () => { cancelled = true }
  }, [])

  function patchCourse(field, value) { setCourse((current) => ({ ...current, [field]: value })) }
  function patchLesson(index, field, value) {
    setCourse((current) => {
      const next = clone(current)
      next.lessons[index][field] = value
      return next
    })
  }
  function resourcesText(resources = []) { return resources.map((r) => [r.title, r.url, r.note].filter(Boolean).join(' | ')).join('\n') }
  function parseResources(text = '') {
    return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [title = '', url = '', ...rest] = line.split('|').map((part) => part.trim())
      return { title, url, note: rest.join(' | ') }
    })
  }

  async function save() {
    if (!course || saving) return
    setSaving(true)
    setStatus('Saving…')
    try {
      const data = await saveCourseContent(course)
      setCourse(clone(data.item))
      setStatus(`Saved${data.updatedAt ? ` · ${data.updatedAt}` : ''}`)
    } catch (error) { setStatus(error.message) }
    finally { setSaving(false) }
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <div>
            <p className="description">Guides / Field Manuals</p>
            <h1>Become the Thousand Servers</h1>
            <p className="description">Edit course copy and lesson content here. Learner progress is separate and remains in each learner’s browser.</p>
          </div>
          <div className="review-card__actions">
            <Link className="button" to="/wp-admin/pages">Back to Pages</Link>
            <a className="button" href={COURSE_URL} target="_blank" rel="noreferrer">View course</a>
            <button className="button button--primary" type="button" onClick={save} disabled={!course || saving}>{saving ? 'Saving…' : 'Save course'}</button>
          </div>
        </div>
        <p className="description" aria-live="polite">{status}</p>
        {!course ? null : <>
          <section className="wp-meta-box">
            <h2>Course home copy</h2>
            <p><label>Title<br/><input className="regular-text" value={course.title || ''} onChange={(e) => patchCourse('title', e.target.value)} /></label></p>
            <p><label>Subtitle<br/><input className="large-text" value={course.subtitle || ''} onChange={(e) => patchCourse('subtitle', e.target.value)} /></label></p>
            <p><label>Deck<br/><input className="large-text" value={course.deck || ''} onChange={(e) => patchCourse('deck', e.target.value)} /></label></p>
            <p><label>Introduction<br/><textarea className="large-text" rows="7" value={course.intro || ''} onChange={(e) => patchCourse('intro', e.target.value)} /></label></p>
            <p><label>Problem-navigation heading<br/><input className="large-text" value={course.taskHeading || ''} onChange={(e) => patchCourse('taskHeading', e.target.value)} /></label></p>
            <p><label>Problem-navigation explanation<br/><textarea className="large-text" rows="3" value={course.taskIntro || ''} onChange={(e) => patchCourse('taskIntro', e.target.value)} /></label></p>
            <p><label>Content version<br/><input value={course.contentVersion || ''} onChange={(e) => patchCourse('contentVersion', e.target.value)} /></label></p>
          </section>

          {course.lessons.map((lesson, index) => (
            <details className="wp-meta-box" key={lesson.slug} open={index === 0}>
              <summary><strong>Lesson {lesson.number}: {lesson.title}</strong> · {lesson.status}</summary>
              <div style={{paddingTop:'1rem'}}>
                <p><label>Title<br/><input className="large-text" value={lesson.title || ''} onChange={(e) => patchLesson(index, 'title', e.target.value)} /></label></p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'12px'}}>
                  <label>Status<input value={lesson.status || ''} onChange={(e) => patchLesson(index, 'status', e.target.value)} /></label>
                  <label>Difficulty<input value={lesson.difficulty || ''} onChange={(e) => patchLesson(index, 'difficulty', e.target.value)} /></label>
                  <label>Approx. time<input value={lesson.time || ''} onChange={(e) => patchLesson(index, 'time', e.target.value)} /></label>
                </div>
                {['learn','do','test','teach'].map((field) => (
                  <p key={field}><label><strong>{field[0].toUpperCase()+field.slice(1)}</strong><br/><textarea className="large-text" rows="8" value={lesson[field] || ''} onChange={(e) => patchLesson(index, field, e.target.value)} placeholder={`Write the ${field} section here…`} /></label></p>
                ))}
                <p><label><strong>Resources</strong><br/><span className="description">One per line: Title | URL | note</span><br/><textarea className="large-text" rows="5" value={resourcesText(lesson.resources)} onChange={(e) => patchLesson(index, 'resources', parseResources(e.target.value))} /></label></p>
              </div>
            </details>
          ))}
          <div className="review-card__actions" style={{marginTop:'18px'}}><button className="button button--primary" type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save course'}</button></div>
        </>}
      </main>
    </AdminFrame>
  )
}

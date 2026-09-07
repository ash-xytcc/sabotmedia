(() => {
  'use strict'

  let course = null
  const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
  const paragraphs = (text = '') => String(text).split(/\n{2,}/).map((part) => part.trim()).filter(Boolean).map((part) => `<p>${esc(part).replace(/\n/g, '<br>')}</p>`).join('')

  function applyHome() {
    if (!course) return
    const hero = document.querySelector('.hero')
    if (!hero) return
    const eyebrow = hero.querySelector('.eyebrow')
    const title = hero.querySelector('h1')
    const deck = hero.querySelector('.deck')
    const prose = hero.querySelector('.prose')
    if (eyebrow) eyebrow.textContent = course.subtitle || eyebrow.textContent
    if (title) title.textContent = course.title || title.textContent
    if (deck) deck.textContent = course.deck || deck.textContent
    if (prose && course.intro) prose.innerHTML = paragraphs(course.intro)

    const tasksSection = document.querySelector('#tasks')?.closest('.section')
    if (tasksSection) {
      const heading = tasksSection.querySelector('h2')
      if (heading && course.taskHeading) heading.textContent = course.taskHeading
      let intro = tasksSection.querySelector('.course-task-intro')
      if (!intro) {
        intro = document.createElement('p')
        intro.className = 'course-task-intro prose'
        tasksSection.insertBefore(intro, document.querySelector('#tasks'))
      }
      intro.textContent = course.taskIntro || ''
    }

    course.lessons?.forEach((lesson, index) => {
      const card = document.querySelectorAll('#lessonGrid .card')[index]
      if (!card) return
      const h3 = card.querySelector('h3')
      if (h3 && lesson.title) h3.textContent = lesson.title
    })
  }

  function lessonFromHash() {
    const match = location.hash.match(/^#lesson-(\d+)/)
    if (!match || !course?.lessons) return null
    return course.lessons[Number(match[1]) - 1] || null
  }

  function applyLesson() {
    const lesson = lessonFromHash()
    const article = document.querySelector('#lessonArticle')
    if (!lesson || !article) return
    const h1 = article.querySelector('h1')
    if (h1 && lesson.title) h1.textContent = lesson.title

    article.querySelectorAll('.backend-course-copy').forEach((node) => node.remove())
    const anchor = article.querySelector('.completebox') || article.querySelector('.prevnext') || null
    const wrap = document.createElement('div')
    wrap.className = 'backend-course-copy'
    const sections = [
      ['Learn', lesson.learn], ['Do', lesson.do], ['Test', lesson.test], ['Teach', lesson.teach]
    ].filter(([, text]) => String(text || '').trim())

    if (!sections.length) {
      wrap.innerHTML = '<section class="lesson-section"><h2>Working lesson</h2><p>This lesson is connected to the Sabot editor and ready to be filled in. The structure is live; the instructional copy is still being written and verified.</p></section>'
    } else {
      wrap.innerHTML = sections.map(([title, text]) => `<section class="lesson-section"><h2>${esc(title)}</h2>${paragraphs(text)}</section>`).join('')
    }

    if (Array.isArray(lesson.resources) && lesson.resources.length) {
      const resources = document.createElement('section')
      resources.className = 'lesson-section backend-course-copy'
      resources.innerHTML = `<h2>Resources</h2><ul class="resources">${lesson.resources.map((r) => `<li><div>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noreferrer">${esc(r.title || r.url)}</a>` : esc(r.title)}${r.note ? `<br><small>${esc(r.note)}</small>` : ''}</div></li>`).join('')}</ul>`
      wrap.appendChild(resources)
    }

    article.insertBefore(wrap, anchor)
  }

  function apply() {
    applyHome()
    window.setTimeout(applyLesson, 0)
  }

  fetch('/api/course-content', { credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' } })
    .then((res) => res.ok ? res.json() : Promise.reject(new Error(`course content ${res.status}`)))
    .then((data) => { if (data?.ok && data.item) { course = data.item; apply() } })
    .catch(() => {})

  window.addEventListener('hashchange', () => window.setTimeout(apply, 0))
  const observer = new MutationObserver(() => { if (course && lessonFromHash()) applyLesson() })
  observer.observe(document.getElementById('main') || document.body, { childList: true, subtree: true })
})()

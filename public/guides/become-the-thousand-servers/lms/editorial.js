export function mountInlineEditor(initial) {
  let course = initial
  for (const element of document.querySelectorAll('[data-unit]')) {
    const key = element.dataset.unit,
      kind = course.sections.some((s) => s.id === key) ? 'sections' : 'lessons'
    const record = course[kind].find((u) => (u.id || u.slug) === key)
    if (!record) continue
    const details = document.createElement('details'),
      summary = document.createElement('summary'),
      form = document.createElement('form'),
      fields = {}
    summary.textContent = 'Edit this ' + (kind === 'sections' ? 'guide section' : 'lesson')
    for (const name of kind === 'sections' ? ['title', 'body'] : ['title', 'learn', 'do', 'test', 'teach']) {
      const label = document.createElement('label'),
        input = document.createElement('textarea')
      label.textContent = name
      input.value = record[name] || ''
      input.rows = name === 'title' ? 2 : 8
      input.maxLength = 30000
      label.append(input)
      form.append(label)
      fields[name] = input
    }
    const label = document.createElement('label'),
      select = document.createElement('select')
    label.textContent = 'Editorial status '
    for (const status of ['draft', 'reporting needed', 'testing', 'review', 'published', 'archived']) {
      const option = document.createElement('option')
      option.textContent = status
      select.append(option)
    }
    select.value = record.status
    label.append(select)
    form.append(label)
    const button = document.createElement('button'),
      message = document.createElement('p')
    button.textContent = 'Save section changes'
    message.setAttribute('role', 'status')
    form.append(button, message)
    form.onsubmit = async (e) => {
      e.preventDefault()
      button.disabled = true
      try {
        const next = structuredClone(course),
          item = next[kind].find((u) => (u.id || u.slug) === key)
        for (const [name, input] of Object.entries(fields)) item[name] = input.value
        item.status = select.value
        // A public course save refreshes its public projection; unpublished units stay excluded.
        const res = await fetch('/api/course-content', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ item: next }),
          }),
          data = await res.json()
        if (!res.ok) throw Error(data.error || 'Save failed')
        course = data.item
        message.textContent = 'Saved. Reload to view the published version, or continue editing here.'
      } catch (e) {
        message.textContent = e.message
      } finally {
        button.disabled = false
      }
    }
    details.append(summary, form)
    element.append(details)
  }
}

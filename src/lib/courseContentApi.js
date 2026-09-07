export async function loadCourseContent() {
  const response = await fetch('/api/course-content', { credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' } })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok) throw new Error(data?.error || `Course content request failed (${response.status})`)
  return data
}

export async function saveCourseContent(item) {
  const response = await fetch('/api/course-content', {
    method: 'PUT', credentials: 'same-origin',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ item }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok) throw new Error(data?.error || `Course content save failed (${response.status})`)
  return data
}

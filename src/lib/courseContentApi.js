async function request(url, options = {}) {
  const response = await fetch(url, { credentials:'same-origin', cache:'no-store', headers:{ accept:'application/json', ...(options.headers || {}) }, ...options })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok) throw new Error(data?.error || `Course request failed (${response.status})`)
  return data
}

export function listCourses() {
  return request('/api/course-content?list=1')
}

export function loadCourseContent(slug = 'become-the-thousand-servers') {
  return request(`/api/course-content?slug=${encodeURIComponent(slug)}&edit=1`)
}

export function saveCourseContent(item) {
  return request('/api/course-content', {
    method:'PUT',
    headers:{ 'content-type':'application/json' },
    body:JSON.stringify({ item }),
  })
}

export function createCourse(item) {
  return request('/api/course-content', {
    method:'POST',
    headers:{ 'content-type':'application/json' },
    body:JSON.stringify({ item }),
  })
}

export function deleteCourse(slug) {
  return request('/api/course-content', {
    method:'DELETE',
    headers:{ 'content-type':'application/json' },
    body:JSON.stringify({ slug }),
  })
}

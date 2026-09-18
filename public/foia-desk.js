(() => {
  const $ = (selector) => document.querySelector(selector)
  const api = '/api/public-records'
  const state = { requests: [], current: null }
  const fields = [
    'id','internalTitle','publicTitle','whyItMatters','recordsSought','jurisdictionType','recordsLaw','agencyName','agencyAbbreviation',
    'agencyComponentName','agencyComponentId','officialFilingUrl','dateRange','preferredFormat','requestText','feeWaiverLanguage',
    'expeditedProcessingLanguage','dateFiled','trackingNumber','status','sortOrder','publicNotes','internalNotes'
  ]

  function message(text, ok = true) {
    const el = $('#message')
    if (!el) return
    el.textContent = text
    el.className = `message show ${ok ? 'ok' : 'err'}`
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options })
    const text = await response.text()
    let data
    try { data = JSON.parse(text) } catch { throw new Error(`Records API returned ${response.status} ${response.statusText}, not JSON`) }
    if (!response.ok || data.ok === false) throw new Error(data.error || `${response.status} ${response.statusText}`)
    return data
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;' }[char]))
  }

  function renderList() {
    const list = $('#requests')
    if (!list) return
    if (!state.requests.length) {
      list.innerHTML = '<div class="empty-state">No requests found for this investigation.</div>'
      return
    }
    list.innerHTML = state.requests.map((item) => `
      <button type="button" class="request-row${state.current?.id === item.id ? ' active' : ''}" data-request-id="${escapeHtml(item.id)}">
        <span class="status" data-status="${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>
        <strong>${escapeHtml(item.publicTitle || item.internalTitle || 'Untitled request')}</strong>
        <span class="meta">${escapeHtml([item.agencyName, item.agencyComponentName].filter(Boolean).join(' · ') || 'Agency/component not verified yet')}</span>
      </button>`).join('')
    list.querySelectorAll('[data-request-id]').forEach((button) => {
      button.addEventListener('click', () => select(state.requests.find((item) => item.id === button.dataset.requestId)))
    })
  }

  function renderDocuments(documents = []) {
    const container = $('#documents')
    if (!container) return
    container.innerHTML = documents.length ? documents.map((doc) => `
      <div class="doc"><strong>${escapeHtml(doc.title || doc.originalFilename || doc.documentKind)}</strong>
      <div class="meta">${escapeHtml([doc.documentKind, doc.receivedDate].filter(Boolean).join(' · '))}</div>
      ${doc.fileUrl ? `<a href="${escapeHtml(doc.fileUrl)}" target="_blank" rel="noreferrer">Open file ↗</a>` : ''}</div>`).join('') : '<p class="meta">No correspondence or released records attached yet.</p>'
  }

  function select(item) {
    if (!item) return
    state.current = item
    fields.forEach((name) => {
      const input = document.querySelector(`[name="${name}"]`)
      if (input) input.value = item[name] ?? ''
    })
    $('[name="isPublic"]').checked = item.isPublic !== false
    $('[name="requestTextPublic"]').checked = Boolean(item.requestTextPublic)
    $('#editor-title').textContent = item.publicTitle || item.internalTitle || 'Request editor'
    $('#official-link').href = item.officialFilingUrl || 'https://www.foia.gov/agency-search.html'
    renderDocuments(item.documents || [])
    renderList()
  }

  async function load() {
    const key = $('#investigation').value.trim()
    $('#count').textContent = 'Loading…'
    const data = await requestJson(`${api}?view=admin&investigation=${encodeURIComponent(key)}&_=${Date.now()}`)
    state.requests = data.requests || []
    $('#count').textContent = `${state.requests.length} total`
    const currentId = state.current?.id
    renderList()
    if (currentId) select(state.requests.find((item) => item.id === currentId) || state.requests[0])
    else if (state.requests[0]) select(state.requests[0])
    else state.current = null
    message(`Loaded ${state.requests.length} request${state.requests.length === 1 ? '' : 's'}.`)
  }

  function blank() {
    state.current = null
    $('#form').reset()
    $('[name="jurisdictionType"]').value = 'federal'
    $('[name="recordsLaw"]').value = 'FOIA'
    $('[name="status"]').value = 'Drafting'
    $('[name="preferredFormat"]').value = 'Electronic records in native format where available'
    $('[name="isPublic"]').checked = true
    $('[name="requestTextPublic"]').checked = false
    $('#editor-title').textContent = 'New request'
    renderDocuments([])
    renderList()
  }

  $('#reload').addEventListener('click', () => load().catch((error) => message(error.message, false)))
  $('#new').addEventListener('click', blank)
  $('#copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('[name="requestText"]').value || '')
      message('Request text copied.')
    } catch (error) { message(error.message, false) }
  })

  $('#form').addEventListener('submit', async (event) => {
    event.preventDefault()
    try {
      const data = { action: 'request', investigationKey: $('#investigation').value.trim() }
      fields.forEach((name) => {
        const input = document.querySelector(`[name="${name}"]`)
        if (input) data[name] = input.value
      })
      data.isPublic = $('[name="isPublic"]').checked
      data.requestTextPublic = $('[name="requestTextPublic"]').checked
      const result = await requestJson(api, {
        method: state.current ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      })
      state.current = result.item
      message('Request saved.')
      await load()
    } catch (error) { message(error.message, false) }
  })

  $('#official-link').addEventListener('click', () => {
    if (!$('#official-link').href) $('#official-link').href = 'https://www.foia.gov/agency-search.html'
  })

  load().catch((error) => {
    $('#count').textContent = 'Load failed'
    message(error.message, false)
  })
})()

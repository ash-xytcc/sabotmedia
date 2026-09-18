import { useState } from 'react'

function displayFeedUrl(feedUrl = '') {
  return String(feedUrl || '').trim()
}

function requestFeedUrl(feedUrl = '') {
  const raw = displayFeedUrl(feedUrl)
  if (!raw || typeof window === 'undefined') return raw
  try {
    const parsed = new URL(raw, window.location.origin)
    if (parsed.hostname === 'sabot.media' && window.location.hostname === 'sabot.media') return `${parsed.pathname}${parsed.search}`
    return parsed.toString()
  } catch {
    return raw
  }
}

export function PodcastFeedTools({ feedUrl = '' }) {
  const [state, setState] = useState('idle')
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState(null)
  const publicUrl = displayFeedUrl(feedUrl)

  if (!publicUrl) return null

  async function copyFeed() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setMessage('RSS URL copied.')
    } catch {
      setMessage('Could not copy automatically. Select the RSS URL and copy it manually.')
    }
  }

  async function validateFeed() {
    try {
      setState('loading')
      setMessage('')
      const response = await fetch(requestFeedUrl(publicUrl), { credentials: 'same-origin', cache: 'no-store' })
      const xml = await response.text()
      if (!response.ok) throw new Error(`Feed returned ${response.status}`)
      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'application/xml')
      if (doc.querySelector('parsererror')) throw new Error('Feed XML could not be parsed')

      const channel = doc.querySelector('rss > channel')
      if (!channel) throw new Error('RSS channel is missing')
      const title = channel.querySelector(':scope > title')?.textContent?.trim() || ''
      const description = channel.querySelector(':scope > description')?.textContent?.trim() || ''
      const items = [...channel.querySelectorAll(':scope > item')]
      const enclosureItems = items.filter((item) => {
        const enclosure = item.querySelector(':scope > enclosure')
        return enclosure?.getAttribute('url') && enclosure?.getAttribute('type') && enclosure?.getAttribute('length') != null
      })
      const guidItems = items.filter((item) => item.querySelector(':scope > guid')?.textContent?.trim())
      const issues = []
      if (!title) issues.push('channel title missing')
      if (!description) issues.push('channel description missing')
      if (items.length && enclosureItems.length !== items.length) issues.push(`${items.length - enclosureItems.length} episode enclosure(s) incomplete`)
      if (items.length && guidItems.length !== items.length) issues.push(`${items.length - guidItems.length} episode GUID(s) missing`)

      setPreview({ title: title || 'Untitled podcast', description, itemCount: items.length, enclosureCount: enclosureItems.length, guidCount: guidItems.length, issues })
      setMessage(issues.length ? `Feed parsed with ${issues.length} issue${issues.length === 1 ? '' : 's'}.` : 'Feed is valid for the core podcast fields Sabot checks.')
      setState(issues.length ? 'warning' : 'valid')
    } catch (error) {
      setPreview(null)
      setMessage(`Feed validation failed: ${String(error?.message || error)}`)
      setState('error')
    }
  }

  return (
    <div className="podcast-feed-tools">
      <div className="review-card__actions">
        <a className="button" href={publicUrl} target="_blank" rel="noreferrer">Open RSS</a>
        <button className="button" type="button" onClick={copyFeed}>Copy RSS URL</button>
        <button className="button" type="button" onClick={validateFeed} disabled={state === 'loading'}>{state === 'loading' ? 'Checking…' : 'Preview / Validate'}</button>
      </div>
      {message ? <p className={`description podcast-feed-tools__status podcast-feed-tools__status--${state}`} role="status">{message}</p> : null}
      {preview ? (
        <div className="podcast-feed-tools__preview">
          <strong>{preview.title}</strong>
          {preview.description ? <p>{preview.description}</p> : null}
          <p>{preview.itemCount} episode{preview.itemCount === 1 ? '' : 's'} · {preview.enclosureCount} enclosures · {preview.guidCount} GUIDs</p>
          {preview.issues.length ? <ul>{preview.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
        </div>
      ) : null}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminFrame } from './AdminRail'
import { MediaPickerModal } from './MediaLibraryPage'
import { WpAdminNotices, useAdminNotices } from './WpAdminNotices'
import {
  createEmptyNativeEntry,
  loadNativeCollection,
  slugify,
  upsertNativeEntryWithMeta,
} from '../lib/nativePublicContent'
import { loadPodcastShowsAsync } from '../lib/podcastSettings'
import { podcastEntryBelongsToShow } from '../../shared/podcastShowMembership'
import {
  fetchEpisodePublishingState,
  publishEpisode,
  retryEpisodeDestination,
  syncEpisodeDestinationMetadata,
} from '../lib/episodePublishingApi'
import { adminRoutes } from '../routing/routes'

const DESTINATIONS = ['website', 'podcastRss', 'youtube', 'peertube']
const DESTINATION_LABELS = {
  website: 'Website',
  podcastRss: 'Podcast RSS',
  youtube: 'YouTube',
  peertube: 'PeerTube',
}

function createGuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `sabot-episode-${crypto.randomUUID()}`
  return `sabot-episode-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function toLocalDateTime(value) {
  const date = new Date(String(value || ''))
  if (!Number.isFinite(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalDateTime(value) {
  const date = new Date(String(value || ''))
  return Number.isFinite(date.getTime()) ? date.toISOString() : ''
}

function normalizeTags(value) {
  if (Array.isArray(value)) return [...new Set(value.map((tag) => String(tag || '').trim()).filter(Boolean))]
  return [...new Set(String(value || '').split(',').map((tag) => tag.trim()).filter(Boolean))]
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function descriptionBody(value = '') {
  return String(value || '')
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('\n')
}

function mediaFromAsset(asset, fallback = {}) {
  if (!asset && !fallback.url) return null
  return {
    id: String(asset?.mediaId || asset?.id || fallback.id || ''),
    url: String(asset?.url || fallback.url || ''),
    title: String(asset?.title || fallback.title || ''),
    mimeType: String(asset?.mimeType || fallback.mimeType || ''),
    mediaType: String(asset?.mediaType || asset?.kind || fallback.mediaType || ''),
    storageKey: String(asset?.storageKey || fallback.storageKey || ''),
    size: Number(asset?.size || fallback.size || 0) || 0,
    alt: String(asset?.alt || asset?.altText || fallback.alt || ''),
    caption: String(asset?.caption || fallback.caption || ''),
  }
}

function relatedAsset(entry, role) {
  return (Array.isArray(entry?.relatedAssets) ? entry.relatedAssets : []).find((asset) => String(asset?.role || '').toLowerCase() === role) || null
}

function destinationStateMap(states = []) {
  return Object.fromEntries((states || []).map((state) => [state.destination, state]))
}

function normalizeOverride(value = {}) {
  return {
    title: String(value?.title || ''),
    description: String(value?.description || ''),
    tags: Array.isArray(value?.tags) ? value.tags.join(', ') : String(value?.tags || ''),
    privacy: String(value?.privacy || ''),
    categoryId: String(value?.categoryId || ''),
    channelId: String(value?.channelId || ''),
  }
}

export function EpisodePublisherPage() {
  const [searchParams] = useSearchParams()
  const requestedEpisodeId = String(searchParams.get('episode') || '').trim()
  const [items, setItems] = useState([])
  const [shows, setShows] = useState([])
  const [defaultShowId, setDefaultShowId] = useState('')
  const [draft, setDraft] = useState(null)
  const [audio, setAudio] = useState(null)
  const [artwork, setArtwork] = useState(null)
  const [showId, setShowId] = useState('')
  const [hostsInput, setHostsInput] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [openMediaFor, setOpenMediaFor] = useState('')
  const [destinations, setDestinations] = useState({ website: true, podcastRss: true, youtube: false, peertube: false })
  const [overrides, setOverrides] = useState({ youtube: normalizeOverride(), peertube: normalizeOverride() })
  const [publishingState, setPublishingState] = useState({ destinations: [], jobs: [] })
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const { pushNotice } = useAdminNotices()

  useEffect(() => {
    let cancelled = false
    async function boot() {
      try {
        setState('loading')
        setError('')
        const [loadedItems, loadedShows] = await Promise.all([
          loadNativeCollection({ includeFuture: 1 }),
          loadPodcastShowsAsync(),
        ])
        if (cancelled) return
        const nextItems = Array.isArray(loadedItems) ? loadedItems : []
        const nextShows = loadedShows.shows || []
        setItems(nextItems)
        setShows(nextShows)
        setDefaultShowId(loadedShows.defaultShowId || '')

        const existing = requestedEpisodeId && requestedEpisodeId !== 'new'
          ? nextItems.find((item) => item.id === requestedEpisodeId || item.slug === requestedEpisodeId)
          : null
        const base = existing || {
          ...createEmptyNativeEntry(),
          contentType: 'podcast',
          status: 'draft',
          workflowState: 'draft',
          sourceKind: 'manual-episode',
          sourceType: 'manual',
          sourceExternalId: createGuid(),
          publishedAt: new Date().toISOString(),
          featuredTitleDisplay: 'hidden',
        }
        setDraft(base)
        setTagInput((base.tags || []).join(', '))
        const canonicalAudio = relatedAsset(base, 'canonical-audio')
        const episodeArtwork = relatedAsset(base, 'episode-artwork')
        setAudio(mediaFromAsset(canonicalAudio, {
          id: base.podcastAudioMediaId,
          url: base.podcastRssEnclosureUrl || base.podcastAudioUrl,
          mimeType: base.podcastMimeType,
          storageKey: base.podcastAudioStorageKey,
          size: base.podcastFileSize,
          mediaType: 'audio',
          title: base.title,
        }))
        setArtwork(mediaFromAsset(episodeArtwork, {
          url: base.podcastCoverImage || base.featuredImage,
          mediaType: 'image',
          title: `${base.title || 'Episode'} artwork`,
        }))
        setHostsInput(Array.isArray(canonicalAudio?.hosts) ? canonicalAudio.hosts.join(', ') : String(base.author || ''))
        const matchedShow = nextShows.find((show) => podcastEntryBelongsToShow(base, show))
        setShowId(matchedShow?.id || loadedShows.defaultShowId || nextShows[0]?.id || '')

        if (existing) {
          const publishState = await fetchEpisodePublishingState(existing.id).catch(() => ({ destinations: [], jobs: [] }))
          if (cancelled) return
          setPublishingState(publishState)
          const byDestination = destinationStateMap(publishState.destinations)
          setOverrides({
            youtube: normalizeOverride(byDestination.youtube?.override),
            peertube: normalizeOverride(byDestination.peertube?.override),
          })
        }
        setState('ready')
      } catch (nextError) {
        if (cancelled) return
        setError(String(nextError?.message || nextError))
        setState('error')
      }
    }
    boot()
    return () => { cancelled = true }
  }, [requestedEpisodeId])

  useEffect(() => {
    if (!draft?.id) return undefined
    const active = (publishingState.destinations || []).some((item) => ['queued', 'processing', 'retrying'].includes(item.status))
    if (!active) return undefined
    const timer = window.setInterval(() => {
      fetchEpisodePublishingState(draft.id)
        .then(setPublishingState)
        .catch(() => {})
    }, 4000)
    return () => window.clearInterval(timer)
  }, [draft?.id, publishingState.destinations])

  const selectedShow = useMemo(() => shows.find((show) => show.id === showId || show.slug === showId) || null, [shows, showId])
  const publishStates = useMemo(() => destinationStateMap(publishingState.destinations), [publishingState.destinations])

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function updateOverride(destination, field, value) {
    setOverrides((current) => ({
      ...current,
      [destination]: { ...current[destination], [field]: value },
    }))
  }

  function canonicalAssets() {
    const preserved = (Array.isArray(draft?.relatedAssets) ? draft.relatedAssets : []).filter((asset) => !['canonical-audio', 'episode-artwork'].includes(String(asset?.role || '').toLowerCase()))
    const hosts = normalizeTags(hostsInput)
    const next = [...preserved]
    if (audio?.url) {
      next.push({
        id: audio.id || '',
        mediaId: audio.id || '',
        role: 'canonical-audio',
        kind: 'audio',
        type: 'audio',
        title: audio.title || draft.title || 'Episode audio',
        url: audio.url,
        mimeType: audio.mimeType || 'audio/mpeg',
        size: Number(audio.size || 0) || 0,
        storageKey: audio.storageKey || '',
        podcastExplicit: Boolean(draft.podcastExplicit),
        hosts,
      })
    }
    if (artwork?.url) {
      next.push({
        id: artwork.id || '',
        mediaId: artwork.id || '',
        role: 'episode-artwork',
        kind: 'image',
        type: 'image',
        title: artwork.title || `${draft.title || 'Episode'} artwork`,
        url: artwork.url,
        mimeType: artwork.mimeType || '',
        storageKey: artwork.storageKey || '',
        alt: artwork.alt || draft.title || '',
      })
    }
    return next
  }

  function normalizedDraft(status) {
    const bodyHtml = descriptionBody(draft.podcastSummary || draft.excerpt || '')
    const showIdentities = selectedShow ? [selectedShow.podcastTitle, selectedShow.slug].filter(Boolean) : []
    const hosts = normalizeTags(hostsInput)
    return {
      ...draft,
      contentType: 'podcast',
      title: String(draft.title || '').trim(),
      slug: slugify(draft.slug || draft.title),
      status,
      workflowState: status === 'published' ? 'published' : 'draft',
      sourceType: draft.sourceType || 'manual',
      sourceKind: draft.sourceKind || 'manual-episode',
      sourceLabel: selectedShow?.podcastTitle || draft.sourceLabel || 'Podcast episode',
      sourceExternalId: draft.sourceExternalId || createGuid(),
      categories: showIdentities,
      projects: showIdentities,
      tags: normalizeTags(tagInput),
      author: hosts.join(', ') || draft.author || selectedShow?.author || 'Sabot Media',
      excerpt: String(draft.excerpt || '').trim(),
      body: bodyHtml,
      bodyHtml,
      podcastSummary: String(draft.podcastSummary || draft.excerpt || '').trim(),
      podcastTranscript: String(draft.podcastTranscript || ''),
      podcastAudioUrl: audio?.url || '',
      podcastRssEnclosureUrl: audio?.url || '',
      podcastAudioMediaId: audio?.id || '',
      podcastAudioStorageKey: audio?.storageKey || '',
      podcastMimeType: audio?.mimeType || 'audio/mpeg',
      podcastFileSize: Number(audio?.size || 0) || 0,
      podcastCoverImage: artwork?.url || selectedShow?.defaultCoverArt || '',
      featuredImage: artwork?.url || selectedShow?.defaultCoverArt || '',
      heroImage: artwork?.url || selectedShow?.defaultCoverArt || '',
      featuredImageAlt: artwork?.alt || draft.title || '',
      podcastExplicit: Boolean(draft.podcastExplicit),
      relatedAssets: canonicalAssets(),
      publishedAt: draft.publishedAt || new Date().toISOString(),
    }
  }

  async function saveEpisode(status = 'draft') {
    if (!draft?.title?.trim()) throw new Error('Episode title is required.')
    if (!selectedShow) throw new Error('Choose a podcast show first.')
    const normalized = normalizedDraft(status)
    const result = await upsertNativeEntryWithMeta(items, normalized, status === 'published' ? 'episode publish' : 'episode draft')
    setItems(result.items)
    setDraft(result.item)
    return result.item
  }

  async function handleSaveDraft() {
    try {
      setState('saving')
      const saved = await saveEpisode('draft')
      pushNotice(`Saved “${saved.title}” as a draft.`, 'success')
      setState('ready')
    } catch (nextError) {
      setState('error')
      setError(String(nextError?.message || nextError))
      pushNotice(`Episode save failed: ${String(nextError?.message || nextError)}`, 'error')
    }
  }

  async function handlePublish(forcedDestinations = null) {
    const selected = forcedDestinations || DESTINATIONS.filter((destination) => destinations[destination])
    if (!selected.length) {
      pushNotice('Select at least one publish destination.', 'error')
      return
    }
    if (!audio?.url) {
      pushNotice('Choose or upload the finished episode audio first.', 'error')
      return
    }
    try {
      setState('publishing')
      setError('')
      const saved = await saveEpisode('published')
      const payloadOverrides = Object.fromEntries(['youtube', 'peertube'].map((destination) => [destination, {
        ...overrides[destination],
        tags: normalizeTags(overrides[destination].tags),
      }]))
      const result = await publishEpisode(saved.id, selected, payloadOverrides)
      setPublishingState(result)
      setDestinations(Object.fromEntries(DESTINATIONS.map((destination) => [destination, selected.includes(destination)])))
      pushNotice('Episode saved. Immediate destinations are live and background destinations are queued.', 'success')
      setState('ready')
    } catch (nextError) {
      setState('error')
      setError(String(nextError?.message || nextError))
      pushNotice(`Episode publish failed: ${String(nextError?.message || nextError)}`, 'error')
    }
  }

  async function handleRetry(destination) {
    try {
      setState('publishing')
      const result = await retryEpisodeDestination(draft.id, destination)
      setPublishingState(result)
      setState('ready')
    } catch (nextError) {
      setState('error')
      pushNotice(`Retry failed: ${String(nextError?.message || nextError)}`, 'error')
    }
  }

  async function handleMetadataSync(destination) {
    try {
      setState('publishing')
      const override = { ...overrides[destination], tags: normalizeTags(overrides[destination].tags) }
      const result = await syncEpisodeDestinationMetadata(draft.id, destination, override)
      setPublishingState(result)
      pushNotice(`${DESTINATION_LABELS[destination]} metadata sync queued.`, 'success')
      setState('ready')
    } catch (nextError) {
      setState('error')
      pushNotice(`Metadata sync failed: ${String(nextError?.message || nextError)}`, 'error')
    }
  }

  if (!draft || state === 'loading') {
    return <AdminFrame><main className="page wp-admin-screen"><h1>Episode Publisher</h1><p>Loading podcast shows and media records…</p></main></AdminFrame>
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen episode-publisher-page">
        <div className="wp-screen-header">
          <div>
            <h1>{requestedEpisodeId && requestedEpisodeId !== 'new' ? 'Edit Episode' : 'New Episode'}</h1>
            <p className="description">One episode record, one audio upload, then publish the website, RSS, YouTube and PeerTube from the same metadata.</p>
          </div>
          <div className="review-card__actions">
            <Link className="button" to={adminRoutes.podcasts}>Back to Podcasts</Link>
            <button className="button" type="button" onClick={handleSaveDraft} disabled={state === 'saving' || state === 'publishing'}>Save Draft</button>
            <button className="button button--primary" type="button" onClick={() => handlePublish()} disabled={state === 'saving' || state === 'publishing'}>{state === 'publishing' ? 'Publishing…' : 'Publish Selected'}</button>
          </div>
        </div>
        <WpAdminNotices />
        {error ? <div className="notice notice-error" role="alert"><p>{error}</p></div> : null}

        <section className="native-bridge-layout episode-publisher-layout">
          <article className="native-bridge-main">
            <section className="wp-meta-box">
              <h2>Episode</h2>
              <div className="wp-settings-form">
                <label><span>Podcast show</span><select value={showId} onChange={(event) => setShowId(event.target.value)}><option value="">Choose a show</option>{shows.map((show) => <option key={show.id} value={show.id}>{show.podcastTitle}</option>)}</select></label>
                <label><span>Title</span><input value={draft.title || ''} onChange={(event) => update('title', event.target.value)} /></label>
                <label><span>Short excerpt</span><textarea rows="2" value={draft.excerpt || ''} onChange={(event) => update('excerpt', event.target.value)} /></label>
                <label><span>Description</span><textarea rows="7" value={draft.podcastSummary || ''} onChange={(event) => update('podcastSummary', event.target.value)} /></label>
                <label><span>Publication date / time</span><input type="datetime-local" value={toLocalDateTime(draft.publishedAt)} onChange={(event) => update('publishedAt', fromLocalDateTime(event.target.value))} /></label>
                <label><span>Episode number</span><input value={draft.podcastEpisodeNumber || ''} onChange={(event) => update('podcastEpisodeNumber', event.target.value)} /></label>
                <label><span>Season</span><input value={draft.podcastSeason || ''} onChange={(event) => update('podcastSeason', event.target.value)} /></label>
                <label><span>Duration</span><input value={draft.podcastDuration || ''} onChange={(event) => update('podcastDuration', event.target.value)} placeholder="42:18" /></label>
                <label><span>Hosts</span><input value={hostsInput} onChange={(event) => setHostsInput(event.target.value)} placeholder="Host One, Host Two" /></label>
                <label><span>Tags</span><input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="mutual aid, interview" /></label>
                <label><span><input type="checkbox" checked={Boolean(draft.podcastExplicit)} onChange={(event) => update('podcastExplicit', event.target.checked)} /> Explicit episode</span></label>
                <label><span>Transcript</span><textarea rows="14" value={draft.podcastTranscript || ''} onChange={(event) => update('podcastTranscript', event.target.value)} /></label>
              </div>
            </section>

            <section className="wp-meta-box">
              <h2>Audio and artwork</h2>
              <div className="episode-media-grid">
                <article className="review-card">
                  <h3>Finished audio</h3>
                  {audio?.url ? <audio controls preload="metadata" src={audio.url} style={{ width: '100%' }} /> : <p className="description">Upload or choose the finished MP3/M4A/etc. once. This asset becomes the website player and RSS enclosure.</p>}
                  {audio ? <p><strong>{audio.title || audio.id || 'Audio'}</strong><br /><small>{audio.mimeType || 'audio'}{audio.size ? ` · ${audio.size} bytes` : ''}</small></p> : null}
                  <button className="button" type="button" onClick={() => setOpenMediaFor('audio')}>{audio ? 'Change Audio' : 'Choose / Upload Audio'}</button>
                </article>
                <article className="review-card">
                  <h3>Episode artwork</h3>
                  {artwork?.url ? <img src={artwork.url} alt={artwork.alt || draft.title || ''} style={{ maxWidth: '240px', width: '100%', height: 'auto' }} /> : <p className="description">Optional. The show's default cover art is used when no episode artwork is selected.</p>}
                  <button className="button" type="button" onClick={() => setOpenMediaFor('artwork')}>{artwork ? 'Change Artwork' : 'Choose / Upload Artwork'}</button>
                </article>
              </div>
            </section>

            <section className="wp-meta-box">
              <h2>Destination overrides</h2>
              <p className="description">Canonical episode metadata stays in Sabot. Only fill these when a platform needs different wording. Editing the episode later updates the website and RSS automatically; external metadata changes are explicit.</p>
              {['youtube', 'peertube'].map((destination) => (
                <details key={destination} className="episode-destination-overrides">
                  <summary>{DESTINATION_LABELS[destination]} overrides</summary>
                  <div className="wp-settings-form">
                    <label><span>Title override</span><input value={overrides[destination].title} onChange={(event) => updateOverride(destination, 'title', event.target.value)} placeholder={draft.title || 'Use canonical title'} /></label>
                    <label><span>Description override</span><textarea rows="5" value={overrides[destination].description} onChange={(event) => updateOverride(destination, 'description', event.target.value)} placeholder="Use canonical description" /></label>
                    <label><span>Tags override</span><input value={overrides[destination].tags} onChange={(event) => updateOverride(destination, 'tags', event.target.value)} placeholder={tagInput || 'Use canonical tags'} /></label>
                    <label><span>Privacy / visibility</span><input value={overrides[destination].privacy} onChange={(event) => updateOverride(destination, 'privacy', event.target.value)} placeholder={destination === 'youtube' ? 'public' : 'public'} /></label>
                    <label><span>Channel / category ID override</span><input value={overrides[destination].channelId || overrides[destination].categoryId} onChange={(event) => updateOverride(destination, destination === 'youtube' ? 'categoryId' : 'channelId', event.target.value)} /></label>
                  </div>
                  {publishStates[destination]?.status === 'published' ? <button className="button" type="button" onClick={() => handleMetadataSync(destination)}>Sync metadata to {DESTINATION_LABELS[destination]}</button> : null}
                </details>
              ))}
            </section>
          </article>

          <aside className="native-bridge-sidebar native-bridge-sidebar--open">
            <section className="wp-meta-box">
              <h2>Publish To</h2>
              {DESTINATIONS.map((destination) => (
                <label className="native-content-editor__check" key={destination}>
                  <input type="checkbox" checked={Boolean(destinations[destination])} onChange={(event) => setDestinations((current) => ({ ...current, [destination]: event.target.checked }))} />
                  <span>{DESTINATION_LABELS[destination]}</span>
                </label>
              ))}
              <div className="native-content-editor__actions">
                <button className="button button--primary" type="button" disabled={state === 'publishing'} onClick={() => handlePublish(DESTINATIONS)}>Publish Everywhere</button>
              </div>
            </section>

            <section className="wp-meta-box">
              <h2>Publish Status</h2>
              {DESTINATIONS.map((destination) => {
                const item = publishStates[destination]
                return (
                  <article className="episode-publish-status" key={destination}>
                    <strong>{DESTINATION_LABELS[destination]}</strong>
                    <span>{item?.status || 'not published'}</span>
                    {item?.remoteUrl ? <a href={item.remoteUrl} target="_blank" rel="noreferrer">Open</a> : null}
                    {item?.lastError ? <small role="alert">{item.lastError}</small> : null}
                    {item?.status === 'failed' && ['youtube', 'peertube'].includes(destination) ? <button className="button" type="button" onClick={() => handleRetry(destination)}>Retry</button> : null}
                  </article>
                )
              })}
              {(publishingState.jobs || []).length ? (
                <details>
                  <summary>Background jobs ({publishingState.jobs.length})</summary>
                  <ul>{publishingState.jobs.slice(0, 12).map((job) => <li key={job.id}>{job.jobType} / {job.destination}: {job.status}{job.attempts ? ` (${job.attempts}/${job.maxAttempts})` : ''}</li>)}</ul>
                </details>
              ) : null}
            </section>

            <section className="wp-meta-box">
              <h2>Canonical identity</h2>
              <p className="description">GUID stays fixed even if the title, description or slug changes.</p>
              <code>{draft.sourceExternalId || 'created on save'}</code>
              {draft.status === 'published' && draft.slug ? <p><Link to={`/post/${draft.slug}`} target="_blank">Open episode page</Link></p> : null}
              {selectedShow?.rssFeedUrl ? <p><a href={selectedShow.rssFeedUrl} target="_blank" rel="noreferrer">Open show RSS</a></p> : null}
            </section>
          </aside>
        </section>

        <MediaPickerModal
          open={Boolean(openMediaFor)}
          title={openMediaFor === 'audio' ? 'Choose Episode Audio' : 'Choose Episode Artwork'}
          onClose={() => setOpenMediaFor('')}
          onPick={(media) => {
            if (openMediaFor === 'audio') setAudio(mediaFromAsset(media))
            if (openMediaFor === 'artwork') setArtwork(mediaFromAsset(media))
            setOpenMediaFor('')
          }}
        />
      </main>
    </AdminFrame>
  )
}

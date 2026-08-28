import { getBoundDb } from '../api/_lib/database.js'
import { buildLiveFeedBundle, normalizeFeedRequestPath } from '../api/_lib/feedRuntime.js'
import { readPodcastSettings } from '../api/_lib/podcastSettings.js'
import { buildPodcastFeedXml, getPodcastFeedItems, podcastXmlResponse } from '../rss/podcast.xml.js'

export async function onRequestGet(context) {
  const requestedPath = normalizeFeedRequestPath(context.params?.path)

  // This catch-all also matches the human-readable /feeds route.
  if (!requestedPath) return context.next()
  if (!requestedPath.toLowerCase().endsWith('.xml')) return context.next()

  const db = getBoundDb(context)
  if (!db) return text('Live feeds unavailable: BF_DB binding is required.', 503)

  try {
    if (requestedPath === 'podcasts/all.xml') {
      const [items, metadata] = await Promise.all([
        getPodcastFeedItems(db),
        readPodcastSettings(db),
      ])
      return podcastXmlResponse(buildPodcastFeedXml({
        requestUrl: context.request.url,
        items,
        settings: metadata.settings,
        selfPath: '/feeds/podcasts/all.xml',
      }))
    }

    const runtime = await buildLiveFeedBundle(db)
    const body = runtime.bundle?.[requestedPath]
    if (typeof body !== 'string') return text('Feed not found.', 404)

    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'application/rss+xml; charset=utf-8',
        'cache-control': 'public, max-age=300',
        'x-sabot-feed-source': 'native-d1',
      },
    })
  } catch (error) {
    return text(`RSS feed error: ${String(error?.message || error)}`, 500)
  }
}

function text(body, status) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

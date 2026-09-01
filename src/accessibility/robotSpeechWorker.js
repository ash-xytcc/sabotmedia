import { renderRobotSpeech } from './robotSpeechEngine.js'
import { normalizeRobotVoiceOptions } from './robotVoicePresets.js'

let siteVoicePromise = null

async function loadSiteVoice() {
  if (siteVoicePromise) return siteVoicePromise
  siteVoicePromise = fetch('/api/public-site-config', {
    method: 'GET',
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  })
    .then(async (res) => {
      if (!res.ok) return normalizeRobotVoiceOptions({})
      const data = await res.json().catch(() => null)
      return normalizeRobotVoiceOptions(data?.config?.blocks?.accessibility?.robotVoice || data?.received?.publicSite?.blocks?.accessibility?.robotVoice || {})
    })
    .catch(() => normalizeRobotVoiceOptions({}))
  return siteVoicePromise
}

self.onmessage = async (event) => {
  const { id, text, speed, voice } = event.data || {}
  if (!id) return
  try {
    const siteVoice = await loadSiteVoice()
    const effectiveVoice = normalizeRobotVoiceOptions(voice && typeof voice === 'object' ? { ...siteVoice, ...voice } : siteVoice)
    const { pcm, sampleRate, durationMs } = renderRobotSpeech(text, speed, effectiveVoice)
    self.postMessage({ id, ok: true, sampleRate, durationMs, pcm: pcm.buffer }, [pcm.buffer])
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : 'Speech rendering failed.' })
  }
}

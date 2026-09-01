import { renderRobotSpeech } from './robotSpeechEngine.js'

self.onmessage = (event) => {
  const { id, text, speed } = event.data || {}
  if (!id) return
  try {
    const { pcm, sampleRate, durationMs } = renderRobotSpeech(text, speed)
    self.postMessage({ id, ok: true, sampleRate, durationMs, pcm: pcm.buffer }, [pcm.buffer])
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : 'Speech rendering failed.' })
  }
}

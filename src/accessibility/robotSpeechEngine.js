import { textToSpeechTokens } from './englishG2p.js'
import { KLATT_PHONEMES } from './vendor/klatt1980Bank.js'
import { renderToBuffer } from './vendor/klattschSynth.js'

const READER_PRESET = Object.freeze({
  sampleRate: 24000,
  baseF0: 118,
  rateMs: 104,
  wordGapMs: 52,
  stressF0Lift: 9,
  stressDuration: 1.18,
  transitionMs: 26,
  aspiration: 0.025,
  effort: 0.58,
  tilt: 0.04,
  gain: 3.5,
})

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min))
}

function soundTarget(phone, F0, glideTo = null) {
  const source = glideTo ? { ...phone, ...glideTo } : phone
  return {
    ...phone,
    ...(glideTo || {}),
    F0,
    F1: source.F1,
    F2: source.F2,
    F3: source.F3,
    BW1: source.BW1,
    BW2: source.BW2,
    BW3: source.BW3,
    gain: READER_PRESET.gain,
    aspiration: READER_PRESET.aspiration,
    effort: READER_PRESET.effort,
    tilt: READER_PRESET.tilt,
  }
}

function silenceTarget() {
  return { A1: 0, A2: 0, A3: 0, voicing: 0, aspiration: 0 }
}

export function buildRobotSchedule(text, speed = 1) {
  const speechSpeed = clamp(speed, 0.7, 1.7)
  const tokens = textToSpeechTokens(text)
  const schedule = [{ atMs: 0, target: silenceTarget(), transitionMs: 4 }]
  let timeMs = 18
  let phoneCount = 0

  const silence = (ms) => {
    schedule.push({ atMs: timeMs, target: silenceTarget(), transitionMs: 18 })
    timeMs += Math.max(0, ms)
  }

  for (const token of tokens) {
    if (token.type === 'pause') {
      silence(token.ms / Math.sqrt(speechSpeed))
      continue
    }

    for (const item of token.phones) {
      const phone = KLATT_PHONEMES[item.code]
      if (!phone) continue
      phoneCount += 1
      const duration = (READER_PRESET.rateMs / speechSpeed) * (item.stressed ? READER_PRESET.stressDuration : 1)
      const F0 = READER_PRESET.baseF0 + (item.stressed ? READER_PRESET.stressF0Lift : 0)

      if (phone.isStop) {
        const quiet = duration * 0.62
        silence(quiet)
        schedule.push({ atMs: timeMs, target: soundTarget(phone, F0), transitionMs: 4 })
        timeMs += duration - quiet
        continue
      }

      schedule.push({
        atMs: timeMs,
        target: soundTarget(phone, F0),
        transitionMs: Math.min(READER_PRESET.transitionMs, duration * 0.34),
      })

      if (phone.glideTo) {
        schedule.push({
          atMs: timeMs + duration * 0.48,
          target: soundTarget(phone, F0 - 2, phone.glideTo),
          transitionMs: Math.max(18, duration * 0.38),
        })
      }
      timeMs += duration
    }

    silence(READER_PRESET.wordGapMs / Math.sqrt(speechSpeed))
  }

  silence(140)
  return { schedule, totalMs: timeMs, phoneCount }
}

export function renderRobotSpeech(text, speed = 1) {
  const cleanText = String(text || '').replace(/\s+/g, ' ').trim()
  if (!cleanText) throw new Error('Nothing readable was found in this section.')
  const { schedule, totalMs, phoneCount } = buildRobotSchedule(cleanText, speed)
  if (!phoneCount) throw new Error('This section could not be converted to speech.')
  const pcm = renderToBuffer({
    sampleRate: READER_PRESET.sampleRate,
    schedule,
    totalMs,
    initialTarget: { gain: READER_PRESET.gain, effort: READER_PRESET.effort },
  })
  return { pcm, sampleRate: READER_PRESET.sampleRate, durationMs: totalMs }
}

import test from 'node:test'
import assert from 'node:assert/strict'

import { textToSpeechTokens, wordToPhones } from '../src/accessibility/englishG2p.js'
import { buildRobotSchedule, renderRobotSpeech } from '../src/accessibility/robotSpeechEngine.js'
import { ROBOT_VOICE_PRESETS, normalizeRobotVoiceOptions } from '../src/accessibility/robotVoicePresets.js'

test('rule-based G2P produces supported ARPABET for ordinary and Sabot-specific words', () => {
  const ordinary = wordToPhones('reader')
  const sabot = wordToPhones('Sabot')
  const molotov = wordToPhones('Molotov')
  assert.ok(ordinary.length >= 3)
  assert.ok(sabot.some((phone) => phone.code === 'AE'))
  assert.ok(molotov.some((phone) => phone.code === 'AA'))
  assert.ok([...ordinary, ...sabot, ...molotov].every((phone) => /^[A-Z]+$/.test(phone.code)))
})

test('text tokenizer preserves useful pauses and spoken words without network inference', () => {
  const tokens = textToSpeechTokens('This is Molotov Now. Read aloud!')
  assert.ok(tokens.filter((token) => token.type === 'word').length >= 6)
  assert.ok(tokens.filter((token) => token.type === 'pause').length >= 2)
})

test('robot voice presets stay inside deterministic synthesis limits', () => {
  assert.ok(ROBOT_VOICE_PRESETS.clear)
  assert.ok(ROBOT_VOICE_PRESETS.terminal)
  assert.ok(ROBOT_VOICE_PRESETS.mainframe)
  assert.ok(ROBOT_VOICE_PRESETS.packet)
  const clamped = normalizeRobotVoiceOptions({ preset: 'terminal', baseF0: 999, aspiration: -2 })
  assert.equal(clamped.preset, 'terminal')
  assert.equal(clamped.baseF0, 220)
  assert.equal(clamped.aspiration, 0)
})

test('robot reader renders finite local PCM with default and production voices', () => {
  const schedule = buildRobotSchedule('This is Molotov Now.', 1)
  assert.ok(schedule.phoneCount > 8)
  assert.ok(schedule.totalMs > 500)
  assert.ok(schedule.schedule.length > 10)

  for (const voice of [{ preset: 'clear' }, { preset: 'terminal' }, { preset: 'mainframe', baseF0: 108 }]) {
    const rendered = renderRobotSpeech('This is Molotov Now.', 1, voice)
    assert.equal(rendered.sampleRate, 24000)
    assert.ok(rendered.durationMs > 500)
    assert.ok(rendered.pcm.length > 1000)

    let peak = 0
    for (let index = 0; index < rendered.pcm.length; index += 97) {
      const sample = rendered.pcm[index]
      assert.ok(Number.isFinite(sample))
      peak = Math.max(peak, Math.abs(sample))
    }
    assert.ok(peak > 0.0001)
  }
})

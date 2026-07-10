import { readFile, writeFile } from 'node:fs/promises'

const filePath = new URL('../src/components/AudioLabPage.jsx', import.meta.url)
const source = await readFile(filePath, 'utf8')
const start = source.indexOf('function TranscriptPanel')
const end = source.indexOf('\nfunction MarkersPanel', start)

if (start === -1 || end === -1) {
  console.warn('[patch-audiolab] TranscriptPanel block not found; skipping patch.')
  process.exit(0)
}

const fixedTranscriptPanel = `function TranscriptPanel({ transcript, onChange, onImport, onExport }) {
  const cues = transcript?.cues || []
  const mode = transcript?.mode || 'plain'

  function updateCue(cueId, patch) {
    onChange({
      cues: cues.map((cue) => (cue.id === cueId ? { ...cue, ...patch } : cue)),
    })
  }

  return (
    <section className="audio-lab-panel audio-lab-transcript-panel" data-audiolab-transcript-panel="fixed">
      <p className="audio-lab-eyebrow">Transcript</p>
      <h2>Manual transcript</h2>

      <label className="audio-lab-field">
        <span>Mode</span>
        <select value={mode} onChange={(event) => onChange({ mode: event.target.value })}>
          <option value="plain">Plain text</option>
          <option value="timestamped">Timestamped cues</option>
        </select>
      </label>

      {mode === 'timestamped' ? (
        <div className="audio-lab-cue-list">
          {cues.map((cue) => (
            <div key={cue.id} className="audio-lab-cue-row">
              <input
                type="number"
                min="0"
                step="0.01"
                value={cue.start}
                onChange={(event) => updateCue(cue.id, { start: Number(event.target.value) || 0 })}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={cue.end}
                onChange={(event) => updateCue(cue.id, { end: Number(event.target.value) || 0 })}
              />
              <input
                placeholder="Speaker"
                value={cue.speaker || ''}
                onChange={(event) => updateCue(cue.id, { speaker: event.target.value })}
              />
              <textarea
                rows={2}
                value={cue.text || ''}
                onChange={(event) => updateCue(cue.id, { text: event.target.value })}
              />
              <button type="button" className="button" onClick={() => onChange({ cues: cues.filter((item) => item.id !== cue.id) })}>
                Delete
              </button>
            </div>
          ))}
          <button
            type="button"
            className="button"
            onClick={() => onChange({ cues: [...cues, { id: makeAudioLabId('cue'), start: 0, end: 5, speaker: '', text: '' }] })}
          >
            Add cue
          </button>
        </div>
      ) : (
        <label className="audio-lab-field">
          <span>Plain transcript</span>
          <textarea rows={9} value={transcript?.text || ''} onChange={(event) => onChange({ text: event.target.value })} />
        </label>
      )}

      <div className="audio-lab-edit-actions">
        <label className="button">
          Import .txt/.srt/.vtt
          <input
            type="file"
            accept=".txt,.srt,.vtt,text/plain"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) onImport(file)
            }}
          />
        </label>
        <button type="button" className="button" onClick={() => onExport('txt')}>Export TXT</button>
        <button type="button" className="button" onClick={() => onExport('vtt')}>Export VTT</button>
      </div>
    </section>
  )
}
`

const next = `${source.slice(0, start)}${fixedTranscriptPanel}${source.slice(end)}`
if (next !== source) {
  await writeFile(filePath, next)
  console.log('[patch-audiolab] Fixed TranscriptPanel JSX before Vite build.')
} else {
  console.log('[patch-audiolab] TranscriptPanel already patched.')
}

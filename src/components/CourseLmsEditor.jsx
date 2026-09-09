import { useState, useEffect } from 'react'
import { STATUSES, TYPES } from '../../public/guides/become-the-thousand-servers/lms/model.js'
const statuses = ['NOT TESTED', 'PARTIAL', 'PASS', 'PASS WITH REVISIONS', 'FAIL', 'RETEST NEEDED']
const title = (s) => s.replace(/([A-Z])/g, ' $1').replace(/^./, (x) => x.toUpperCase())
export function CourseLmsEditor({ course, onChange }) {
  const [tab, setTab] = useState('sections'),
    [contributors, setContributors] = useState([]),
    [admin, setAdmin] = useState(false),
    [message, setMessage] = useState(''),
    [history, setHistory] = useState([]),
    [name, setName] = useState(''),
    [id, setId] = useState(''),
    [days, setDays] = useState(90)
  const update = (key, index, field, value) =>
    onChange({ ...course, [key]: course[key].map((v, i) => (i === index ? { ...v, [field]: value } : v)) })
  const field = (key, i, record, name, rows = 3) => (
    <label key={name} style={{ display: 'block', margin: '12px 0' }}>
      {title(name)}
      <textarea
        className="large-text"
        rows={rows}
        value={record[name] || ''}
        onChange={(e) => update(key, i, name, e.target.value)}
      />
    </label>
  )
  const status = (key, i, r) => (
    <label>
      Editorial status{' '}
      <select value={r.status} onChange={(e) => update(key, i, 'status', e.target.value)}>
        {STATUSES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    </label>
  )
  async function request(url, body) {
    const r = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...(body
        ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
        : {}),
    })
    const d = await r.json()
    if (!r.ok) throw Error(d.error || 'Request failed')
    return d
  }
  async function loadContributors() {
    try {
      const d = await request('/api/course-contributors')
      setContributors(d.items)
      setAdmin(d.admin)
    } catch (e) {
      setMessage(e.message)
    }
  }
  useEffect(() => {
    loadContributors()
  }, [])
  return (
    <section className="wp-meta-box">
      <h2>Course workspace</h2>
      <nav aria-label="Course workspace sections" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {['sections', 'activities', 'documents', 'testing', 'contributors', 'revisions', 'recovery'].map(
          (t) => (
            <button
              className="button"
              type="button"
              key={t}
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
            >
              {title(t)}
            </button>
          ),
        )}
      </nav>
      <p role="status">{message}</p>
      {tab === 'sections' &&
        (course.sections || []).map((s, i) => (
          <details key={s.id}>
            <summary>
              {s.id}. {s.title}
            </summary>
            {field('sections', i, s, 'title')}
            {status('sections', i, s)}
            {field('sections', i, s, 'body', 12)}
            <p>Practical lessons: {s.lessonSlugs.join(', ') || 'None'}</p>
            <Lines
              label="Activities (IDs, one per line)"
              value={s.activities}
              onChange={(v) => update('sections', i, 'activities', v)}
            />
            <Lines
              label="Contributor IDs (one per line)"
              value={s.contributors}
              onChange={(v) => update('sections', i, 'contributors', v)}
            />
            <Resources value={s.sources} onChange={(v) => update('sections', i, 'sources', v)} />
            <Completion value={s.completion} onChange={(v) => update('sections', i, 'completion', v)} />
          </details>
        ))}
      {tab === 'activities' && (
        <>
          <button
            type="button"
            className="button"
            onClick={() =>
              onChange({
                ...course,
                activities: [
                  ...(course.activities || []),
                  {
                    id: 'activity-' + Date.now(),
                    title: 'New activity',
                    type: 'multiple-choice',
                    version: 1,
                    status: 'draft',
                    prompt: '',
                    options: [],
                    answer: [],
                    pairs: [],
                    feedback: '',
                    sources: [],
                  },
                ],
              })
            }
          >
            Add activity
          </button>
          {(course.activities || []).map((a, i) => (
            <details key={a.id}>
              <summary>
                {a.title} · {a.type} · {a.status}
              </summary>
              <p>ID: {a.id}</p>
              {field('activities', i, a, 'title')}
              {status('activities', i, a)}
              <p>
                <label>
                  Type{' '}
                  <select value={a.type} onChange={(e) => update('activities', i, 'type', e.target.value)}>
                    {TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>{' '}
                <label>
                  Activity version{' '}
                  <input
                    type="number"
                    min="1"
                    value={a.version}
                    onChange={(e) => update('activities', i, 'version', Number(e.target.value))}
                  />
                </label>
              </p>
              <p>Increase the activity version when a changed exercise needs a new attempt.</p>
              {field('activities', i, a, 'prompt', 5)}
              <label>
                Options: ID | label, one per line
                <textarea
                  className="large-text"
                  rows={5}
                  value={a.options.map((o) => o.id + ' | ' + o.label).join('\n')}
                  onChange={(e) =>
                    update(
                      'activities',
                      i,
                      'options',
                      e.target.value
                        .split('\n')
                        .filter(Boolean)
                        .map((line) => {
                          const [id, ...label] = line.split('|')
                          return { id: id.trim(), label: label.join('|').trim() }
                        }),
                    )
                  }
                />
              </label>
              <Lines
                label="Correct answer IDs (in sequence for ordered activities)"
                value={a.answer}
                onChange={(v) => update('activities', i, 'answer', v)}
              />
              <label>
                Matching: left | right, one per line
                <textarea
                  className="large-text"
                  rows={5}
                  value={a.pairs.map((p) => p.left + ' | ' + p.right).join('\n')}
                  onChange={(e) =>
                    update(
                      'activities',
                      i,
                      'pairs',
                      e.target.value
                        .split('\n')
                        .filter(Boolean)
                        .map((line) => {
                          const [left, ...right] = line.split('|')
                          return { left: left.trim(), right: right.join('|').trim() }
                        }),
                    )
                  }
                />
              </label>
              {field('activities', i, a, 'feedback')}
              <Resources value={a.sources} onChange={(v) => update('activities', i, 'sources', v)} />
            </details>
          ))}
        </>
      )}
      {tab === 'documents' &&
        (course.documents || []).map((d, i) => (
          <details key={d.id}>
            <summary>
              {d.title} · {d.status}
            </summary>
            {field('documents', i, d, 'title')}
            {status('documents', i, d)}
            {field('documents', i, d, 'body', 15)}
            <Resources value={d.sources} onChange={(v) => update('documents', i, 'sources', v)} />
          </details>
        ))}
      {tab === 'testing' && (
        <>
          <button
            type="button"
            className="button"
            onClick={() =>
              onChange({
                ...course,
                testing: [...(course.testing || []), { id: 'test-' + Date.now(), state: 'NOT TESTED' }],
              })
            }
          >
            Add exercise test
          </button>
          <p>
            Testing records remain editorial. Publish an appropriate summary in the shared Exercise Testing
            document.
          </p>
          {(course.testing || []).map((r, i) => (
            <details key={r.id}>
              <summary>
                {r.exercise || 'New exercise test'} · {r.state}
              </summary>
              <label>
                State{' '}
                <select value={r.state} onChange={(e) => update('testing', i, 'state', e.target.value)}>
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              {[
                'exercise',
                'tester',
                'environment',
                'date',
                'assumptions',
                'worked',
                'broke',
                'unclear',
                'hiddenAssumptions',
                'concerns',
                'changes',
                'retest',
              ].map((k) => field('testing', i, r, k))}
            </details>
          ))}
        </>
      )}
      {tab === 'contributors' && (
        <>
          <ul>
            {contributors.map((p) => (
              <li key={p.id}>
                <a
                  href={`/guides/become-the-thousand-servers/contributors/${p.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {p.name}: public contribution / edit / access controls
                </a>{' '}
                ·{' '}
                <a
                  href={`/guides/become-the-thousand-servers/contributors/${p.id}/private`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Private Comms
                </a>
              </li>
            ))}
          </ul>
          {admin && (
            <div>
              <label>
                New contributor name <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                URL identifier <input value={id} onChange={(e) => setId(e.target.value)} />
              </label>
              <button
                type="button"
                className="button"
                onClick={async () => {
                  try {
                    await request('/api/course-contributors', { action: 'create', name, id })
                    await loadContributors()
                    setName('')
                    setId('')
                  } catch (e) {
                    setMessage(e.message)
                  }
                }}
              >
                Create contributor
              </button>
            </div>
          )}
        </>
      )}
      {tab === 'revisions' && (
        <>
          <button
            type="button"
            className="button"
            onClick={async () => {
              try {
                const d = await request(
                  `/api/course-content?slug=${encodeURIComponent(course.slug)}&revisions=1`,
                )
                setHistory(d.items)
              } catch (e) {
                setMessage(e.message)
              }
            }}
          >
            Load revision history
          </button>
          {history.map((r) => (
            <details key={r.id}>
              <summary>
                Version {r.version} · {r.created_at} · {r.actor_id} · {r.status}
              </summary>
              <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
                {JSON.stringify(JSON.parse(r.content_json), null, 2)}
              </pre>
              <button
                type="button"
                className="button"
                onClick={() => {
                  if (confirm('Load this revision into the editor? Save course to apply it.'))
                    onChange({ ...JSON.parse(r.content_json), revision: course.revision, status: 'draft' })
                }}
              >
                Restore into editor as draft
              </button>
            </details>
          ))}
        </>
      )}
      {tab === 'recovery' && (
        <>
          <p>
            Only encrypted learner blobs are stored. Retention defaults to 90 days. Changing retention applies
            to new backups.
          </p>
          {admin && (
            <>
              <label>
                Retention days{' '}
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                />
              </label>
              <button
                type="button"
                className="button"
                onClick={async () => {
                  try {
                    const d = await request('/api/course-recovery', { action: 'settings' })
                    setDays(d.days)
                    setMessage('Loaded retention setting')
                  } catch (e) {
                    setMessage(e.message)
                  }
                }}
              >
                Load
              </button>
              <button
                type="button"
                className="button"
                onClick={async () => {
                  try {
                    await request('/api/course-recovery', { action: 'settings', days })
                    setMessage('Retention saved')
                  } catch (e) {
                    setMessage(e.message)
                  }
                }}
              >
                Save retention
              </button>
            </>
          )}
          <p>Manage SabotPress editor roles through the existing Users screen.</p>
        </>
      )}
    </section>
  )
}
export function Lines({ label, value = [], onChange }) {
  return (
    <label style={{ display: 'block', margin: '12px 0' }}>
      {label}
      <textarea
        className="large-text"
        rows="3"
        value={value.join('\n')}
        onChange={(e) => onChange(e.target.value.split('\n'))}
      />
    </label>
  )
}
export function Resources({ value = [], onChange }) {
  return (
    <label style={{ display: 'block', margin: '12px 0' }}>
      Sources: title | HTTPS URL | note, one per line
      <textarea
        className="large-text"
        rows="4"
        value={value.map((r) => [r.title, r.url, r.note].join(' | ')).join('\n')}
        onChange={(e) =>
          onChange(
            e.target.value
              .split('\n')
              .filter(Boolean)
              .map((line) => {
                const [title = '', url = '', ...note] = line.split('|')
                return { title: title.trim(), url: url.trim(), note: note.join('|').trim() }
              }),
          )
        }
      />
    </label>
  )
}
export function Completion({ value = {}, onChange }) {
  return (
    <fieldset>
      <legend>Completion rules</legend>
      {['manual', 'practical', 'viewed'].map((k) => (
        <label key={k} style={{ marginRight: 12 }}>
          <input
            type="checkbox"
            checked={!!value[k]}
            onChange={(e) => onChange({ ...value, [k]: e.target.checked })}
          />
          {title(k)}
        </label>
      ))}
      <Lines
        label="Required activity IDs (one per line)"
        value={value.activities || []}
        onChange={(v) => onChange({ ...value, activities: v })}
      />
    </fieldset>
  )
}

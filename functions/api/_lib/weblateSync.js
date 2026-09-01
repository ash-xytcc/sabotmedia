import { getExistingNativeEntry } from './nativePublicContent.js'
import { translationFromWeblateBundle, upsertTranslation } from './nativePublicTranslations.js'
import { writeAuditLog } from './auditLog.js'

const DEFAULT_BASE_URL = 'https://hosted.weblate.org'
const MAX_JSON_BYTES = 2 * 1024 * 1024

export const WEBLATE_COMPONENTS = new Map([
  ['sabotpress/ai-server-called-paranoia', 'the-server-called-paranoia'],
])

function normalizeBaseUrl(value) {
  const url = new URL(String(value || DEFAULT_BASE_URL))
  if (url.protocol !== 'https:') throw new Error('WEBLATE_BASE_URL must use https')
  if (url.username || url.password) throw new Error('WEBLATE_BASE_URL must not contain credentials')
  return url.origin
}

function authHeaders(token, accept = 'application/json') {
  if (!token) throw new Error('WEBLATE_API_TOKEN is not configured')
  return { Authorization: `Token ${token}`, Accept: accept }
}

async function readBoundedText(response, maxBytes = MAX_JSON_BYTES) {
  const declared = Number(response.headers.get('content-length') || 0)
  if (declared && declared > maxBytes) throw new Error('Weblate response is too large')
  const text = await response.text()
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error('Weblate response is too large')
  return text
}

export async function fetchWeblateTranslationFile({ env, project, component, language }) {
  const base = normalizeBaseUrl(env?.WEBLATE_BASE_URL)
  const endpoint = `${base}/api/translations/${encodeURIComponent(project)}/${encodeURIComponent(component)}/${encodeURIComponent(language)}/file/`
  const response = await fetch(endpoint, { headers: authHeaders(env?.WEBLATE_API_TOKEN, 'application/json') })
  if (!response.ok) throw new Error(`Weblate translation fetch failed (${response.status})`)
  const text = await readBoundedText(response)
  try { return JSON.parse(text) } catch { throw new Error('Weblate returned invalid translation JSON') }
}

export async function listWeblateTranslations({ env, project, component }) {
  const base = normalizeBaseUrl(env?.WEBLATE_BASE_URL)
  let endpoint = `${base}/api/components/${encodeURIComponent(project)}/${encodeURIComponent(component)}/translations/`
  const results = []
  for (let page = 0; endpoint && page < 20; page += 1) {
    const response = await fetch(endpoint, { headers: authHeaders(env?.WEBLATE_API_TOKEN) })
    if (!response.ok) throw new Error(`Weblate translation list failed (${response.status})`)
    const payload = JSON.parse(await readBoundedText(response))
    results.push(...(Array.isArray(payload?.results) ? payload.results : []))
    endpoint = payload?.next ? String(payload.next) : ''
    if (endpoint && !endpoint.startsWith(normalizeBaseUrl(env?.WEBLATE_BASE_URL))) throw new Error('Weblate pagination escaped configured origin')
  }
  return results
}

function languageCodeFromTranslation(item) {
  return String(item?.language?.code || item?.language_code || item?.language || item?.code || '').trim().toLowerCase().replace(/_/g, '-')
}

function languageLabelFromTranslation(item, code) {
  return String(item?.language?.name || item?.language_name || item?.name || code).trim() || code
}

export async function importWeblateTranslation({ db, env, project, component, language, languageLabel = '', translatorCredit = '', provenanceUrl = '', auditDetail = {} }) {
  const key = `${project}/${component}`
  const slug = WEBLATE_COMPONENTS.get(key)
  if (!slug) return { ok: true, ignored: true, reason: 'unmapped-component' }
  const code = String(language || '').trim().toLowerCase().replace(/_/g, '-')
  if (!code || code === 'en') return { ok: true, ignored: true, reason: 'source-language' }

  const content = await getExistingNativeEntry(db, slug)
  if (!content) throw new Error(`Mapped Sabot article not found: ${slug}`)
  const bundle = await fetchWeblateTranslationFile({ env, project, component, language: code })
  const base = normalizeBaseUrl(env?.WEBLATE_BASE_URL)
  const input = translationFromWeblateBundle(bundle, {
    nativeContentId: content.id,
    languageCode: code,
    languageLabel: languageLabel || code,
    status: 'in_review',
    provider: 'weblate',
    translatorCredit: translatorCredit || 'Community translation via Weblate',
    weblateUrl: provenanceUrl || `${base}/projects/${encodeURIComponent(project)}/${encodeURIComponent(component)}/${encodeURIComponent(code)}/`,
  })
  // Never let automated sync publish content.
  input.status = 'in_review'
  input.publishedAt = ''
  const saved = await upsertTranslation(db, input)
  await writeAuditLog(db, {
    action: 'native_translation.weblate_sync',
    entityType: 'native_translation',
    entityId: saved.id,
    actor: 'weblate-sync',
    detail: { project, component, language: code, status: saved.status, ...auditDetail },
  })
  return { ok: true, translation: saved }
}

export async function syncWeblateComponent({ db, env, project, component }) {
  if (!WEBLATE_COMPONENTS.has(`${project}/${component}`)) return { ok: true, ignored: true, reason: 'unmapped-component' }
  const translations = await listWeblateTranslations({ env, project, component })
  const imported = []
  for (const item of translations) {
    const code = languageCodeFromTranslation(item)
    if (!code || code === 'en') continue
    const result = await importWeblateTranslation({
      db, env, project, component, language: code,
      languageLabel: languageLabelFromTranslation(item, code),
      provenanceUrl: String(item?.url || ''),
      auditDetail: { trigger: 'component-sync' },
    })
    if (result?.translation) imported.push({ language: code, status: result.translation.status })
  }
  return { ok: true, imported }
}

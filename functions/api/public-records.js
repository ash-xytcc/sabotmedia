import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { databaseUnavailable, getBoundDb } from './_lib/database.js'
import { inferActorFromRequest, writeAuditLog } from './_lib/auditLog.js'

const STATUSES = new Set(['Researching','Drafting','Ready to file','Filed','Acknowledged','Processing','Clarification requested','Fee issue','Partial release','Records released','Denied','Appealed','Closed'])
const DOCUMENT_KINDS = new Set(['acknowledgement','clarification','fee_notice','correspondence','denial','appeal','appeal_decision','release','responsive_record','other'])

export async function onRequestGet(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('public-records desk')
    const url = new URL(context.request.url)
    const investigationKey = cleanKey(url.searchParams.get('investigation') || '')
    if (!investigationKey) return json({ ok: false, error: 'investigation is required' }, 400)
    const permission = await resolvePublicSitePermission(context)
    const adminView = permission.canEdit && url.searchParams.get('view') === 'admin'
    const requests = await listRequests(db, investigationKey, { publicOnly: !adminView })
    return json({ ok: true, investigationKey, requests, summary: summarize(requests), admin: adminView })
  } catch (error) { return json({ ok: false, error: String(error?.message || error) }, 500) }
}

export async function onRequestPost(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: 'editor access required' }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('public-records desk')
    const body = await context.request.json()
    if (body.action === 'request') {
      const item = await createRequest(db, body)
      await audit(context, db, 'public_records.request.create', 'public_record_request', item.id, { investigationKey: item.investigationKey, status: item.status })
      return json({ ok: true, item }, 201)
    }
    if (body.action === 'document') {
      const item = await createDocument(db, body)
      await audit(context, db, 'public_records.document.create', 'public_record_document', item.id, { requestId: item.requestId, kind: item.documentKind })
      return json({ ok: true, item }, 201)
    }
    return json({ ok: false, error: 'unsupported action' }, 400)
  } catch (error) { return json({ ok: false, error: String(error?.message || error) }, Number(error?.status) || 400) }
}

export async function onRequestPatch(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: 'editor access required' }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('public-records desk')
    const body = await context.request.json()
    if (body.action === 'request') {
      const item = await updateRequest(db, body)
      await audit(context, db, 'public_records.request.update', 'public_record_request', item.id, { status: item.status, trackingNumber: item.trackingNumber || '' })
      return json({ ok: true, item })
    }
    if (body.action === 'document') {
      const item = await updateDocument(db, body)
      await audit(context, db, 'public_records.document.update', 'public_record_document', item.id, { requestId: item.requestId, kind: item.documentKind })
      return json({ ok: true, item })
    }
    return json({ ok: false, error: 'unsupported action' }, 400)
  } catch (error) { return json({ ok: false, error: String(error?.message || error) }, Number(error?.status) || 400) }
}

export async function onRequestDelete(context) {
  try {
    const permission = await resolvePublicSitePermission(context)
    if (!permission.canEdit) return json({ ok: false, error: 'editor access required' }, 403)
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('public-records desk')
    const body = await context.request.json()
    if (body.action === 'document' && body.id) {
      await db.prepare('DELETE FROM public_record_documents WHERE id = ?').bind(cleanText(body.id, 120)).run()
      return json({ ok: true })
    }
    if (body.action === 'request' && body.id) {
      await db.prepare('DELETE FROM public_record_requests WHERE id = ?').bind(cleanText(body.id, 120)).run()
      return json({ ok: true })
    }
    return json({ ok: false, error: 'unsupported action' }, 400)
  } catch (error) { return json({ ok: false, error: String(error?.message || error) }, 400) }
}

async function listRequests(db, investigationKey, { publicOnly = true } = {}) {
  const where = publicOnly ? 'AND r.is_public = 1' : ''
  const rows = await db.prepare(`SELECT r.* FROM public_record_requests r WHERE r.investigation_key = ? ${where} ORDER BY r.sort_order ASC, r.created_at ASC`).bind(investigationKey).all()
  const items = []
  for (const row of rows.results || []) {
    const docsQuery = publicOnly
      ? 'SELECT * FROM public_record_documents WHERE request_id = ? AND is_public = 1 ORDER BY sort_order ASC, COALESCE(received_date, created_at) DESC'
      : 'SELECT * FROM public_record_documents WHERE request_id = ? ORDER BY sort_order ASC, COALESCE(received_date, created_at) DESC'
    const docs = await db.prepare(docsQuery).bind(row.id).all()
    items.push(serializeRequest(row, docs.results || [], publicOnly))
  }
  return items
}

async function createRequest(db, body) {
  const id = cleanText(body.id, 120) || createId('records')
  const status = validStatus(body.status || 'Drafting')
  const filingUrl = validateOfficialUrl(body.officialFilingUrl || '', body.jurisdictionType || 'federal')
  await db.prepare(`INSERT INTO public_record_requests (
    id, investigation_key, campaign_id, jurisdiction_type, records_law, internal_title, public_title,
    why_it_matters, records_sought, agency_name, agency_abbreviation, agency_component_name,
    agency_component_id, official_filing_url, request_form_json, request_text, request_text_public,
    date_range, preferred_format, fee_waiver_language, expedited_processing_language, date_filed,
    tracking_number, status, internal_notes, public_notes, is_public, sort_order, updated_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(
    id, cleanKey(body.investigationKey), cleanText(body.campaignId, 120), cleanText(body.jurisdictionType || 'federal', 40), cleanText(body.recordsLaw || 'FOIA', 80),
    cleanText(body.internalTitle, 300), cleanText(body.publicTitle, 300), cleanLong(body.whyItMatters), cleanLong(body.recordsSought), cleanText(body.agencyName, 300),
    cleanText(body.agencyAbbreviation, 80), cleanText(body.agencyComponentName, 300), cleanText(body.agencyComponentId, 120), filingUrl,
    safeJson(body.requestForm || {}), cleanLong(body.requestText, 100000), boolInt(body.requestTextPublic), cleanText(body.dateRange, 500), cleanText(body.preferredFormat || 'Electronic records in native format where available', 500),
    cleanLong(body.feeWaiverLanguage, 30000), cleanLong(body.expeditedProcessingLanguage, 30000), nullableDate(body.dateFiled), cleanText(body.trackingNumber, 200), status,
    cleanLong(body.internalNotes), cleanLong(body.publicNotes), boolInt(body.isPublic !== false), numberInt(body.sortOrder)
  ).run()
  return getRequest(db, id, false)
}

async function updateRequest(db, body) {
  const id = cleanText(body.id, 120)
  if (!id) throw bad('id is required')
  const existing = await db.prepare('SELECT * FROM public_record_requests WHERE id = ?').bind(id).first()
  if (!existing) throw bad('request not found', 404)
  const next = {
    investigationKey: body.investigationKey ?? existing.investigation_key,
    campaignId: body.campaignId ?? existing.campaign_id,
    jurisdictionType: body.jurisdictionType ?? existing.jurisdiction_type,
    recordsLaw: body.recordsLaw ?? existing.records_law,
    internalTitle: body.internalTitle ?? existing.internal_title,
    publicTitle: body.publicTitle ?? existing.public_title,
    whyItMatters: body.whyItMatters ?? existing.why_it_matters,
    recordsSought: body.recordsSought ?? existing.records_sought,
    agencyName: body.agencyName ?? existing.agency_name,
    agencyAbbreviation: body.agencyAbbreviation ?? existing.agency_abbreviation,
    agencyComponentName: body.agencyComponentName ?? existing.agency_component_name,
    agencyComponentId: body.agencyComponentId ?? existing.agency_component_id,
    officialFilingUrl: body.officialFilingUrl ?? existing.official_filing_url,
    requestForm: body.requestForm ?? parseJson(existing.request_form_json),
    requestText: body.requestText ?? existing.request_text,
    requestTextPublic: body.requestTextPublic ?? Boolean(existing.request_text_public),
    dateRange: body.dateRange ?? existing.date_range,
    preferredFormat: body.preferredFormat ?? existing.preferred_format,
    feeWaiverLanguage: body.feeWaiverLanguage ?? existing.fee_waiver_language,
    expeditedProcessingLanguage: body.expeditedProcessingLanguage ?? existing.expedited_processing_language,
    dateFiled: body.dateFiled ?? existing.date_filed,
    trackingNumber: body.trackingNumber ?? existing.tracking_number,
    status: body.status ?? existing.status,
    internalNotes: body.internalNotes ?? existing.internal_notes,
    publicNotes: body.publicNotes ?? existing.public_notes,
    isPublic: body.isPublic ?? Boolean(existing.is_public),
    sortOrder: body.sortOrder ?? existing.sort_order,
  }
  const filingUrl = validateOfficialUrl(next.officialFilingUrl || '', next.jurisdictionType || 'federal')
  await db.prepare(`UPDATE public_record_requests SET investigation_key=?, campaign_id=?, jurisdiction_type=?, records_law=?, internal_title=?, public_title=?, why_it_matters=?, records_sought=?, agency_name=?, agency_abbreviation=?, agency_component_name=?, agency_component_id=?, official_filing_url=?, request_form_json=?, request_text=?, request_text_public=?, date_range=?, preferred_format=?, fee_waiver_language=?, expedited_processing_language=?, date_filed=?, tracking_number=?, status=?, internal_notes=?, public_notes=?, is_public=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(
    cleanKey(next.investigationKey), cleanText(next.campaignId, 120), cleanText(next.jurisdictionType, 40), cleanText(next.recordsLaw, 80), cleanText(next.internalTitle, 300), cleanText(next.publicTitle, 300),
    cleanLong(next.whyItMatters), cleanLong(next.recordsSought), cleanText(next.agencyName, 300), cleanText(next.agencyAbbreviation, 80), cleanText(next.agencyComponentName, 300), cleanText(next.agencyComponentId, 120),
    filingUrl, safeJson(next.requestForm), cleanLong(next.requestText, 100000), boolInt(next.requestTextPublic), cleanText(next.dateRange, 500), cleanText(next.preferredFormat, 500), cleanLong(next.feeWaiverLanguage, 30000),
    cleanLong(next.expeditedProcessingLanguage, 30000), nullableDate(next.dateFiled), cleanText(next.trackingNumber, 200), validStatus(next.status), cleanLong(next.internalNotes), cleanLong(next.publicNotes), boolInt(next.isPublic), numberInt(next.sortOrder), id
  ).run()
  return getRequest(db, id, false)
}

async function createDocument(db, body) {
  const requestId = cleanText(body.requestId, 120)
  if (!requestId) throw bad('requestId is required')
  const parent = await db.prepare('SELECT id FROM public_record_requests WHERE id = ?').bind(requestId).first()
  if (!parent) throw bad('request not found', 404)
  const fileUrl = validateDocumentUrl(body.fileUrl || '')
  const id = cleanText(body.id, 120) || createId('record-doc')
  const kind = validDocumentKind(body.documentKind || 'correspondence')
  await db.prepare(`INSERT INTO public_record_documents (id, request_id, document_kind, title, agency_name, received_date, description, file_url, mime_type, original_filename, public_notes, internal_notes, what_we_learned, is_public, sort_order, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(
    id, requestId, kind, cleanText(body.title, 300), cleanText(body.agencyName, 300), nullableDate(body.receivedDate), cleanLong(body.description), fileUrl, cleanText(body.mimeType, 160), cleanText(body.originalFilename, 300), cleanLong(body.publicNotes), cleanLong(body.internalNotes), cleanLong(body.whatWeLearned), boolInt(body.isPublic !== false), numberInt(body.sortOrder)
  ).run()
  return getDocument(db, id)
}

async function updateDocument(db, body) {
  const id = cleanText(body.id, 120)
  if (!id) throw bad('id is required')
  const row = await db.prepare('SELECT * FROM public_record_documents WHERE id = ?').bind(id).first()
  if (!row) throw bad('document not found', 404)
  const v = (name, column) => body[name] ?? row[column]
  await db.prepare(`UPDATE public_record_documents SET document_kind=?, title=?, agency_name=?, received_date=?, description=?, file_url=?, mime_type=?, original_filename=?, public_notes=?, internal_notes=?, what_we_learned=?, is_public=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(
    validDocumentKind(v('documentKind','document_kind')), cleanText(v('title','title'),300), cleanText(v('agencyName','agency_name'),300), nullableDate(v('receivedDate','received_date')), cleanLong(v('description','description')), validateDocumentUrl(v('fileUrl','file_url')), cleanText(v('mimeType','mime_type'),160), cleanText(v('originalFilename','original_filename'),300), cleanLong(v('publicNotes','public_notes')), cleanLong(v('internalNotes','internal_notes')), cleanLong(v('whatWeLearned','what_we_learned')), boolInt(v('isPublic','is_public')), numberInt(v('sortOrder','sort_order')), id
  ).run()
  return getDocument(db, id)
}

async function getRequest(db, id, publicOnly = false) {
  const row = await db.prepare(`SELECT * FROM public_record_requests WHERE id = ? ${publicOnly ? 'AND is_public = 1' : ''}`).bind(id).first()
  if (!row) return null
  const docs = await db.prepare(`SELECT * FROM public_record_documents WHERE request_id = ? ${publicOnly ? 'AND is_public = 1' : ''} ORDER BY sort_order ASC, COALESCE(received_date, created_at) DESC`).bind(id).all()
  return serializeRequest(row, docs.results || [], publicOnly)
}
async function getDocument(db, id) { const row = await db.prepare('SELECT * FROM public_record_documents WHERE id = ?').bind(id).first(); return serializeDocument(row) }

function serializeRequest(row, docs = [], publicOnly = false) {
  const item = {
    id: row.id, investigationKey: row.investigation_key, campaignId: row.campaign_id || '', jurisdictionType: row.jurisdiction_type, recordsLaw: row.records_law,
    publicTitle: row.public_title || row.internal_title, whyItMatters: row.why_it_matters, recordsSought: row.records_sought, agencyName: row.agency_name,
    agencyAbbreviation: row.agency_abbreviation, agencyComponentName: row.agency_component_name, agencyComponentId: row.agency_component_id,
    officialFilingUrl: row.official_filing_url, requestText: row.request_text_public ? row.request_text : '', requestTextPublic: Boolean(row.request_text_public), dateRange: row.date_range,
    preferredFormat: row.preferred_format, feeWaiverLanguage: row.request_text_public ? row.fee_waiver_language : '', expeditedProcessingLanguage: row.request_text_public ? row.expedited_processing_language : '',
    dateFiled: row.date_filed || '', trackingNumber: row.tracking_number || '', status: row.status, publicNotes: row.public_notes || '', isPublic: Boolean(row.is_public), lastUpdated: row.updated_at, documents: docs.map(serializeDocument)
  }
  if (!publicOnly) Object.assign(item, { internalTitle: row.internal_title, internalNotes: row.internal_notes, requestText: row.request_text, requestForm: parseJson(row.request_form_json) })
  return item
}
function serializeDocument(row) { return row ? { id: row.id, requestId: row.request_id, documentKind: row.document_kind, title: row.title, agencyName: row.agency_name, receivedDate: row.received_date || '', description: row.description, fileUrl: row.file_url, mimeType: row.mime_type, originalFilename: row.original_filename, publicNotes: row.public_notes, whatWeLearned: row.what_we_learned, isPublic: Boolean(row.is_public), lastUpdated: row.updated_at } : null }
function summarize(items) { const count = (s) => items.filter((x) => s.includes(x.status)).length; return { total: items.length, filed: count(['Filed','Acknowledged','Processing','Clarification requested','Fee issue','Partial release','Records released','Denied','Appealed','Closed']), processing: count(['Acknowledged','Processing','Clarification requested','Fee issue']), readyToFile: count(['Ready to file']), recordsReleased: count(['Partial release','Records released']) } }
function validStatus(v) { if (!STATUSES.has(v)) throw bad(`invalid status: ${v}`); return v }
function validDocumentKind(v) { if (!DOCUMENT_KINDS.has(v)) throw bad(`invalid document kind: ${v}`); return v }
function validateOfficialUrl(value, jurisdiction = 'federal') { if (!value) return ''; let u; try { u = new URL(value) } catch { throw bad('official filing URL is invalid') } if (u.protocol !== 'https:' || u.username || u.password) throw bad('official filing URL must be HTTPS without embedded credentials'); const host = u.hostname.toLowerCase(); if (isPrivateHost(host)) throw bad('official filing URL host is not allowed'); if (String(jurisdiction).toLowerCase() === 'federal' && !(host.endsWith('.gov') || host === 'foia.gov' || host.endsWith('.foia.gov'))) throw bad('federal filing URLs must use an official .gov host'); return u.toString() }
function validateDocumentUrl(value) { if (!value) throw bad('fileUrl is required'); let u; try { u = new URL(value, 'https://sabot.media') } catch { throw bad('document URL is invalid') } if (u.protocol !== 'https:' || u.username || u.password || isPrivateHost(u.hostname.toLowerCase())) throw bad('document URL must be a safe HTTPS URL'); return u.toString() }
function isPrivateHost(host) { return host === 'localhost' || host === '127.0.0.1' || host === '::1' || /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host) }
function cleanKey(v) { return String(v || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120) }
function cleanText(v, max=1000) { return String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').trim().slice(0,max) }
function cleanLong(v, max=50000) { return cleanText(v,max) }
function boolInt(v) { return v === true || v === 1 || v === '1' ? 1 : 0 }
function numberInt(v) { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : 0 }
function nullableDate(v) { const s = cleanText(v,40); if (!s) return null; return s }
function safeJson(v) { try { return JSON.stringify(v && typeof v === 'object' ? v : {}) } catch { return '{}' } }
function parseJson(v) { try { return JSON.parse(v || '{}') } catch { return {} } }
function createId(prefix) { return `${prefix}-${typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,10)}`}` }
function bad(message,status=400){ const e=new Error(message); e.status=status; return e }
async function audit(context,db,action,entityType,entityId,detail){ try { await writeAuditLog(db,{ action, entityType, entityId, actor: inferActorFromRequest(context.request), detail }) } catch {} }
function json(value,status=200){ return new Response(JSON.stringify(value,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer'}}) }

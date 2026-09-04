const SCHEMA = [
`CREATE TABLE IF NOT EXISTS public_record_requests (
  id TEXT PRIMARY KEY, investigation_key TEXT NOT NULL, campaign_id TEXT, jurisdiction_type TEXT NOT NULL DEFAULT 'federal', records_law TEXT NOT NULL DEFAULT 'FOIA',
  internal_title TEXT NOT NULL DEFAULT '', public_title TEXT NOT NULL DEFAULT '', why_it_matters TEXT NOT NULL DEFAULT '', records_sought TEXT NOT NULL DEFAULT '',
  agency_name TEXT NOT NULL DEFAULT '', agency_abbreviation TEXT NOT NULL DEFAULT '', agency_component_name TEXT NOT NULL DEFAULT '', agency_component_id TEXT NOT NULL DEFAULT '',
  official_filing_url TEXT NOT NULL DEFAULT '', request_form_json TEXT NOT NULL DEFAULT '{}', request_text TEXT NOT NULL DEFAULT '', request_text_public INTEGER NOT NULL DEFAULT 0,
  date_range TEXT NOT NULL DEFAULT '', preferred_format TEXT NOT NULL DEFAULT 'Electronic records in native format where available', fee_waiver_language TEXT NOT NULL DEFAULT '',
  expedited_processing_language TEXT NOT NULL DEFAULT '', date_filed TEXT, tracking_number TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Drafting',
  internal_notes TEXT NOT NULL DEFAULT '', public_notes TEXT NOT NULL DEFAULT '', is_public INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS public_record_documents (
  id TEXT PRIMARY KEY, request_id TEXT NOT NULL, document_kind TEXT NOT NULL DEFAULT 'correspondence', title TEXT NOT NULL DEFAULT '', agency_name TEXT NOT NULL DEFAULT '',
  received_date TEXT, description TEXT NOT NULL DEFAULT '', file_url TEXT NOT NULL, mime_type TEXT NOT NULL DEFAULT '', original_filename TEXT NOT NULL DEFAULT '',
  public_notes TEXT NOT NULL DEFAULT '', internal_notes TEXT NOT NULL DEFAULT '', what_we_learned TEXT NOT NULL DEFAULT '', is_public INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES public_record_requests(id) ON DELETE CASCADE
)`,
`CREATE INDEX IF NOT EXISTS idx_public_record_requests_investigation ON public_record_requests(investigation_key, is_public, sort_order, updated_at DESC)`,
`CREATE INDEX IF NOT EXISTS idx_public_record_documents_request ON public_record_documents(request_id, is_public, sort_order, received_date DESC)`,
]

const AI_SEEDS = [
['pr-ai-state-crozier-2025','autistici-inventati','State — Crozier/DCNF October 2025 inquiry','State Department response trail for the October 2025 A/I inquiry','This could show how an outside press inquiry about A/I was routed inside State, who reviewed it, and whether it produced any referral or follow-up beyond the published response.','Incoming and outgoing records concerning Hudson Crozier/DCNF inquiries about Autistici/Inventati, NoBlogs, Rose City Counter-Info, Abolition Media, or related infrastructure, including routing, drafts, clearances, referrals, and follow-up.','U.S. Department of State','State','Drafting',10],
['pr-ai-state-roundtable-2025','autistici-inventati','State — October 8 White House follow-up','State follow-up after the October 8 White House Antifa roundtable','This could establish whether the White House discussion of foreign terrorist designations generated tasking at State, and when work on later foreign designations actually began.','Records concerning follow-up, tasking, options, recommendations, or referrals after the October 8, 2025 White House Antifa roundtable involving foreign terrorist or SDGT designations and relevant organizations or infrastructure.','U.S. Department of State','State','Drafting',20],
['pr-ai-state-crozier-rubio-2025','autistici-inventati','State — Crozier/Rubio December 2025 follow-up','Any follow-up after Rubio invited suggestions for additional targets','Rubio publicly invited Crozier to suggest additional targets. Records could establish whether any follow-up was submitted and whether A/I, NoBlogs, or related projects were identified.','Communications and materials following the December 19, 2025 exchange involving Hudson Crozier and Secretary Marco Rubio concerning suggested foreign terrorist designations or targets, including references to A/I or NoBlogs.','U.S. Department of State','State','Drafting',30],
['pr-ai-ofac-origin','autistici-inventati','Treasury/OFAC — earliest A/I targeting record','The earliest record putting A/I into the sanctions pipeline','This is the central missing bureaucratic handoff: the first record that identifies A/I as a proposed sanctions target, the originating office, and the basis for opening the targeting file.','Records sufficient to identify the earliest referral, recommendation, targeting memorandum, case initiation, originating office, and evidentiary basis that proposed Autistici/Inventati for designation under Executive Order 13224.','U.S. Department of the Treasury','Treasury','Drafting',40],
['pr-ai-dhs-fbi-infrastructure','autistici-inventati','DHS/FBI — NoBlogs infrastructure referrals','Federal infrastructure research and onward referrals involving NoBlogs/A/I','Federal investigators encountered NoBlogs-linked infrastructure before the final designation. These records could show whether that investigative knowledge was later referred into the sanctions process.','Records identifying NoBlogs, Autistici/Inventati, Abolition Media, or Rose City Counter-Info as infrastructure in federal investigations, and any onward referral to State, Treasury/OFAC, DOJ, or other components.','Federal component to be verified','','Researching',50],
]

export async function ensurePublicRecordsSchema(db) {
  if (!db) return
  for (const statement of SCHEMA) await db.prepare(statement).run()
  const insert = db.prepare(`INSERT OR IGNORE INTO public_record_requests
    (id, investigation_key, internal_title, public_title, why_it_matters, records_sought, agency_name, agency_abbreviation, status, request_text_public, is_public, sort_order)
    VALUES (?,?,?,?,?,?,?,?,?,0,1,?)`)
  for (const seed of AI_SEEDS) await insert.bind(...seed).run()
}

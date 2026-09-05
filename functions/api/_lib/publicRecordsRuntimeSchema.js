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

const FEE_WAIVER = `Sabot Media is an independent journalism outlet seeking these records for news-gathering and public-interest reporting, not for a commercial purpose. Disclosure will contribute significantly to public understanding of the federal government's decision-making, referrals, and records concerning counterterrorism and sanctions policy. Sabot Media intends to analyze and publish responsive material for the public. I therefore request a waiver or reduction of all search, review, and duplication fees. If fees are nevertheless expected to exceed $25, please contact me before incurring them.`

const EXPEDITED = `I request expedited processing to the extent the agency determines the statutory and regulatory standard is met. Sabot Media is primarily engaged in disseminating information to the public, and these records concern current federal counterterrorism and sanctions actions that are the subject of ongoing public reporting. If expedited processing is denied, please continue processing this request under the ordinary track rather than holding the request for clarification.`

function requestText(recordsSought, dateRange) {
  return `This is a request under the Freedom of Information Act, 5 U.S.C. § 552.\n\nI request the following records:\n\n${recordsSought}\n\nDate range: ${dateRange}.\n\nPlease search all offices, custodians, systems, email accounts, messaging systems, memoranda, referral records, tasking records, briefing materials, drafts, attachments, and other locations reasonably likely to contain responsive records. Please include attachments and enclosures and preserve native electronic metadata where it is part of the responsive record.\n\nIf any portion of a responsive record is exempt, please release all reasonably segregable non-exempt material and identify the exemption relied upon for each withholding or redaction. If this request is considered too broad, please contact me so the scope can be narrowed without closing the request.\n\nI prefer electronic production in native format where available, with searchable PDFs as a fallback.`
}

const AI_SEEDS = [
  {
    id: 'pr-ai-state-crozier-2025', investigationKey: 'autistici-inventati',
    internalTitle: 'State — Crozier/DCNF October 2025 inquiry',
    publicTitle: 'State Department response trail for the October 2025 A/I inquiry',
    whyItMatters: 'This could show how an outside press inquiry about A/I was routed inside State, who reviewed it, and whether it produced any referral or follow-up beyond the published response.',
    recordsSought: 'Incoming and outgoing records concerning Hudson Crozier/DCNF inquiries about Autistici/Inventati, NoBlogs, Rose City Counter-Info, Abolition Media, or related infrastructure, including routing, drafts, clearances, referrals, and follow-up.',
    agencyName: 'U.S. Department of State', agencyAbbreviation: 'State',
    agencyComponentName: 'Office of Information Programs and Services (A/GIS/IPS)',
    officialFilingUrl: 'https://pal.foia.state.gov/app/Home.aspx',
    dateRange: 'September 1, 2025 through January 31, 2026', status: 'Drafting', sortOrder: 10,
  },
  {
    id: 'pr-ai-state-roundtable-2025', investigationKey: 'autistici-inventati',
    internalTitle: 'State — October 8 White House follow-up',
    publicTitle: 'State follow-up after the October 8 White House Antifa roundtable',
    whyItMatters: 'This could establish whether the White House discussion of foreign terrorist designations generated tasking at State, and when work on later foreign designations actually began.',
    recordsSought: 'Records concerning follow-up, tasking, options, recommendations, or referrals after the October 8, 2025 White House Antifa roundtable involving foreign terrorist or SDGT designations and relevant organizations or infrastructure.',
    agencyName: 'U.S. Department of State', agencyAbbreviation: 'State',
    agencyComponentName: 'Office of Information Programs and Services (A/GIS/IPS)',
    officialFilingUrl: 'https://pal.foia.state.gov/app/Home.aspx',
    dateRange: 'October 1, 2025 through March 31, 2026', status: 'Drafting', sortOrder: 20,
  },
  {
    id: 'pr-ai-state-crozier-rubio-2025', investigationKey: 'autistici-inventati',
    internalTitle: 'State — Crozier/Rubio December 2025 follow-up',
    publicTitle: 'Any follow-up after Rubio invited suggestions for additional targets',
    whyItMatters: 'Records could establish whether any follow-up was submitted after the December 19, 2025 exchange and whether A/I, NoBlogs, or related projects were identified.',
    recordsSought: 'Communications and materials following the December 19, 2025 exchange involving Hudson Crozier and Secretary Marco Rubio concerning suggested foreign terrorist designations or targets, including references to Autistici/Inventati, A/I, NoBlogs, Rose City Counter-Info, or Abolition Media.',
    agencyName: 'U.S. Department of State', agencyAbbreviation: 'State',
    agencyComponentName: 'Office of Information Programs and Services (A/GIS/IPS)',
    officialFilingUrl: 'https://pal.foia.state.gov/app/Home.aspx',
    dateRange: 'December 1, 2025 through March 31, 2026', status: 'Drafting', sortOrder: 30,
  },
  {
    id: 'pr-ai-ofac-origin', investigationKey: 'autistici-inventati',
    internalTitle: 'Treasury/OFAC — earliest A/I targeting record',
    publicTitle: 'The earliest record putting A/I into the sanctions pipeline',
    whyItMatters: 'This is the central missing bureaucratic handoff: the first record that identifies A/I as a proposed sanctions target, the originating office, and the basis for opening the targeting file.',
    recordsSought: 'Records sufficient to identify the earliest referral, recommendation, targeting memorandum, case initiation, originating office, and evidentiary basis that proposed Autistici/Inventati for designation under Executive Order 13224, including communications transmitting or discussing that referral or proposal.',
    agencyName: 'U.S. Department of the Treasury', agencyAbbreviation: 'Treasury',
    agencyComponentName: 'Departmental Offices — Office of Privacy, Transparency, and Records (records including OFAC)',
    officialFilingUrl: 'https://home.treasury.gov/footer/freedom-of-information-act/submit-a-request',
    dateRange: 'January 1, 2025 through August 26, 2026', status: 'Drafting', sortOrder: 40,
  },
  {
    id: 'pr-ai-dhs-fbi-infrastructure', investigationKey: 'autistici-inventati',
    internalTitle: 'FBI — NoBlogs infrastructure referrals',
    publicTitle: 'FBI infrastructure research and onward referrals involving NoBlogs/A/I',
    whyItMatters: 'Federal investigators encountered NoBlogs-linked infrastructure before the final designation. These records could show whether that investigative knowledge was later referred into the sanctions process.',
    recordsSought: 'Records identifying NoBlogs, Autistici/Inventati, Abolition Media, or Rose City Counter-Info as infrastructure in federal investigations, and any onward referral or transmission of information concerning those services or organizations to the Department of State, Department of the Treasury or OFAC, Department of Justice, Department of Homeland Security, National Security Council, or other federal components.',
    agencyName: 'Federal Bureau of Investigation', agencyAbbreviation: 'FBI',
    agencyComponentName: 'Record/Information Dissemination Section (RIDS), Information Management Division',
    officialFilingUrl: 'https://efoia.fbi.gov/',
    dateRange: 'January 1, 2024 through August 26, 2026', status: 'Drafting', sortOrder: 50,
  },
]

export async function ensurePublicRecordsSchema(db) {
  if (!db) return
  for (const statement of SCHEMA) await db.prepare(statement).run()

  const insert = db.prepare(`INSERT OR IGNORE INTO public_record_requests
    (id, investigation_key, internal_title, public_title, why_it_matters, records_sought, agency_name, agency_abbreviation,
     agency_component_name, official_filing_url, request_text, request_text_public, date_range, preferred_format,
     fee_waiver_language, expedited_processing_language, status, is_public, sort_order)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)

  const backfill = db.prepare(`UPDATE public_record_requests SET
    agency_component_name = CASE WHEN TRIM(agency_component_name) = '' THEN ? ELSE agency_component_name END,
    official_filing_url = CASE WHEN TRIM(official_filing_url) = '' THEN ? ELSE official_filing_url END,
    request_text = CASE WHEN TRIM(request_text) = '' THEN ? ELSE request_text END,
    date_range = CASE WHEN TRIM(date_range) = '' THEN ? ELSE date_range END,
    preferred_format = CASE WHEN TRIM(preferred_format) = '' THEN ? ELSE preferred_format END,
    fee_waiver_language = CASE WHEN TRIM(fee_waiver_language) = '' THEN ? ELSE fee_waiver_language END,
    expedited_processing_language = CASE WHEN TRIM(expedited_processing_language) = '' THEN ? ELSE expedited_processing_language END,
    status = CASE WHEN status = 'Researching' THEN ? ELSE status END,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`)

  for (const seed of AI_SEEDS) {
    const text = requestText(seed.recordsSought, seed.dateRange)
    const preferred = 'Electronic records in native format where available; searchable PDF as a fallback'
    await insert.bind(
      seed.id, seed.investigationKey, seed.internalTitle, seed.publicTitle, seed.whyItMatters, seed.recordsSought,
      seed.agencyName, seed.agencyAbbreviation, seed.agencyComponentName, seed.officialFilingUrl, text, 0,
      seed.dateRange, preferred, FEE_WAIVER, EXPEDITED, seed.status, 1, seed.sortOrder,
    ).run()
    await backfill.bind(
      seed.agencyComponentName, seed.officialFilingUrl, text, seed.dateRange, preferred,
      FEE_WAIVER, EXPEDITED, seed.status, seed.id,
    ).run()
  }
}

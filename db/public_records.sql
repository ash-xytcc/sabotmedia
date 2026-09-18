CREATE TABLE IF NOT EXISTS public_record_requests (
  id TEXT PRIMARY KEY,
  investigation_key TEXT NOT NULL,
  campaign_id TEXT,
  jurisdiction_type TEXT NOT NULL DEFAULT 'federal',
  records_law TEXT NOT NULL DEFAULT 'FOIA',
  internal_title TEXT NOT NULL DEFAULT '',
  public_title TEXT NOT NULL DEFAULT '',
  why_it_matters TEXT NOT NULL DEFAULT '',
  records_sought TEXT NOT NULL DEFAULT '',
  agency_name TEXT NOT NULL DEFAULT '',
  agency_abbreviation TEXT NOT NULL DEFAULT '',
  agency_component_name TEXT NOT NULL DEFAULT '',
  agency_component_id TEXT NOT NULL DEFAULT '',
  official_filing_url TEXT NOT NULL DEFAULT '',
  request_form_json TEXT NOT NULL DEFAULT '{}',
  request_text TEXT NOT NULL DEFAULT '',
  request_text_public INTEGER NOT NULL DEFAULT 0,
  date_range TEXT NOT NULL DEFAULT '',
  preferred_format TEXT NOT NULL DEFAULT 'Electronic records in native format where available',
  fee_waiver_language TEXT NOT NULL DEFAULT '',
  expedited_processing_language TEXT NOT NULL DEFAULT '',
  date_filed TEXT,
  tracking_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Drafting',
  internal_notes TEXT NOT NULL DEFAULT '',
  public_notes TEXT NOT NULL DEFAULT '',
  is_public INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (status IN ('Researching','Drafting','Ready to file','Filed','Acknowledged','Processing','Clarification requested','Fee issue','Partial release','Records released','Denied','Appealed','Closed'))
);

CREATE TABLE IF NOT EXISTS public_record_documents (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  document_kind TEXT NOT NULL DEFAULT 'correspondence',
  title TEXT NOT NULL DEFAULT '',
  agency_name TEXT NOT NULL DEFAULT '',
  received_date TEXT,
  description TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT '',
  original_filename TEXT NOT NULL DEFAULT '',
  public_notes TEXT NOT NULL DEFAULT '',
  internal_notes TEXT NOT NULL DEFAULT '',
  what_we_learned TEXT NOT NULL DEFAULT '',
  is_public INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES public_record_requests(id) ON DELETE CASCADE,
  CHECK (document_kind IN ('acknowledgement','clarification','fee_notice','correspondence','denial','appeal','appeal_decision','release','responsive_record','other'))
);

-- Evidence sits in the same investigation docket as requests and returned documents, but it can
-- also represent primary-source records that were published independently of a FOIA response.
-- request_id/document_id are optional links back into the existing request/release trail.
CREATE TABLE IF NOT EXISTS public_record_evidence (
  id TEXT PRIMARY KEY,
  investigation_key TEXT NOT NULL,
  request_id TEXT,
  document_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  agency_name TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'primary_source',
  source_date TEXT,
  primary_source_url TEXT NOT NULL DEFAULT '',
  related_source_url TEXT NOT NULL DEFAULT '',
  archive_url TEXT NOT NULL DEFAULT '',
  obtained_via TEXT NOT NULL DEFAULT 'public',
  authentication_confidence TEXT NOT NULL DEFAULT 'primary_official',
  epistemic_status TEXT NOT NULL DEFAULT 'KNOWN',
  investigation_stage TEXT NOT NULL DEFAULT 'Y',
  bridge_from_stage TEXT NOT NULL DEFAULT '',
  bridge_to_stage TEXT NOT NULL DEFAULT '',
  legal_authority TEXT NOT NULL DEFAULT '',
  government_assertion TEXT NOT NULL DEFAULT '',
  predicate_act_status TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
  predicate_act_description TEXT NOT NULL DEFAULT '',
  what_it_establishes TEXT NOT NULL DEFAULT '',
  what_it_does_not_establish TEXT NOT NULL DEFAULT '',
  evidence_disclosed TEXT NOT NULL DEFAULT '',
  supports_json TEXT NOT NULL DEFAULT '[]',
  contradicts_json TEXT NOT NULL DEFAULT '[]',
  leaves_unresolved_json TEXT NOT NULL DEFAULT '[]',
  why_it_matters TEXT NOT NULL DEFAULT '',
  follow_up_needed TEXT NOT NULL DEFAULT '',
  is_public INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES public_record_requests(id) ON DELETE SET NULL,
  FOREIGN KEY (document_id) REFERENCES public_record_documents(id) ON DELETE SET NULL,
  CHECK (epistemic_status IN ('KNOWN','ALLEGED','INFERRED','UNKNOWN')),
  CHECK (investigation_stage IN ('X','Y','Z','BRIDGE')),
  CHECK (bridge_from_stage IN ('','X','Y','Z')),
  CHECK (bridge_to_stage IN ('','X','Y','Z')),
  CHECK (predicate_act_status IN ('NOT_APPLICABLE','IDENTIFIED','PARTIALLY_IDENTIFIED','NOT_PUBLICLY_IDENTIFIED','DISPUTED'))
);

CREATE TABLE IF NOT EXISTS public_record_open_questions (
  id TEXT PRIMARY KEY,
  investigation_key TEXT NOT NULL,
  question TEXT NOT NULL,
  why_it_matters TEXT NOT NULL DEFAULT '',
  investigation_stage TEXT NOT NULL DEFAULT 'Y',
  epistemic_status TEXT NOT NULL DEFAULT 'UNKNOWN',
  status TEXT NOT NULL DEFAULT 'OPEN',
  related_request_id TEXT,
  related_evidence_id TEXT,
  records_likely_to_answer TEXT NOT NULL DEFAULT '',
  likely_holders TEXT NOT NULL DEFAULT '',
  source_leads TEXT NOT NULL DEFAULT '',
  public_notes TEXT NOT NULL DEFAULT '',
  is_public INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  last_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (related_request_id) REFERENCES public_record_requests(id) ON DELETE SET NULL,
  FOREIGN KEY (related_evidence_id) REFERENCES public_record_evidence(id) ON DELETE SET NULL,
  CHECK (investigation_stage IN ('X','Y','Z','BRIDGE')),
  CHECK (epistemic_status IN ('KNOWN','ALLEGED','INFERRED','UNKNOWN')),
  CHECK (status IN ('OPEN','PARTIALLY_ANSWERED','ANSWERED','SUPERSEDED'))
);

CREATE INDEX IF NOT EXISTS idx_public_record_requests_investigation ON public_record_requests(investigation_key, is_public, sort_order, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_record_requests_status ON public_record_requests(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_record_documents_request ON public_record_documents(request_id, is_public, sort_order, received_date DESC);
CREATE INDEX IF NOT EXISTS idx_public_record_evidence_investigation ON public_record_evidence(investigation_key, is_public, investigation_stage, sort_order, source_date DESC);
CREATE INDEX IF NOT EXISTS idx_public_record_evidence_epistemic ON public_record_evidence(epistemic_status, predicate_act_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_record_questions_investigation ON public_record_open_questions(investigation_key, is_public, status, sort_order, updated_at DESC);

-- A/I starting docket. These are scopes only. No filing dates, tracking numbers, agency components,
-- or official submission URLs are asserted until an editor verifies and records them.
INSERT OR IGNORE INTO public_record_requests
(id, investigation_key, internal_title, public_title, why_it_matters, records_sought, agency_name, agency_abbreviation, status, request_text_public, is_public, sort_order)
VALUES
('pr-ai-state-crozier-2025', 'autistici-inventati', 'State — Crozier/DCNF October 2025 inquiry', 'State Department response trail for the October 2025 A/I inquiry', 'This could show how an outside press inquiry about A/I was routed inside State, who reviewed it, and whether it produced any referral or follow-up beyond the published response.', 'Incoming and outgoing records concerning Hudson Crozier/DCNF inquiries about Autistici/Inventati, NoBlogs, Rose City Counter-Info, Abolition Media, or related infrastructure, including routing, drafts, clearances, referrals, and follow-up.', 'U.S. Department of State', 'State', 'Drafting', 0, 1, 10),
('pr-ai-state-roundtable-2025', 'autistici-inventati', 'State — October 8 White House follow-up', 'State follow-up after the October 8 White House Antifa roundtable', 'This could establish whether the White House discussion of foreign terrorist designations generated tasking at State, and when work on later foreign designations actually began.', 'Records concerning follow-up, tasking, options, recommendations, or referrals after the October 8, 2025 White House Antifa roundtable involving foreign terrorist or SDGT designations and the relevant organizations or infrastructure.', 'U.S. Department of State', 'State', 'Drafting', 0, 1, 20),
('pr-ai-state-crozier-rubio-2025', 'autistici-inventati', 'State — Crozier/Rubio December 2025 follow-up', 'Any follow-up after Rubio invited suggestions for additional targets', 'Rubio publicly invited Crozier to suggest additional targets. Records could establish whether any follow-up was submitted and whether A/I, NoBlogs, or related projects were identified.', 'Communications and materials following the December 19, 2025 exchange involving Hudson Crozier and Secretary Marco Rubio concerning suggested foreign terrorist designations or targets, including references to A/I or NoBlogs.', 'U.S. Department of State', 'State', 'Drafting', 0, 1, 30),
('pr-ai-ofac-origin', 'autistici-inventati', 'Treasury/OFAC — earliest A/I targeting record', 'The earliest record putting A/I into the sanctions pipeline', 'This is the central missing bureaucratic handoff: the first record that identifies A/I as a proposed sanctions target, the originating office, and the basis for opening the targeting file.', 'Records sufficient to identify the earliest referral, recommendation, targeting memorandum, case initiation, originating office, and evidentiary basis that proposed Autistici/Inventati for designation under Executive Order 13224.', 'U.S. Department of the Treasury', 'Treasury', 'Drafting', 0, 1, 40),
('pr-ai-dhs-fbi-infrastructure', 'autistici-inventati', 'DHS/FBI — NoBlogs infrastructure referrals', 'Federal infrastructure research and onward referrals involving NoBlogs/A/I', 'Federal investigators encountered NoBlogs-linked infrastructure before the final designation. These records could show whether that investigative knowledge was later referred into the sanctions process.', 'Records identifying NoBlogs, Autistici/Inventati, Abolition Media, or Rose City Counter-Info as infrastructure in federal investigations, and any onward referral of that information to State, Treasury/OFAC, DOJ, or other components.', 'Federal component to be verified', '', 'Researching', 0, 1, 50);

-- Official designation record. This is a Y→Z bridge: it establishes the authority OFAC used and
-- the fact of the designation, while preserving the crucial gap between the government's legal
-- theory and the underlying conduct/evidence that has not been publicly identified in this notice.
INSERT OR IGNORE INTO public_record_evidence
(id, investigation_key, title, agency_name, source_type, source_date, primary_source_url, related_source_url, obtained_via, authentication_confidence, epistemic_status, investigation_stage, bridge_from_stage, bridge_to_stage, legal_authority, government_assertion, predicate_act_status, predicate_act_description, what_it_establishes, what_it_does_not_establish, evidence_disclosed, supports_json, leaves_unresolved_json, why_it_matters, follow_up_needed, is_public, sort_order)
VALUES
(
  'evidence-ai-ofac-fr-2026-17725',
  'autistici-inventati',
  'Federal Register notice of A/I designation under Executive Order 13224',
  'U.S. Department of the Treasury / Office of Foreign Assets Control',
  'official_notice',
  '2026-08-31',
  'https://www.govinfo.gov/content/pkg/FR-2026-08-31/pdf/2026-17725.pdf',
  'https://ofac.treasury.gov/recent-actions/20260826',
  'public',
  'primary_official',
  'KNOWN',
  'BRIDGE',
  'Y',
  'Z',
  'Executive Order 13224 § 1(a)(iii)(C)',
  'OFAC states that Autistici/Inventati meets the criteria in E.O. 13224 § 1(a)(iii)(C), the material-support provision, and designated it on August 26, 2026.',
  'NOT_PUBLICLY_IDENTIFIED',
  'The Federal Register notice identifies the legal predicate but does not identify the underlying act of terrorism to which the alleged support relates.',
  'The official designation rests on E.O. 13224 § 1(a)(iii)(C), and OFAC formally designated Autistici/Inventati on August 26, 2026.',
  'The notice does not identify the underlying act of terrorism, the recipient of alleged support, the specific support or service allegedly provided, when it occurred, the evidence establishing that connection, or the internal reasoning supporting the determination.',
  'No underlying evidentiary record is disclosed in the notice.',
  '["OFAC designated A/I on August 26, 2026","The cited legal basis is E.O. 13224 § 1(a)(iii)(C)"]',
  '["Which act of terrorism is the predicate?","What conduct or service did OFAC treat as material support?","Who allegedly received the support?","What evidence connected A/I to the predicate act?","When and how did A/I enter the targeting pipeline?"]',
  'This narrows the investigation from broad rhetoric to a specific legal bridge. The public record establishes the authority and outcome, but the factual link that would connect A/I to the cited material-support criterion remains undisclosed.',
  'Target the OFAC evidentiary memorandum, referral or case-opening records, interagency communications, legal review, and records identifying the predicate act, alleged recipient, alleged support, and evidentiary basis.',
  1,
  5
);

INSERT OR IGNORE INTO public_record_open_questions
(id, investigation_key, question, why_it_matters, investigation_stage, epistemic_status, status, related_request_id, related_evidence_id, records_likely_to_answer, likely_holders, source_leads, public_notes, is_public, sort_order)
VALUES
(
  'question-ai-predicate-act',
  'autistici-inventati',
  'What specific act of terrorism did OFAC treat as the predicate for applying E.O. 13224 § 1(a)(iii)(C) to Autistici/Inventati?',
  'The designation notice supplies the legal theory but not the factual bridge. Identifying the predicate act is necessary to test what conduct the government relied on and whether the public influence trail connects to the actual decision record.',
  'Y',
  'UNKNOWN',
  'OPEN',
  'pr-ai-ofac-origin',
  'evidence-ai-ofac-fr-2026-17725',
  'OFAC evidentiary memorandum; designation package; case-opening or targeting memorandum; referral records; interagency communications; legal review; records identifying the alleged recipient, service or support, and predicate act.',
  'Treasury/OFAC, State Department, and any referring or investigative component identified in the designation package',
  'Federal Register document 2026-17725; OFAC recent action dated August 26, 2026',
  'PREDICATE ACT: NOT PUBLICLY IDENTIFIED. Treat the missing predicate as an open evidentiary question, not as proof for or against the government allegation.',
  1,
  5
);

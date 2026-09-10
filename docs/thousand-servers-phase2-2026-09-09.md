# Become the Thousand Servers — phase two implementation and launch audit

Date: 2026-09-09

Scope: `ash-xytcc/sabotmedia` only. The course remains an unlisted, `noindex`/`noarchive` direct-URL project under `/guides/become-the-thousand-servers/`.

This document records implementation details, test boundaries, content status, and launch work still requiring people. It is not a claim that the practical infrastructure exercises have been independently executed by experts.

## Preserved invariants

- Locked G01–G13 structure and its mapping to the twelve established practical lessons.
- Existing D1 course drafts/publication snapshots/revision history and local learner progress key.
- No learner accounts, email addresses, grades, rankings, certificates, or surveillance dashboard.
- Validated JSON progress import/export.
- One reusable recovery card/code, client-side encryption, QR without the recovery secret, and explicit opt-in to server backup.
- One project credential opens that project's contribution editor and Private Comms. Project sessions are not SabotPress staff sessions.
- Private Comms remain a separate storage scope and are excluded from contributor comparisons, publication data, public HTML, the offline download, and course publication payloads.
- Existing SabotPress owner/admin/editor authorization remains authoritative for staff actions.
- Public course reading remains server-rendered and usable without JavaScript. Interactive progress/editing/recovery features still require JavaScript.

## Editorial review workflow

Contributor saves now create immutable review submissions in `course_contributor_submissions`. A submission stores the exact public contribution revision being proposed, its project, submission time, status, decision metadata, and reviewer note. Private Comms are never copied into a submission.

The Courses workspace now has a Reviews view with:

- project, submission time, revision and status;
- added/removed/changed labels that do not rely on color;
- responsive before/after comparisons for the shared answer, project questions/answers and exercise;
- Approve and publish, Request changes, and Reject submission actions;
- a required reviewer note for every decision.

Approval uses the submitted revision as a compare-and-swap boundary. It succeeds only when that submission is still the contributor's current draft/revision. A contributor saving a newer revision makes the older submission stale for approval. Rejection and change requests preserve the submission and publication unchanged. Decisions and restoration remain visible in the contributor workspace. Revision history has a Load as draft action; loading never publishes.

Ordinary editor contributor listings expose pending counts/status only. The review dashboard must explicitly request submitted review content.

## Exercise testing and readiness

The existing Exercise Testing data model is extended rather than replaced. A record can now distinguish technical review from practical performance and record:

- target lesson/activity and tested content/activity version;
- technical reviewer and practical tester assignment;
- OS, software versions, equipment and starting conditions;
- steps, expected result and actual result;
- confusing instructions, failed commands, missing assumptions, safety concerns and recovery failures;
- severity, responsible person, finding status, required correction and retest outcome;
- READ ONLY versus successful practical performance.

The Readiness view is advisory and configurable. It reports lessons missing technical review, lessons without a successful practical test, unresolved configured blocking severities, and reviews recorded against an older content version. It does not silently unpublish anything.

Editors can explicitly publish a lesson's `lastTestedDate` and `lastTestedEnvironment`. Internal tester identities and testing notes are removed by `publicCourse()` and are not rendered publicly.

## Learning feedback

Activity versions remain the validity boundary for completion. Older attempts stay in learner state, but an attempt from an older material version does not satisfy the current activity.

Activities now support:

- a completion explanation shown before the learner starts;
- correct-answer explanation;
- incorrect-answer explanation;
- answer-specific feedback keyed to selected option IDs;
- the existing general feedback field.

Reflections remain saved responses rather than automatically graded answers. Practical/checklist work remains self-confirmed. Teach-back still requires both a written response and explicit confirmation that the learner taught someone and checked understanding. “I need more practice” remains limited to self-assessed activities.

## Recovery changes

Recovery continues to store opaque encrypted blobs plus a one-way writer credential hash. The recovery secret and plaintext learner state are not sent to the server or placed in URLs.

Changes in this phase:

- backup status is visible in each practical lesson as well as Progress tools;
- last successful backup time is visible;
- each lesson has Back up now;
- pending local changes are explained while automatic backup is waiting;
- conflict mode pauses automatic writes and offers a download of the stale device's local copy before restore;
- restoration still asks before replacing local state, so canceling restoration keeps the browser copy;
- successful restores keep the same recovery card/code and writer lineage;
- successful updates renew retention; an expired remote blob is explicitly not recoverable merely because a printed card still exists.

### Shared-IP abuse controls

The previous single recovery rate-limit bucket was inappropriate for workshops behind one NAT address. Recovery limits are separated:

- new recovery-card creation: network/IP limited;
- recovery reads: network/IP limited;
- failed write credentials: network/IP limited;
- authorized updates: limited per recovery ID/card rather than consuming one shared workshop bucket.

The encrypted blob update is conditional on winning the writer-revision compare-and-swap inside the same D1 batch, preventing a stale racing device from replacing ciphertext after losing the revision race.

## Offline reading edition

`/guides/become-the-thousand-servers/offline` generates a downloadable self-contained HTML reading snapshot from the current published course projection and published contributor responses only.

It contains inline presentation CSS and local in-document navigation, and labels both the course content version and generation time. It excludes learner notes, recovery credentials, encrypted recovery state, drafts, testing records, review decisions, reviewer identities and Private Comms. The file explains that interactive checking, progress persistence and synchronization are unavailable in the download and identifies the canonical web edition.

No service worker was introduced, so the implementation cannot accidentally expand a cache boundary over admin/private Sabot routes.

PDF, EPUB and facilitator editions are deliberately deferred. The current application has no maintained PDF/EPUB generation dependency or tested publication pipeline for those formats. Shipping an unverified converter would be less useful than the single-file HTML edition and would create another stale-output path. A later phase can generate those formats from the same public projection once typography, links, code blocks and update/version behavior have dedicated tests.

## Content audit and manuscript status

The repository's current LMS seed contains all twelve practical lesson bodies but does not contain the complete authored G01–G13 manuscript. The project file set supplied for this work contains the longer manuscript/snapshot and a newer G01–G13 collaborative working draft. Those sources contain substantial authored connective prose beyond the short section seed and also preserve explicit reporting gaps/TK markers.

The correct editorial rule for this phase is therefore: do not treat a heading, one-line quotation, or placeholder as a completed essay section; do not synthesize missing interviews or operator testimony; move source-backed prose into the editorial workspace only as a human-reviewable draft before publication.

Current content status by guide section:

| Section | Practical mapping | Editorial status / human work |
| --- | --- | --- |
| G01 WHY BECOME THE THOUSAND SERVERS? | none | Longer opening/justification prose exists in supplied manuscript material. Assemble into a draft and review its claims/citations before publishing. |
| G02 A SERVER IS NOT JUST A MACHINE | Lesson 1 | Manuscript material exists on dependency mapping and infrastructure as social as well as technical. Needs evidence pass and final integration. |
| G03 LEARN WHAT IS ACTUALLY HAPPENING | Lessons 2–3 | Practical material exists. Connective prose exists, but technical references should be checked against current primary documentation during expert review. |
| G04 YOUR FIRST SERVER DOESN’T NEED TO SERVE ANYONE | Lessons 4–5 | Practical material exists. Needs fresh-learner execution and editorial connective pass. |
| G05 “I HAVE A SERVER” IS NOT RESILIENCE | Lessons 6–8 | Backup/restore/rebuild/migration practical material exists. Must not be called complete until clean-start restore and migration tests are performed and recovery assumptions are documented. |
| G06 TECHNICALLY DECENTRALIZED, SOCIALLY CENTRALIZED | Lesson 9 | Authored thesis material exists. Needs contributor/operator responses and final editorial synthesis without inventing absent answers. |
| G07 PUBLISH FOR DISAPPEARANCE | Lesson 10 | Practical material exists. Needs primary-documentation verification for current publishing/mirroring procedures and fresh execution. |
| G08 THE INTERNET IS NOT THE ONLY NETWORK | Lessons 11–12 | Practical/alternative-network material exists. Needs device/network testing and current primary-source verification for named software/protocol behavior. |
| G09 THIS IS NOT A SERVER GUIDE | none | Connective prose exists in supplied working material. Editorial draft needed; do not substitute a slogan for a finished section. |
| G10 THE HUMAN INFRASTRUCTURE | none | Supplied material identifies care, burnout, knowledge transfer and social maintenance as core topics. Reporting/operator testimony remains incomplete. |
| G11 THE WEB OF PARTIAL KNOWLEDGE | none | Authored conceptual material exists. Needs synthesis with contributor answers and explicit sourcing where factual claims are made. |
| G12 WHAT SURVIVES WITHOUT YOU? | none | Central thesis and supplied prose exist, including the resilience/person formulation. Contributor answers and final synthesis remain human reporting work. |
| G13 EACH ONE, TEACH ONE | none | Closing/teach-back concept exists. Final prose should be assembled after testing because it needs to reflect what learners actually can reproduce and teach. |

### Known reporting gaps

Human editors still need to resolve the explicit TK/reporting gaps in the supplied manuscript, especially:

- operator guidance on what should not be self-hosted and why;
- contributor/operator answers that have not yet been supplied;
- care, burnout, succession and maintenance practices for the human-infrastructure sections;
- synthesis of the “what survives without you?” answers;
- claims whose current technical truth depends on software/network behavior;
- final conclusion/challenge language informed by actual learner/expert testing.

No contributor response, quote, endorsement, successful exercise result, or expert approval was invented in this implementation.

## Verification matrix

### Automated

The regression suite must cover and remain green for:

- locked course map and publication projection;
- staff/contributor/other-project/anonymous permissions;
- private-content canaries absent from public API/HTML/review/offline download;
- immutable contributor submissions, decisions, required notes and stale-approval conflicts;
- publication unchanged on rejection/change request;
- activity-version invalidation without deleting attempt history;
- answer-specific feedback semantics;
- recovery encryption, same-card updates, stale revision protection and retention renewal;
- multiple independent recovery cards behind one simulated IP;
- self-contained offline published projection and headers.

### Real browser / HTTP

Before claiming production live, verify the deployed canonical URL and offline URL, noindex/noarchive headers/meta, readable server-rendered course, absence from public discovery surfaces, and staff course route availability. Interactive browser acceptance should verify review controls, contributor decision visibility, local progress/import hydration and recovery flows where a browser environment with the production D1 binding is available.

### Physical / expert participation still required

These cannot honestly be marked passed by automated code tests:

- Android/iPhone plus Firefox/Chrome/Safari acceptance matrix;
- two genuinely separate clean devices through a full recovery handoff;
- black-ink printer output and scanning the printed QR with real phone cameras;
- every practical infrastructure exercise from a disposable clean starting environment;
- expert technical review and fresh-learner usability review;
- final editorial acceptance of G01–G13 prose and contributor synthesis.

## Production safety

Practical infrastructure exercises must use disposable hosts/networks. Do not point destructive lesson steps at Sabot production. The production deployment changes course/editor/recovery code only and does not itself execute learner exercises.

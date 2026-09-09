# Thousand Servers course implementation

The course stays unlisted at `/guides/become-the-thousand-servers/`. No homepage, navigation, campaign, archive, or feed link is added. No learner account or analytics is introduced.

## Content and publication

The existing twelve lessons, glossary, task index, and introduction are preserved in `lms/seed.js`. Existing browser progress keeps the same storage key. Version 1 exports migrate to version 2, preserving completed/started lessons, notes, bookmarks, scroll positions, and resume. New exports include section state and activity attempts. Invalid imports do not replace local state.

G01–G13 and their lesson mapping are locked in `lms/model.js`. Their longer reporting prose was not present in the starting repository. Missing prose is explicitly labelled as being assembled; the quotations supplied for the course are retained. Contributors start without published responses or working credentials. No answers or reporting have been fabricated.

`course_content` stores the editable version. `course_publications` stores its published projection. Saving a draft/review version keeps the previous publication. Saving as published updates it; archived withdraws the course. Individual draft/review/archived sections, activities, lessons, and working documents are excluded from publication. Test records remain editorial. Legacy published records are projected safely; legacy empty lesson placeholders inherit the existing instructional seed. Archived courses do not fall back to the seed.

The route renders the same published snapshot for every anonymous reader, whether scripting is enabled or disabled. It fails closed when D1 is unavailable. The generated static HTML contains only the public seed; the Pages Function is authoritative in deployment. All course and private routes carry noindex/noarchive. Private content is never serialized into the HTML, learner bundle, public API, or generated files.

## Editing

Use the existing Courses admin interface. The workspace has buttons for guide sections, activities, shared documents, testing records, contributors, revision history, and recovery retention. The original lesson editor remains. Inline section/lesson controls use the same course API and revision checks. The Users screen remains authoritative for owner/admin/editor roles.

Full recoverable course snapshots are stored in `course_revisions`, with version, time, actor, and status. Restoring a revision loads it into the editor as a draft; save explicitly. Concurrent stale writes are rejected. D1 batches make revisions and updates atomic.

The three shared documents cover Open Questions + Disagreements, Sources + Technical References, and Exercise Testing. Sources use title/URL/note records. Exercise test records include tester, environment, date, starting assumptions, successes, failures, unclear instructions, hidden assumptions, concerns, required changes, and retest results. Editors explicitly publish appropriate summaries.

## Activities and completion

Activities have stable IDs, a version, a type, prompt, options or pairs, expected answers, feedback, sources, and editorial status. Ten supported types: multiple choice, multiple select, true/false, ordered sequence, matching, short reflection, checklist, practical verification, troubleshooting, teach-back. Initial activities use the existing verification and teaching prompts plus short checks. Ordered and matching tasks use native selects, not drag-only controls.

Lessons can reference optional activities separately from activities required for completion. Completion combines explicit manual, viewed, practical self-confirmation, and required-activity rules. Reading/scrolling alone does not complete the default lessons. Optional prerequisite enforcement gates activity/completion controls while leaving the lesson readable. Activity version changes require a fresh attempt. “Needs another attempt” records an unsuccessful latest attempt. No grades, rankings, certificates, or teacher surveillance are added.

## Contributor isolation

`course_contributors` stores each project's public draft, published response, separate private text, and credential hashes. `course_contributor_revisions` stores recoverable content scoped to the project and public-edit/private permission. Each project has one password, at least 20 characters, salted PBKDF2-SHA-256 with 100,000 iterations (the Workers Web Crypto limit). Use generated high-entropy passwords, not memorable phrases at this minimum.

Owners/admins create projects, set the project password, or disable access through the contributor page linked from Course admin. Credentials are never generated into source or stored in plaintext. Contributor sessions use a separate cookie and domain-separated HMAC, last one hour, and are Secure/HttpOnly/SameSite=Strict. Scope, project, expiry, enabled state, and credential epoch are checked on every protected request. Password resets/disable revoke old sessions. These cookies cannot authenticate to SabotPress.

A project password unlocks both its contribution editor and its Private Comms with the editorial team. It cannot unlock another project. Signed-in editors already have access without a project password. Contributors submit public changes for review; editors publish. Private pages are empty authentication shells until project or editorial access is verified. Same-origin JSON checks apply to writes. Login attempts are rate limited in D1 using short-lived hashed IP/scope buckets; raw IPs are not stored in those buckets. No course content, credentials, or recovery codes are placed in analytics or audit payloads. Existing infrastructure/platform request logging remains a deployment consideration; no custom request-body logging is added.

## Encrypted progress recovery

Each backup creates a fresh random 256-bit identifier and 256-bit AES key in the browser. AES-GCM uses a fresh 96-bit IV and authenticated associated data binding the identifier and protocol version. Only ciphertext, IV, identifier, schema version and expiry are stored in `course_recovery`. The recovery code stays in the browser UI, never a URL. Read requests contain the opaque identifier, never the key. Backups are immutable; making a new backup returns a new code. Failed backup/restore does not erase local progress.

Restore decrypts and validates locally, then asks explicitly before replacing local progress. Anyone with the code can recover the backup; Sabot cannot restore a lost code. Retention defaults to 90 days, adjustable from 1–365 days by an administrator. Changes apply to new backups; expired blobs are unavailable and cleaned during recovery requests. Backups are size/rate limited; storage has a 250 MB admission limit. JSON export/import remains available if recovery is unavailable.

## Open-source design references

Concepts reviewed, not imported code:

- Moodle [activity completion](https://docs.moodle.org/en/Activity_completion): explicit manual and automatic completion criteria.
- Moodle [Roles API](https://moodledev.io/docs/5.0/apis/subsystems/roles): capabilities evaluated in a scope.
- H5P [semantics definitions](https://h5p.org/semantics): typed activity inputs separated from rendering and validation.

No Moodle PHP, H5P runtime, BookStack, CryptPad, xAPI service, or new runtime dependency is included. Native HTML controls avoid a new quiz-library dependency. Existing project dependencies and licenses remain unchanged. Browser acceptance tests use Playwright (Apache-2.0) as an optional development tool, not application code.

## Validation and rollout

Run `node --test tests/course-lms.test.mjs` and `npm test`. Build with `npm run build`. Worker entrypoints can also be bundled with esbuild. With Playwright and Chromium installed, run `node tests/course-browser.mjs` (Node 24, built-in SQLite). The browser harness binds only to loopback and uses an in-memory test database and a test-only session secret; it does not touch production.

Tables are created lazily using the existing BF_DB binding. SABOT_SESSION_SECRET remains required for signed contributor sessions. Use an isolated preview D1 database for deployment-specific session-cookie and clean-profile encrypted-recovery acceptance checks. Do not test contributor credentials against a preview that shares production D1. The optional local preview uses `SABOT_COURSE_PREVIEW=1 npm run dev` (Node 24); its in-memory database and test secret are isolated from deployed data. Normal development and production builds do not enable this fixture.

Validation at integrated main c7681c8: all 21 focused API, cryptographic, and DOM tests pass. Full suite: 441 pass, 13 fail; untouched c7681c8 has 420 pass and the same 13 failures. The combined prebuild and Vite build pass. Connected-browser checks passed for notes/completion/quiz persistence after reload, keyboard-only matching submission, phone-width reading, and the entire published course in a script-disabled iframe. The local HTTP preview cannot exercise Web Crypto; its backup action now explains the HTTPS requirement. The standalone two-profile harness is provided but was not executed in this environment. Deployment-specific cookie and clean-profile recovery checks remain to be verified on isolated HTTPS infrastructure.

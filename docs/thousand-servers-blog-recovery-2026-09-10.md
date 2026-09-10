# NoBlogs / WordPress XML recovery pathway

Scope: `ash-xytcc/sabotmedia` only. Direct production entry: https://sabot.media/guides/become-the-thousand-servers/#blog-recovery

The course remains unlisted. No public home, navigation, archive, campaign, investigation, search or feed entry is added. Course response headers/meta retain `noindex,nofollow,noarchive`.

## Implementation

- Twelve supporting modules attached to the existing guide sections; no changes to G01–G13 or the twelve practical lesson identifiers/order/mapping.
- One structured task path: nine hosted steps, eleven self-hosted steps, three alternative-destination preservation/handoff steps. Alternatives do not claim recovery completion.
- Thirteen versioned activities: twelve practical checklists and one explanatory XML knowledge check. All applicable checkpoints must be current and self-confirmed before the recovery exit appears. Merely opening/reading a step does not complete it.
- Destination choice, last step and optional notes extend the existing local progress object and its JSON/encrypted transfer. No account or separate recovery service. Existing attempt history and course completion arrays retain their semantics. Finishing this path does not complete any broader course lesson/section.
- Supporting modules link to contextual existing lessons, with return links. Hosted users use relevant DNS/dependency/backup/migration concepts without mandatory Linux/SSH lesson completion.
- Course workspace includes Pathways and Modules. Title, introduction, exit text, sources, destinations, ordered step references, module content/status/version, section attachment and lesson/activity references are editable. The existing Activities and Testing views handle feedback, versions and testing metadata. Readiness includes modules/pathways as well as lessons and does not mistake a NOT TESTED technical-review placeholder for completed review.
- Both server HTML and the single-file offline edition include published instructions, destination trails and checklist text. Offline HTML contains no scripts, learner state or internal review/testing identities. Without JavaScript, all instructions remain readable and the exit is conditional on doing the checklists manually.

## Publication and preservation

`withRecoveryPathway` adds the new structured fields and records to snapshots missing `pathwaySchemaVersion: 1`. Public reads receive only the public additions; editor reads also receive unexecuted testing placeholders. The operation does not write D1, overwrite authored fields or mutate saved publication/revision bytes. Existing arrays retain their entries; new stable IDs are appended only if absent.

A subsequent normal editor save persists the new fields and marker under the existing compare-and-swap/revision workflow. After that, removed or draft content stays removed/draft and cannot be silently re-seeded. Archived/null publications remain unavailable. Existing drafts are not published by this deployment. Existing contributor/private communication tables and recovery endpoints are unchanged.

Material activity changes require an activity-version bump. Module/path versions label content; testing records use `module-id:version` or `pathway-id:version` as their contentVersion. Old attempts are kept but no longer satisfy a changed activity version. Reading a procedure, performing it and observing an unaided learner are different review kinds.

## Technical sources and boundaries

References checked on 2026-09-10:

- WordPress Export, Import, General Settings and Permalink screen documentation.
- WordPress.org official importer directory: describes import tooling, limits and version-dependent URL rewriting. Directory information is not a successful test of any hosting environment. Do not confuse its advertised compatibility with practical acceptance here.
- WordPress advanced administration: installation, backups, migration.
- WordPress current hosting requirements.
- Ubuntu WordPress tutorial and Apache installation documentation.
- Certbot Apache instructions.
- Cloudflare DNS record definitions (a technical reference, not a provider recommendation).

Each module carries its relevant URLs. No provider-specific WordPress compatibility was invented. No recommended-host comparison grid was found in the repository during inspection; the destination text explicitly marks this gap and supplies capability questions. Editors can add a verified comparison link/source when available.

The self-host practical is explicitly scoped to a separate empty Ubuntu 24.04 LTS VPS, Apache, PHP and MariaDB; it must not be pasted over the earlier Caddy/nginx exercise or an existing live site. It includes database creation, application installation, HTTPS, backup download and a disposable restore procedure. Actual package versions, permissions, import behavior and certificate renewal still need practical execution. Other operating systems/stacks need their own reviewed adaptation.

The alternative-CMS/static route is an honest preservation/handoff boundary, not a complete converter. Media automation is not added. Manual copies and operator-coordinated paced transfer avoid repeated full crawls against an impaired source.

## Automated validation

Untouched baseline `eb429b9447b0497c2cd5af75b1f209993697797c`: 480 tests passed, zero failed.

Implementation full suite: 496 tests passed, zero failed, skipped or cancelled. Sixteen added tests cover the task map, branch completion, checkpoint requirements, independent completion state, history/version handling, migration/revision preservation, draft/private canaries, public and offline HTTP output, advisory testing placeholders, discovery source boundaries and DOM persistence/continuation.

Production build passed (prebuild generators plus Vite). The existing large-main-bundle warning remains. Generated unrelated reading pages are build output and are not part of the focused source commit.

The cloud browser could not open the loopback preview (`ERR_BLOCKED_BY_CLIENT`). Local isolated VM/DOM tests and HTTP tests ran successfully. Production HTTP verification confirmed the new pathway and offline HTML, noindex/nofollow/noarchive headers, and exact preservation of existing published lessons, sections, activities and prose. A live browser check found a self-host navigation ordering defect; the follow-up fix aligns visible steps with the selected trail and keeps the initial trail at XML/destination until a choice is made. Regression tests cover both ordering and direct step links. Final browser verification is recorded in the delivery report. Automated checklists simulate confirmation to test software behavior; they are not evidence that an actual blog was recovered.

## Human acceptance execution sheet — NOT EXECUTED

Fifteen editorial placeholders: five scenarios × technical review, practical execution and learner usability. For each run record date, tester/reviewer, exact content/activity versions, WordPress version, importer version, hosted/self-host environment, plan, OS, PHP/database/web-server versions, browser/device, initial conditions, expected/actual results, attachment behavior, errors, confusing language, severity, owner, required correction and retest result. Leave actual result blank until execution.

1. **Hosted WordPress / novice:** Give a nontechnical learner a real WXR and only this course. Observe copying/identifying it, choosing a confirmed plan, creating an empty blog, author mapping/import, media inspection/repair, reconstruction, independent backup and restore, test-domain cutover (or explicit no-domain-control case), final public verification, recovery exit and an explanation of how someone else would move it. No administrator coaching; record every undocumented intervention as a defect.
2. **Self-hosted disposable WordPress:** Repeat on a fresh Ubuntu 24.04 VPS and a test hostname, including linked prerequisite lessons, all installation commands, HTTPS/renewal, restricted database exposure, independent download and clean restore. Record exact software versions. Never run destructive exercises against Sabot production.
3. **Partially failing media:** Use authorized fixtures with a working image, missing image, remote-only inline file, PDF, audio and featured image. Confirm the learner distinguishes local bytes from old URLs, repairs available files without repeated aggressive requests, and documents genuine losses.
4. **Complex/large/retried WXR:** Include several authors, categories/tags, posts/pages, Unicode, comments, draft/private material and attachments. Exercise the host's real upload/memory/time limit, capture partial results, and retry from a clean protected destination without duplicating or losing new work. Verify no private imported material becomes unintentionally public.
5. **Domain and independent backup:** On a disposable domain with mail records, copy all DNS settings, change only web records, test IPv4/IPv6/HTTPS from another device/network, verify email remains functional, exercise rollback, and restore from a learner-controlled downloaded copy after denying access to the original host. Cover an old NoBlogs subdomain the learner does not control as a separate no-cutover outcome.

Also pending: physical Android/iPhone reading/input; Firefox/Safari; 200% text enlargement; keyboard-only end-to-end task completion; actual offline opening with connectivity disabled; two real-device encrypted transfer including task notes/choice; independent expert security/content review. Existing broader course human acceptance requirements remain in force.

## Prioritized optional improvements

1. Complete host-plan compatibility fields and link the verified Sabot comparison.
2. Use real novice trials to shorten confusing sections and add provider-specific screenshots/branches where justified.
3. Add a strictly local optional WXR inventory tool, with large-file safeguards, after separately testing parser/privacy behavior.
4. Generalize the next task path (host migration or administrator succession) using this schema; avoid duplicating core lessons.

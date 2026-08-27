# SabotPress Backend Completion Matrix

Last updated: 2026-08-27

Status legend: **verified** = executable or live verification completed; **fixed / awaiting deploy verification** = merged code passed repository verification but has not yet been proven through the authenticated production workflow; **defect** = behavior is known to violate the production contract; **audit pending** = route exists but the full workflow or responsive pass has not yet been completed.

Current reconciled `main`: `d6bb73d3c9a42c12d6bfb5a8f801d05e0f063656` after PR #104 (Publications persistence) and PR #103 (Feed settings persistence).

| Page / route | Current purpose | Data source | Read behavior | Write behavior | Authentication | Desktop / mobile | Empty / loading / error states | Verification performed | Remaining blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/wp-admin` | Dashboard / newsroom | D1 + compiled content + widgets | Mixed real backend reads | Quick actions route to canonical tools | Edge + React session guard | Audit pending | Mixed | Route/source audit | Full responsive/live admin pass |
| `/wp-admin/posts` | Content list | Native content API / D1 plus imported archive | Native API is authoritative; imported archive remains derived/read-only | Routes to real editor actions | Edge + React guard | Audit pending | Error handling present in native API path | #101 persistence contract + source audit | Cross-session production validation |
| `/wp-admin/add-new`, `/wp-admin/native-bridge` | Post editor | Native content D1 + browser-local autosave/recovery snapshots | Authoritative server read for native entries | Manual Save/Publish/Delete are fail-closed and server-authoritative | Edge + React guard | Prior laptop repair; full responsive pass pending | Manual save errors visible; autosave still browser-local | #101 CI verified | **Defect:** move autosave/revisions to server and expose legacy local snapshots only as recovery data |
| `/wp-admin/media` | Media library / picker | Binary media endpoint + D1 media registry + legacy browser metadata/fallback | Mixed server/derived/local sources | **Defect:** failed server upload can still downgrade to browser data URL; metadata edits are not authoritative D1 writes | Edge + React guard | Audit pending | Some upload notices | Source audit | Highest-priority P0: require server upload, wire D1 metadata, migrate/recover legacy local assets, verify storage binding |
| `/wp-admin/pages` | Public route/template inventory | Application route definitions | Static route inventory | No pretend page-database writes | Edge + React guard | Audit pending | Truthful non-editable state | #97 truthfulness cleanup | Decide whether to remain an inventory or become a real D1 page CMS |
| `/wp-admin/collections` | Collection editor | D1 collections API | D1 authoritative; legacy browser collection data exposed only for explicit recovery/migration helpers | Writes/deletes fail closed; no local success fallback | Edge + React guard | Audit pending | Errors propagate to admin notices | #96 CI verified | Live cross-session + public collection verification |
| `/wp-admin/publications` | Publication/zine system above Printlab | D1 publications API | D1 authoritative; public index/landing/reader load server data | Save/generate/delete fail closed; no production localStorage save fallback | Edge + React guard | Audit pending | Loading/error states added | PR #104 CI verified and merged at `6f90d1c78e1681c97f8e040e2dd0d6363ee5dc56` | Live visibility/reader/generation verification; Printlab handoff audit |
| `/wp-admin/feeds` | RSS/feed settings | D1 `site_settings` via `/api/feed-settings` | Persisted public-read server configuration | Authenticated D1 save/reset, fail closed, audit logged | Edge + React guard for admin writes | Audit pending | Loading/saving/error states present | PR #103 CI verified and merged at `d6bb73d3c9a42c12d6bfb5a8f801d05e0f063656` | Verify live feed configuration and add/verify direct XML feed endpoints where practical |
| `/wp-admin/taxonomy`, `/taxonomy` | Tags/series/themes/projects | D1 taxonomy API | Real D1 | Real D1; missing BF_DB fails closed | Edge + React guard | Visual polish pending | Loading/error state present | #100 canonical route + prior API CI coverage | Live write/read validation and admin-frame polish |
| `/wp-admin/users` | Authentication/collaboration status | Current authenticated session/capabilities | Truthful current auth state | Fake local user provisioning removed | Edge + React guard | Audit pending | Truthful capability limitation | #97 CI verified | Real D1 membership/user model only if session identities can be resolved server-side |
| `/wp-admin/roles`, `/roles` | Stored editor-role records | D1 `editor_roles` | Real D1 | Real D1 records | Edge + React guard | Visual polish pending | Loading/error state present | #100 canonical route + prior API CI coverage | Roles are records, not enforced RBAC; tie to authenticated identities before claiming authorization |
| `/wp-admin/qa`, `/review` | Editorial QA/review | Native content / workflow | Real native workflow reads | Workflow actions require deeper validation | Edge + React guard | Audit pending | Audit pending | Route inventory | Full review-state lifecycle test |
| `/wp-admin/customize` | Site identity/colors/homepage/public configuration | D1-backed public-site config | Backend config is authoritative | Saves through public-config backend; browser-only fake save removed | Edge + React guard | Audit pending | Backend state/error UI present | #97 CI verified | Verify each saved option visibly affects production; migrate any legacy browser customization explicitly |
| `/menus` | Public navigation configuration entry point | Currently routed through customization/public config | Partial | Partial | Edge protection | Audit pending | Audit pending | Route/source audit | **Defect:** define persisted navigation model and prove saved navigation controls public menus |
| `/wp-admin/settings` | General public-site settings | D1-backed public-site config | Backend config is authoritative | Saves through public-config backend | Edge + React guard | Audit pending | Backend state/error UI present | #97 CI verified | Verify public effect of title/tagline/homepage/settings and eliminate duplicate config paths |
| `/wp-admin/site-health`, `/site-health` | Infrastructure + editorial diagnostics | Authenticated health API + D1 + binding diagnostics | Real backend diagnostics | Read-only | Edge + React guard | Existing admin patterns | Visible backend failure | Regression coverage for missing BF_DB | Authenticated production health run |
| `/wp-admin/system-backup`, `/system-backup` | System export | Required server APIs | Strict server reads | Download only after complete manifest | Edge + React guard | Existing admin patterns | Fail-closed visible errors | Strict backup integrity regression coverage | Verify manifest includes every newly added D1 domain; authenticated production export/import validation |
| `/wp-admin/audit-log`, `/audit-log` | Audit history | D1 audit log | Real D1 | Read-only; other APIs append audit events | Edge + React guard | Audit pending | API error behavior present | Route/source audit | Live validation across collections/sites/feeds/media/publications/settings |
| `/wp-admin/analytics`, `/analytics` | First-party traffic reports | D1 analytics | Authenticated real report | Public collector writes privacy-filtered pageviews | Edge + React guard for reports | Existing widgets; responsive pass pending | Strong loading/error/empty states | #98 server DNT/GPC enforcement; #100 canonical route; analytics tests | Authenticated production report verification and live ingestion proof |
| `/wp-admin/sites`, `/wp-admin/settings/sites`, `/sites` | Sites/domains intent registry | D1 `sites` registry | Real D1 | Authenticated D1 save/delete with audit log | Edge + React guard | Audit pending | Loading/error/empty states added | #99 CI verified | Live validation; actual DNS/custom-domain attachment remains an external Cloudflare operation |
| `/wp-admin/printlab`, `/printlab` | Separate print/design utility | Mixed project/browser/media systems | Audit pending | Audit pending | Edge + React guard | Specialized workspace | Audit pending | Route inventory | Dedicated persistence/export/responsive pass; keep separate from Post Editor |
| `/wp-admin/audiolab`, `/audiolab` | Audio production | R2/media + project state | Audit pending | Audit pending | Edge + React guard | Many accumulated CSS layers | Audit pending | Route/CSS inventory | Deep functional/media/render/persistence pass |
| `/wp-admin/podcasts` | Podcast administration | Native/podcast content | Audit pending | Audit pending | Edge + React guard | Audit pending | Audit pending | Route inventory | End-to-end episode/audio/feed validation |
| `/wp-admin/overrides` | Overrides/admin tooling | Mixed | Audit pending | Audit pending | Edge + React guard | Audit pending | Audit pending | Route inventory | Full audit |
| `/wp-admin/live-editor`, `/draft` | Public-site draft/editor | Public config + browser draft layer | Backend config plus local editing state | Backend save available; local draft affordances remain | Edge + React guard | Audit pending | Audit pending | Route inventory | Clarify canonical persistence and legacy recovery semantics |
| `/login`, `/logout`, `/wp-login` | Admin session | Token + signed HttpOnly session; optional CF Access | Real session check | Login/logout session cookie | Public endpoints; protected destinations at edge | Audit pending | Lock/error states exist | Auth source audit | Live redirect/session verification without exposing credentials |
| Admin command palette + rail | Navigation/action launcher | Canonical route registry | Client-side navigation | Navigational only | Protected admin | Audit pending | Accessible keyboard basics present | #102 CI verified; async Sites regression fixed | Full keyboard/mobile regression |
| `www.sabot.media/*` | Canonical-host redirect | Pages middleware | N/A | N/A | N/A | N/A | N/A | Source audit: 308 preserves path/query; public fetch environment could not prove `www` live | Verify production redirect after current deployment |

## Severity-ranked defects remaining

### P0: data integrity / false success

1. **Media Library:** failed server upload can still become a browser-local data URL; metadata editing is not authoritative D1 persistence.
2. **Native autosave/revisions:** manual Save/Publish/Delete are fixed, but autosave and local revision history remain browser-local. Server revision APIs already exist and should become authoritative.
3. **Backup coverage:** strict failure behavior exists, but the manifest must be re-audited after Sites, Feeds, Publications, Media metadata, taxonomy/roles, and revision migrations are complete.

### P1: incomplete production behavior

1. **Menus/navigation:** no proven server-persisted navigation model controlling the public site yet.
2. **RBAC:** `editor_roles` exists, but role rows are not an enforced authorization boundary tied to authenticated identities.
3. **Production verification:** authenticated admin/API paths and current deployed asset hashes still need production confirmation.
4. **Pages:** currently a truthful route inventory, not a database-backed page CMS.

### P2: engineering / interface consistency

1. Global styling is split across a large stylesheet plus numerous late-stage `*-fix`, `*-final`, and runtime override layers.
2. Printlab and AudioLab require dedicated functional and responsive audits after the remaining P0 persistence work.
3. Several admin pages still need desktop/narrow-laptop/tablet/mobile normalization once their behavior is final.

## Verification history

- PR #92: analytics result mapping + repository test/build gate. GitHub Actions `Verify` passed before merge. Squash commit `a16f7c48ad31c763c78b92474b2c360bab58ddab`.
- PR #93: BF_DB fail-closed contracts for native content, taxonomy, media metadata, editor roles, publications; expanded edge authentication aliases. GitHub Actions `Verify` passed before merge. Squash commit `1c3e07bbae51062b28de2919ba1e1cf467cb26d2`.
- PR #96: Collections fail-closed persistence. `Verify` passed; merge commit `c453fed49bf370f5ee3295cbf69b498db0b8482b`.
- PR #97: Removed fake browser-only Users/Settings/Customize/Backup behavior. `Verify` passed; merge commit `38caf0c5d5fa456528c041c083a9961698c5f38e`.
- PR #98: Server-side DNT/GPC enforcement for analytics ingestion. `Verify` passed; merge commit `d3bc71857f509869b6eb62fb1031feb624a2f6f3`.
- PR #99: Sites & Domains moved to D1. `Verify` passed; merge commit `e9fa0ccc072113f2dd59ba5f1681c7ad694b3a7d`.
- PR #100: Canonical Analytics/Taxonomy/Roles/Platform Map routes. `Verify` passed; merge commit `74b3b64b18aeaa3e18d6c1ed427742a34fbefaba`.
- PR #101: Native manual Save/Publish/Delete made server-authoritative. `Verify` passed; merge commit `c4b912125f1fd8f7e5a3ddfff724296303bf4a92`.
- PR #102: Admin rail/command palette synced to real routes and async Sites regression repaired. `Verify` passed; merge commit `0548330314ac28117afbb7d7e07720e9c05c9350`.
- PR #104: Publications client persistence made authoritative against the D1 API; public reader/loading behavior tightened. `Verify` passed; merge commit `6f90d1c78e1681c97f8e040e2dd0d6363ee5dc56`.
- PR #103: Feed settings moved to public-read/authenticated-write D1 storage with audit logging. `Verify` passed; merge commit `d6bb73d3c9a42c12d6bfb5a8f801d05e0f063656`.

## Production verification notes

- `https://sabot.media` is reachable in the current production environment.
- Authenticated admin/API production workflows have not yet been certified in this run because no authenticated production session is available to the web probe.
- The source-level `www.sabot.media` middleware is a 308 hostname rewrite that preserves path and query. Direct `www` verification must still be repeated against production after the current deployment.

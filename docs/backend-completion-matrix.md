# SabotPress Backend Completion Matrix

Last updated: 2026-08-27

Status legend: **verified** = executable or live verification completed; **fixed / awaiting deploy verification** = merged code not yet proven on production; **defect** = behavior is known to violate the production contract; **audit pending** = route exists but the full workflow has not yet been completed in this run.

| Page / route | Current purpose | Data source | Read behavior | Write behavior | Authentication | Desktop / mobile | Empty / loading / error states | Verification performed | Remaining blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/wp-admin` | Dashboard / newsroom | D1 + compiled content + widgets | Mixed real backend reads | Quick actions route elsewhere | Edge + React session guard | Audit pending | Mixed | Route/source audit | Full visual/live pass |
| `/wp-admin/posts` | Content list | Native content API / D1 plus imported archive | Real native read with legacy local merge | Routes to editor actions | Edge + React guard | Audit pending | Audit pending | Source audit | Remove browser fallback from native collection |
| `/wp-admin/add-new`, `/wp-admin/native-bridge` | Post editor | Native content D1 + browser draft/revision fallbacks | D1 read merged with localStorage | **Defect:** failed server saves can still be presented as local success | Edge + React guard | Prior laptop repair; full responsive pass pending | Warning exists but can be followed by success notice | Source audit | Make server confirmation authoritative; D1 autosave/revisions |
| `/wp-admin/media` | Media library / picker | R2 binary endpoint + D1 media registry + localStorage metadata/fallback | Mixed | **Defect:** failed server upload silently falls back to browser data URL; metadata local-only | Edge + React guard | Audit pending | Some upload notices | Source audit | Require server upload; persist metadata to D1; verify R2 binding |
| `/wp-admin/pages` | Public page/template index | Hard-coded route inventory | Static route list | No page persistence | Edge + React guard | Audit pending | Minimal | Source audit | Define editable page model or make index explicitly navigational |
| `/wp-admin/collections` | Collection editor | D1 API + localStorage fallback | D1 with local fallback | **Defect:** writes/deletes fall back to localStorage | Edge + React guard | Audit pending | Audit pending | Source audit | Fail closed and surface legacy migration |
| `/wp-admin/publications` | Publication/zine system | D1 API + localStorage fallback | D1 with local fallback | **Defect:** failed API write falls back to localStorage | Edge + React guard | Audit pending | Audit pending | D1 endpoint missing-binding contract fixed | Remove browser fallback; verify public publication flow |
| `/wp-admin/feeds` | RSS/feed settings | Mixed native content and feed helpers | Audit pending | Audit pending | Edge + React guard | Audit pending | Audit pending | Route/source inventory | Full read/write/feed validation |
| `/taxonomy` (orphaned UI) | Tags/series/themes/projects | D1 taxonomy API | Real D1 | Real D1; missing BF_DB now fails 503 | Edge protection added | UI not in admin frame | Has loading/error state | API contract verified in CI | Register canonical admin route and navigation; visual polish |
| `/wp-admin/users` | User administration | **localStorage scaffold** | Fake local users | Fake local create/delete/role changes | Edge + React guard | Audit pending | Minimal | Source audit | Replace with truthful auth/collaboration UI |
| `/roles` (orphaned UI) | Stored editor-role records | D1 `editor_roles` | Real D1 | Real D1; missing BF_DB now fails 503 | Edge protection added | UI not in admin frame | Has loading/error state | API contract verified in CI | Register route; clarify roles do not yet enforce RBAC |
| `/wp-admin/qa`, `/review` | Editorial QA/review | Native content / workflow | Audit pending | Audit pending | Edge + React guard | Audit pending | Audit pending | Route inventory | Full workflow validation |
| `/wp-admin/customize` | Site identity/colors/homepage | **localStorage scaffold** | Browser only | Browser only | Edge + React guard | Audit pending | Save notice only | Source audit | Move to D1/public-site-config and migrate browser draft explicitly |
| `/menus` | Navigation draft | **localStorage** | Browser only | Browser only | Edge protection | Audit pending | Unsaved notice | Source audit | Persist real public navigation and wire to public site |
| `/wp-admin/settings` | General settings | **localStorage scaffold** | Browser only | Browser only | Edge + React guard | Audit pending | Save notice only | Source audit | D1-backed admin settings and migration |
| `/wp-admin/site-health`, `/site-health` | Infrastructure + editorial diagnostics | Authenticated health API + D1 + editorial scans | Real D1/binding diagnostics added | Read-only | Edge + React guard | Existing admin patterns | Visible backend failure | Regression test for missing BF_DB; production verification pending | Verify live after deployment; authenticated health endpoint requires session |
| `/wp-admin/system-backup`, `/system-backup` | System export | Required server APIs | Strict server reads | Download only after complete manifest | Edge + React guard | Existing admin patterns | Fail-closed visible errors | Regression tests added; CI pending | Production export with authenticated session |
| `/wp-admin/audit-log`, `/audit-log` | Audit history | D1 audit log | Real D1 | Read-only | Edge protection + React guard | Audit pending | Has API error behavior | Route/source audit | Visual/live validation |
| `/analytics` (component orphaned) | First-party traffic reports | D1 analytics | Real authenticated report | Collector writes public pageviews | Edge protection added for alias | Existing analytics widgets | Strong loading/error/empty states | Analytics mapping regression passed; privacy source audit | Register canonical route/navigation; production report verification |
| `/wp-admin/sites`, `/wp-admin/settings/sites`, `/sites` | Sites/domains | **localStorage scaffold** | Browser only | Browser only; no Cloudflare wiring | Edge + React guard | Audit pending | Warning admits local-only | Source audit | D1 intent registry + exact Cloudflare domain workflow |
| `/wp-admin/printlab`, `/printlab` | Separate print/design utility | Mixed project/browser systems | Audit pending | Audit pending | Edge + React guard | Specialized workspace | Audit pending | Route inventory | Dedicated functional + responsive pass |
| `/wp-admin/audiolab`, `/audiolab` | Audio production | R2/media + project state | Audit pending | Audit pending | Edge protection fixed + React guard | Many accumulated CSS layers | Audit pending | Route/CSS inventory | Deep functional/media/render pass |
| `/wp-admin/podcasts` | Podcast administration | Native/podcast content | Audit pending | Audit pending | Edge + React guard | Audit pending | Audit pending | Route inventory | End-to-end feed/audio validation |
| `/wp-admin/overrides` | Overrides/admin tooling | Audit pending | Audit pending | Audit pending | Edge + React guard | Audit pending | Audit pending | Route inventory | Full audit |
| `/wp-admin/live-editor`, `/draft` | Public-site draft/editor | Public config + browser systems | Audit pending | Audit pending | Edge + React guard | Audit pending | Audit pending | Route inventory | Determine canonical persistence and remove duplicate customization paths |
| `/login`, `/logout`, `/wp-login` | Admin session | Token + signed HttpOnly session; optional CF Access | Real session check | Login/logout session cookie | Public endpoints; protected destinations at edge | Audit pending | Lock/error states exist | Auth source audit | Live redirect/session verification without exposing credentials |
| Admin command palette | Navigation/action launcher | Route registry | Client-side | Navigational | Available inside protected admin | Audit pending | Audit pending | Source inventory | Sync with final route inventory and accessible keyboard test |
| `www.sabot.media/*` | Canonical-host redirect | Pages middleware | N/A | N/A | N/A | N/A | N/A | Source audit: 308 preserves path/query | Verify live after current deployment |

## Severity-ranked defects found in this run

### P0: data integrity / false success

1. Native post saves and deletes can fall back to browser storage after server failure; the editor can emit both a sync warning and a success notice.
2. Media upload failures silently downgrade to browser-local data URLs; media metadata edits are not authoritative server writes.
3. Collections and publication helpers fall back to browser persistence when the D1/API write fails.
4. System backup previously swallowed API failures and exported empty sections as a successful "full" snapshot. Fixed on the current hardening branch; verification pending.

### P1: misleading or unreachable administration

1. Users, Settings, Customize, Menus, and Sites are browser-only scaffolds.
2. Analytics, Taxonomy, and Editor Roles have real components/backends but are not coherently registered in canonical admin routing/navigation.
3. Stored editor roles do not participate in `resolvePublicSitePermission`; they are records, not enforced RBAC.
4. Site Health previously reported local browser storage and manual reminders instead of production binding/schema health. Replaced on the current hardening branch; live verification pending.
5. Legacy admin aliases were not consistently edge-protected. Fixed in PR #93 and regression-tested.

### P2: engineering / interface consistency

1. Global styling is split across a very large stylesheet plus numerous late-stage `*-fix`, `*-final`, and runtime override layers.
2. Printlab and AudioLab require dedicated responsive/workspace audits after persistence and auth integrity are resolved.
3. Several admin pages use different page shells/patterns and need normalization after their real behavior is finalized.

## Verification history

- PR #92: analytics result mapping + repository test/build gate. GitHub Actions `Verify` passed before merge. Squash commit `a16f7c48ad31c763c78b92474b2c360bab58ddab`.
- PR #93: BF_DB fail-closed contracts for native content, taxonomy, media metadata, editor roles, publications; expanded edge authentication aliases. GitHub Actions `Verify` passed before merge. Squash commit `1c3e07bbae51062b28de2919ba1e1cf467cb26d2`.
- Current branch: authenticated site-health diagnostics and strict backup integrity are implemented; CI/live verification pending.

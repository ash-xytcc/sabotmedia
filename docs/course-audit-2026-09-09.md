# Thousand Servers audit — 9 September 2026

Scope: current ash-xytcc/sabotmedia course, public rendering, contributor access, editorial tools, learner state and encrypted recovery. This is an implementation audit, not expert verification of the lesson procedures or an independent security assessment.

## Fixed in this audit

| Area | Confirmed problem | Correction |
| --- | --- | --- |
| Recovery | Unreadable local progress plus a remembered recovery card could upload an empty fallback session | Pause recovery writes until local progress is safely recovered |
| Recovery | A reset during an asynchronous upload could reconnect the card after reset | Invalidate in-flight operations when the local connection is removed |
| Recovery | Failed uploads retried after about three seconds when there was no recent successful backup | Back off using the latest attempt time, not just the latest success |
| Recovery | Restoring a legacy snapshot could leave the previous reusable card displayed | Clear the obsolete displayed card and reset its controls |
| Activities | JSON import restored state but left old answer controls and feedback on screen | Rehydrate selections, reflections, and feedback immediately, including clearing absent answers |
| Activities | Any teach-back text counted as passing | Require a written reflection plus explicit confirmation of teaching and checking understanding |
| Activities | Self-assessed work looked automatically graded | Use response-saved and self-confirmed labels |
| Activities | Automatically graded quizzes had a redundant manual retry button | Keep “I need more practice” only for self-assessed work |
| Navigation | Malformed percent-encoded fragments could abort initialization | Fall back safely to the course map |
| Publication | A legacy archived record without a publication snapshot could reveal the starter course | Respect legacy archived status instead of falling back |
| Editorial validation | Missing required activities, unpublished required work, or prerequisite cycles could make completion impossible | Reject invalid configurations with actionable validation messages |
| Editorial review | Contributor list gave no indication which projects had submitted changes | Show pending-review counts and per-project status to editors only |
| Editorial drafts | Navigating away could discard unsaved contributor responses without warning | Warn before leaving an edited, unsaved contributor form |
| New courses | Non-seeded courses inherited the Thousand Servers activity catalog | Start new courses without unrelated activities |
| Deployment | Updated modules could be mixed with older cached dependencies | Version the changed learner module imports together |

## Verification

- 33 focused course API, permission, model, DOM, and recovery-controller tests pass.
- Full suite: 469 tests; 456 pass and 13 fail. Before this audit: 460 tests; 447 pass and the same 13 test names fail.
- Vite production build passes; diff whitespace checks pass.
- Regression coverage includes unreadable progress, reset during upload, offline backoff, current-code restore, stale revision rejection, archived legacy records, immediate import hydration, teach-back confirmation, prerequisite cycles, and editorial-only review metadata.
- Existing isolation tests still pass: project-scoped private access, anonymous exclusion, public HTML without private text, session revocation, cross-origin rejection, and ciphertext without the decryption key.
- Prior live browser checks verified production backup creation/update with the same card, card rendering, print-window opening, lesson interactions, keyboard controls, and script-disabled reading. Simulated separate-device tests are not a substitute for a broader real-device acceptance matrix.

## Needed before public launch

1. **Complete the authored guide prose.** The twelve practical lessons exist, but most G01–G13 essay bodies are placeholders or short supplied quotations. No missing reporting or contributor responses should be invented.
2. **Test every practical exercise from a clean starting point.** Record OS/version, commands, expected results, deliberate failure/recovery steps, tester and retest outcome. Use the existing Exercise Testing workspace. This audit does not claim to have executed those real infrastructure procedures.
3. **Assign review ownership.** Give each lesson a technical reviewer and a fresh learner/tester. Require resolution of blocking findings before explicitly publishing it. A checklist is useful now; a formal publication gate can follow once the team agrees its rules.
4. **Compare proposed contributor changes with the current publication.** The new pending count helps discovery, but the workflow is still draft/review/publish. It lacks an accessible side-by-side diff, approve/reject controls, reviewer comments, and per-submission decisions.
5. **Run a device/print acceptance matrix.** Android/iPhone, Firefox/Chrome/Safari, slow/offline transitions, two independent browsers, black-and-white printers and real QR scanning. Check that people can restore from the printed code without help.
6. **Resolve the existing site-wide failing tests.** Several assert old source locations or editor behavior. Determine which need updating and which identify real regressions; do not merely remove assertions to obtain a green suite.

## Useful next additions

- A review dashboard connecting findings, responsible people, lesson versions and retest status.
- Clear last-tested date/environment on each practical lesson.
- Readable revision differences and one-click load-as-draft restoration for contributor content; history is currently raw snapshots.
- Richer formative feedback explaining why a quiz answer is right or wrong.
- Recovery status visible within lessons, a last-successful-backup timestamp, and a “save before leaving” affordance. Automatic backup requires an open online page and may lag changes by a minute.
- Safer multi-device conflict resolution that helps preserve and compare both copies. Current behavior protects the newer server revision by pausing the stale device.
- Offline reading/download bundles and later PDF/EPUB/facilitator editions.
- Public correction submissions only when there is capacity to moderate them; they are not required for the present small expert-review phase.

## Deliberate limits retained

No learner accounts, grades dashboard, leaderboard, surveillance, or mandatory recovery enrollment. Public questions and lesson text remain readable without scripts; local state and interactive work require scripts. Shared project credentials identify the project, not individual people. Recovery keys are bearer secrets; QR links contain no secret. Stored encrypted backups expire after the configured inactivity period (default 365 days), renewed by successful updates; a printed card cannot retrieve an expired blob without another surviving copy. These remain explicit product choices, not claims of unlimited or account-based recovery.

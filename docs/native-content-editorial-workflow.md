# Native Content Editorial Workflow

SabotPress now uses a newsroom workflow that separates writing access from publishing authority.

## Roles

- `owner` — full control, including owners and account security.
- `admin` — site operations, user management, editorial review, publishing, settings, analytics, and system tools.
- `editor` — content/media work, editorial review, scheduling, publishing, and analytics. No user or site-settings management.
- `contributor` — create and edit their own unpublished work, upload media, submit for review, and participate in editorial discussion. Cannot schedule, publish, archive, approve, decline, or manage other writers' work.
- `viewer` — read-only admin/analytics access.

Publishing authority is enforced server-side with `publishing:write`. Review decisions are enforced with `review:manage`. Editorial discussion uses `review:comment`.

## Workflow states

Native entries track:

- `draft`
- `in_review`
- `needs_revision`
- `ready`
- `declined`
- `scheduled`
- `published`
- `archived`
- `trash`

These are editorial workflow states and are not identical to public visibility.

Typical flow:

`draft` → `in_review` → `needs_revision` → `in_review` → `ready` → `scheduled` or `published`

An editor may also move a submission to `declined`.

## Contributor ownership

New native content records preserve newsroom identity fields including:

- `createdByUserId`
- `createdByEmail`
- `createdByDisplayName`
- `lastEditedByUserId`
- `lastEditedByEmail`
- `submittedAt`
- `reviewedAt`
- `reviewedByUserId`
- `reviewedByEmail`
- `reviewDecision`
- optional assigned-editor fields

Contributors can only load and modify native newsroom records they created. Existing historical/imported content without a contributor owner is not implicitly claimable by contributor accounts.

## Editorial discussion

Piece-level editorial discussion is stored in:

- `editorial_comments`

The API is:

- `GET /api/editorial-comments?nativeId=...`
- `POST /api/editorial-comments`

Editors and contributors can comment. Contributors can only read or comment on their own work. Editor-only discussion kinds include change requests and editorial decisions.

## Review queue

The Posts screen acts as the newsroom queue.

Editors see workflow buckets for drafts, Review Queue, Changes Requested, Approved, Scheduled, Published, Declined, Archived, and Trash. Review actions include opening the full editor/revision history, requesting changes, approving, declining, publishing, and participating in editorial discussion.

Contributors see their own writing organized by Drafts, Review Queue, Changes Requested, Approved, Published, and Declined, with submit/resubmit and discussion controls.

## Scheduling

Native content entries may include `scheduledFor`. Public routes must not render scheduled entries before the scheduled time.

## Revisions

Each native content save writes revision snapshots to:

- `native_public_content_revisions`

Delete operations also save a pre-delete revision. Revision reads are ownership-aware for contributors. Revision restoration is restricted to editor-level review permission so an old published revision cannot be used to bypass publishing controls.

Restore is available through:

- `/api/native-content-revisions`

## Required SQL

Core tables are created defensively by their APIs, and the repository also carries SQL definitions for explicit deployment/migration:

- `db/native_public_content.sql`
- `db/native_public_content_revisions.sql`
- `db/editorial_comments.sql`

## Public visibility rule

Public content remains constrained to published/scheduled records that are actually due for publication. Review-only states, declined work, archived work, and trash are never public.

## Colophon upstream parity

This newsroom workflow is a SabotPress-instance implementation that should be ported to Colophon proper as a general publishing capability rather than retained as a Sabot-only divergence.

Upstream parity requirements:

- Contributor role distinct from Editor.
- Server-enforced separation of `content:write` and `publishing:write`.
- Per-user ownership for contributor drafts.
- Draft → review → changes → approved → scheduled/published workflow.
- Distinct declined state.
- Editorial discussion/comment history.
- Review queue and contributor-focused writing dashboard.
- Revision ownership rules and editor-only restoration where a restore could reinstate publishable state.
- UI controls hidden when the role lacks the corresponding capability, in addition to backend enforcement.

Do not remove this section until equivalent functionality exists in the canonical Colophon repository.

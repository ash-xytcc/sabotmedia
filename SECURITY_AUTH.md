# Sabot Media Admin Auth

Sabot Media is a Cloudflare Pages/Vite app with Pages Functions under `functions/api/*`.

Public routes stay open for reading:

- `/`
- `/archive`
- `/projects`
- `/about`
- `/contact`
- `/submit`
- `/support`
- `/security`
- `/post/*`
- `/post/*/print`
- `/pgp.asc`

Admin, editing, CMS, media, and Printlab routes are not public.

## Runtime Auth Model

The app supports two server-side authorization paths:

1. **Cloudflare Access / Zero Trust** for production route protection.
2. **`SABOT_ADMIN_TOKEN`** as a fallback/API token for editor actions.

Frontend hiding is not treated as security. It is only usability. Server-side Pages middleware and API handlers reject unauthenticated write requests.

## Required Environment Variables

Set these in Cloudflare Pages project settings:

- `SABOT_ADMIN_TOKEN`: long random secret used by `/login` and API write checks.
- `SABOT_TRUST_CF_ACCESS`: set to `true` only after Cloudflare Access policies protect the same admin/API routes listed below.

Do not set `SABOT_TRUST_CF_ACCESS=true` unless Cloudflare Access is active. Cloudflare Access identity headers are only trustworthy when Access is enforcing the route before the request reaches Pages Functions.

## Cloudflare Access Policies

In Cloudflare Zero Trust, create an Access application for `sabot.media` and protect these path groups.

Admin application:

- `/admin*`
- `/wp-admin*`
- `/printlab*`
- `/content*`
- `/posts*`
- `/add-new*`
- `/post-new*`
- `/native-bridge*`
- `/native-preview*`
- `/media*`
- `/settings*`
- `/customize*`
- `/site-editor*`
- `/advanced-draft-tools*`
- `/tools*`
- `/users*`
- `/pages*`
- `/menus*`
- `/sites*`
- `/podcasts*`
- `/draft*`
- `/review*`
- `/overrides*`

Write API application:

- `/api/public-site-config*`
- `/api/native-content*`
- `/api/native-content-revisions*`
- `/api/native-content-sources*`
- `/api/native-content-taxonomy*`
- `/api/media-assets*`
- `/api/taxonomy*`
- `/api/editor-roles*`
- `/api/publications*`
- `/api/audit-log*`

Policy recommendation:

- Allow only named editor/admin emails or a dedicated editor group.
- Require an identity provider login.
- Enable MFA where available.
- Keep public read routes outside this Access application.

After Access is active for these paths, set `SABOT_TRUST_CF_ACCESS=true`.

## Server-Side Protection in Repo

`functions/_middleware.js` blocks:

- Direct requests to admin/editor routes without server-recognized auth.
- `POST`, `PUT`, `PATCH`, and `DELETE` requests under `/api/*` without auth.

Individual write endpoints also call `resolvePublicSitePermission()` before saving, publishing, uploading, or deleting.

Write endpoints:

- `PUT /api/public-site-config`
- `POST|PUT|DELETE /api/native-content`
- `POST /api/native-content-revisions`
- `POST|DELETE /api/native-content-sources`
- `POST|DELETE /api/native-content-taxonomy`
- `POST|DELETE /api/media-assets`
- `POST|DELETE /api/taxonomy`
- `POST|DELETE /api/editor-roles`
- `POST|PUT /api/publications`
- `POST /api/audit-log`

Native content draft/future reads are also gated: `includeFuture=1` only works when edit permission is valid.

## Frontend Behavior

- `/login` and `/wp-login` accept the `SABOT_ADMIN_TOKEN`.
- Authenticated editors see the public admin toolbar.
- Unauthenticated visitors do not see Edit Site controls.
- `?edit=site` redirects unauthenticated visitors to `/login`.
- Logout clears the saved token from the browser.

## Known Limitations

- The token login is a fallback, not a full user-management system.
- Direct hard refreshes of protected static admin URLs are best protected by Cloudflare Access. A browser token stored in `localStorage` is not sent to the server during document navigation.
- Cloudflare Access is the production-grade route gate. Keep it enabled for admin routes and write APIs.

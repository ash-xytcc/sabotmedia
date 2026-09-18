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

Admin, editing, CMS, media, and Printlab routes are protected by server-side middleware and API permission checks.

## Auth Architecture

The app supports two server-recognized editor identities:

1. A Sabot signed session cookie created by `/api/login`.
2. A Cloudflare Access identity header, only when `SABOT_TRUST_CF_ACCESS=true`.

Frontend state is not trusted for authorization. Public toolbar visibility is only UI; Pages middleware and every write API validate the request server-side.

## Login Flow

1. An editor visits `/login` or `/wp-login`.
2. The browser submits the entered token to `POST /api/login`.
3. The server compares it with `SABOT_ADMIN_TOKEN`.
4. If it matches, the server signs a session with `SABOT_SESSION_SECRET`.
5. The response sets an HttpOnly `sabot_session` cookie.
6. The frontend checks `GET /api/session` to decide whether to show editor/admin UI.

The admin token is never returned to the frontend after login and is not stored in `localStorage` or `sessionStorage`.

## Cookie Settings

The `sabot_session` cookie is configured as:

- `HttpOnly`
- `Secure` on HTTPS requests
- `SameSite=Lax`
- `Path=/`
- `Max-Age=604800` by default

Set `SABOT_SESSION_TTL_SECONDS` to override the lifetime. The default is 7 days.

## Logout

`POST /api/logout` clears the `sabot_session` cookie and the frontend immediately drops local authenticated state.

## Required Environment Variables

Set these in Cloudflare Pages project settings:

- `SABOT_ADMIN_TOKEN`: long random login secret editors type into `/login`.
- `SABOT_SESSION_SECRET`: long random HMAC signing secret for session cookies.

Optional:

- `SABOT_SESSION_TTL_SECONDS`: positive integer session lifetime in seconds. Defaults to `604800`.
- `SABOT_TRUST_CF_ACCESS`: set to `true` only after Cloudflare Access policies protect the admin/API routes listed below.

Rotate `SABOT_SESSION_SECRET` to invalidate all active Sabot sessions.

## Server-Side Protection in Repo

`functions/_middleware.js` blocks:

- Direct requests to admin/editor routes without server-recognized auth.
- `POST`, `PUT`, `PATCH`, and `DELETE` requests under `/api/*` without auth, except `/api/login`, `/api/logout`, and `/api/session`.

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

## Cloudflare Access Compatibility

Cloudflare Access can be layered on later without changing the app flow. When Access protects a request and `SABOT_TRUST_CF_ACCESS=true`, `resolvePublicSitePermission()` accepts the `cf-access-authenticated-user-email` header as an authenticated editor identity.

Do not set `SABOT_TRUST_CF_ACCESS=true` unless Cloudflare Access is active. Those identity headers are trustworthy only when Access enforces the route before the request reaches Pages Functions.

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

## Frontend Behavior

- `/login` and `/wp-login` submit the admin token to the server.
- Authenticated editors see the public admin toolbar.
- Unauthenticated visitors do not see Edit Site controls.
- `?edit=site` redirects unauthenticated visitors to `/login`.
- Editor API clients send same-origin cookies, not bearer tokens.

## Known Limits

- This is token-based editor login with signed sessions, not a full user management system.
- Session revocation is currently coarse-grained: rotate `SABOT_SESSION_SECRET` to invalidate all sessions before their expiration.
- Cloudflare Access remains recommended as an additional production route gate for admin tools.

# Sabot Media Project Status

## Completed Systems

- Public reading routes for home, archive, projects, project pages, posts, print views, and public info pages.
- Native CMS editing for posts, imported article promotion, media records, taxonomy, revisions, and audit log.
- Live public copy editing for navigation, footer, info pages, archive copy, homepage fallback copy, login copy, and not-found copy.
- Server-side editor authentication with signed HttpOnly session cookies.
- Public security page and hosted OpenPGP key.
- Featured-image article lead with per-post title display settings.
- Public print article layout with controls hidden in browser print.
- Admin QA checklist with route links and safe JSON exports.
- Sitewide `sabot.media` logo, favicons, app icons, and Open Graph image.

## Architecture Summary

- Frontend: React + Vite SPA.
- Routing: React Router in `src/App.jsx`, with legacy `/piece/*` redirects preserved.
- Public content: imported archive JSON plus native CMS content merged at runtime.
- Editable public copy: `editableContentRegistry` fields are resolved through public site config and saved via protected API endpoints.
- Persistence: public config and native content are loaded from backend APIs when available, with local scaffold fallback only for development/demo paths.
- Auth: `/api/login` validates `SABOT_ADMIN_TOKEN` and issues a signed `sabot_session` cookie using `SABOT_SESSION_SECRET`.
- Hosting/runtime: Cloudflare Pages Functions under `functions/api/*`.

## Known Limitations

- The live editor does not yet expose every visual setting inline; some post metadata and image settings are still edited through the CMS/admin screens.
- Login copy is configurable through the same public config model, but it is not inline-editable from the logged-out login screen.
- Cloudflare Access remains optional and should still be configured for additional production route protection.
- The JavaScript bundle is large; code splitting is a future performance task.
- Static `404.html` exists, but HTTP status behavior still depends on host routing configuration for direct unknown URLs.

## Recommended Next Milestones

- Add a dedicated metadata editor for public pages so title/description/social text can be managed without code.
- Add image pickers to live-editable public sections where images are currently controlled through admin settings.
- Split admin, Printlab, and public route bundles to reduce first-load JavaScript.
- Expand admin QA to record pass/fail notes for each route.
- Add automated smoke tests for route availability, auth redirects, post rendering, archive search, and print views.

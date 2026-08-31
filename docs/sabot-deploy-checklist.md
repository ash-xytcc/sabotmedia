# Sabot Deploy Checklist

## Required backend storage
Apply these D1 schemas before expecting full persistence:

- `db/public_site_config.sql`
- `db/native_public_content.sql`

## Required bindings
Set these in the deploy environment:

- `BF_DB`

## Required edit permission config
Use one of:

- `SABOT_ADMIN_TOKEN`
- or `PUBLIC_CONFIG_OPEN_EDIT=true`

Recommended:
- use `SABOT_ADMIN_TOKEN`
- do not leave public editing open in production

## Critical routes to verify after deploy

### Public
- `/`
- `/projects`
- `/updates`
- `/updates/:slug`
- `/piece/:slug`
- `/piece/:slug/print`

### Editorial/Admin
- `/admin`
- `/review`
- `/overrides`
- `/podcasts`
- `/native-bridge`
- `/draft`

## Critical loops to test
- public config load
- public config save
- native content create
- native content update
- native content publish
- native content delete
- updates route render
- homepage native highlights render
- review queue filtering
- podcast bridge copy/export behavior

## Recovery notes
If backend persistence is unavailable:
- native bridge falls back to local storage
- public config can still run in scaffold/fallback mode
- treat fallback data as temporary, not source of truth

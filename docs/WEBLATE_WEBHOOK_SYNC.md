# Weblate → Sabot automatic translation sync

Goal: remove manual JSON download/upload from the newsroom workflow while keeping Sabot as the final publication authority.

## Runtime contract

Hosted Weblate sends its Standard Webhooks `translation_completed` event to:

`POST https://sabot.media/api/weblate-webhook`

The endpoint must:

1. Verify `webhook-id`, `webhook-timestamp`, and `webhook-signature` using the Standard Webhooks HMAC-SHA256 construction and `WEBLATE_WEBHOOK_SECRET`.
2. Reject stale/replayed/invalid deliveries.
3. Only accept the configured Weblate project/component (`sabotpress` / `ai-server-called-paranoia` initially).
4. On `Translation completed`, fetch the original JSON translation file from Weblate REST API using `WEBLATE_API_TOKEN` and `GET /api/translations/{project}/{component}/{language}/file/`.
5. Import it into the existing D1 native translation record for the mapped Sabot article slug, preserving language, author/translator attribution, Weblate provenance URL, and setting status to `in_review`.
6. Never publish automatically. Editors still explicitly approve/publish in Sabot.
7. Record an audit entry and make duplicate webhook deliveries idempotent.

## Environment

- `WEBLATE_WEBHOOK_SECRET`: Standard Webhooks base64 secret generated/configured in Weblate.
- `WEBLATE_API_TOKEN`: Weblate API token used server-side only for fetching completed translation files.
- Optional: `WEBLATE_BASE_URL`, default `https://hosted.weblate.org`.

## Weblate configuration

Install the **Webhook** add-on on the component:

- URL: `https://sabot.media/api/weblate-webhook`
- event filter: custom
- event: `Translation completed`
- secret: same value stored as `WEBLATE_WEBHOOK_SECRET`

This deliberately imports completed translations as `in_review`, not `published`.

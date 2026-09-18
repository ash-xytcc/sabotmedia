# Native podcast hosting

Sabot Media's podcasts should originate in SabotPress: episode publishing, audio storage, artwork, RSS and download reporting. Acast becomes a migration source and temporary subscriber redirect only.

Implementation repository: `ash-xytcc/sabotmedia`. Carry this feature into the general SabotPress release later; do not modify `sabotmedia/sabotpress` as part of this rollout.

## Operator workflow

1. Open Podcasts in the admin. Each show has a Hosting & Analytics panel.
2. Confirm the production D1 binding `BF_DB` and R2 binding `SABOT_MEDIA_BUCKET` are present. Back up the database and media bucket using the existing backup workflow before migration.
3. Choose **Move hosting to SabotPress**. External synchronization is frozen for that show. The importer inventories source GUIDs and imports missing episodes without overwriting authored edits. The source must still be available for this initial inventory.
4. Leave the panel open while it copies audio and artwork one asset at a time. Pause or close it and resume later. Media is streamed into R2; deterministic object keys allow retries without recopying successful objects. Changes to episode JSON use compare-and-swap so concurrent editorial changes are preserved.
5. Cutover verifies the source inventory, local URLs, stored objects and audio sizes before marking the show native. Existing GUIDs, dates, revisions and episode identity are preserved. Old source URLs remain as provenance; they no longer control publishing.
6. Verify the actual outgoing feed, every enclosure/artwork URL, seeking, full downloads and one newly published episode on production. The hosted feed and website player use `/api/podcasts/audio?id=...`, which serves stored bytes rather than redirecting to Acast.
7. In the old host account, set a permanent redirect from each original RSS feed to its canonical Sabot RSS URL. Update/verify existing directory listings; do not create duplicate shows. Keep the redirect active through the subscriber transition. This requires access to Acast and any relevant directory accounts; the Sabot admin cannot change those accounts.
8. Export historical Acast analytics before closing that account. This implementation does not import historical reports. Do not call the migration complete until production assets and subscriber redirects have been verified.

## Publishing and analytics

Use the existing Episode Publisher to upload/select audio and artwork, set metadata, and publish to the website and RSS. A selected canonical audio asset now takes precedence over a stale imported delivery asset.

RSS and the website player use the same measured endpoint for native uploaded audio. Delivery supports GET, HEAD, valid byte ranges (including suffix ranges), ETags and If-Range. Draft/future/private visibility follows the existing public-content checks. The endpoint returns no-store so a CDN response cannot silently skip request accounting. Direct media-library URLs are unmeasured; published podcast links use the measured endpoint.

Reports show daily-client estimates and request totals for 7, 30 or 90 Pacific calendar days, per episode, using the `America/Los_Angeles` time zone so daylight-saving changes are handled automatically. Repeat range requests share one daily episode/client bucket. Known bots and HEAD requests are excluded. A secret-key HMAC of day, episode, IP and user agent is stored instead of raw IP or user agent. Records expire after 90 days. These are requests, not confirmed listens, completed transfers or IAB-certified downloads; preloads can count and podcast-app caching can hide listening. Analytics failures do not block audio delivery.

## Limits and recovery

Migration sources must return an audio/image MIME type and a positive Content-Length. Audio transfers are capped at 1 GB and artwork at 20 MB, with a three-minute per-file timeout. Remote URLs and each redirect undergo public-address validation. Unsupported sources require the original file to be uploaded through the existing media workflow. The existing browser upload endpoint has its own size/runtime limits; this change does not add multipart browser uploads.

Migration writes revisions before updating episode media. Failed copies do not replace playable source URLs. Original source URLs remain in asset provenance. Missing/trash source episodes block completeness rather than silently republishing deleted content. Feed ownership cannot be reset through ordinary settings saves. Finishing migration does not delete old-host files or cancel an account.

## General SabotPress release follow-up

Port the native hosting workflow, delivery endpoint, canonical-asset precedence fix, analytics and tests into the general software after the Sabot deployment is proven. Make canonical domain and storage adapters configurable for other operators. Add large multipart browser uploads, durable background migration jobs, historical analytics import/export and backup/restore integration for hosting state. Keep request estimates distinct from certified downloads; richer retention and aggregation should avoid persistent listener tracking.

## References

- Apple RSS requirements: https://podcasters.apple.com/support/823-podcast-requirements
- Apple feed migration: https://podcasters.apple.com/support/837-change-the-rss-feed-url
- R2 Worker storage API: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/

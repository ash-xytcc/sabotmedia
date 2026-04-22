# Media Assets Setup

This phase adds a first real media asset registry.

## Apply schema
Run:

- `db/media_assets.sql`

## Backend route
- `/api/media-assets`

## Current scope
This is an asset registry and picker layer, not full binary upload infrastructure.

Editors can:
- save asset metadata
- save reusable URLs
- set alt text
- set captions and credits
- pick assets into rich native content blocks

## Future expansion
Later phases can add:
- file upload storage
- image transformations
- foldering
- usage tracking

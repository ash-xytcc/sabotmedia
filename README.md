# Sabot Media Starter Base

A first-pass public site shell built to absorb the NoBlogs archive instead of forcing a hand rebuild of every piece.

## What this includes

- React + Vite public site shell
- Homepage with featured drop and latest imported pieces
- Reading mode piece page
- Experience mode toggle
- Print route
- WordPress XML importer that normalizes published posts into `src/content/pieces.imported.json`

## What this intentionally does not include yet

- Studio authoring
- Drive integration
- Whisper transcription
- Distribution routing
- Admin UI
- Podcast ingestion pipeline

That can come after the archive is rendering cleanly.

## Quick start

```bash
npm install
npm run import:wordpress -- sabotmedia.WordPress.2026-04-21.xml
npm run dev
```

If your XML file lives somewhere else:

```bash
npm run import:wordpress -- /absolute/path/to/export.xml
```

## Fonts

The CSS is already wired for three font roles:

- headline: `Griffos`
- body: `Vanilla Extract`
- accent: `Stamp`

Drop the actual font files into `src/assets/fonts/` and uncomment the `@font-face` blocks in `src/styles.css`.

## Import rules right now

- Imports only `post` entries with `publish` status
- Ignores ActivityPub actor noise like `ap_actor`, `ap_outbox`, and related plugin post types
- Pulls related PDF attachments by `post_parent`
- Maps categories into project lenses
- Leaves imported HTML intact enough to render fast

## Next sane step

Get this into your repo, run the importer against the XML export, and prove the public shell with the imported archive before building anything fancier.

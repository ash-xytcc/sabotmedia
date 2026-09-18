# FOIA Desk / public-records tracker

The FOIA Desk is a reusable investigation records ledger. Sabot files the canonical requests; public pages show what was sought, why it matters, status, correspondence, and released records.

## Routes

- Public API: `/api/public-records?investigation=<key>`
- Editor API view: `/api/public-records?view=admin&investigation=<key>`
- Protected editor: `/records-desk/editor`
- FOIA.gov metadata proxy: `/api/foia-directory`
- A/I public desk: injected into `/investigations/autistici-inventati/`

## Storage

D1 tables are defined in `db/public_records.sql` and are also created defensively by `functions/api/_lib/publicRecordsRuntimeSchema.js` when `/api/public-records` is first used. This keeps the feature deployable without a separate manual migration while retaining the SQL schema as the canonical reference.

Requests and released documents are generic enough for federal FOIA, state public-records laws, local requests, and other jurisdictions. `jurisdiction_type` and `records_law` are deliberately not federal-only.

Editor-only and public notes are stored separately. Exact request text can be withheld from the public desk until `request_text_public` is enabled.

## FOIA.gov metadata

FOIA.gov's public portal API currently exposes read-oriented agency component and request-form metadata. It requires an API key.

Set a server-side environment secret:

```
FOIA_GOV_API_KEY=<data.gov / FOIA.gov API key>
```

The key is used only by the Pages Function proxy and is never sent to browser code.

The editor can search components, load request-form metadata, and retain a verified official filing URL. The system does not assume a public third-party request-submission API exists.

## Filing workflow

1. Create or open a request in `/records-desk/editor`.
2. Verify the agency and component.
3. Load FOIA.gov request-form metadata where available.
4. Finish the request text.
5. Use **Copy Request Text**.
6. Use **Try Official Form** if an official filing URL has been verified.
7. If the government page refuses iframe framing, use **Open Official FOIA Form ↗**. This is the normal supported fallback.
8. After submission, enter the real filing date, tracking number, and status.
9. Upload acknowledgement letters, correspondence, denials, appeals, and responsive records through the existing Media Library upload path.
10. Add a public `what we learned` note when a response changes the investigation.

Sabot does not store or proxy government passwords, portal credentials, or requester identity details.

## Released files

The editor uses the existing `/api/media/files` endpoint and therefore inherits Sabot's file-size limit, MIME validation, R2 storage, filename sanitization, authentication requirement, and media registry/audit logging. Public-record metadata then associates the stored file with the relevant request.

## URL safety

Federal official-filing URLs must be HTTPS and use an official `.gov` host. Embedded credentials, localhost, and private-network hosts are rejected. Document URLs also require safe HTTPS targets.

## Initial A/I docket

The bundled A/I seed data contains scopes only. It intentionally does not invent component IDs, official filing URLs, filing dates, tracking numbers, acknowledgements, or released records. Those fields should be filled only after verification or actual filing.

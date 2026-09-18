export async function onRequestGet() {
  return new Response(page(), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}

function page() {
  const statuses = ['Researching','Drafting','Ready to file','Filed','Acknowledged','Processing','Clarification requested','Fee issue','Partial release','Records released','Denied','Appealed','Closed']
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FOIA Desk | Sabot Media</title>
<style>
:root{--ink:#191714;--paper:#f4efe4;--card:#fffdf8;--red:#a51d20;--green:#526a49;--gold:#c4a442;--line:#c6bba9;--muted:#716a60}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 Arial,sans-serif}a{color:inherit}.top{position:sticky;top:0;z-index:5;background:var(--ink);color:#fff;padding:14px 22px;display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid var(--red)}.top strong{letter-spacing:.12em}.top a{font-size:12px}.wrap{width:min(1400px,calc(100% - 32px));margin:28px auto 70px}.hero{display:grid;grid-template-columns:1.2fr .8fr;gap:30px;margin-bottom:28px}.hero h1{font-size:56px;line-height:.92;margin:0;text-transform:uppercase;letter-spacing:-.05em}.hero p{max-width:780px}.note{border-left:5px solid var(--gold);background:#e9dfc9;padding:16px}.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}.btn,button{border:2px solid var(--ink);background:var(--card);padding:9px 12px;font-weight:800;cursor:pointer}.primary{background:var(--red);color:white;border-color:var(--red)}.good{background:var(--green);color:white;border-color:var(--green)}.grid{display:grid;grid-template-columns:390px 1fr;gap:18px}.panel{background:var(--card);border:1px solid var(--line);box-shadow:5px 5px 0 rgba(30,25,18,.08)}.panel h2,.panel h3{margin:0;font-size:18px}.panel-head{padding:16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:10px;align-items:center}.requests{max-height:74vh;overflow:auto}.request-row{display:block;width:100%;padding:15px;border:0;border-bottom:1px solid var(--line);text-align:left;background:transparent}.request-row:hover,.request-row.active{background:#eee4d3}.request-row strong,.request-row .meta{display:block}.meta{color:var(--muted);font-size:12px}.status{display:inline-block;padding:4px 7px;background:var(--ink);color:white;font-size:10px;font-weight:900;text-transform:uppercase}.status[data-status="Ready to file"]{background:var(--gold);color:var(--ink)}.status[data-status="Filed"],.status[data-status="Acknowledged"],.status[data-status="Processing"]{background:var(--green)}.status[data-status="Denied"],.status[data-status="Appealed"]{background:var(--red)}form{padding:18px}.fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.full{grid-column:1/-1}label{display:block;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}input,select,textarea{width:100%;margin-top:5px;padding:9px;border:1px solid #9d9385;background:white;font:14px/1.4 Arial,sans-serif}textarea{min-height:110px;resize:vertical}.long{min-height:230px}.checks{display:flex;gap:18px;flex-wrap:wrap}.checks label{text-transform:none;font-size:13px}.checks input{width:auto}.filing{margin:16px 0;padding:16px;background:#171512;color:white}.filing h3{font-size:20px}.filing p{color:#ccc}.filing-actions{display:flex;gap:8px;flex-wrap:wrap}.filing a{display:inline-block;text-decoration:none;background:var(--gold);color:#171512;padding:10px 12px;font-weight:900}.docs{padding:18px;border-top:1px solid var(--line)}.doc{padding:11px 0;border-top:1px solid var(--line)}.message{padding:10px;margin:10px 0;display:none}.message.show{display:block}.message.ok{display:block;background:#dce8d7}.message.err{display:block;background:#efd5d4}.empty-state{padding:18px;color:var(--muted)}@media(max-width:900px){.grid,.hero{grid-template-columns:1fr}.hero h1{font-size:42px}.fields{grid-template-columns:1fr}.full{grid-column:auto}.requests{max-height:none}}
</style>
</head>
<body>
<header class="top"><strong>SABOT MEDIA · FOIA DESK</strong><nav><a href="/wp-admin/campaigns">Campaigns</a> · <a href="/investigations/autistici-inventati/">A/I investigation ↗</a></nav></header>
<main class="wrap">
<section class="hero"><div><h1>Public Records Desk</h1><p>Prepare, file, track, and publish the paper trail for Sabot investigations.</p></div><aside class="note"><strong>Official filing stays official.</strong><br>Sabot keeps the canonical request and tracking record. Filing opens the verified government form rather than storing government credentials.</aside></section>
<div class="toolbar"><label>Investigation <input id="investigation" value="autistici-inventati"></label><button type="button" id="reload">Reload</button><button type="button" class="primary" id="new">+ New request</button></div>
<div id="message" class="message">Loading records desk…</div>
<div class="grid">
<section class="panel"><div class="panel-head"><h2>Requests</h2><span id="count" class="meta">Loading…</span></div><div id="requests" class="requests"><div class="empty-state">Loading requests…</div></div></section>
<section class="panel"><div class="panel-head"><h2 id="editor-title">Request editor</h2></div>
<form id="form"><input type="hidden" name="id"><div class="fields">
<label>Internal title<input name="internalTitle"></label><label>Public title<input name="publicTitle"></label>
<label class="full">Why this matters<textarea name="whyItMatters"></textarea></label><label class="full">Records sought<textarea name="recordsSought"></textarea></label>
<label>Jurisdiction<select name="jurisdictionType"><option value="federal">Federal FOIA</option><option value="state">State</option><option value="local">Local</option><option value="other">Other</option></select></label><label>Records law<input name="recordsLaw" value="FOIA"></label>
<label>Agency<input name="agencyName"></label><label>Agency abbreviation<input name="agencyAbbreviation"></label>
<label>Agency component<input name="agencyComponentName"></label><label>FOIA.gov component ID<input name="agencyComponentId"></label>
<label class="full">Official filing URL<input name="officialFilingUrl" placeholder="https://..."></label>
<label>Date range<input name="dateRange"></label><label>Preferred format<input name="preferredFormat" value="Electronic records in native format where available"></label>
<label class="full">Request text<textarea class="long" name="requestText"></textarea></label>
<label class="full">Fee waiver language<textarea name="feeWaiverLanguage"></textarea></label><label class="full">Expedited processing language (optional)<textarea name="expeditedProcessingLanguage"></textarea></label>
<label>Date filed<input type="date" name="dateFiled"></label><label>Tracking number<input name="trackingNumber"></label>
<label>Status<select name="status">${statuses.map((status) => `<option>${status}</option>`).join('')}</select></label><label>Sort order<input type="number" name="sortOrder" value="0"></label>
<label class="full">Public notes / what the response means<textarea name="publicNotes"></textarea></label><label class="full">Internal notes<textarea name="internalNotes"></textarea></label>
<div class="full checks"><label><input type="checkbox" name="isPublic" checked> Show request on public desk</label><label><input type="checkbox" name="requestTextPublic"> Publish exact request text</label></div>
</div>
<div class="filing"><h3>Official filing</h3><p>Copy the final request, then file it through the official government form.</p><div class="filing-actions"><button type="button" id="copy" class="good">Copy Request Text</button><a id="official-link" href="https://www.foia.gov/agency-search.html" target="_blank" rel="noreferrer">Open Official FOIA Form ↗</a></div></div>
<button class="primary" type="submit">Save request</button>
</form>
<section class="docs"><div class="panel-head"><h3>Correspondence & released records</h3></div><div id="documents"><p class="meta">Select a request to view attached records.</p></div></section>
</section>
</div>
</main>
<script src="/foia-desk.js" defer></script>
</body></html>`
}

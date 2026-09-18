// Repository-hosted editions accompany the relevant public surface without changing authored bodies.
const catalanEdition = 'https://vfc.codeberg.page/Fanzinamel/'
const catalanZineSlugs = new Set(['server-called-paranoia', 'the-server-called-paranoia', 'zine-the-server-called-paranoia-defend-autistici-inventati-before-september-25'])
const catalanZinePostSlugs = new Set(['zine-the-server-called-paranoia-defend-autistici-inventati-before-september-25'])

export function zineSupplementHtml(slug) {
  if (!catalanZineSlugs.has(slug)) return ''
  return `<section id="server-called-paranoia-editions" aria-labelledby="server-called-paranoia-editions-title" style="margin:1.5rem 0;padding:1rem;border:1px solid currentColor;max-width:100%;box-sizing:border-box">
<h2 id="server-called-paranoia-editions-title">Other editions of this zine</h2>
<p>A Catalan edition of the zine is now available to read online.</p>
<p><a href="${catalanEdition}" target="_blank" rel="external noopener noreferrer">Read the Catalan edition · Català</a></p>
</section>`
}

export function articleSupplementHtml(slug) {
  if (catalanZinePostSlugs.has(slug)) return zineSupplementHtml(slug)
  if (slug !== 'ai-shuts-down') return ''
  const pdf = '/downloads/thousand-server-black-wave-collective.pdf'
  return `<section id="thousand-server-zine" aria-labelledby="thousand-server-zine-title" style="margin:1.5rem 0;padding:1rem;border:1px solid currentColor;max-width:100%;box-sizing:border-box">
<h2 id="thousand-server-zine-title">Thousand Server: the zine</h2>
<p>This article is now a zine. Text by Sabot Media; layout by Black Wave Collective. Read it, print it, pass it on.</p>
<p>English · 19 pages · A4 · PDF, 6.9 MB</p>
<p><a href="${pdf}" download="Thousand-Server-Black-Wave-Collective.pdf">Download the zine</a> · <a href="${pdf}" target="_blank" rel="noopener">Open PDF</a></p>
<details><summary>Read the zine here</summary>
<p>If the reader does not display on your device, use the open or download link above.</p>
<iframe src="${pdf}#page=1" title="Thousand Server zine by Sabot Media and Black Wave Collective" loading="lazy" style="display:block;width:100%;max-width:100%;height:70vh;min-height:320px;border:0"></iframe>
</details>
</section>`
}

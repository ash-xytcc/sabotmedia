// Repository-hosted editions accompany the article without changing its authored body.
export function articleSupplementHtml(slug) {
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

import { getBoundDb } from './api/_lib/database.js'
import { ABERDEEN_1312_GALLERY, getGallery } from './api/_lib/galleries.js'

export async function onRequestGet(context) {
  const db = getBoundDb(context)
  if (!db) return page('Gallery temporarily unavailable', '<p>The gallery database is unavailable.</p>', 503)
  try {
    const gallery = await getGallery(db, ABERDEEN_1312_GALLERY.slug)
    if (!gallery) return page(ABERDEEN_1312_GALLERY.title, '<p>This historical gallery has not been migrated yet.</p>', 404)
    const items = gallery.items.filter((item) => item.url)
    const cards = items.map((item, index) => `<figure class="gallery-card">
      <button class="gallery-image-button" type="button" data-index="${index}" aria-label="Open ${escapeHtml(item.altText || item.title || `image ${index + 1}`)}">
        <img loading="lazy" src="${escapeAttr(item.url)}" alt="${escapeAttr(item.altText || item.title || '')}">
      </button>
      ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}
    </figure>`).join('')
    const content = `<header class="gallery-header"><p class="eyebrow">Sabot Media archive / AL1312</p><h1>${escapeHtml(gallery.title)}</h1>
      <p>${escapeHtml(gallery.description || 'Historical image archive from Aberdeen Local 1312.')}</p>
      <p class="gallery-meta">${items.length} of ${gallery.expectedItemCount || items.length} images migrated${gallery.complete ? '' : ' · migration still in progress'}.</p>
      <p><a href="/">← Sabot Media</a> · <a href="/archive">Archive</a></p></header>
      <section class="gallery-grid" aria-label="${escapeAttr(gallery.title)}">${cards || '<p>No images have been migrated yet.</p>'}</section>
      <dialog id="lightbox"><button id="close" type="button" aria-label="Close image">×</button><button id="prev" type="button" aria-label="Previous image">‹</button><figure><img id="lightbox-image" alt=""><figcaption id="lightbox-caption"></figcaption></figure><button id="next" type="button" aria-label="Next image">›</button></dialog>
      <script type="application/json" id="gallery-data">${safeJson(items.map((item) => ({ url: item.url, altText: item.altText || item.title || '', caption: item.caption || '' })))}</script>
      <script>${clientScript()}</script>`
    return page(gallery.title, content, 200)
  } catch (error) {
    return page('Gallery temporarily unavailable', `<p>${escapeHtml(String(error?.message || error))}</p>`, 500)
  }
}

function page(title, content, status) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | Sabot Media</title><meta name="description" content="Historical Aberdeen Local 1312 image gallery from the Sabot Media archive."><style>
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#efefea;color:#171717;font:16px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.gallery-header{max-width:1220px;margin:0 auto;padding:48px 24px 26px}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.75rem}.gallery-header h1{font-size:clamp(2rem,5vw,4.5rem);line-height:.95;margin:.25em 0}.gallery-header a{color:inherit}.gallery-meta{font-size:.9rem;color:#555}.gallery-grid{max-width:1500px;margin:0 auto;padding:0 18px 60px;columns:4 260px;column-gap:14px}.gallery-card{break-inside:avoid;margin:0 0 14px;background:white;border:1px solid #c7c7c0}.gallery-image-button{display:block;width:100%;border:0;padding:0;background:transparent;cursor:zoom-in}.gallery-card img{display:block;width:100%;height:auto}.gallery-card figcaption{padding:10px 12px;font-size:.86rem}dialog{width:min(96vw,1400px);height:min(96vh,1000px);padding:0;border:0;background:#111;color:#fff}dialog::backdrop{background:rgba(0,0,0,.86)}dialog figure{height:100%;margin:0;display:grid;grid-template-rows:minmax(0,1fr) auto;place-items:center;padding:28px 70px}dialog img{max-width:100%;max-height:calc(96vh - 100px);object-fit:contain}dialog figcaption{padding:12px;text-align:center}#close,#prev,#next{position:absolute;border:0;background:rgba(0,0,0,.6);color:#fff;font-size:2.25rem;cursor:pointer;z-index:2}#close{right:14px;top:10px;width:48px;height:48px}#prev,#next{top:50%;transform:translateY(-50%);width:54px;height:80px}#prev{left:8px}#next{right:8px}@media(max-width:700px){.gallery-header{padding-top:30px}.gallery-grid{columns:2 145px;padding-inline:8px;column-gap:8px}.gallery-card{margin-bottom:8px}dialog figure{padding:55px 10px 65px}#prev,#next{top:auto;bottom:6px;height:48px}}
</style></head><body>${content}</body></html>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': status === 200 ? 'public, max-age=60, s-maxage=300' : 'no-store' } })
}

function clientScript() {
  return `(()=>{const data=JSON.parse(document.getElementById('gallery-data').textContent||'[]');const d=document.getElementById('lightbox');const img=document.getElementById('lightbox-image');const cap=document.getElementById('lightbox-caption');let i=0;function show(n){if(!data.length)return;i=(n+data.length)%data.length;img.src=data[i].url;img.alt=data[i].altText||'';cap.textContent=data[i].caption||data[i].altText||'';if(!d.open)d.showModal()}document.querySelectorAll('.gallery-image-button').forEach(b=>b.addEventListener('click',()=>show(Number(b.dataset.index||0))));document.getElementById('close').onclick=()=>d.close();document.getElementById('prev').onclick=()=>show(i-1);document.getElementById('next').onclick=()=>show(i+1);d.addEventListener('click',e=>{if(e.target===d)d.close()});document.addEventListener('keydown',e=>{if(!d.open)return;if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1)});})();`
}
function safeJson(value) { return JSON.stringify(value).replace(/</g, '\\u003c') }
function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) }
function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;') }

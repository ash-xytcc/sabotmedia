const BODY_COPY_SELECTORS = [
  '.piece-body__content',
  '.piece-body__content p',
  '.piece-body__content li',
  '.piece-body__content blockquote',
  '.piece-body__content .post-body__paragraph',
  '.piece-body__content .post-body__block',
  '.piece-body__content .post-body__list',
  '.piece-body__content .post-body__list-item',
].join(',')

const DESCRIPTION_SELECTORS = [
  '.archive-card__excerpt',
  '.archive-card__excerpt p',
  '.project-hero__description',
  '.hero__excerpt',
  '.piece-card > p',
  '.piece-card__subtitle',
  '.publication-hero-card p',
  '.publication-post-card p',
  '.publication-card p',
  '.public-experience-panel p',
  '.missing-state p',
].join(',')

const BODY_HEADINGS = [
  ['.piece-body__content h1', '21px'],
  ['.piece-body__content h2, .piece-body__content .post-body__heading', '17px'],
  ['.piece-body__content h3', '15px'],
]

function important(node, property, value) {
  if (!node?.style) return
  node.style.setProperty(property, value, 'important')
}

function isMediaPost() {
  return document.body.classList.contains('is-sabot-preview-media') || /\b(zine|comic|comics|reader|manifesto|print|saboteurs)\b/i.test(decodeURIComponent(window.location.pathname || ''))
}

function setBodyCopy() {
  const mobile = window.matchMedia('(max-width: 720px)').matches
  const media = isMediaPost()
  const bodySize = media ? (mobile ? '12px' : '12.5px') : (mobile ? '12.5px' : '13px')

  document.querySelectorAll(BODY_COPY_SELECTORS).forEach((node) => {
    important(node, 'font-size', bodySize)
    important(node, 'line-height', media ? '1.46' : '1.5')
    important(node, 'letter-spacing', '0')
  })

  document.querySelectorAll(DESCRIPTION_SELECTORS).forEach((node) => {
    important(node, 'font-size', mobile ? '11px' : '11.5px')
    important(node, 'line-height', '1.4')
    important(node, 'letter-spacing', '0')
  })

  BODY_HEADINGS.forEach(([selector, desktopSize]) => {
    document.querySelectorAll(selector).forEach((node) => {
      const size = mobile
        ? selector.includes('h1') ? '19px' : selector.includes('h3') ? '14px' : '16px'
        : desktopSize
      important(node, 'font-size', size)
      important(node, 'line-height', '1.14')
    })
  })
}

function setLeadTitles() {
  const media = isMediaPost()
  const mobile = window.matchMedia('(max-width: 720px)').matches
  const size = media ? (mobile ? '17px' : '19px') : (mobile ? '24px' : '32px')

  document.querySelectorAll('.piece-article-lead__fallback h1, .piece-article-lead__title-below h1, .piece-article-lead__overlay h1').forEach((node) => {
    important(node, 'font-size', size)
    important(node, 'line-height', media ? '1.12' : '1.04')
    important(node, 'max-width', media ? '42ch' : '28ch')
    important(node, 'letter-spacing', media ? '0' : '-0.015em')
    important(node, 'overflow-wrap', 'normal')
    important(node, 'word-break', 'normal')
    important(node, 'hyphens', 'none')
  })

  if (media) {
    document.querySelectorAll('.piece-article-lead__eyebrow, .piece-article-lead__meta, .piece-article-lead__meta span').forEach((node) => {
      important(node, 'font-size', '10px')
      important(node, 'line-height', '1.3')
    })
    document.querySelectorAll('.piece-article-lead__title-below').forEach((node) => {
      important(node, 'margin-top', '10px')
      important(node, 'padding', '0')
    })
  }
}

function applyPublicTypeFix() {
  if (/^\/(wp-admin|admin|login|wp-login)/.test(window.location.pathname)) return
  setBodyCopy()
  setLeadTitles()
}

if (typeof window !== 'undefined') {
  const boot = () => {
    let queued = false
    const schedule = () => {
      if (queued) return
      queued = true
      window.requestAnimationFrame(() => {
        queued = false
        applyPublicTypeFix()
      })
    }

    applyPublicTypeFix()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', schedule, { passive: true })
    window.addEventListener('popstate', schedule)
    window.addEventListener('audiolab:navigation', schedule)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
}

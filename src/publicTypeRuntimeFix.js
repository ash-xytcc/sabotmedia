const BODY_COPY_SELECTORS = [
  '.piece-body__content p',
  '.piece-body__content li',
  '.piece-body__content blockquote',
  '.piece-body__content .post-body__paragraph',
  '.piece-body__content .post-body__block',
  '.piece-body__content .post-body__list-item',
].join(',')

const DESCRIPTION_SELECTORS = [
  '.archive-card__excerpt',
  '.project-hero__description',
  '.hero__excerpt',
  '.piece-card > p',
  '.piece-card__subtitle',
  '.public-experience-panel p',
  '.missing-state p',
].join(',')

const BODY_HEADINGS = [
  ['.piece-body__content h1', '21px'],
  ['.piece-body__content h2, .piece-body__content .post-body__heading', '18px'],
  ['.piece-body__content h3', '15px'],
]

function important(node, property, value) {
  if (!node?.style) return
  node.style.setProperty(property, value, 'important')
}

function setBodyCopy() {
  document.querySelectorAll(BODY_COPY_SELECTORS).forEach((node) => {
    important(node, 'font-size', '13px')
    important(node, 'line-height', '1.52')
    important(node, 'letter-spacing', '0')
  })

  document.querySelectorAll(DESCRIPTION_SELECTORS).forEach((node) => {
    important(node, 'font-size', '12px')
    important(node, 'line-height', '1.45')
    important(node, 'letter-spacing', '0')
  })

  BODY_HEADINGS.forEach(([selector, size]) => {
    document.querySelectorAll(selector).forEach((node) => {
      important(node, 'font-size', size)
      important(node, 'line-height', '1.16')
    })
  })
}

function setLeadTitles() {
  const isMedia = document.body.classList.contains('is-sabot-preview-media') || /\b(zine|comic|reader|manifesto|print)\b/i.test(window.location.pathname)
  const titleSize = isMedia ? '22px' : '38px'
  const mobileSize = isMedia ? '19px' : '30px'
  const size = window.matchMedia('(max-width: 720px)').matches ? mobileSize : titleSize

  document.querySelectorAll('.piece-article-lead__fallback h1, .piece-article-lead__title-below h1, .piece-article-lead__overlay h1').forEach((node) => {
    important(node, 'font-size', size)
    important(node, 'line-height', isMedia ? '1.08' : '1.02')
    important(node, 'max-width', isMedia ? '34ch' : '24ch')
    important(node, 'overflow-wrap', 'normal')
    important(node, 'word-break', 'normal')
    important(node, 'hyphens', 'none')
  })

  if (isMedia) {
    document.querySelectorAll('.piece-article-lead__eyebrow, .piece-article-lead__meta').forEach((node) => {
      important(node, 'font-size', '10px')
      important(node, 'line-height', '1.3')
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
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
}

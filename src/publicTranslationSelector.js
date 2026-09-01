const ARTICLE_TRANSLATIONS = {
  '/post/the-server-called-paranoia': {
    current: { code: 'en', label: 'English' },
    translations: [
      {
        code: 'es',
        label: 'Español',
        href: 'https://babelicosas.sutty.nl/2026/08/29/a-i-el-servidor-llamado-paranoia/',
        credit: 'Dazibao translation',
      },
      {
        code: 'fr',
        label: 'Français',
        href: 'https://nantes.indymedia.org/posts/168508/autistici-inventati-designe-organisation-terroriste-internationale-par-les-etats-unis/',
        credit: 'Collective translation via Indymedia Nantes',
      },
      {
        code: 'de',
        label: 'Deutsch',
        href: 'https://barrikade.info/article/7678',
        credit: 'German translation via Barrikade',
      },
    ],
  },
}

const SELECTOR_ATTR = 'data-sabot-language-selector'

function normalizedPathname() {
  return String(window.location.pathname || '/').replace(/\/+$/, '') || '/'
}

function clearStaleSelectors(pathname) {
  document.querySelectorAll(`[${SELECTOR_ATTR}]`).forEach((node) => {
    if (node.getAttribute(SELECTOR_ATTR) !== pathname) node.remove()
  })
}

function makeLanguageRow({ label, code, href = '', credit = '', current = false }) {
  const row = document.createElement(current ? 'span' : 'a')
  row.className = `piece-language-switcher__option${current ? ' is-current' : ''}`
  row.lang = code

  if (current) {
    row.setAttribute('aria-current', 'page')
  } else {
    row.href = href
    row.rel = 'external noopener'
    row.hreflang = code
    row.setAttribute('aria-label', `Read this article in ${label}`)
  }

  const labelNode = document.createElement('strong')
  labelNode.textContent = label
  row.appendChild(labelNode)

  const note = document.createElement('small')
  note.textContent = current ? 'Current language' : credit || 'Translation'
  row.appendChild(note)

  return row
}

function buildSelector(pathname, config) {
  const details = document.createElement('details')
  details.className = 'piece-language-switcher'
  details.setAttribute(SELECTOR_ATTR, pathname)

  const summary = document.createElement('summary')
  summary.className = 'piece-language-switcher__button'
  summary.setAttribute('aria-label', 'Choose article language')

  const buttonLabel = document.createElement('span')
  buttonLabel.textContent = 'Languages'
  summary.appendChild(buttonLabel)

  const count = document.createElement('span')
  count.className = 'piece-language-switcher__count'
  count.textContent = String(config.translations.length + 1)
  count.setAttribute('aria-hidden', 'true')
  summary.appendChild(count)

  const menu = document.createElement('div')
  menu.className = 'piece-language-switcher__menu'

  menu.appendChild(makeLanguageRow({ ...config.current, current: true }))
  config.translations.forEach((translation) => menu.appendChild(makeLanguageRow(translation)))

  details.append(summary, menu)
  return details
}

function refreshTranslationSelector() {
  const pathname = normalizedPathname()
  const config = ARTICLE_TRANSLATIONS[pathname]
  clearStaleSelectors(pathname)
  if (!config) return

  const mount = document.querySelector('.piece-article-lead__below')
  if (!mount || mount.querySelector(`[${SELECTOR_ATTR}]`)) return
  mount.appendChild(buildSelector(pathname, config))
}

let refreshQueued = false
function queueRefresh() {
  if (refreshQueued) return
  refreshQueued = true
  window.requestAnimationFrame(() => {
    refreshQueued = false
    refreshTranslationSelector()
  })
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const observer = new MutationObserver(queueRefresh)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', queueRefresh)
  window.addEventListener('pageshow', queueRefresh)
  queueRefresh()
}

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
const SELECTOR_SIGNATURE_ATTR = 'data-sabot-language-signature'
const LOCAL_TRANSLATION_ATTR = 'data-sabot-local-translation'
const ORIGINAL_HERO_ATTR = 'data-sabot-original-hero'
const ORIGINAL_META_ATTR = 'data-sabot-original-content'
const TRANSLATION_CACHE_TTL_MS = 30 * 1000
const translationCache = new Map()

function normalizedPathname() {
  return String(window.location.pathname || '/').replace(/\/+$/, '') || '/'
}

function slugFromPath(pathname) {
  const match = String(pathname || '').match(/^\/post\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : ''
}

function clearStaleSelectors(pathname) {
  document.querySelectorAll(`[${SELECTOR_ATTR}]`).forEach((node) => {
    if (node.getAttribute(SELECTOR_ATTR) !== pathname) node.remove()
  })
}

function isExternalHref(href) {
  try {
    const url = new URL(href, window.location.origin)
    return url.origin !== window.location.origin
  } catch {
    return false
  }
}

function makeLanguageRow({ label, code, href = '', credit = '', current = false }) {
  const row = document.createElement(current ? 'span' : 'a')
  row.className = `piece-language-switcher__option${current ? ' is-current' : ''}`
  row.lang = code

  if (current) {
    row.setAttribute('aria-current', 'page')
  } else {
    row.href = href
    if (isExternalHref(href)) row.rel = 'external noopener'
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

function selectorSignature(config) {
  return JSON.stringify({
    current: [config?.current?.code || '', config?.current?.label || ''],
    translations: (config?.translations || []).map((item) => [
      item?.code || '',
      item?.label || '',
      item?.href || '',
      item?.credit || '',
      item?.status || '',
    ]),
  })
}

function buildSelector(pathname, config) {
  const details = document.createElement('details')
  details.className = 'piece-language-switcher'
  details.setAttribute(SELECTOR_ATTR, pathname)
  details.setAttribute(SELECTOR_SIGNATURE_ATTR, selectorSignature(config))

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

async function loadNativeTranslations(pathname, { force = false } = {}) {
  const slug = slugFromPath(pathname)
  if (!slug) return null

  const now = Date.now()
  const cached = translationCache.get(slug)
  if (!force && cached && now - cached.fetchedAt < TRANSLATION_CACHE_TTL_MS) return cached.promise

  const request = fetch(`/api/native-translations?slug=${encodeURIComponent(slug)}`, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
    credentials: 'same-origin',
  })
    .then(async (response) => {
      if (!response.ok) return null
      const data = await response.json()
      return data?.ok ? data : null
    })
    .catch(() => null)

  translationCache.set(slug, { promise: request, fetchedAt: now })
  return request
}

function mergeTranslations(staticConfig, nativeData) {
  const current = staticConfig?.current || nativeData?.current || { code: 'en', label: 'English' }
  const merged = new Map()

  for (const item of staticConfig?.translations || []) {
    if (item?.code) merged.set(String(item.code).toLowerCase(), { ...item })
  }
  for (const item of nativeData?.translations || []) {
    if (!item?.code || !item?.href) continue
    const key = String(item.code).toLowerCase()
    merged.set(key, { ...(merged.get(key) || {}), ...item })
  }

  return { current, translations: Array.from(merged.values()) }
}

function safeUrl(value, { image = false } = {}) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('#') || raw.startsWith('/')) return raw
  try {
    const url = new URL(raw, window.location.origin)
    if (['http:', 'https:'].includes(url.protocol)) return url.href
    if (!image && ['mailto:', 'tel:'].includes(url.protocol)) return url.href
  } catch {
    return ''
  }
  return ''
}

function sanitizeTranslatedHtml(html) {
  const documentFragment = new DOMParser().parseFromString(String(html || ''), 'text/html')
  documentFragment.querySelectorAll('script, style, iframe, object, embed, form, input, button, textarea, select, meta, link').forEach((node) => node.remove())

  documentFragment.body.querySelectorAll('*').forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase()
      if (name.startsWith('on') || name === 'srcdoc') node.removeAttribute(attribute.name)
    }
    if (node.hasAttribute('href')) {
      const href = safeUrl(node.getAttribute('href'))
      if (href) node.setAttribute('href', href)
      else node.removeAttribute('href')
    }
    if (node.hasAttribute('src')) {
      const src = safeUrl(node.getAttribute('src'), { image: true })
      if (src) node.setAttribute('src', src)
      else node.removeAttribute('src')
    }
  })

  return documentFragment.body.innerHTML
}

function applyTranslatedHero(body) {
  const hero = document.querySelector('.piece-article-lead__image')
  if (!hero) return
  if (!hero.hasAttribute(ORIGINAL_HERO_ATTR)) {
    hero.setAttribute(ORIGINAL_HERO_ATTR, JSON.stringify({ src: hero.getAttribute('src') || '', alt: hero.getAttribute('alt') || '' }))
  }
  const heroImage = safeUrl(body?.heroImage, { image: true })
  if (heroImage) hero.setAttribute('src', heroImage)
  if (body?.heroImageAlt) hero.setAttribute('alt', String(body.heroImageAlt))
}

function applyTranslatedMeta(body, title) {
  const pairs = [
    ['meta[property="og:image"]', body?.socialImage || body?.heroImage],
    ['meta[name="twitter:image"]', body?.socialImage || body?.heroImage],
    ['meta[property="og:title"]', title],
    ['meta[name="twitter:title"]', title],
    ['meta[name="description"]', body?.seoDescription],
    ['meta[property="og:description"]', body?.seoDescription],
  ]
  for (const [selector, value] of pairs) {
    if (!value) continue
    const node = document.querySelector(selector)
    if (!node) continue
    if (!node.hasAttribute(ORIGINAL_META_ATTR)) node.setAttribute(ORIGINAL_META_ATTR, node.getAttribute('content') || '')
    node.setAttribute('content', String(value))
  }
}

function restoreOriginalMeta() {
  document.querySelectorAll(`[${ORIGINAL_META_ATTR}]`).forEach((node) => {
    node.setAttribute('content', node.getAttribute(ORIGINAL_META_ATTR) || '')
    node.removeAttribute(ORIGINAL_META_ATTR)
  })
}

function restoreOriginalHero() {
  const hero = document.querySelector(`.piece-article-lead__image[${ORIGINAL_HERO_ATTR}]`)
  if (!hero) return
  try {
    const original = JSON.parse(hero.getAttribute(ORIGINAL_HERO_ATTR) || '{}')
    if (original.src) hero.setAttribute('src', original.src)
    hero.setAttribute('alt', original.alt || '')
  } catch { /* keep current image if the marker is malformed */ }
  hero.removeAttribute(ORIGINAL_HERO_ATTR)
}

function applyLocalTranslation(translation) {
  if (!translation?.code || !translation?.translation) return false
  const body = translation.translation
  const title = String(body.title || '').trim()
  const bodyHtml = String(body.bodyHtml || '').trim()
  const sanitizedBodyHtml = bodyHtml ? sanitizeTranslatedHtml(bodyHtml) : ''
  const marker = `${translation.code}:${title.length}:${bodyHtml.length}:${String(body.heroImage || '').length}`
  const bodyMount = document.querySelector('.piece-body__content')
  const titleNodes = Array.from(document.querySelectorAll('.piece-article-lead h1'))
  const titleMatches = !title || (titleNodes.length > 0 && titleNodes.every((node) => node.textContent === title))
  const bodyMatches = !sanitizedBodyHtml || Boolean(bodyMount && bodyMount.innerHTML === sanitizedBodyHtml)

  if (document.documentElement.getAttribute(LOCAL_TRANSLATION_ATTR) === marker && titleMatches && bodyMatches) return true

  if (title) {
    titleNodes.forEach((node) => {
      if (node.textContent !== title) node.textContent = title
    })
    document.title = `${title} | Sabot Media`
  }

  if (sanitizedBodyHtml && bodyMount && bodyMount.innerHTML !== sanitizedBodyHtml) bodyMount.innerHTML = sanitizedBodyHtml
  if (!bodyMount && sanitizedBodyHtml) return false
  applyTranslatedHero(body)
  applyTranslatedMeta(body, title)

  document.documentElement.lang = translation.code
  document.documentElement.setAttribute(LOCAL_TRANSLATION_ATTR, marker)
  return true
}

function configForSelectedLanguage(pathname, baseConfig, nativeData) {
  const selectedCode = String(new URLSearchParams(window.location.search).get('lang') || '').toLowerCase()
  if (!selectedCode || selectedCode === 'en') {
    if (document.documentElement.hasAttribute(LOCAL_TRANSLATION_ATTR)) {
      restoreOriginalHero()
      restoreOriginalMeta()
      document.documentElement.removeAttribute(LOCAL_TRANSLATION_ATTR)
      document.documentElement.lang = 'en'
    }
    return baseConfig
  }

  const nativeTranslation = (nativeData?.translations || []).find((item) => String(item?.code || '').toLowerCase() === selectedCode)
  if (!nativeTranslation?.translation || !applyLocalTranslation(nativeTranslation)) return baseConfig

  const englishHref = pathname
  const alternatives = [
    {
      code: baseConfig.current.code || 'en',
      label: baseConfig.current.label || 'English',
      href: englishHref,
      credit: 'Original',
    },
    ...baseConfig.translations.filter((item) => String(item.code || '').toLowerCase() !== selectedCode),
  ]

  return {
    current: {
      code: nativeTranslation.code,
      label: nativeTranslation.label || nativeTranslation.code,
    },
    translations: alternatives,
  }
}

async function refreshTranslationSelector({ force = false } = {}) {
  const pathname = normalizedPathname()
  clearStaleSelectors(pathname)
  const staticConfig = ARTICLE_TRANSLATIONS[pathname]
  const nativeData = await loadNativeTranslations(pathname, { force })
  if (!staticConfig && !nativeData?.translations?.length) return

  const baseConfig = mergeTranslations(staticConfig, nativeData)
  const config = configForSelectedLanguage(pathname, baseConfig, nativeData)
  const mount = document.querySelector('.piece-article-lead__below')
  if (!mount) return

  const signature = selectorSignature(config)
  const existing = mount.querySelector(`[${SELECTOR_ATTR}]`)
  if (existing?.getAttribute(SELECTOR_SIGNATURE_ATTR) === signature) return

  const next = buildSelector(pathname, config)
  if (existing) existing.replaceWith(next)
  else mount.appendChild(next)
}

let refreshQueued = false
let forceRefreshQueued = false
function queueRefresh(force = false) {
  if (force) forceRefreshQueued = true
  if (refreshQueued) return
  refreshQueued = true
  window.requestAnimationFrame(() => {
    const forceThisRefresh = forceRefreshQueued
    refreshQueued = false
    forceRefreshQueued = false
    refreshTranslationSelector({ force: forceThisRefresh })
  })
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const observer = new MutationObserver(() => queueRefresh(false))
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', () => queueRefresh(true))
  window.addEventListener('pageshow', () => queueRefresh(true))
  window.addEventListener('focus', () => queueRefresh(true))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') queueRefresh(true)
  })
  queueRefresh(true)
}

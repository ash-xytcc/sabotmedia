const ACCEPT = 'audio/*,video/*,image/*,application/pdf'
const COMPOSER_INPUT = '.contributor-composer input[type="file"]'
const ATTACHMENT_IMAGE = '.contributor-bubble img[alt="Contributor attachment"]'

function enhanceContributorDocuments(root = document) {
  root.querySelectorAll?.(COMPOSER_INPUT).forEach((input) => {
    if (input.getAttribute('accept') !== ACCEPT) input.setAttribute('accept', ACCEPT)
  })

  root.querySelectorAll?.(ATTACHMENT_IMAGE).forEach((image) => {
    const src = String(image.getAttribute('src') || '')
    if (!isPdfUrl(src) || image.dataset.sabotDocumentHandled === '1') return
    const link = document.createElement('a')
    link.href = src
    link.target = '_blank'
    link.rel = 'noreferrer'
    link.className = 'contributor-document-link'
    link.textContent = documentLabel(src)
    image.dataset.sabotDocumentHandled = '1'
    image.replaceWith(link)
  })
}

function isPdfUrl(value) {
  try {
    const url = new URL(value, window.location.origin)
    const filename = String(url.searchParams.get('filename') || '')
    return /\.pdf$/i.test(filename) || /\.pdf(?:$|[?#])/i.test(url.pathname)
  } catch {
    return /\.pdf(?:$|[?#])/i.test(String(value || ''))
  }
}

function documentLabel(value) {
  try {
    const url = new URL(value, window.location.origin)
    return url.searchParams.get('filename') || 'Open attached PDF'
  } catch {
    return 'Open attached PDF'
  }
}

if (typeof document !== 'undefined') {
  enhanceContributorDocuments()
  const observer = new MutationObserver(() => enhanceContributorDocuments())
  observer.observe(document.documentElement, { childList: true, subtree: true })
}

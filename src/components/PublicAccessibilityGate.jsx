import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PublicAccessibilityPanel } from './PublicAccessibilityPanel'

const PRIVATE_PREFIXES = [
  '/admin', '/review', '/qa', '/content', '/posts', '/add-new', '/post-new', '/native-bridge', '/native-preview',
  '/podcasts', '/draft', '/overrides', '/system-backup', '/taxonomy', '/roles', '/audit-log', '/analytics',
  '/design-system', '/platform-map', '/media', '/pages', '/collections-admin', '/campaigns-admin', '/publications-admin',
  '/feeds-admin', '/users', '/menus', '/customize', '/site-editor', '/advanced-draft-tools', '/tools', '/site-health',
  '/printlab', '/audiolab', '/settings', '/sites', '/wp-admin', '/login', '/wp-login', '/logout', '/contribute/',
]

function isPrivateSurface(pathname) {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`))
}

function isGeneratedAccessibilityNode(node) {
  if (!(node instanceof Element)) return false
  return node.matches('[data-sabot-generated-image-description], .public-accessibility')
    || Boolean(node.closest('[data-sabot-generated-image-description], .public-accessibility'))
}

function mutationNeedsAccessibilityRefresh(mutation) {
  if (mutation.type === 'attributes') {
    return mutation.target instanceof Element
      && !isGeneratedAccessibilityNode(mutation.target)
      && ['alt', 'src', 'hidden', 'aria-hidden'].includes(mutation.attributeName)
  }
  if (mutation.type !== 'childList') return false
  if (mutation.target instanceof Element && isGeneratedAccessibilityNode(mutation.target)) return false
  const changed = [...mutation.addedNodes, ...mutation.removedNodes]
  if (!changed.length) return false
  return changed.some((node) => {
    if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent?.trim())
    return node instanceof Element && !isGeneratedAccessibilityNode(node)
  })
}

export function PublicAccessibilityGate() {
  const { pathname } = useLocation()
  const [contentRevision, setContentRevision] = useState(0)

  useEffect(() => {
    if (isPrivateSurface(pathname)) return undefined
    let observer = null
    let timer = 0
    let stopped = false

    const connect = () => {
      if (stopped) return
      const main = document.getElementById('main-content')
      if (!main) {
        timer = window.setTimeout(connect, 120)
        return
      }
      observer = new MutationObserver((mutations) => {
        if (!mutations.some(mutationNeedsAccessibilityRefresh)) return
        window.clearTimeout(timer)
        timer = window.setTimeout(() => setContentRevision((value) => value + 1), 120)
      })
      observer.observe(main, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['alt', 'src', 'hidden', 'aria-hidden'],
      })
    }

    connect()
    return () => {
      stopped = true
      observer?.disconnect()
      window.clearTimeout(timer)
    }
  }, [pathname])

  if (isPrivateSurface(pathname)) return null
  return <PublicAccessibilityPanel key={`${pathname}:${contentRevision}`} />
}

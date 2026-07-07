function findButtonByLabel(label) {
  const target = String(label || '').toLowerCase()
  return Array.from(document.querySelectorAll('button')).find((button) => {
    const text = `${button.getAttribute('aria-label') || ''} ${button.textContent || ''}`.toLowerCase()
    return text.includes(target)
  }) || null
}

function wirePrintlabSmartTools() {
  if (typeof document === 'undefined' || window.__printlabSmartToolWiring) return
  window.__printlabSmartToolWiring = true
  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button')
    if (!button || !/use in design/i.test(button.textContent || '')) return
    const card = button.closest('.print-lab-asset-card')
    const title = String(card?.querySelector('strong')?.textContent || card?.textContent || '').toLowerCase()
    if (!title.includes('magic splitter') && !title.includes('background remover')) return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation?.()
    if (title.includes('magic splitter')) {
      const splitButton = findButtonByLabel('poster split')
      if (splitButton) splitButton.click()
      return
    }
    window.alert('Background Remover needs a selected canvas image. The full cutout action is next.')
  }, true)
}

wirePrintlabSmartTools()

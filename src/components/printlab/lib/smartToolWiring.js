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
      window.dispatchEvent(new CustomEvent('printlab:split-selected-image', { detail: { rows: 2, columns: 2 } }))
      return
    }
    window.alert('Background Remover needs a selected canvas image. The full cutout action is next.')
  }, true)
}

wirePrintlabSmartTools()

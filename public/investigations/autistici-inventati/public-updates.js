(() => {
  const scripts = ['./public-updates-base.js', './antifawatch-update.js']

  function load(index) {
    if (index >= scripts.length) return
    const script = document.createElement('script')
    script.src = scripts[index]
    script.async = false
    script.addEventListener('load', () => load(index + 1), { once: true })
    script.addEventListener('error', () => load(index + 1), { once: true })
    document.head.appendChild(script)
  }

  load(0)
})()

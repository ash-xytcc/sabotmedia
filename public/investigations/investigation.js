// Compatibility shim for investigation URLs served without a trailing slash.
(() => {
  if (!document.querySelector('base')) {
    const base = document.createElement('base')
    base.href = '/investigations/autistici-inventati/'
    document.head.prepend(base)
  }

  const script = document.createElement('script')
  script.src = '/investigations/autistici-inventati/investigation.js'
  document.head.appendChild(script)
})()

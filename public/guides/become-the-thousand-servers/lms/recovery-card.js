import { encryptProgress, decryptProgress, parseCode, writeToken } from './recovery.js?v=card-1'
const STORAGE = 'sabot.course.recovery-card.v1'
export function mountRecoveryCard(getState, applyProgress) {
  const $ = (s) => document.querySelector(s)
  let meta = null, timer = null, busy = false, conflict = false, savedSnapshot = ''
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE) || 'null')
    if (value && Number.isInteger(value.revision)) { parseCode(value.code); meta = value }
  } catch { /* Local progress still works when recovery credentials cannot be read. */ }
  const status = (text) => { $('[data-recovery-status]').textContent = text }
  const persist = () => {
    try { localStorage.setItem(STORAGE, JSON.stringify(meta)) }
    catch { status('Print your card now. This browser cannot remember it for automatic backups.') }
  }
  const showCard = () => {
    if (!meta) return
    $('[data-card]').hidden = false
    $('[data-card-code]').textContent = meta.code
    $('[data-card-retention]').textContent = `Keep using this same card. The encrypted backup is retained for ${meta.retentionDays || 365} days after each successful update. Opening the course online renews it.`
    $('[data-backup]').textContent = 'Update backup / show my card'
    $('[data-print-card]').hidden = false
  }
  async function api(body) {
    const r = await fetch('/api/course-recovery', {method:'POST',credentials:'omit',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
    const data = await r.json()
    if (!r.ok) { const e = Error(data.error || 'Recovery unavailable'); e.status = r.status; throw e }
    return data
  }
  function schedule() {
    if (!meta || busy || timer || conflict) return
    if (JSON.stringify(getState()) !== savedSnapshot) status('Changes waiting for encrypted backup. Keep the course open and online; updates run within a minute. Use Update backup to save now.')
    timer = setTimeout(() => { timer = null; return backup(false) }, Math.max(3000, 60000 - (Date.now() - (meta.lastAt || 0))))
  }
  async function backup(manual = true) {
    if (busy || conflict) { if (conflict) status('Automatic backup paused: restore the newer backup before updating from this device. Export first to keep local changes.'); return }
    if (!crypto.subtle) { status('Recovery needs HTTPS. Export Progress still works.'); return }
    busy = true
    clearTimeout(timer); timer = null
    const snapshot = JSON.stringify(getState())
    try {
      if (!manual && snapshot === savedSnapshot && Date.now() - (meta?.lastAt || 0) < 86400000) return
      status('Encrypting and updating your recovery backup…')
      const encrypted = await encryptProgress(JSON.parse(snapshot), meta?.code)
      // Persist a new code before upload so an interrupted response cannot lose it.
      if (!meta) { meta = {code:encrypted.code,revision:0,lastAt:0}; persist() }
      const token = await writeToken(meta.code)
      let result
      try {
        result = await api({action:meta.revision ? 'update':'create',...encrypted.blob,writeToken:token,revision:meta.revision})
      } catch (e) {
        // A lost response may have committed our exact snapshot. Verify before adopting it.
        if (![400,409].includes(e.status)) throw e
        const remote = await api({action:'read',recoveryId:encrypted.blob.recoveryId})
        const plain = await decryptProgress(meta.code,remote.blob)
        if (JSON.stringify(plain) !== snapshot || !Number.isInteger(remote.revision)) { e.status = 409; throw e }
        result = {revision:remote.revision,retentionDays:meta.retentionDays || 365}
      }
      meta = {...meta,revision:result.revision,lastAt:Date.now(),retentionDays:result.retentionDays}
      savedSnapshot = snapshot
      persist(); showCard()
      status('Recovery backup saved. Your card and code stay the same. Changes back up automatically while this course is open and online.')
    } catch (e) {
      conflict = e.status === 409
      status(conflict ? 'Another device has a newer backup. Export your local progress, then restore the newer backup before continuing here.' : 'Backup not saved yet. Your local progress is safe. Keep this page open to retry, or export a copy.')
    } finally {
      busy = false
      if (meta && (JSON.stringify(getState()) !== savedSnapshot)) schedule()
    }
  }
  $('[data-backup]').onclick = () => backup(true)
  $('[data-restore]').onclick = () => {
    $('[data-recovery-panel]').hidden = false
    $('[data-recovery-code]').focus()
  }
  $('[data-fetch-recovery]').onclick = async () => {
    if (busy) return
    busy = true; clearTimeout(timer); timer = null
    try {
      const code = $('[data-recovery-code]').value.trim(), {id} = parseCode(code)
      const result = await api({action:'read',recoveryId:id})
      const next = await decryptProgress(code,result.blob)
      if (!applyProgress(next)) return
      conflict = false
      if (Number.isInteger(result.revision)) {
        meta = {code,revision:result.revision,lastAt:0,retentionDays:result.retentionDays || 365}
        savedSnapshot = JSON.stringify(getState()); persist(); showCard()
        status('Progress restored. This device will keep updating the same recovery card.')
      } else {
        meta = null; persist()
        status('Older snapshot restored. Create your reusable recovery card once to enable automatic updates.')
      }
      $('[data-recovery-code]').value = ''
    } catch { status('Could not restore. Check your code and connection. Existing local progress was not replaced.') }
    finally { busy = false; schedule() }
  }
  $('[data-print-card]').onclick = () => {
    if (!meta) return
    showCard()
    const page = window.open('', '_blank', 'width=850,height=700')
    if (!page) { status('Allow the print window, then select Print recovery card again.'); return }
    page.opener = null
    page.document.write('<!doctype html><html><head><title>Sabot recovery card</title><link rel="stylesheet" href="' + location.origin + '/guides/become-the-thousand-servers/lms/recovery-card.css?v=card-1"></head><body>' + $('[data-card]').outerHTML + '</body></html>')
    page.addEventListener('load', () => page.print(), {once:true})
    page.document.close()
  }
  if (meta) { showCard(); status('Your recovery card is connected. Automatic backup is enabled on this device.'); schedule() }
  if (location.hash === '#restore') $('[data-restore]').click()
  addEventListener('online', schedule)
  return {changed:schedule, detach() {clearTimeout(timer);timer=null;meta=null;conflict=false;persist();$('[data-card]').hidden=true;$('[data-print-card]').hidden=true;status('Local recovery connection removed. Your printed card can still restore the saved backup.')}}
}

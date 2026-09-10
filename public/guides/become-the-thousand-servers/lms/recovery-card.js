import { encryptProgress, decryptProgress, parseCode, writeToken } from './recovery.js?v=card-1'
const STORAGE = 'sabot.course.recovery-card.v1'
export function mountRecoveryCard(getState, applyProgress, canBackup = () => true) {
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)]
  let meta=null,timer=null,busy=false,conflict=false,savedSnapshot='',generation=0,lastAttemptAt=0
  try { const value=JSON.parse(localStorage.getItem(STORAGE)||'null'); if(value&&Number.isInteger(value.revision)){parseCode(value.code);meta=value} } catch { /* local progress remains independent */ }
  const timeText=()=>meta?.lastAt?`Last successful encrypted backup: ${new Date(meta.lastAt).toLocaleString()}.`:'No successful encrypted backup on this device yet.'
  const status=(text)=>{ $$('[data-recovery-status], [data-lesson-backup-status]').forEach((n)=>n.textContent=text); $$('[data-recovery-time], [data-lesson-backup-time]').forEach((n)=>n.textContent=timeText()) }
  const persist=()=>{ try{localStorage.setItem(STORAGE,JSON.stringify(meta))}catch{status('Print your card now. This browser cannot remember it for automatic backups.')} }
  const showCard=()=>{if(!meta)return;$('[data-card]').hidden=false;$('[data-card-code]').textContent=meta.code;$('[data-card-retention]').textContent=`Keep using this same card. The encrypted backup is retained for ${meta.retentionDays||365} days after each successful update. Opening the course online renews it only after an update succeeds.`;$('[data-backup]').textContent='Back up now / show my card';$('[data-print-card]').hidden=false;status('Recovery card connected. Changes are backed up automatically while this course is open and online.')}
  async function api(body){const r=await fetch('/api/course-recovery',{method:'POST',credentials:'omit',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),data=await r.json();if(!r.ok){const e=Error(data.error||'Recovery unavailable');e.status=r.status;throw e}return data}
  function exportConflict(){const url=URL.createObjectURL(new Blob([JSON.stringify(getState(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='become-the-thousand-servers-conflict-copy.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Local conflict copy downloaded. It contains this device’s notes and attempts. You can now restore the newer server backup without losing this copy.')}
  function conflictTools(){let button=document.querySelector('[data-preserve-conflict]');if(!button){button=document.createElement('button');button.type='button';button.dataset.preserveConflict='';button.textContent='Download this device’s copy';button.onclick=exportConflict;const panel=$('[data-recovery-panel]');panel?.before(button)}button.hidden=!conflict;if(conflict&&$('[data-recovery-panel]'))$('[data-recovery-panel]').hidden=false}
  function schedule(){if(!meta||busy||timer||conflict)return;if(JSON.stringify(getState())!==savedSnapshot)status('Changes are waiting for encrypted backup. Keep the course open and online; automatic updates run within a minute, or use Back up now.');timer=setTimeout(()=>{timer=null;return backup(false)},Math.max(3000,60000-(Date.now()-Math.max(meta.lastAt||0,lastAttemptAt))))}
  async function backup(manual=true){
    if(!canBackup()){status('Recovery paused because saved local progress could not be read. Import a known backup before updating recovery.');return}
    if(busy||conflict){if(conflict){status('Automatic backup paused because another device has a newer backup. Download this device’s copy, then restore the newer backup or keep working locally without overwriting it.');conflictTools()}return}
    if(!crypto.subtle){status('Recovery needs HTTPS. Export Progress still works.');return}
    busy=true;clearTimeout(timer);timer=null;const snapshot=JSON.stringify(getState()),operation=generation;lastAttemptAt=Date.now()
    try{
      if(!manual&&snapshot===savedSnapshot&&Date.now()-(meta?.lastAt||0)<86400000)return
      status('Encrypting and updating your recovery backup…')
      const encrypted=await encryptProgress(JSON.parse(snapshot),meta?.code)
      if(operation!==generation)return
      if(!meta){meta={code:encrypted.code,revision:0,lastAt:0};persist()}
      const token=await writeToken(meta.code);let result
      try{result=await api({action:meta.revision?'update':'create',...encrypted.blob,writeToken:token,revision:meta.revision})}
      catch(e){
        if(![400,409].includes(e.status))throw e
        const remote=await api({action:'read',recoveryId:encrypted.blob.recoveryId}),plain=await decryptProgress(meta.code,remote.blob)
        if(JSON.stringify(plain)!==snapshot||!Number.isInteger(remote.revision)){e.status=409;throw e}
        result={revision:remote.revision,retentionDays:meta.retentionDays||365}
      }
      if(operation!==generation)return
      meta={...meta,revision:result.revision,lastAt:Date.now(),retentionDays:result.retentionDays};savedSnapshot=snapshot;conflict=false;persist();showCard();conflictTools();status('Recovery backup saved. Your card and code stay the same. Changes back up automatically while this course is open and online.')
    }catch(e){if(operation!==generation)return;conflict=e.status===409;status(conflict?'Another device has a newer backup. Nothing on this device was discarded. Download this device’s copy, then restore the newer backup and compare/import deliberately.':'Backup not saved yet. Your local progress is safe. Keep this page open to retry, use Back up now, or export a copy.');conflictTools()}
    finally{busy=false;if(operation===generation&&meta&&(JSON.stringify(getState())!==savedSnapshot))schedule()}
  }
  $('[data-backup]').onclick=()=>backup(true);$$('[data-lesson-backup]').forEach((b)=>b.onclick=()=>backup(true))
  $('[data-restore]').onclick=()=>{$('[data-recovery-panel]').hidden=false;$('[data-recovery-code]').focus()}
  $('[data-fetch-recovery]').onclick=async()=>{
    if(busy)return;busy=true;clearTimeout(timer);timer=null;const operation=generation
    try{const code=$('[data-recovery-code]').value.trim(),{id}=parseCode(code),result=await api({action:'read',recoveryId:id}),next=await decryptProgress(code,result.blob);if(operation!==generation||!applyProgress(next))return;conflict=false;if(Number.isInteger(result.revision)){meta={code,revision:result.revision,lastAt:Date.now(),retentionDays:result.retentionDays||365};savedSnapshot=JSON.stringify(getState());persist();showCard();status('Progress restored. This device will keep updating the same recovery card.')}else{meta=null;persist();$('[data-card]').hidden=true;$('[data-print-card]').hidden=true;$('[data-backup]').textContent='Create my recovery card';status('Older snapshot restored. Create your reusable recovery card once to enable automatic updates.')}conflictTools();$('[data-recovery-code]').value=''}catch{status('Could not restore. Check your code and connection. Existing local progress was not replaced.')}finally{busy=false;schedule()}
  }
  $('[data-print-card]').onclick=()=>{if(!meta)return;showCard();const page=window.open('','_blank','width=850,height=700');if(!page){status('Allow the print window, then select Print recovery card again.');return}page.opener=null;page.document.write('<!doctype html><html><head><title>Sabot recovery card</title><link rel="stylesheet" href="'+location.origin+'/guides/become-the-thousand-servers/lms/recovery-card.css?v=card-1"></head><body>'+ $('[data-card]').outerHTML +'</body></html>');page.addEventListener('load',()=>page.print(),{once:true});page.document.close()}
  if(meta){showCard();savedSnapshot='';schedule()}else status('Remote backup is optional and currently off. Local progress still saves in this browser; export JSON if you want a portable copy.')
  if(location.hash==='#restore')$('[data-restore]').click();addEventListener('online',schedule)
  return {changed:schedule,detach(){generation++;clearTimeout(timer);timer=null;meta=null;conflict=false;persist();$('[data-card]').hidden=true;$('[data-print-card]').hidden=true;$('[data-card-code]').textContent='';$('[data-backup]').textContent='Create my recovery card';conflictTools();status('Local recovery connection removed. Your printed card can still restore the server backup until that backup expires.')}}
}

import { activityPassed } from './progress.js?v=blog-1'
export function pathwaySteps(c,path,choice) {
  const variant=path.variants.find((v)=>v.id===choice)
  return variant ? variant.steps.map((id)=>c.modules?.find((m)=>m.id===id&&m.status==='published')||{id,unavailable:true}) : []
}
export function pathwayComplete(c,state,path,choice) {
  const variant=path.variants.find((v)=>v.id===choice),steps=pathwaySteps(c,path,choice)
  return variant?.outcome==='recovery'&&steps.length>0&&steps.every((m)=>!m.unavailable&&m.activities.length>0&&m.activities.every((id)=>activityPassed(c,state,id)))
}
// Selection is navigation state; completion comes only from versioned activity attempts.
export function mountPathways(c,getState,save,refresh) {
  const elements=[...document.querySelectorAll('[data-pathway]')]
  function update() {
    for(const el of elements) {
      const p=c.pathways.find((p)=>p.id===el.dataset.pathway),s=getState(),saved=s.pathways[p.id]||{},variant=p.variants.find((v)=>v.id===saved.choice)
      const ids=variant?.steps||[...new Set(p.variants.flatMap((v)=>v.steps))],selected=ids.includes(saved.lastStep)?saved.lastStep:ids[0]
      const steps=variant?pathwaySteps(c,p,variant.id):[]
      const done=steps.filter((m)=>!m.unavailable&&m.activities.length&&m.activities.every((id)=>activityPassed(c,s,id))).length
      el.querySelector('[data-path-status]').textContent=variant?`${variant.title} · ${done}/${steps.length} steps self-confirmed. Recovery progress is separate from the broader course.`:'Choose a destination after reading the XML step. You can change your choice without deleting work.'
      el.querySelectorAll('[data-path-choice]').forEach((b)=>b.setAttribute('aria-pressed',String(b.dataset.pathChoice===saved.choice)))
      el.querySelectorAll('[data-path-step]').forEach((a)=>{a.hidden=!ids.includes(a.dataset.pathStep);a.setAttribute('aria-current',a.dataset.pathStep===selected?'step':'false')})
      el.querySelectorAll('[data-path-module]').forEach((m)=>{m.hidden=m.dataset.pathModule!==selected;const note=m.querySelector('[data-path-notes]');if(note&&document.activeElement!==note)note.value=saved.notes?.[m.dataset.pathModule]||''})
      const finished=pathwayComplete(c,s,p,saved.choice)
      el.querySelector('[data-path-success]').hidden=!finished
      const current=ids.indexOf(selected), nav=el.querySelector('[data-path-next]')
      nav.hidden=current>=ids.length-1
      nav.textContent=current===0&&!variant?'Next: choose a destination':'Next step'
      nav.onclick=()=>go(p,ids[current+1])
      el.querySelector('[data-path-position]').textContent=`Step ${current+1} of ${ids.length}${variant?'':' (all destinations shown until you choose)'}`
      el.querySelectorAll('[data-path-step]').forEach((a)=>{const id=a.dataset.pathStep,m=c.modules.find((m)=>m.id===id);const badge=a.querySelector('[data-step-status]');if(badge)badge.textContent=m?.activities.length&&m.activities.every((id)=>activityPassed(c,s,id))?' · done':''})
    }
  }
  function go(p,id) {
    const s=getState(); s.pathways[p.id]={...(s.pathways[p.id]||{}),lastStep:id}; save();update()
    const el=document.querySelector(`[data-pathway="${p.id}"]`),heading=el.querySelector(`[data-path-module="${id}"] h3`)
    heading?.focus();heading?.scrollIntoView({block:'start'})
  }
  for(const el of elements) {
    const p=c.pathways.find((p)=>p.id===el.dataset.pathway)
    el.querySelectorAll('[data-path-choice]').forEach((b)=>{b.onclick=()=>{const s=getState();s.pathways[p.id]={...(s.pathways[p.id]||{}),choice:b.dataset.pathChoice,lastStep:'blog-destination'};if(!p.variants.find((v)=>v.id===b.dataset.pathChoice).steps.includes('blog-destination'))s.pathways[p.id].lastStep=p.variants.find((v)=>v.id===b.dataset.pathChoice).steps[0];save();refresh()}})
    el.querySelectorAll('[data-path-step]').forEach((a)=>{a.onclick=(e)=>{e.preventDefault();go(p,a.dataset.pathStep)}})
    el.querySelectorAll('[data-path-notes]').forEach((n)=>{n.oninput=()=>{const s=getState(),saved=s.pathways[p.id]||{};s.pathways[p.id]={...saved,notes:{...(saved.notes||{}),[n.dataset.pathNotes]:n.value}};save()}})
    el.querySelectorAll('fieldset').forEach((f)=>f.disabled=false)
  }
  update();return {update}
}

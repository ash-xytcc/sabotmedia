import { resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { getBoundDb } from './_lib/database.js'
import { ensureCourseTables, readCourse, saveCourse, json, sameOrigin } from './_lib/courseStore.js'
import { SLUG, id } from '../../public/guides/become-the-thousand-servers/lms/model.js'
export async function onRequest(context) {
 try {
  const db=getBoundDb(context);if(!db)return json({ok:false,error:'Course storage unavailable'},503)
  const permission=await resolvePublicSitePermission(context),url=new URL(context.request.url),method=context.request.method
  const slug=id(url.searchParams.get('slug')||SLUG)
  if(method==='GET') {
   await ensureCourseTables(db)
   if(url.searchParams.has('revisions')) {
    if(!permission.canEdit)return json({ok:false,error:'Authentication required'},403)
    const rows=await db.prepare('SELECT * FROM course_revisions WHERE slug=? ORDER BY created_at DESC, version DESC LIMIT 100').bind(slug).all()
    return json({ok:true,items:rows.results||[]})
   }
   if(url.searchParams.get('list')==='1') {
    if(!permission.canEdit)return json({ok:false,error:'Authentication required'},403)
    const rows=await db.prepare('SELECT slug FROM course_content').all()
    const slugs=[...new Set([SLUG,...(rows.results||[]).map(r=>r.slug)])]
    const items=await Promise.all(slugs.map(async slug=>{const c=await readCourse(db,slug,true);return {slug,title:c.title,status:c.status,lessons:c.lessons.length}}))
    return json({ok:true,items})
   }
   const item=await readCourse(db,slug,permission.canEdit&&url.searchParams.get('edit')==='1')
   return item?json({ok:true,item,source:'d1',canEdit:permission.canEdit}):json({ok:false,error:'Course not found'},404)
  }
  if(!sameOrigin(context.request)||!permission.canEdit)return json({ok:false,error:'Authentication required'},403)
  if(!['PUT','POST','DELETE'].includes(method))return json({ok:false},405)
  const raw=await context.request.text();if(raw.length>1800000)return json({ok:false,error:'Course too large'},413)
  const body=JSON.parse(raw),input=body.item||body
  if(method==='DELETE') {
   if(!input.slug||input.slug===SLUG)return json({ok:false,error:'The seeded course cannot be deleted'},400)
   await ensureCourseTables(db)
   await db.batch([db.prepare('DELETE FROM course_content WHERE slug=?').bind(id(input.slug)),db.prepare('DELETE FROM course_publications WHERE slug=?').bind(id(input.slug))])
   return json({ok:true})
  }
  if(method==='POST'&&await readCourse(db,id(input.slug),true))return json({ok:false,error:'Course already exists'},409)
  const item=await saveCourse(db,input,permission)
  return json({ok:true,item,source:'d1',canEdit:true})
 } catch(error){return json({ok:false,error:error.message.startsWith('Conflict')?error.message:'Unable to save or load course. Check content and reload before retrying.'},400)}
}

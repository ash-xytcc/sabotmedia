export const encode=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
export const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))
export async function encryptProgress(state) {
 const id=encode(crypto.getRandomValues(new Uint8Array(32))),keyBytes=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12))
 const key=await crypto.subtle.importKey('raw',keyBytes,'AES-GCM',false,['encrypt'])
 const bytes=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(`sabot-course:1:${id}`)},key,new TextEncoder().encode(JSON.stringify(state))))
 // Chunk base64 conversion so a large notebook does not overflow the call stack.
 let binary='';for(const b of bytes)binary+=String.fromCharCode(b)
 return {code:`sabot1.${id}.${encode(keyBytes)}`,blob:{recoveryId:id,schemaVersion:1,iv:encode(iv),ciphertext:btoa(binary)}}
}
export function parseCode(code) {
 const parts=code.trim().split('.')
 if(parts.length!==3||parts[0]!=='sabot1'||!parts.slice(1).every(p=>/^[A-Za-z0-9_-]{43}$/.test(p)))throw Error('Invalid recovery code')
 return {id:parts[1],key:decode(parts[2])}
}
export async function decryptProgress(code,blob) {
 const p=parseCode(code)
 if(blob.recoveryId!==p.id||blob.schemaVersion!==1)throw Error('Recovery data does not match')
 const key=await crypto.subtle.importKey('raw',p.key,'AES-GCM',false,['decrypt'])
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(blob.iv),additionalData:new TextEncoder().encode(`sabot-course:1:${p.id}`)},key,decode(blob.ciphertext))
 return JSON.parse(new TextDecoder().decode(plain))
}

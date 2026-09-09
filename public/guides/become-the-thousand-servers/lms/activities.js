export function initialActivities(lessons) {
 const activities=lessons.flatMap(l=>[
  {id:`${l.slug}-verify`,type:'checklist',version:1,title:'Practical verification',prompt:l.test,status:'published',options:l.checks.map((label,i)=>({id:`check-${i+1}`,label})),answer:[],pairs:[],feedback:'Do the work in the disposable environment before confirming it.',sources:l.resources},
  {id:`${l.slug}-teach`,type:'teach-back',version:1,title:'Each one, teach one.',prompt:l.teach,status:'published',options:[],answer:[],pairs:[],feedback:'Keep the reflection here or in your own notebook.',sources:[]}
 ])
 const add=(id,type,title,prompt,options,answer,pairs=[])=>activities.push({id,type,version:1,title,prompt,options:options.map(([id,label])=>({id,label})),answer,pairs,feedback:'Use the lesson and its primary resources to check your reasoning, then try again if needed.',status:'published',sources:[]})
 add('dependency-choice','multiple-choice','Find the missing dependency','Only one person can recover the registrar account. What does the dependency map need to include?',[['person','That person and the recovery process'],['server','Only the web server']],['person'])
 add('dns-select','multiple-select','Read the records','Select the record types that point a hostname directly to an IP address.',[['a','A'],['aaaa','AAAA'],['mx','MX'],['txt','TXT']],['a','aaaa'])
 add('ssh-true-false','true-false','Choose a classroom','The production server is an appropriate place to practise destructive recovery exercises.',[['true','True'],['false','False']],['false'])
 add('request-sequence','ordered-sequence','Trace a request','Put this simplified request path in order. Assume the browser needs a fresh DNS lookup.',[['browser','Browser requests a hostname'],['file','Server reads the requested file'],['dns','DNS lookup returns an address'],['connect','Browser connects to the server']],['browser','dns','connect','file'])
 add('dns-match','matching','Who does what?','Match each term to its role.',[],[],[{left:'Registrar',right:'Controls the domain registration'},{left:'DNS host',right:'Answers queries about domain records'},{left:'Web server',right:'Serves the requested web content'}])
 add('exposure-reflection','short-reflection','Explain the exposure','Which ports did you find open, why are they reachable, and who maintains each service?',[],[])
 add('restore-practical','practical','Restore the backup','Rebuild the disposable service in a clean environment and verify that it works before confirming.',[],[])
 add('backup-scenario','troubleshooting','The backup exists. Does it work?','Your only backup file lives on the same machine as the service. What should you do before destroying that machine?',[['restore','Copy the recovery set independently and test a restore'],['delete','Destroy the machine and trust the backup filename']],['restore'])
 return activities
}

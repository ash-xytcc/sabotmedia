export function initialActivities(lessons) {
  const activityVersions = {
    'read-dns-verify': 2,
    'read-dns-teach': 2,
    'dns-select': 2,
    'dns-match': 2,
    'ssh-disposable-linux-verify': 2,
    'ssh-disposable-linux-teach': 2,
    'first-disposable-page-verify': 2,
    'first-disposable-page-teach': 2,
    'understand-exposure-verify': 2,
    'understand-exposure-teach': 2,
    'real-backup-verify': 2,
    'real-backup-teach': 2,
    'destroy-and-rebuild-verify': 2,
    'destroy-and-rebuild-teach': 2,
    'learn-to-leave-verify': 2,
    'learn-to-leave-teach': 2,
    'request-sequence': 2,
    'exposure-reflection': 2,
    'restore-practical': 2,
    'backup-scenario': 2,
    'stop-being-only-admin-verify': 2,
    'stop-being-only-admin-teach': 2,
    'mirror-publish-survival-verify': 2,
    'mirror-publish-survival-teach': 2,
    'local-network-verify': 2,
    'local-network-teach': 2,
    'connect-differently-teach-verify': 2,
    'connect-differently-teach-teach': 2,
  }
  const versionFor = (id) => activityVersions[id] || 1
  const activities = lessons.flatMap((l) => [
    {
      id: `${l.slug}-verify`,
      type: 'checklist',
      version: versionFor(`${l.slug}-verify`),
      title: 'Practical verification',
      prompt: l.test,
      status: 'published',
      options: l.checks.map((label, i) => ({ id: `check-${i + 1}`, label })),
      answer: [],
      pairs: [],
      feedback: 'Do the work in the disposable environment before confirming it.',
      sources: l.resources,
    },
    {
      id: `${l.slug}-teach`,
      type: 'teach-back',
      version: versionFor(`${l.slug}-teach`),
      title: 'Each one, teach one.',
      prompt: l.teach,
      status: 'published',
      options: [],
      answer: [],
      pairs: [],
      feedback: 'Keep the reflection here or in your own notebook.',
      sources: [],
    },
  ])
  const add = (id, type, title, prompt, options, answer, pairs = []) =>
    activities.push({
      id,
      type,
      version: versionFor(id),
      title,
      prompt,
      options: options.map(([id, label]) => ({ id, label })),
      answer,
      pairs,
      feedback: 'Use the lesson and its primary resources to check your reasoning, then try again if needed.',
      status: 'published',
      sources: [],
    })
  add(
    'dependency-choice',
    'multiple-choice',
    'Find the missing dependency',
    'Only one person’s account and recovery method can recover the registrar. What should the dependency map record?',
    [
      ['person', 'That person, the recovery path, and the single-person risk'],
      ['server', 'Only the web server, because the registrar is not on the request path'],
    ],
    ['person'],
  )
  add(
    'dns-select',
    'multiple-select',
    'Read the records',
    'Which record types map a DNS name directly to an IP address?',
    [
      ['a', 'A'],
      ['aaaa', 'AAAA'],
      ['cname', 'CNAME'],
      ['mx', 'MX'],
      ['txt', 'TXT'],
    ],
    ['a', 'aaaa'],
  )
  add(
    'ssh-true-false',
    'true-false',
    'Choose a classroom',
    'The production server is an appropriate place to practise destructive recovery exercises.',
    [
      ['true', 'True'],
      ['false', 'False'],
    ],
    ['false'],
  )
  add(
    'request-sequence',
    'ordered-sequence',
    'Trace a request',
    'Put this simplified HTTPS request path in order. Assume the browser needs a fresh DNS lookup.',
    [
      ['lookup', 'Client asks DNS for the hostname'],
      ['answer', 'DNS returns an address'],
      ['transport', 'Client establishes the network/TLS connection'],
      ['request', 'Client sends the HTTP request'],
      ['file', 'Web server returns the requested file'],
    ],
    ['lookup', 'answer', 'transport', 'request', 'file'],
  )
  add(
    'dns-match',
    'matching',
    'Who does what?',
    'Match each term to its role.',
    [],
    [],
    [
      { left: 'Registrar', right: 'Provides registrant-facing control of the domain registration' },
      { left: 'Registry', right: 'Operates the registration database for the top-level domain' },
      { left: 'Recursive resolver', right: 'Obtains and caches DNS answers for clients' },
      { left: 'Authoritative DNS', right: 'Publishes DNS data for a zone' },
      { left: 'Web host', right: 'Runs or serves the website or application' },
    ],
  )
  add(
    'exposure-reflection',
    'short-reflection',
    'Explain the exposure',
    'Which TCP and UDP listeners did you find, through which IPv4/IPv6 and firewall paths are they reachable, and who maintains each service?',
    [],
    [],
  )
  add(
    'restore-practical',
    'practical',
    'Restore the backup',
    'Restore the disposable service from an independent recovery copy into a clean environment, verify the data and service externally, and record the recovered point and elapsed recovery time before confirming.',
    [],
    [],
  )
  add(
    'backup-scenario',
    'troubleshooting',
    'The backup exists. Does it work?',
    'Your only backup file lives on the same machine as the service. What must happen before a destructive rebuild test?',
    [
      ['restore', 'Move a recovery set to an independent failure domain and successfully test a restore from it'],
      ['delete', 'Destroy the machine first because the backup job reported success'],
    ],
    ['restore'],
  )
  return activities
}

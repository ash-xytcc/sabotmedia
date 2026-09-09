// Draft interview prompts, not statements or answers attributed to these projects.
const prompts = {
  'autistici-inventati': [
    'What parts of your recovery planning held up when access to infrastructure disappeared?',
    'What would you want a smaller collective to understand before trusting a provider with its only copy?',
    'Inventory the independent copies and recovery paths for one service; identify what remains if its provider disappears.',
  ],
  riseup: [
    'How should a small collective decide which services to run itself and which to trust to others?',
    'What does useful account-recovery planning look like without concentrating power in one person?',
    'Map a collective’s email recovery dependencies without recording passwords or private messages.',
  ],
  'may-first-movement-technology': [
    'How can member participation change decisions about shared infrastructure?',
    'What knowledge needs to circulate beyond the people administering machines?',
    'Write an infrastructure decision that two non-administrators can explain and challenge.',
  ],
  systemli: [
    'What do you wish groups documented before asking for help moving a service?',
    'Which maintenance responsibilities are easiest for a new group to overlook?',
    'Prepare a migration inventory with versions, data, access holders, and a tested rollback plan.',
  ],
  immerda: [
    'How do you make continuity possible when a maintainer needs to step away?',
    'What should a group ask before depending on a shared service?',
    'Have a second person follow a service handover document and record every missing step.',
  ],
  sindominio: [
    'Where does infrastructure knowledge remain concentrated despite collective decision-making?',
    'What helps new people move from using infrastructure to helping maintain it?',
    'Draw a map of who knows what and pair a learner with someone outside the usual administrator circle.',
  ],
  chatons: [
    'What should someone compare when choosing between independent service providers?',
    'Which promises about portability can a learner actually test?',
    'Export a harmless test dataset and check whether a second service can use it.',
  ],
  koumbit: [
    'What information makes a request for migration help actionable?',
    'How do groups plan for ongoing maintenance when money and time are scarce?',
    'Write a one-page hosting and maintenance budget that includes people’s time and recovery work.',
  ],
  'electric-embers': [
    'How can a group tell whether it could leave a service before it urgently needs to?',
    'What should it independently preserve from its communications infrastructure?',
    'List the exports, DNS records, and administrator contacts needed for a provider change.',
  ],
  aktivix: [
    'What makes technical support teach someone instead of creating another dependency?',
    'Which assumptions about a learner’s equipment or prior knowledge most often get missed?',
    'Ask someone to follow a short troubleshooting guide and mark every unexplained term.',
  ],
  anarchaserver: [
    'What must an infrastructure guide understand about care, access, and who gets treated as technical?',
    'How can a group share maintenance without making care work invisible?',
    'Document both the technical and care tasks required to keep one shared service usable.',
  ],
  puscii: [
    'What would you teach somebody who has a machine but has never helped keep a shared service alive?',
    'Which practical skill most changes how a newcomer understands infrastructure?',
    'Choose a disposable service, document how to start and stop it, and have another person reproduce it.',
  ],
  bash: [
    'What changes for a learner when names, paths, and services work differently from the ordinary web?',
    'What should someone test locally before depending on an alternative network?',
    'Run a harmless local service and have a second device find it; document the transport and failure points.',
  ],
  rhizomatica: [
    'Which decisions about a communications network must remain with the people using it?',
    'What should an outsider learn before proposing a technical solution?',
    'Map one community communications need, available equipment, local knowledge, and who gets to decide.',
  ],
  'detroit-community-technology-project': [
    'What makes a network exercise useful to the people who live with the network?',
    'How do learners turn technical knowledge into something neighbours can use and teach?',
    'Create a local network troubleshooting sheet with someone who did not build the network.',
  ],
  sutty: [
    'What does publishing autonomy require beyond having a copy of a website?',
    'What should a learner preserve so another person can publish after the usual editor leaves?',
    'Hand a second person the files and instructions needed to publish a disposable page.',
  ],
  'distributed-press': [
    'What should a publisher test before calling a publication resilient?',
    'Where can distribution appear independent while retaining a shared point of failure?',
    'Compare two copies of a publication and trace which dependencies they still share.',
  ],
  'indymedia-nl': [
    'Which parts of a publishing archive are hardest to preserve meaningfully?',
    'What knowledge about moderation or publication would a backup of files fail to capture?',
    'Preserve a public article with its attachments and context, then verify it offline.',
  ],
  'the-final-straw-radio': [
    'What would another group need to keep an episode available if its usual distribution disappeared?',
    'Which metadata or production knowledge is most likely to be absent from an audio backup?',
    'Preserve a public episode, its description, transcript if available, and attribution; verify playback offline.',
  ],
  'it-s-going-down': [
    'How do you decide what reporting must remain independently available?',
    'What needs preserving besides the text when a source or platform disappears?',
    'Make a local preservation checklist for one public article, including sources, images, and context.',
  ],
  crimethinc: [
    'What makes a mirrored text usable rather than merely copied?',
    'How should a publisher preserve translations and links between editions?',
    'Compare a public text and a mirror, checking attribution, translation information, links, and print access.',
  ],
  submedia: [
    'What should someone preserve alongside a video so it stays accessible and understandable?',
    'Which dependencies in video distribution should a small group map first?',
    'Create an offline viewing copy of material you can redistribute, including captions and descriptive metadata.',
  ],
  kolektiva: [
    'Which responsibilities stay local even when media distribution is federated?',
    'What should someone test before depending on a federated video service?',
    'Map a public video’s hosting, federation, captions, and independent recovery copy.',
  ],
}
export function contributionDraft(id) {
  const [first, second, exercise] = prompts[id] || []
  return {
    sharedAnswer: '',
    questions: [first, second].filter(Boolean).map((question) => ({ question, answer: '' })),
    exercise: '',
    suggestedExercise: exercise || '',
    status: 'reporting needed',
  }
}

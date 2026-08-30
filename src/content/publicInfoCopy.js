const CURRENT_INFO_COPY_VERSION = 'v2'
const INFO_COPY_VERSIONS = { contact: 'v3' }

export const publicInfoCopy = {
  about: {
    eyebrow: 'about / collective / make trouble',
    title: 'About Sabot Media',
    body: `Sabot Media is an open collective of radical media makers rooted in Grays Harbor, Washington, and connected to struggles far beyond it.

We make independent reporting, analysis, essays, interviews, podcasts, comics, graphics, zines, newsletters, archives, and whatever other forms prove useful. We are interested in media as a tool: something that can document what is happening, carry ideas between people, preserve movement memory, sharpen an argument, make somebody laugh, or end up photocopied at 2 a.m. and passed hand to hand.

We are not a conventional newsroom and we are not trying to become one. Sabot is a meeting place for autonomous and overlapping projects, contributors, and experiments. A piece of reporting can become a podcast episode, a graphic, a workshop, a zine, or a stack of pages liberated from the office printer by the repeat offenders at Black Cat Distro. The point is not to funnel everything into one brand. The point is to let different forms strengthen each other without flattening the people making them.

Our politics are not hidden behind claims of neutrality. We come out of anarchist, anti-authoritarian, mutual-aid, labor, abolitionist, queer, and antifascist traditions. We care about the people living through a story more than institutions managing it. We are interested in power, who has it, who pays for it, how people resist it, and what they build together instead.

We are especially interested in the rural edge. Grays Harbor is not scenery behind our work. It is a place where organizing, poverty, extraction, isolation, mutual aid, labor, ecology, addiction, policing, housing, and survival all collide in ways national media usually notices only when something catches fire. We want rural communities speaking for themselves and in direct conversation with organizers elsewhere.

Sabot is also an archive. Movements forget things because websites disappear, social platforms collapse, accounts get banned, servers die, people burn out, and paper gets lost. Preserving radical work is part of publishing it. We want what we make to remain readable, printable, searchable, shareable, and difficult to quietly erase.

Read it. Print it. Share it. Argue with it. Build on it. Send us what we are missing. Media becomes useful when it leaves our hands.`,
  },

  contact: {
    eyebrow: 'contact / tips / correspondence',
    title: 'Contact Sabot',
    body: `Sabot Media is a small collective, not a customer-service department, so the best way to get a useful reply is to tell us what you are writing about and what you need.

If you are contacting us about a particular project, article, podcast, zine, or contributor, name it in the subject or first line. If there is a deadline, tell us. If you are correcting something we published, include the URL and the specific claim you believe is wrong.

For ordinary correspondence, ordinary email is fine. The encrypted form below is available for general messages that should not travel as readable email. For more sensitive material, source protection, anonymity, or file-safety guidance, read our Security page before sending anything:
https://sabot.media/security

We would rather receive a careful message later than a dangerous one quickly.`,
  },

  submit: {
    eyebrow: 'submit / contribute / bring us something',
    title: 'Submit Work',
    body: `Sabot Media wants work with a reason to exist.

That can mean reporting from a place nobody is covering, an argument that needs making, a firsthand dispatch, an interview, an essay, an oral history, a photo series, a comic, a piece of art, an audio project, a zine, a practical guide, a document worth preserving, or a strange little format we have not thought of yet.

We are especially interested in work grounded in lived experience, organizing, rural life, labor, mutual aid, abolition, antifascism, ecology, queer and trans life, disability, youth liberation, housing, state violence, movement history, and experiments in building something better than the systems currently eating everybody alive.

You do not need a journalism degree, a polished pitch deck, a professional bio, or permission from an institution. Tell us what you want to make, why it matters, what stage it is in, and what kind of help you need. Finished work is welcome. So are rough pitches, field notes, recordings, images, and ideas that need an editor or collaborator.

When you write, include:
- a short description of the piece or project
- the format you imagine it taking
- whether it is finished, in progress, or only an idea
- links or files that help us understand it
- any time sensitivity
- how you want to be credited, including anonymous or pseudonymous publication when appropriate

Send submissions to:
submit@sabot.media

We do not want SEO filler, press-release laundering, copaganda, fascist recruitment material, or content generated simply to fill a feed. We do want work made by people who care about what they are saying and who they are saying it with.

If your submission contains sensitive information, source identities, legal risk, or material that could endanger somebody, read the Security page before sending it:
https://sabot.media/security

Good work does not have to arrive looking finished. That is what editing and collaboration are for.`,
  },

  support: {
    eyebrow: 'support / circulate / keep it moving',
    title: 'Support Sabot Media',
    body: `The most useful thing you can do for independent media is help it circulate.

Read the work. Send it to somebody who needs it. Print a zine. Put a stack on a table. Share an article without feeding every interaction back through a corporate platform. Cite the reporting. Archive something before it disappears. Invite us to talk. Send a tip. Offer a skill. Help a project reach people we cannot reach on our own.

Sabot is built around the idea that media can move through a network instead of sitting behind a gate. That means support is not only money. It is also printers, microphones, rides, food, hosting, distribution, translation, transcription, editing, illustration, photography, web work, research, local knowledge, introductions, venues, mirrors, archives, and the thousand small forms of infrastructure that make independent publishing possible.

If you have resources to share or want to help with a current need, write to:
support@sabot.media

If you want to contribute work rather than material support, use:
submit@sabot.media

And if all you can do today is read something and pass it along, that counts. The whole machine is supposed to end with the work escaping us anyway.

Black Cat Distro has apparently interpreted this philosophy as blanket authorization to steal everything we publish and reproduce it on any unattended printer they can locate. We continue to deny responsibility for their methods while benefiting suspiciously often from the results.`,
  },
}

export function getPublicInfoCopy(page) {
  return publicInfoCopy[page] || null
}

export function getPublicInfoField(page, part, fallbackField = '') {
  if (!publicInfoCopy[page]) return fallbackField
  const version = INFO_COPY_VERSIONS[page] || CURRENT_INFO_COPY_VERSION
  return `info.${page}.${part}.${version}`
}

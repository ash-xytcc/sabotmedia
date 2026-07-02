export const editableContentRegistry = {
  about: {
    eyebrow: {
      field: 'info.about.eyebrow',
      defaultText: 'about / publication / harbor',
    },
    title: {
      field: 'info.about.title',
      defaultText: 'About Sabot Media',
    },
    body: {
      field: 'info.about.body',
      defaultText:
        'Sabot Media publishes independent reporting, essays, comics, podcasts, zines, and project-based archive work rooted in Grays Harbor and connected to wider struggles.',
    },
  },
  contact: {
    eyebrow: {
      field: 'info.contact.eyebrow',
      defaultText: 'contact / tips / correspondence',
    },
    title: {
      field: 'info.contact.title',
      defaultText: 'Contact',
    },
    body: {
      field: 'info.contact.body',
      defaultText:
        'Send tips, corrections, project notes, questions, and correspondence through the publication channels. Include context, links, and a way to follow up when a reply is needed.',
    },
  },
  submit: {
    eyebrow: {
      field: 'info.submit.eyebrow',
      defaultText: 'submit / pitches / contributions',
    },
    title: {
      field: 'info.submit.title',
      defaultText: 'Submit',
    },
    body: {
      field: 'info.submit.body',
      defaultText:
        'Send pitches, essays, reports, comics, art, zine ideas, or project leads that fit the publication. Include a short description, the intended format, and how to reach you.',
    },
  },
  support: {
    eyebrow: {
      field: 'info.support.eyebrow',
      defaultText: 'support / sustain / share',
    },
    title: {
      field: 'info.support.title',
      defaultText: 'Support',
    },
    body: {
      field: 'info.support.body',
      defaultText:
        'Support Sabot Media by reading, sharing, printing, citing, and circulating work from the archive. Direct support details can be added here when they are ready.',
    },
  },
}

export function getEditablePage(pageKey) {
  return editableContentRegistry[pageKey] || editableContentRegistry.about
}

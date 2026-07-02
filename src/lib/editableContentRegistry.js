export const editableContentRegistry = {
  nav: [
    { id: 'archive', labelField: 'nav.archive.label', hrefField: 'nav.archive.href', defaultLabel: 'Archive', defaultHref: '/archive' },
    { id: 'projects', labelField: 'nav.projects.label', hrefField: 'nav.projects.href', defaultLabel: 'Projects', defaultHref: '/projects' },
    { id: 'about', labelField: 'nav.about.label', hrefField: 'nav.about.href', defaultLabel: 'About', defaultHref: '/about' },
  ],
  footer: {
    eyebrow: {
      field: 'footer.brand.eyebrow',
      defaultText: 'independent media / archive / public publication',
    },
    title: {
      field: 'footer.brand.title',
      defaultText: 'Sabot Media',
    },
    body: {
      field: 'footer.brand.body',
      defaultText:
        'An independent media publication for recent writing, dispatches, print material, and archive work. The public site is for reading. The tools stay backstage.',
    },
    bottom: {
      field: 'footer.bottom.body',
      defaultText: 'Read online, search the archive, or open a print-friendly article view.',
    },
    sections: [
      {
        id: 'site',
        titleField: 'footer.site.title',
        defaultTitle: 'Site',
        links: [
          { id: 'home', labelField: 'footer.site.home.label', hrefField: 'footer.site.home.href', defaultLabel: 'Home', defaultHref: '/' },
          { id: 'archive', labelField: 'footer.site.archive.label', hrefField: 'footer.site.archive.href', defaultLabel: 'Archive', defaultHref: '/archive' },
          { id: 'projects', labelField: 'footer.site.projects.label', hrefField: 'footer.site.projects.href', defaultLabel: 'Projects', defaultHref: '/projects' },
          { id: 'about', labelField: 'footer.site.about.label', hrefField: 'footer.site.about.href', defaultLabel: 'About', defaultHref: '/about' },
          { id: 'contact', labelField: 'footer.site.contact.label', hrefField: 'footer.site.contact.href', defaultLabel: 'Contact', defaultHref: '/contact' },
          { id: 'submit', labelField: 'footer.site.submit.label', hrefField: 'footer.site.submit.href', defaultLabel: 'Submit work', defaultHref: '/submit' },
          { id: 'support', labelField: 'footer.site.support.label', hrefField: 'footer.site.support.href', defaultLabel: 'Support', defaultHref: '/support' },
        ],
      },
      {
        id: 'formats',
        titleField: 'footer.formats.title',
        defaultTitle: 'Formats',
        links: [
          { id: 'articles', labelField: 'footer.formats.articles.label', hrefField: 'footer.formats.articles.href', defaultLabel: 'Articles', defaultHref: '/archive?format=article' },
          { id: 'podcasts', labelField: 'footer.formats.podcasts.label', hrefField: 'footer.formats.podcasts.href', defaultLabel: 'Podcasts', defaultHref: '/archive?format=podcast' },
          { id: 'comics', labelField: 'footer.formats.comics.label', hrefField: 'footer.formats.comics.href', defaultLabel: 'Comics', defaultHref: '/archive?format=comic' },
          { id: 'zines', labelField: 'footer.formats.zines.label', hrefField: 'footer.formats.zines.href', defaultLabel: 'Zines', defaultHref: '/archive?format=zine' },
          { id: 'newsletters', labelField: 'footer.formats.newsletters.label', hrefField: 'footer.formats.newsletters.href', defaultLabel: 'Newsletters', defaultHref: '/archive?format=newsletter' },
        ],
      },
    ],
  },
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
    actions: [
      { id: 'archive', labelField: 'info.about.actions.archive.label', hrefField: 'info.about.actions.archive.href', defaultLabel: 'Browse archive', defaultHref: '/archive' },
      { id: 'projects', labelField: 'info.about.actions.projects.label', hrefField: 'info.about.actions.projects.href', defaultLabel: 'View projects', defaultHref: '/projects' },
    ],
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
    actions: [
      { id: 'submit', labelField: 'info.contact.actions.submit.label', hrefField: 'info.contact.actions.submit.href', defaultLabel: 'Submit work', defaultHref: '/submit' },
      { id: 'support', labelField: 'info.contact.actions.support.label', hrefField: 'info.contact.actions.support.href', defaultLabel: 'Support', defaultHref: '/support' },
    ],
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
    actions: [
      { id: 'articles', labelField: 'info.submit.actions.articles.label', hrefField: 'info.submit.actions.articles.href', defaultLabel: 'Read articles', defaultHref: '/archive?format=article' },
      { id: 'contact', labelField: 'info.submit.actions.contact.label', hrefField: 'info.submit.actions.contact.href', defaultLabel: 'Contact', defaultHref: '/contact' },
    ],
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
    actions: [
      { id: 'zines', labelField: 'info.support.actions.zines.label', hrefField: 'info.support.actions.zines.href', defaultLabel: 'Print material', defaultHref: '/archive?format=zine' },
      { id: 'projects', labelField: 'info.support.actions.projects.label', hrefField: 'info.support.actions.projects.href', defaultLabel: 'Projects', defaultHref: '/projects' },
    ],
  },
}

export function getEditablePage(pageKey) {
  return editableContentRegistry[pageKey] || editableContentRegistry.about
}

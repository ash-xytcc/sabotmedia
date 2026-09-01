export const editableContentRegistry = {
  nav: [
    { id: 'archive', labelField: 'nav.archive.label', hrefField: 'nav.archive.href', defaultLabel: 'Archive', defaultHref: '/archive' },
    { id: 'feeds', labelField: 'nav.feeds.label', hrefField: 'nav.feeds.href', defaultLabel: 'Feeds', defaultHref: '/feeds' },
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
          { id: 'feeds', labelField: 'footer.site.feeds.label', hrefField: 'footer.site.feeds.href', defaultLabel: 'Feeds / RSS', defaultHref: '/feeds' },
          { id: 'about', labelField: 'footer.site.about.label', hrefField: 'footer.site.about.href', defaultLabel: 'About', defaultHref: '/about' },
          { id: 'security', labelField: 'footer.site.security.label', hrefField: 'footer.site.security.href', defaultLabel: 'Security', defaultHref: '/security' },
          { id: 'contact', labelField: 'footer.site.contact.label', hrefField: 'footer.site.contact.href', defaultLabel: 'Contact', defaultHref: '/contact' },
          { id: 'submit', labelField: 'footer.site.submit.label', hrefField: 'footer.site.submit.href', defaultLabel: 'Submit work', defaultHref: '/submit' },
          { id: 'support', labelField: 'footer.site.support.label', hrefField: 'footer.site.support.href', defaultLabel: 'Support', defaultHref: '/support' },
        ],
      },
      {
        id: 'projects',
        titleField: 'footer.projects.title',
        defaultTitle: 'Projects',
        links: [],
      },
    ],
  },
  home: {
    loadingTitle: {
      field: 'home.loading.title',
      defaultText: 'Loading recent posts',
    },
    loadingBody: {
      field: 'home.loading.body',
      defaultText: 'Pulling together the latest published material.',
    },
    emptyTitle: {
      field: 'home.empty.title',
      defaultText: 'No recent pieces available',
    },
    emptyBody: {
      field: 'home.empty.body',
      defaultText: 'Publish native entries or confirm the imported archive is loaded.',
    },
    errorTitle: {
      field: 'home.error.title',
      defaultText: 'Recent posts unavailable',
    },
    nextLabel: {
      field: 'home.next.label',
      defaultText: 'Next',
    },
  },
  archive: {
    eyebrow: {
      field: 'archive.hero.eyebrow',
      defaultText: 'archive / browse / publication',
    },
    title: {
      field: 'archive.hero.title',
      defaultText: 'Archive',
    },
    body: {
      field: 'archive.hero.body',
      defaultText:
        'Browse the full Sabot Media archive by project, or search across everything.',
    },
    countLabel: {
      field: 'archive.hero.countLabel',
      defaultText: 'pieces',
    },
    searchLabel: {
      field: 'archive.search.label',
      defaultText: 'Search the archive',
    },
    searchPlaceholder: {
      field: 'archive.search.placeholder',
      defaultText: 'Title, project, excerpt...',
    },
    projectLabel: {
      field: 'archive.project.label',
      defaultText: 'Project',
    },
    allProjectsLabel: {
      field: 'archive.project.allLabel',
      defaultText: 'All projects',
    },
    recentLabel: {
      field: 'archive.results.recentLabel',
      defaultText: 'recent archive',
    },
    emptyTitle: {
      field: 'archive.empty.title',
      defaultText: 'No archive results',
    },
    emptyBody: {
      field: 'archive.empty.body',
      defaultText: 'Try a different project, a broader search term, or clear the project filter.',
    },
    loadMoreLabel: {
      field: 'archive.loadMore.label',
      defaultText: 'Load more',
    },
    clearFiltersLabel: {
      field: 'archive.clearFilters.label',
      defaultText: 'Clear filters',
    },
    readLabel: {
      field: 'archive.card.readLabel',
      defaultText: 'Read',
    },
    printLabel: {
      field: 'archive.card.printLabel',
      defaultText: 'Print',
    },
  },
  notFound: {
    eyebrow: {
      field: 'notFound.eyebrow',
      defaultText: '404',
    },
    pageTitle: {
      field: 'notFound.page.title',
      defaultText: 'Page not found',
    },
    pageBody: {
      field: 'notFound.page.body',
      defaultText: 'That page does not exist, moved, or was never published.',
    },
    postTitle: {
      field: 'notFound.post.title',
      defaultText: 'Post not found',
    },
    postBody: {
      field: 'notFound.post.body',
      defaultText: 'This post is not published, does not exist, or is still saving.',
    },
    projectTitle: {
      field: 'notFound.project.title',
      defaultText: 'Project not found',
    },
    projectBody: {
      field: 'notFound.project.body',
      defaultText: 'That project archive does not exist or is not public.',
    },
    homeLabel: {
      field: 'notFound.actions.homeLabel',
      defaultText: 'Home',
    },
    archiveLabel: {
      field: 'notFound.actions.archiveLabel',
      defaultText: 'Back to archive',
    },
    projectsLabel: {
      field: 'notFound.actions.projectsLabel',
      defaultText: 'Back to projects',
    },
  },
  login: {
    title: {
      field: 'login.title',
      defaultText: 'Editor Login',
    },
    body: {
      field: 'login.body',
      defaultText: 'Enter the admin token to access backstage tools and live editing.',
    },
    tokenLabel: {
      field: 'login.tokenLabel',
      defaultText: 'Admin token',
    },
    emptyError: {
      field: 'login.emptyError',
      defaultText: 'Enter the admin token.',
    },
    rejectedError: {
      field: 'login.rejectedError',
      defaultText: 'That token was not accepted.',
    },
    submitLabel: {
      field: 'login.submitLabel',
      defaultText: 'Log in',
    },
    checkingLabel: {
      field: 'login.checkingLabel',
      defaultText: 'Checking...',
    },
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
    ],
  },
  contact: {
    eyebrow: {
      field: 'info.contact.eyebrow',
      defaultText: 'contact / correspondence / tips',
    },
    title: {
      field: 'info.contact.title',
      defaultText: 'Contact Sabot Media',
    },
    body: {
      field: 'info.contact.body',
      defaultText: 'Send corrections, tips, submissions, press requests, or general correspondence. Use the secure form for sensitive material.',
    },
    actions: [],
  },
  security: {
    eyebrow: {
      field: 'info.security.eyebrow',
      defaultText: 'security / privacy / infrastructure',
    },
    title: {
      field: 'info.security.title',
      defaultText: 'Security',
    },
    body: {
      field: 'info.security.body',
      defaultText: 'Security and privacy information for Sabot Media readers, contributors, and collaborators.',
    },
    actions: [],
  },
  submit: {
    eyebrow: {
      field: 'info.submit.eyebrow',
      defaultText: 'submit / pitch / contribute',
    },
    title: {
      field: 'info.submit.title',
      defaultText: 'Submit work',
    },
    body: {
      field: 'info.submit.body',
      defaultText: 'Pitch reporting, essays, audio, comics, zines, photography, or other work for publication.',
    },
    actions: [],
  },
  support: {
    eyebrow: {
      field: 'info.support.eyebrow',
      defaultText: 'support / sustain / circulate',
    },
    title: {
      field: 'info.support.title',
      defaultText: 'Support Sabot Media',
    },
    body: {
      field: 'info.support.body',
      defaultText: 'Help sustain independent publishing, reporting, travel, printing, hosting, and distribution.',
    },
    actions: [],
  },
}

export function getEditablePage(page) {
  return editableContentRegistry[page] || editableContentRegistry.about
}

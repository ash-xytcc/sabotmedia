export const publicSiteDefaults = {
  text: {
    'home.featured.eyebrow': 'Featured drop',
    'home.projects.eyebrow': 'Projects',
    'home.archive.eyebrow': 'Archive flow',
    'home.archive.title': 'Browse imported pieces',

    'projects.hero.eyebrow': 'federation / lenses / routes',
    'projects.hero.title': 'Projects',
    'projects.hero.description':
      'Sabot Media is not one stream. It is a federation of smaller publishing routes, each with its own emphasis, rhythm, and medium.',
    'projects.index.eyebrow': 'Browse by project',
    'projects.index.title': 'Publishing routes',

    'projectPage.hero.eyebrow': 'project archive',
    'projectPage.hero.description': 'Imported archive entries grouped under this publishing lane.',
    'projectPage.featured.eyebrow': 'featured in this lane',
    'projectPage.archive.eyebrow': 'Project archive',
    'projectPage.archive.title': 'Browse pieces',

    'footer.about.eyebrow': 'about',
    'footer.about.title': 'Sabot Media',
    'footer.about.body':
      'An open collective of radical media makers working across writing, print, graphics, comics, newsletters, and broadcast.',
    'footer.routes.eyebrow': 'routes',
    'footer.state.eyebrow': 'state',
    'footer.state.body':
      'Imported archive online. Native publishing and deeper tooling next.',
  },

  styles: {},

  blocks: {
    home: {
      featured: {
        eyebrowField: 'home.featured.eyebrow',
        titleField: 'home.featured.title',
        subtitleField: 'home.featured.subtitle',
        excerptField: 'home.featured.excerpt',
      },
      archive: {
        eyebrowField: 'home.archive.eyebrow',
        titleField: 'home.archive.title',
      },
    },

    projects: {
      hero: {
        eyebrowField: 'projects.hero.eyebrow',
        titleField: 'projects.hero.title',
        descriptionField: 'projects.hero.description',
      },
      index: {
        eyebrowField: 'projects.index.eyebrow',
        titleField: 'projects.index.title',
      },
    },

    projectPage: {
      hero: {
        eyebrowField: 'projectPage.hero.eyebrow',
        descriptionField: 'projectPage.hero.description',
      },
      featured: {
        eyebrowField: 'projectPage.featured.eyebrow',
      },
      archive: {
        eyebrowField: 'projectPage.archive.eyebrow',
        titleField: 'projectPage.archive.title',
      },
    },

    footer: {
      about: {
        eyebrowField: 'footer.about.eyebrow',
        titleField: 'footer.about.title',
        bodyField: 'footer.about.body',
      },
      routes: {
        eyebrowField: 'footer.routes.eyebrow',
      },
      state: {
        eyebrowField: 'footer.state.eyebrow',
        bodyField: 'footer.state.body',
      },
    },
  },
}

import sabotMedia from './sabot-media'
import harborRat from './the-harbor-rat-report'
import communique from './the-communique'
import blackCatDistro from './black-cat-distro'
import sabotuers from './the-sabotuers'
import molotovNow from './molotov-now'
import tcaie from './the-child-and-its-enemies'
import neighborhood from './get-to-know-your-neighborhood'
import glaringExamples from './glaring-examples'

export const publicationLogo = sabotMedia

export const projectLogos = Object.freeze({
  'the-harbor-rat-report': harborRat,
  'the-communique': communique,
  'black-cat-distro': blackCatDistro,
  'the-sabotuers': sabotuers,
  'molotov-now': molotovNow,
  'the-child-and-its-enemies': tcaie,
  'get-to-know-your-neighborhood': neighborhood,
  'glaring-examples': glaringExamples,
})

export function getProjectLogo(slug) {
  return projectLogos[String(slug || '').trim()] || ''
}

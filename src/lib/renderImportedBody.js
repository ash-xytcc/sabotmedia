import { expandStandaloneEmbedsInHtml } from './contentEmbeds'
import {
  renderImportedBody as renderImportedBodyBase,
  extractLeadFromHtml,
  normalizeLinkTarget,
} from './renderImportedBody.jsx'

export function renderImportedBody(html, mode = 'read') {
  return renderImportedBodyBase(expandStandaloneEmbedsInHtml(html), mode)
}

export { extractLeadFromHtml, normalizeLinkTarget }

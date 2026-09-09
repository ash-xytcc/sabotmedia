import { renderPlainHtmlListing } from './api/_lib/plainHtmlPage.js'

export async function onRequest(context) {
  return renderPlainHtmlListing(context, { homepageOnly: true })
}

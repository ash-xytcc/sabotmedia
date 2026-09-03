import fs from 'node:fs'

function patch(path, replacements) {
  let text = fs.readFileSync(path, 'utf8')
  for (const [before, after] of replacements) {
    if (!text.includes(before)) throw new Error(`Missing patch anchor in ${path}: ${before.slice(0, 90)}`)
    text = text.replace(before, after)
  }
  fs.writeFileSync(path, text)
}

patch('src/components/CampaignPage.jsx', [
  [
    "import { CampaignBenefitToolkit, CampaignDispatches, CampaignDonation, CampaignQuestionForm, CampaignSocialArchive } from './CampaignCorrespondence'\n",
    "import { CampaignBenefitToolkit, CampaignDispatches, CampaignDonation, CampaignQuestionForm, CampaignSocialArchive } from './CampaignCorrespondence'\nimport { CampaignSignatures } from './CampaignSignatures'\n",
  ],
  [
    "    signatories: signatories.length > 0 || Boolean(campaign.automation?.enabled && campaign.automation?.signatoriesUrl),",
    "    signatories: isAiCampaign || signatories.length > 0 || Boolean(campaign.automation?.enabled && campaign.automation?.signatoriesUrl),",
  ],
  [
    "      {showSection('signatories') ? <SignatoryCarousel signatories={signatories} title={sectionTitle('signatories')} sectionKey=\"signatories\" /> : null}",
    "      {showSection('signatories') ? (isAiCampaign ? <CampaignSignatures campaign={campaign} title={sectionTitle('signatories')} sectionKey=\"signatories\" /> : <SignatoryCarousel signatories={signatories} title={sectionTitle('signatories')} sectionKey=\"signatories\" />) : null}",
  ],
])

patch('src/components/CampaignAdminPage.jsx', [
  [
    "import { CampaignCorrespondenceAdmin } from './CampaignCorrespondenceAdmin'\n",
    "import { CampaignCorrespondenceAdmin } from './CampaignCorrespondenceAdmin'\nimport { CampaignSignaturesAdmin } from './CampaignSignaturesAdmin'\n",
  ],
  [
    "{Object.entries(LIST_EDITORS).filter(([key]) => key !== 'resources' && activeSet.has(key)).map(([key, editor]) =>",
    "{Object.entries(LIST_EDITORS).filter(([key]) => key !== 'resources' && activeSet.has(key) && !(key === 'signatories' && draft.slug === 'autistici-inventati')).map(([key, editor]) =>",
  ],
  [
    "            {!isNew && draft.slug && activeSet.has('coverage') ? <CampaignCoverageModeration campaignSlug={draft.slug} onNotice={pushNotice} /> : null}\n",
    "            {!isNew && draft.slug && activeSet.has('coverage') ? <CampaignCoverageModeration campaignSlug={draft.slug} onNotice={pushNotice} /> : null}\n            {!isNew && draft.slug && activeSet.has('signatories') ? <CampaignSignaturesAdmin campaign={draft} onNotice={pushNotice} /> : null}\n",
  ],
])

patch('functions/api/campaign-signatures.js', [
  [
    "import { getNativeEntry } from './_lib/nativePublicContent.js'\n",
    "import { getNativeEntry } from './_lib/nativePublicContent.js'\nimport { signatureSeedsForCampaign } from './_lib/bundledCampaignSignatureSeeds.js'\n",
  ],
  [
    "  try {\n    const letter = await getNativeEntry(db, 'open-letter-ai')\n    const legacy = extractAiLetterSignatories(letter?.bodyHtml || letter?.body || '')\n    if (legacy.length) await importManualSignatories(db, campaign.id, legacy)\n  } catch { /* built-in public names remain available through the campaign decorator */ }",
    "  await importManualSignatories(db, campaign.id, signatureSeedsForCampaign(campaign.slug))\n  try {\n    const letter = await getNativeEntry(db, 'open-letter-ai')\n    const legacy = extractAiLetterSignatories(letter?.bodyHtml || letter?.body || '')\n    if (legacy.length) await importManualSignatories(db, campaign.id, legacy)\n  } catch { /* the bundled manual approvals are already preserved */ }",
  ],
])

patch('functions/api/_lib/nativePublicTranslations.js', [
  [
    "      seoDescription: String(translation.seoDescription || translation.seo_description || input.seoDescription || ''),\n",
    "      seoDescription: String(translation.seoDescription || translation.seo_description || input.seoDescription || ''),\n      heroImage: String(translation.heroImage || translation.hero_image || input.heroImage || input.hero_image || ''),\n      heroImageAlt: String(translation.heroImageAlt || translation.hero_image_alt || input.heroImageAlt || input.hero_image_alt || ''),\n",
  ],
  [
    "      seoDescription: strings.seoDescription,\n",
    "      seoDescription: strings.seoDescription,\n      heroImage: strings.heroImage,\n      heroImageAlt: strings.heroImageAlt,\n",
  ],
])

console.log('campaign signing + translation integration applied')

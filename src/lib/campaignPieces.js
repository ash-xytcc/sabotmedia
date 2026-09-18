const AI_CAMPAIGN_SLUG = 'autistici-inventati'

export function findCampaignPieces(pieces, campaign) {
  if (!Array.isArray(pieces) || !campaign) return []
  const campaignSlug = String(campaign.slug || '').toLowerCase()
  const isAiCampaign = campaignSlug === AI_CAMPAIGN_SLUG
  const exactSlugs = new Set(['the-us-designated-a-25-year-old-volunteer-communications-collective-a-terrorist-organization', 'communications-infrastructure-is-not-terrorism', 'open-letter-defend-autistici-inventati', 'open-letter-ai', 'individual-letter-defend-autistici-inventati', 'the-server-called-paranoia'])
  return pieces.filter((piece) => {
    const explicit = [...(piece.campaigns || []), ...(piece.tags || []), ...(piece.collections || []), ...(piece.projects || []), piece.primaryProject]
      .map((item) => String(item || '').toLowerCase())
      .some((item) => item === campaignSlug || (isAiCampaign && (item.includes('autistici') || item.includes('inventati') || item.includes('a/i campaign'))))
    if (explicit || (isAiCampaign && exactSlugs.has(String(piece.slug || '').toLowerCase()))) return true
    if (!isAiCampaign) return false
    const title = String(piece.title || '').toLowerCase()
    return /autistici(?:\s*\/\s*|\s+)?inventati/.test(title) || (/communications infrastructure/.test(title) && /terrorism|sanction|designation/.test(title))
  }).sort((a, b) => new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0))
}

export const BUNDLED_CAMPAIGN_SIGNATURE_SEEDS = {
  'autistici-inventati': [
    { id: 'signer-sabot-media', name: 'Sabot Media', location: 'USA' },
    { id: 'signer-grounded-futures', name: 'Grounded Futures Podcast', location: 'USA' },
    { id: 'signer-final-straw', name: 'The Final Straw Radio', location: 'USA' },
    { id: 'signer-dirty-hands', name: 'Dirty Hands Collective', location: 'Colorado, USA' },
    { id: 'signer-bash', name: 'BASH - Boise Autonomous Solidarity Hub', location: 'Idaho, USA' },
    { id: 'signer-crman', name: 'Chehalis River Mutual Aid Network', location: 'Washington, USA' },
    { id: 'signer-blackflower', name: 'The Blackflower Collective', location: 'Washington, USA' },
    { id: 'signer-anarkism', name: 'Anarkism.info', location: 'Sweden' },
    { id: 'signer-milk-tea-alliance', name: '#MilkTeaAlliance Calendar Team', location: 'Southeast Asia' },
    { id: 'signer-datenpunks', name: 'Datenpunks e.V.', location: 'Germany' },
    { id: 'signer-eric-gallager', name: 'Eric Gallager', location: 'New Hampshire, USA' },
    { id: 'signer-jeremy-smith', name: 'Jeremy Beausoleil Smith', location: 'Oregon, USA' },
    { id: 'signer-haymarket-customs', name: 'Haymarket Customs', location: 'USA' },
  ],
}

export function signatureSeedsForCampaign(slug) {
  return (BUNDLED_CAMPAIGN_SIGNATURE_SEEDS[String(slug || '').trim()] || []).map((item) => ({ ...item }))
}

import fs from 'node:fs'

function patch(path, changes) {
  let text = fs.readFileSync(path, 'utf8')
  for (const [before, after, label] of changes) {
    if (!text.includes(before)) throw new Error(`missing patch anchor: ${label}`)
    text = text.replace(before, after)
  }
  fs.writeFileSync(path, text)
}

patch('src/components/CampaignPage.jsx', [[
`          <PieceGrid pieces={letterPieces} empty="Letter downloads are temporarily unavailable. The reporting section remains available while they are restored." />
          <ResourceStrip resources={letterResources} />`,
`          <div className={isAiCampaign ? 'campaign-letter-sign-layout' : undefined}>
            <div>
              <PieceGrid pieces={letterPieces} empty="Letter downloads are temporarily unavailable. The reporting section remains available while they are restored." />
              <ResourceStrip resources={letterResources} />
            </div>
            {isAiCampaign ? <a className="campaign-sign-letter-cta" href="#signatories"><span>ADD YOUR NAME OR ORGANIZATION</span><strong>SIGN<br />THE<br />LETTER</strong><b>↓</b></a> : null}
          </div>`,
'letters CTA'
]])

patch('src/campaign-signatures.css', [[
`.campaign-signature-form,.campaign-signature-manage{border:2px solid currentColor;padding:clamp(1rem,2vw,1.5rem);background:var(--paper,#f4f0e7)}`,
`.campaign-signature-form,.campaign-signature-manage{border:2px solid #111;padding:clamp(1rem,2vw,1.5rem);background:var(--paper,#f4f0e7);color:#111}.campaign-signature-form__intro,.campaign-signature-form__intro h3,.campaign-signature-form__intro p,.campaign-signature-field span,.campaign-signature-privacy,.campaign-signature-message{color:#111!important}.campaign-signature-form__intro p{opacity:.82}.campaign-signature-privacy{opacity:.78}.campaign-signature-message.is-error{background:#fff1f1;color:#7d1111!important;border-color:#b00020}.campaign-signature-message.is-sent{background:#eef8ee;border-color:#237a32}.campaign-letter-sign-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.92fr);gap:clamp(1.25rem,3vw,3rem);align-items:stretch}.campaign-sign-letter-cta{min-height:390px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;padding:clamp(1.25rem,3vw,2.5rem);background:#111;color:#f4f0e7!important;border:3px solid #111;text-decoration:none!important;text-transform:uppercase}.campaign-sign-letter-cta span{font-size:.85rem;font-weight:800;letter-spacing:.08em}.campaign-sign-letter-cta strong{font-size:clamp(3.2rem,7vw,7rem);line-height:.78;letter-spacing:-.055em;color:#f4f0e7}.campaign-sign-letter-cta b{font-size:3rem;line-height:1}.campaign-sign-letter-cta:hover,.campaign-sign-letter-cta:focus-visible{background:#c51f2b;color:#fff!important;border-color:#c51f2b}.campaign-sign-letter-cta:hover strong,.campaign-sign-letter-cta:focus-visible strong{color:#fff}`,
'form contrast + giant CTA styles'
], [
`@media(max-width:800px){.campaign-signature-layout{grid-template-columns:1fr}.campaign-signature-admin__card dl{grid-template-columns:1fr}.campaign-signature-admin__card dt{margin-top:.4rem}}`,
`@media(max-width:800px){.campaign-signature-layout,.campaign-letter-sign-layout{grid-template-columns:1fr}.campaign-sign-letter-cta{min-height:300px}.campaign-signature-admin__card dl{grid-template-columns:1fr}.campaign-signature-admin__card dt{margin-top:.4rem}}`,
'mobile CTA layout'
]])

patch('functions/api/campaign-signatures.js', [[
`        await sendSignatureEmail(context.env, {
          to: result.email,
          subject: \`Verify your signature: \${campaign.shortTitle || campaign.title}\`,
          text: \`Thanks for signing. Verify control of this email address here:\\n\\n\${verifyUrl}\\n\\nVerification does not publish your signature. After verification it goes to the Sabot moderation queue.\`,
        })`,
`        try {
          await sendSignatureEmail(context.env, {
            to: result.email,
            subject: \`Verify your signature: \${campaign.shortTitle || campaign.title}\`,
            text: \`Thanks for signing. Verify control of this email address here:\\n\\n\${verifyUrl}\\n\\nVerification does not publish your signature. After verification it goes to the Sabot moderation queue.\`,
          })
        } catch (emailError) {
          await db.prepare(\`DELETE FROM campaign_signatures WHERE id = ? AND status = 'pending_email'\`).bind(result.id).run().catch(() => {})
          const error = new Error('We could not send the verification email. Please try again shortly.')
          error.status = 503
          error.cause = emailError
          throw error
        }`,
'clean up failed email submission'
], [
`function publicError(error) {
  const status = Number(error?.status || 500)
  if (status >= 500) return 'The signing service is temporarily unavailable.'
  return String(error?.message || error)
}`,
`function publicError(error) {
  const status = Number(error?.status || 500)
  if (status === 503 && String(error?.message || '').includes('verification email')) return String(error.message)
  if (status >= 500) return 'The signing service is temporarily unavailable.'
  return String(error?.message || error)
}`,
'clear mail error'
]])

patch('functions/api/_lib/campaignSignatures.js', [[
`  // MailChannels remains an optional zero-account fallback for Cloudflare deployments.
  const response = await fetch('https://api.mailchannels.net/tx/v1/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: parseFrom(from), subject, content: [{ type: 'text/plain', value: text }, ...(html ? [{ type: 'text/html', value: html }] : [])] }) })
  if (!response.ok) throw new Error(\`email provider returned \${response.status}\`)
  return { sent: true, provider: 'mailchannels' }`,
`  if (String(env.SIGNATURE_EMAIL_PROVIDER || '').toLowerCase() === 'mailchannels') {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: parseFrom(from), subject, content: [{ type: 'text/plain', value: text }, ...(html ? [{ type: 'text/html', value: html }] : [])] }) })
    if (!response.ok) throw new Error(\`email provider returned \${response.status}\`)
    return { sent: true, provider: 'mailchannels' }
  }
  throw new Error('signature email transport is not configured')`,
'do not silently rely on MailChannels'
]])

console.log('signing UI and mail error fixes applied')

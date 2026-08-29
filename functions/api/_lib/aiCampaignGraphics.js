const BASE = '/campaigns/autistici-inventati/graphics'

const rows = [
  ['book-download-card', 'Ten Years of Hacking and Media Activism', 'Red, black, pink and green book-download card for The Kaos Ten Years of Hacking and Media Activism, with Hacklabs, Genova, Plan B and Noblogs listed.', 'Download and share the free Kaos book on A/I, hacklabs and radical media infrastructure.'],
  ['carousel-1', 'The Server Called Paranoia', 'Red and black campaign card reading “The server called Paranoia” above a server icon and text saying the U.S. is trying to make Autistici/Inventati untouchable.', 'Before September 25: read, share, preserve and organize.'],
  ['carousel-2', 'Immediate Answer Is Solidarity', 'Black campaign card reading “The immediate answer is solidarity” with six red action boxes: read, share, preserve, document, organize and pressure.', 'Six immediate ways to defend resistant communications infrastructure.'],
  ['carousel-3', 'Save Public Noblogs', 'Pink and black campaign card reading “Save public Noblogs” beside a browser-window illustration and a preservation checklist.', 'Preserve public pages and media without accessing private accounts or bypassing security.'],
  ['carousel-4', 'Do and Do Not', 'Paper-textured campaign checklist contrasting useful actions such as reporting and preserving public material with prohibited actions such as rerouting funds or bypassing access.', 'Act independently and legally; do not create new sanctions risks.'],
  ['carousel-5', 'Noblogs: 25 Years', 'Red, black and paper campaign card reading “Noblogs: 25 years of resistant communication” with email, Noblogs, servers and knowledge listed.', 'A quarter century of noncommercial movement infrastructure.'],
  ['carousel-6', 'Repression Became Architecture', 'Paper-textured timeline from Paranoia Goes Online in 2001 through U.S. designation in 2026, titled “Repression became architecture.”', 'A short history of attacks, seizures and resilient rebuilding.'],
  ['carousel-7', 'The Government Case', 'Black and red campaign card explaining that A/I provided digital infrastructure used by radical movements and that the designation targets infrastructure itself.', 'The government’s theory collapses providers into the conduct of users.'],
  ['carousel-8', 'A/I Public Statement: Allegations', 'Black quote card reproducing A/I’s denial of allegations in the included statements and identifying A/I as digital self-defense infrastructure.', 'A/I responds in its own words.'],
  ['carousel-9', 'A/I Public Statement: We Will Not Back Down', 'Black quote card reading “We will not back down, we will keep doing what we have been doing all these years,” attributed to Autistici/Inventati.', 'A/I’s public response to the designation.'],
  ['carousel-10', 'A/I Public Statement: Antifascism', 'Black quote card reading “Antifascism and anticapitalism are not terrorism. Protesting is not terrorism.”', 'Political opposition and protest are not terrorism.'],
  ['carousel-11', 'September 25 Deadline', 'Black and red deadline card showing 09 25 and 12:01 a.m. Eastern, when the temporary wind-down period ends.', 'The deadline affects banks, hosts, certificates, providers and users.'],
  ['carousel-12', 'Built For, Targeted Now', 'Paper-textured comparison card listing infrastructure built for server seizure, hostile providers, hardware loss and censorship against present threats to banking, donations, domains, bandwidth and global access.', 'A network can replace a machine; it cannot replace the world around it.'],
  ['featured-image', 'Campaign Featured Image', 'Wide red, black and paper banner reading “The server called Paranoia: Defend Autistici/Inventati” with Noblogs and Welcome to A/I browser marks.', 'Communications infrastructure is not terrorism.'],
  ['quote-1', 'The First Server Was Called Paranoia', 'Black quote card reading “The first server was called Paranoia. The network it created was called solidarity,” beside a white network diagram.', 'The network it created was called solidarity.'],
  ['quote-2', 'September 25 Is Not Silence', 'Red and black quote card reading “September 25 is not a deadline for silence. It is a deadline for organization.”', 'Turn the deadline into organization.'],
  ['quote-3', 'Infrastructure Is Not Every Message', 'Black quote card reading “Providing infrastructure is not the same as authoring everything transmitted through it,” with a two-way arrow.', 'Political affinity is not operational control.'],
  ['quote-4', 'Build Something Harder to Destroy', 'Red and black quote card reading “Disclose what happened. Repair the damage. Share the lesson. Build something harder to destroy.”', 'Repair, document and build resilient systems.'],
  ['story-1', 'The U.S. Designated A/I', 'Vertical red and black story card reading “The U.S. designated A/I,” describing a volunteer communications collective being treated as terrorist infrastructure.', 'A concise story-format introduction to the designation.'],
  ['story-2', 'September 25 Story Card', 'Vertical red story card reading “September 25” above a calendar illustration and text warning that the wind-down period ends.', 'Share the campaign deadline in story format.'],
  ['story-3', 'Do Not Let A/I Disappear', 'Vertical red and black story card reading “Do not let A/I disappear” above a Welcome to A/I browser screenshot.', 'Read, share, preserve public archives and organize independently.'],
  ['web-banner', 'Do Not Let A/I Disappear Banner', 'Wide black campaign banner reading “Do not let A/I disappear” beside a Welcome to A/I browser screenshot.', 'A wide campaign banner for websites and social headers.'],
]

export const AI_CAMPAIGN_GRAPHICS = rows.map(([slug, title, alt, caption], index) => ({
  id: `built-in-${index + 1}`,
  title,
  imageUrl: `${BASE}/${slug}.webp`,
  alt,
  caption,
  downloadUrl: `${BASE}/originals/${slug}.png`,
}))

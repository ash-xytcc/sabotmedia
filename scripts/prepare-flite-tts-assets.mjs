import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const ROOT = new URL('../', import.meta.url)
const PUBLIC_DIR = new URL('../public/tts/', import.meta.url)

const assets = [
  {
    path: 'flite/flite.wasm',
    minBytes: 10_000_000,
    urls: [
      'https://cdn.jsdelivr.net/npm/@echogarden/flite-wasi@0.1.1/flite.wasm',
      'https://unpkg.com/@echogarden/flite-wasi@0.1.1/flite.wasm',
    ],
  },
  {
    path: 'flite/cmu_us_lnh.flitevox',
    minBytes: 10_000_000,
    urls: [
      'https://dk.archive.ubuntu.com/pub/pub/mirrors/gentoo/distfiles/55/cmu_us_lnh.flitevox',
      'https://mirror.iro.umontreal.ca/gentoo/gentoo/distfiles/55/cmu_us_lnh.flitevox',
    ],
  },
  ...['debug.js', 'wasi_defs.js', 'fd.js', 'fs_mem.js', 'wasi.js'].map((file) => ({
    path: `vendor/browser-wasi-shim/${file}`,
    minBytes: file === 'wasi.js' || file === 'fs_mem.js' ? 5_000 : 50,
    urls: [
      `https://cdn.jsdelivr.net/npm/@bjorn3/browser_wasi_shim@0.4.2/dist/${file}`,
      `https://unpkg.com/@bjorn3/browser_wasi_shim@0.4.2/dist/${file}`,
    ],
  })),
]

async function existsWithMinimumSize(pathname, minimum) {
  try {
    const info = await stat(pathname)
    return info.isFile() && info.size >= minimum
  } catch {
    return false
  }
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: { 'user-agent': 'SabotPress-build/1.0' },
      })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      return new Uint8Array(await response.arrayBuffer())
    } catch (error) {
      lastError = error
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 750))
    }
  }
  throw lastError || new Error(`Unable to download ${url}`)
}

async function prepareAsset(asset) {
  const pathname = join(PUBLIC_DIR.pathname, asset.path)
  if (await existsWithMinimumSize(pathname, asset.minBytes)) return
  await mkdir(dirname(pathname), { recursive: true })

  const errors = []
  for (const url of asset.urls) {
    try {
      const bytes = await fetchWithRetry(url)
      if (bytes.byteLength < asset.minBytes) {
        throw new Error(`download was unexpectedly small (${bytes.byteLength} bytes)`)
      }
      await writeFile(pathname, bytes)
      console.log(`Prepared ${asset.path} (${bytes.byteLength} bytes)`)
      return
    } catch (error) {
      errors.push(`${url}: ${error?.message || error}`)
    }
  }
  throw new Error(`Unable to prepare ${asset.path}\n${errors.join('\n')}`)
}

await mkdir(PUBLIC_DIR, { recursive: true })
for (const asset of assets) await prepareAsset(asset)

const notice = `Sabot local speech runtime assets\n\nVoice: Flite cmu_us_lnh (CMU ARCTIC / FestVox)\nFlite WASI build: @echogarden/flite-wasi 0.1.1\nBrowser WASI shim: @bjorn3/browser_wasi_shim 0.4.2\n\nThese files are fetched at build time and served from the Sabot origin. Runtime speech text is processed locally in the browser and is not sent to the upstream projects or a speech API.\n`
await writeFile(join(PUBLIC_DIR.pathname, 'README.txt'), notice)
console.log(`Flite TTS assets ready under ${PUBLIC_DIR.pathname.replace(ROOT.pathname, '')}`)

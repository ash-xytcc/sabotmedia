import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, relative, sep } from 'node:path'
import { readdirSync, statSync } from 'node:fs'

function collectHtmlInputs(dir, base = process.cwd(), out = {}) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === 'public' || name === '.git') continue
    const full = resolve(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      collectHtmlInputs(full, base, out)
      continue
    }
    if (!name.endsWith('.html')) continue
    const rel = relative(base, full).split(sep).join('/')
    const key = rel.replace(/\/index\.html$/i, '').replace(/\.html$/i, '').replace(/[^a-z0-9/_-]+/gi, '-').replace(/\//g, '-') || 'main'
    out[key] = full
  }
  return out
}

export default defineConfig(async ({command}) => ({
  plugins: [react(), ...(command === 'serve' && process.env.SABOT_COURSE_PREVIEW === '1' ? (await import('./tests/course-preview.config.mjs')).default.plugins : [])],
  build: {
    rollupOptions: {
      input: collectHtmlInputs(process.cwd()),
    },
  },
  server: {
    port: 4173,
    host: true,
    allowedHosts: ['terminal.local'],
  },
}))

import test from 'node:test'
import assert from 'node:assert/strict'
import { getImposedZinePdf } from '../src/lib/imposedZinePdf.js'

test('finds the printer-friendly imposed PDF in imported article content', () => {
  const piece = {
    slug: 'zine-example',
    bodyHtml: `
      <a href="https://example.org/reader.pdf">Online Reader Version</a>
      <a href="https://example.org/imposed.pdf">Imposed (8.5 x 11)</a>
      <a href="https://example.org/bw-imposed.pdf">Printer Friendly Imposed (8.5 x 11)</a>
    `,
  }

  assert.equal(getImposedZinePdf(piece), 'https://example.org/bw-imposed.pdf')
})

test('decodes escaped query strings and does not mistake the reader PDF for imposed', () => {
  const piece = {
    content: '<a href="https://example.org/reader.pdf">Imposed Online Reader</a><a href="https://example.org/imposed.pdf?x=1&amp;y=2">Download Imposed version</a>',
  }

  assert.equal(getImposedZinePdf(piece), 'https://example.org/imposed.pdf?x=1&y=2')
})

test('uses an explicit print asset or publication asset when present', () => {
  const piece = { slug: 'zine-example', relatedPrintLinks: [{ title: 'Imposed edition', url: 'https://example.org/asset-imposed.pdf' }] }
  const fromPublication = { slug: 'other-zine', pieceSlugs: ['zine-example'], visibility: 'public', assets: { imposedPdf: 'https://example.org/publication.pdf' } }

  assert.equal(getImposedZinePdf(piece), 'https://example.org/asset-imposed.pdf')
  assert.equal(getImposedZinePdf({ slug: 'zine-example' }, [fromPublication]), 'https://example.org/publication.pdf')
})

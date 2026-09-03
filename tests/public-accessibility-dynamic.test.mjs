import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const gate = fs.readFileSync(new URL('../src/components/PublicAccessibilityGate.jsx', import.meta.url), 'utf8')

test('public accessibility refreshes after meaningful async content changes', () => {
  assert.match(gate, /MutationObserver/)
  assert.match(gate, /childList: true/)
  assert.match(gate, /subtree: true/)
  assert.match(gate, /attributeFilter: \['alt', 'src', 'hidden', 'aria-hidden'\]/)
  assert.match(gate, /setContentRevision/)
})

test('generated image-description nodes do not create an observer feedback loop', () => {
  assert.match(gate, /data-sabot-generated-image-description/)
  assert.match(gate, /isGeneratedAccessibilityNode/)
  assert.match(gate, /!mutations\.some\(mutationNeedsAccessibilityRefresh\)/)
})

test('reader cache is invalidated by remounting the accessibility panel revision', () => {
  assert.match(gate, /<PublicAccessibilityPanel key=\{`\$\{pathname\}:\$\{contentRevision\}`\} \/>/)
})

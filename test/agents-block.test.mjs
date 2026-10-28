import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const script = new URL('../scripts/agents-block.mjs', import.meta.url).pathname
const run = (target, flag) => spawnSync('node', [script, flag, '--target=' + target], { encoding: 'utf8' })

test('install, status, update and revert leave the rest of the file untouched', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pos-agents-'))
  const target = join(dir, 'AGENTS.md')
  const original = '# Global\n\nRegel eins.\n\n<!-- GEMEINSAM:ENDE -->\n\n## Diese Maschine\n\nPfade.\n'
  writeFileSync(target, original)

  assert.equal(run(target, '--status').status, 1)            // missing
  assert.match(run(target, '--install').stdout, /inserted/)
  assert.equal(run(target, '--status').status, 0)            // current
  const withBlock = readFileSync(target, 'utf8')
  assert.ok(withBlock.startsWith(original.trimEnd()))
  assert.ok(withBlock.includes('Das Feld `description` ist der Name der Karte'))
  assert.match(run(target, '--install').stdout, /already current/)

  // an outdated block is replaced in place, text after it survives
  writeFileSync(target, withBlock.replace('Das Feld `description` ist der Name der Karte', 'ALT') + '\n## Danach\n\nbleibt.\n')
  assert.equal(run(target, '--status').status, 1)            // outdated
  assert.match(run(target, '--install').stdout, /updated/)
  const updated = readFileSync(target, 'utf8')
  assert.ok(updated.includes('Das Feld `description` ist der Name der Karte'))
  assert.ok(!updated.includes('ALT'))
  assert.ok(updated.includes('## Danach\n\nbleibt.'))

  assert.match(run(target, '--revert').stdout, /removed/)
  const reverted = readFileSync(target, 'utf8')
  assert.ok(!reverted.includes('PROJECTOS'))
  assert.ok(reverted.startsWith(original.trimEnd()))
  assert.ok(reverted.includes('## Danach'))
})

test('damaged markers are refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pos-agents-'))
  const target = join(dir, 'AGENTS.md')
  writeFileSync(target, 'x\n<!-- PROJECTOS:ENDE -->\n')
  const r = run(target, '--install')
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /damaged/)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, lstatSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, plan, revert } from '../scripts/link-dsh.mjs'

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'pos-links-'))
  const repo = join(root, 'repo'); const home = join(root, 'dsh')
  mkdirSync(join(repo, 'patches'), { recursive: true }); mkdirSync(join(repo, 'rollen'), { recursive: true })
  mkdirSync(join(home, 'patches'), { recursive: true }); mkdirSync(join(home, 'rollen'), { recursive: true })
  writeFileSync(join(repo, 'patches', 'a.mjs'), 'AAA'); writeFileSync(join(repo, 'patches', 'b.mjs'), 'BBB')
  writeFileSync(join(repo, 'rollen', 'x.md'), 'XXX')
  writeFileSync(join(repo, 'dsh-links.json'), JSON.stringify({ links: [
    { from: 'patches/a.mjs', to: 'patches/a.mjs' }, { from: 'patches/b.mjs', to: 'patches/b.mjs' },
    { from: 'rollen', to: 'rollen', kind: 'dir' },
  ] }))
  return { repo, home }
}

test('links: same files become links, a differing file is NOT touched', () => {
  const { repo, home } = fixture()
  writeFileSync(join(home, 'patches', 'a.mjs'), 'AAA')      // byte-gleich
  writeFileSync(join(home, 'patches', 'b.mjs'), 'ANDERS')   // weicht ab
  writeFileSync(join(home, 'rollen', 'x.md'), 'XXX')
  assert.deepEqual(plan(repo, home).map((r) => r.state), ['copy-same', 'copy-diff', 'copy-same'])
  const result = apply(repo, home).map((r) => r.result)
  assert.deepEqual(result, ['linked', 'copy-diff', 'linked'])
  assert.ok(lstatSync(join(home, 'patches', 'a.mjs')).isSymbolicLink())
  assert.equal(readFileSync(join(home, 'patches', 'b.mjs'), 'utf8'), 'ANDERS')
  assert.deepEqual(plan(repo, home).map((r) => r.state), ['linked', 'copy-diff', 'linked'])
})

test('links: missing target is linked; a link elsewhere is left alone; revert copies back', () => {
  const { repo, home } = fixture()
  rmSync(join(home, 'rollen'), { recursive: true })                              // Zielordner fehlt ganz
  symlinkSync(join(repo, 'patches', 'b.mjs'), join(home, 'patches', 'a.mjs'))   // zeigt auf die falsche Datei
  assert.deepEqual(apply(repo, home).map((r) => r.result), ['wrong-link', 'linked', 'linked'])
  assert.ok(lstatSync(join(home, 'rollen')).isSymbolicLink())
  assert.equal(readFileSync(join(home, 'rollen', 'x.md'), 'utf8'), 'XXX')        // durch den Verweis lesbar
  assert.deepEqual(revert(repo, home).map((r) => r.result), ['wrong-link', 'copied-back', 'copied-back'])
  assert.ok(!lstatSync(join(home, 'patches', 'b.mjs')).isSymbolicLink())
  assert.ok(!lstatSync(join(home, 'rollen')).isSymbolicLink())
  assert.equal(readFileSync(join(home, 'rollen', 'x.md'), 'utf8'), 'XXX')
})

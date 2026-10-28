#!/usr/bin/env node
// Puts agents/projectos-agents.md between two markers into an AGENTS.md (default ~/.dsh/AGENTS.md).
//   node scripts/agents-block.mjs --status            is the block there, and is it current?
//   node scripts/agents-block.mjs --install           insert or update the block (backup first)
//   node scripts/agents-block.mjs --revert            remove the block again
//   --target=<file>                                   work on another file (tests)
// The block goes at the END of the file, outside the shared region of ~/.dsh/AGENTS.md.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const BEGIN = '<!-- PROJECTOS:ANFANG — kommt aus dsh-projectOS (agents/projectos-agents.md); hier nicht ändern -->'
const END = '<!-- PROJECTOS:ENDE -->'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const targetArg = args.find((a) => a.startsWith('--target='))
const target = targetArg ? targetArg.slice('--target='.length) : join(homedir(), '.dsh', 'AGENTS.md')
const source = readFileSync(join(root, 'agents', 'projectos-agents.md'), 'utf8').trimEnd()
const block = `${BEGIN}\n\n${source}\n\n${END}\n`

export function split(text) {
  const a = text.indexOf(BEGIN)
  const b = text.indexOf(END)
  if (a < 0 && b < 0) return { before: text, inside: undefined, after: '' }
  if (a < 0 || b < a) throw new Error('markers are damaged: refusing to touch ' + target)
  return { before: text.slice(0, a), inside: text.slice(a, b + END.length), after: text.slice(b + END.length).replace(/^\n/, '') }
}

const text = existsSync(target) ? readFileSync(target, 'utf8') : ''
const parts = split(text)
const current = parts.inside === undefined ? 'missing' : parts.inside === block.trimEnd() ? 'current' : 'outdated'

if (args.includes('--status') || args.length === 0) {
  console.log(`${target}: block ${current}`)
  process.exit(current === 'current' ? 0 : 1)
}

function backup() {
  const dir = join(dirname(target), 'patches', 'backup-projectos-agents')
  mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const file = join(dir, `AGENTS.md.${stamp}`)
  if (existsSync(target)) copyFileSync(target, file)
  return file
}

if (args.includes('--install')) {
  if (current === 'current') { console.log('already current, nothing to do'); process.exit(0) }
  const saved = backup()
  const next = parts.inside === undefined
    ? parts.before.trimEnd() + '\n\n' + block
    : parts.before + block + (parts.after === '' ? '' : '\n' + parts.after)
  writeFileSync(target, next)
  console.log(`block ${current === 'missing' ? 'inserted' : 'updated'} in ${target}; backup ${saved}`)
} else if (args.includes('--revert')) {
  if (parts.inside === undefined) { console.log('no block there, nothing to do'); process.exit(0) }
  const saved = backup()
  writeFileSync(target, parts.before.trimEnd() + (parts.after === '' ? '\n' : '\n\n' + parts.after))
  console.log(`block removed from ${target}; backup ${saved}`)
} else {
  console.error('use --status, --install or --revert')
  process.exit(2)
}

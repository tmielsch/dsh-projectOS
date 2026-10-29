import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildWorkspaces, departmentActivity, baselineOf, diffTicker, feedOf, activityOf, applyNames, agoOf, levelCards,
} from '../.build/model.mjs'
import { fold, definition, lastLine } from '../src/host/index.js'

const row = (id, over = {}) => ({ id, displayTitle: id, running: false, updatedAt: 1, ...over })
const task = (id, over = {}) => ({ id, revision: 1, subject: id, description: '', status: 'pending', blockedBy: [], writeScopes: [], ready: true, writeScopeWarnings: [], ...over })
function world(over = {}) {
  return {
    ids: ['lead', 'e1', 's1', 'solo', 'soloKid'],
    byId: {
      lead: row('lead', { displayTitle: 'Haus bauen', cwd: '/w/proj', updatedAt: 500 }),
      e1: row('e1', { parentId: 'lead', origin: 'subagent', running: over.e1Running ?? false, updatedAt: 900 }),
      s1: row('s1', { parentId: 'e1', origin: 'subagent', running: over.s1Running ?? false, updatedAt: 700 }),
      solo: row('solo', { displayTitle: 'Einzelchat', cwd: '/w/proj' }),
      soloKid: row('soloKid', { parentId: 'solo', origin: 'subagent' }),
    },
    projectionsBySession: {
      lead: { values: {
        agentTeam: { members: [{ id: 'e1', name: 'strata', role: 'teammate', phase: 'active' }], tasks: over.tasks ?? [] },
        subagentCatalog: [],
      } },
      e1: { values: { subagentCatalog: [{ id: 's1', createdAt: 5, mode: 'continuable', label: 'Messung' }], projectOsActivity: over.activity } },
      solo: { values: { subagentCatalog: [{ id: 'soloKid', createdAt: 1, mode: 'one-shot', label: 'x' }] } },
    },
  }
}

test('a lone lead with only helpers is NOT a department', () => {
  const ws = buildWorkspaces(world())
  assert.deepEqual(ws.map((w) => w.departments.map((d) => d.leadId)), [['lead']])
})

test('activity: inactive when nothing runs, active when anything below runs; last activity is the newest below', () => {
  const idle = buildWorkspaces(world())[0].departments[0]
  assert.deepEqual(departmentActivity(world(), idle), { active: false, working: 0, lastActiveAt: 900 })
  const busyList = world({ s1Running: true })
  const busy = buildWorkspaces(busyList)[0].departments[0]
  assert.deepEqual(departmentActivity(busyList, busy), { active: true, working: 1, lastActiveAt: 900 })
})

test('ticker: first sight seeds, later changes become lines', () => {
  const a = buildWorkspaces(world())[0].departments[0]
  const first = diffTicker(undefined, baselineOf(world(), a), 'lead', 1000)
  assert.equal(first.length, 0)
  const bList = world({ e1Running: true, tasks: [task('t1', { status: 'in_progress', ownerName: 'strata', description: 'Stand: messe Kante' })] })
  const b = buildWorkspaces(bList)[0].departments[0]
  const lines = diffTicker(baselineOf(world(), a), baselineOf(bList, b), 'lead', 2000)
  assert.deepEqual(lines.map((l) => l.kind).sort(), ['started', 'task-new', 'task-note'])
  const done = diffTicker(baselineOf(bList, b), baselineOf(world(), a), 'lead', 3000)
  assert.deepEqual(done.map((l) => l.kind), ['finished'])
})

test('projection: thought shows on the card of a working session; feed prefers fresh activity', () => {
  const list = world({ e1Running: true, activity: { thought: 'Prüfe Kante B2', said: '', tool: 'bash', at: 4000 } })
  const dep = buildWorkspaces(list)[0].departments[0]
  const card = levelCards(list, dep, 'lead')[0]
  assert.equal(card.thought, 'Prüfe Kante B2')
  assert.equal(card.tool, 'bash')
  const feed = feedOf(list, dep, [], 5000)
  assert.equal(feed[0].kind, 'thought')
  assert.equal(feed[0].who, 'strata')
  // an old finished session is not in the feed
  const old = world({ activity: { thought: 'alt', said: '', tool: '', at: 1000 } })
  assert.equal(feedOf(old, buildWorkspaces(old)[0].departments[0], [], 1000 + 11 * 60 * 1000).length, 0)
  assert.equal(activityOf(world(), 'e1'), undefined)
})

test('names given by the user replace the session title; empty falls back', () => {
  const ws = buildWorkspaces(world())
  assert.equal(applyNames(ws, { lead: ' Hausbau ' })[0].departments[0].title, 'Hausbau')
  assert.equal(applyNames(ws, { lead: '  ' })[0].departments[0].title, 'Haus bauen')
})

test('agoOf units', () => {
  assert.deepEqual(agoOf(0, 10_000), { unit: 'now', n: 0 })
  assert.deepEqual(agoOf(0, 5 * 60_000), { unit: 'min', n: 5 })
  assert.deepEqual(agoOf(0, 3 * 3600_000), { unit: 'hour', n: 3 })
  assert.deepEqual(agoOf(0, 2 * 86400_000), { unit: 'day', n: 2 })
})

test('host fold: last line of reasoning and text, last tool, same reference when nothing changes', () => {
  let s = definition.init()
  const ev = (type, data, time) => ({ type, data, time })
  s = fold(s, ev('assistant/message', { message: { content: [{ type: 'reasoning', text: 'a\n\n> **Dann** messe ich B2\n' }, { type: 'text', text: 'Fertig.' }] } }, 10))
  assert.deepEqual(s, { thought: 'Dann messe ich B2', said: 'Fertig.', tool: '', at: 10 })
  assert.equal(fold(s, ev('tool/result', {}, 11)), s)
  const t = fold(s, ev('tool/call', { name: 'bash' }, 12))
  assert.equal(t.tool, 'bash')
  assert.equal(fold(t, ev('tool/call', { name: 'bash' }, 13)), t)
  assert.equal(fold(t, null), t)
  assert.equal(fold(t, ev('assistant/message', { message: { content: 5 } }, 14)), t)
  assert.equal(lastLine('x'.repeat(500)).length, 240)
  assert.ok(definition.stateSchema.safeParse(t).success)
})

import { apply, inject, name } from '../src/host/index.js'
test('host apply: registers once, survives a throwing register, exports name and inject', () => {
  assert.equal(name, 'project-os')
  assert.deepEqual(inject, ['sessionProjections'])
  const seen = []
  apply({ sessionProjections: { register: (d) => { seen.push(d.key); return () => {} } } })
  assert.deepEqual(seen, ['projectOsActivity'])
  const warned = []
  apply({ sessionProjections: { register() { throw new Error('boom') } }, logger: () => ({ warn: (m) => warned.push(m) }) })
  assert.equal(warned.length, 1)
  assert.match(warned[0], /boom/)
})

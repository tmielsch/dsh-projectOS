import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildWorkspaces, levelCards, childCards, inLane, claimedTasks, summary, readableTitle,
  baseName, laneOf, isHelpersId, nameOf, childIdsOf,
} from '../.build/model.mjs'

// Shaped like SPEC B7: byId rows, agentTeam on the lead, subagentCatalog on every parent.
const row = (id, over = {}) => ({ id, displayTitle: id, running: false, updatedAt: 1, ...over })
const list = {
  ids: ['lead', 'exp1', 'exp2', 's1', 's2', 's2a', 'h1', 'h2', 'h3', 'other'],
  byId: {
    lead: row('lead', { displayTitle: 'STRATA Experte Hausbau', cwd: '/Users/t/proj' }),
    exp1: row('exp1', { displayTitle: '<system-reminder> You are teammate', parentId: 'lead', origin: 'subagent', running: true }),
    exp2: row('exp2', { displayTitle: 'Zweiter', parentId: 'lead', origin: 'subagent' }),
    s1: row('s1', { displayTitle: '> ## ERSTER SATZ: Du arbeitest', parentId: 'exp1', origin: 'subagent', running: true }),
    s2: row('s2', { displayTitle: 'Untersuche einen Fehler', parentId: 'exp1', origin: 'subagent' }),
    s2a: row('s2a', { displayTitle: 'Enkel', parentId: 's2', origin: 'subagent', running: true }),
    h1: row('h1', { displayTitle: '<system-reminder> You are x', parentId: 'lead', origin: 'subagent' }),
    h2: row('h2', { displayTitle: 'R2 416 reconstruction', parentId: 'lead', origin: 'subagent', running: true }),
    h3: row('h3', { displayTitle: 'Suche', parentId: 'lead', origin: 'subagent' }),
    other: row('other', { displayTitle: 'Einzelchat', cwd: '/Users/t/other' }),
  },
  projectionsBySession: {
    lead: { values: { agentTeam: {
      members: [
        { id: 'lead', name: 'lead', role: 'lead', phase: 'active' },
        { id: 'exp1', name: 'strata', role: 'teammate', phase: 'active' },
        { id: 'exp2', name: 'workflow', role: 'teammate', phase: 'failed', error: 'boom' },
      ],
      tasks: [
        { id: 't1', revision: 1, subject: 'A', description: '', status: 'in_progress', blockedBy: [], writeScopes: [], ownerName: 'strata', ready: false, writeScopeWarnings: [] },
        { id: 't2', revision: 1, subject: 'B', description: '', status: 'pending', blockedBy: ['t1'], writeScopes: [], ready: false, writeScopeWarnings: [] },
        { id: 't3', revision: 2, subject: 'C', description: '', status: 'completed', blockedBy: [], writeScopes: [], ownerName: 'workflow', ready: true, writeScopeWarnings: [] },
      ],
    } } },
    exp1: { values: { subagentCatalog: [
      { id: 's1', createdAt: 100, mode: 'continuable', label: 'Red-Team Plan prüfen' },
      { id: 's2', createdAt: 200, mode: 'one-shot', label: 'Messung Kante' },
    ] } },
    s2: { values: { subagentCatalog: [{ id: 's2a', createdAt: 300, mode: 'one-shot', label: 'Enkel-Label' }] } },
    lead: undefined,
  },
}
// the lead entry above was overwritten by `lead: undefined`: rebuild it properly
list.projectionsBySession.lead = { values: {
  agentTeam: {
    members: [
      { id: 'lead', name: 'lead', role: 'lead', phase: 'active' },
      { id: 'exp1', name: 'strata', role: 'teammate', phase: 'active' },
      { id: 'exp2', name: 'workflow', role: 'teammate', phase: 'failed', error: 'boom' },
    ],
    tasks: [
      { id: 't1', revision: 1, subject: 'A', description: '', status: 'in_progress', blockedBy: [], writeScopes: [], ownerName: 'strata', ready: false, writeScopeWarnings: [] },
      { id: 't2', revision: 1, subject: 'B', description: '', status: 'pending', blockedBy: ['t1'], writeScopes: [], ready: false, writeScopeWarnings: [] },
      { id: 't3', revision: 2, subject: 'C', description: '', status: 'completed', blockedBy: [], writeScopes: [], ownerName: 'workflow', ready: true, writeScopeWarnings: [] },
    ],
  },
  subagentCatalog: [
    { id: 'h1', createdAt: 10, mode: 'continuable', label: 'Hilfe eins' },
    { id: 'h2', createdAt: 20, mode: 'continuable', label: 'R2 416 reconstruction' },
    { id: 'h3', createdAt: 30, mode: 'one-shot', label: 'Suche' },
    { id: 'exp1', createdAt: 5, mode: 'continuable', label: 'strata' },
  ],
} }

const dep = () => buildWorkspaces(list)[0].departments[0]

test('baseName and readableTitle', () => {
  assert.equal(baseName('/a/b/proj'), 'proj')
  assert.equal(baseName('C:\\a\\proj\\'), 'proj')
  assert.equal(readableTitle('<system-reminder> You are', 'session-12345678-aaaa'), '12345678')
  assert.equal(readableTitle('> ## ERSTER SATZ: Du arbeitest', 'x'), 'ERSTER SATZ: Du arbeitest')
  assert.equal(readableTitle('```', 'abcdefgh1234'), 'abcdefgh')
  assert.equal(readableTitle('Klartext', 'x'), 'Klartext')
})

test('only sessions with at least one teammate are departments', () => {
  const groups = buildWorkspaces(list)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].name, 'proj')
  assert.equal(groups[0].departments.length, 1)
  assert.equal(groups[0].departments[0].leadId, 'lead')
})

test('top level: group leads plus ONE helpers card; no specialists, no helpers in the list', () => {
  const cards = levelCards(list, dep(), 'lead')
  assert.deepEqual(cards.map((c) => c.kind).sort(), ['group-lead', 'group-lead', 'helpers'])
  assert.equal(cards.length, 3)
  const helpers = cards.find((c) => c.kind === 'helpers')
  assert.equal(isHelpersId(helpers.id), true)
  assert.equal(helpers.children, 3)          // h1 h2 h3, NOT the team member exp1
  assert.equal(helpers.childrenWorking, 1)   // h2
})

test('team members are never counted as helpers', () => {
  const ids = childIdsOf(list, 'lead')
  assert.ok(ids.includes('exp1'))
  const helpers = levelCards(list, dep(), 'lead').find((c) => c.kind === 'helpers')
  assert.equal(helpers.children, 3)
})

test('group lead card: lane from team phase, children counted one level down', () => {
  const cards = levelCards(list, dep(), 'lead')
  const strata = cards.find((c) => c.name === 'strata')
  const workflow = cards.find((c) => c.name === 'workflow')
  assert.equal(strata.lane, 'working')
  assert.equal(strata.children, 2)
  assert.equal(strata.childrenWorking, 1)
  assert.equal(workflow.lane, 'failed')
  assert.equal(workflow.error, 'boom')
})

test('entering a group lead shows only its direct specialists, named by catalog label, newest first', () => {
  const cards = levelCards(list, dep(), 'exp1')
  assert.deepEqual(cards.map((c) => c.id).sort(), ['s1', 's2'])
  assert.equal(cards.find((c) => c.id === 's1').name, 'Red-Team Plan prüfen')
  assert.equal(cards.find((c) => c.id === 's2').name, 'Messung Kante')
  assert.ok(cards.every((c) => c.kind === 'specialist'))
  assert.equal(cards.find((c) => c.id === 's1').lane, 'working')
  assert.equal(cards.find((c) => c.id === 's2').lane, 'done')   // never "waiting for an order"
  assert.deepEqual(inLane(cards, 'done').map((c) => c.id), ['s2'])
})

test('nesting: a specialist has its own children one level further down', () => {
  const s2 = levelCards(list, dep(), 'exp1').find((c) => c.id === 's2')
  assert.equal(s2.children, 1)
  const kids = childCards(list, dep(), s2)
  assert.deepEqual(kids.map((c) => c.id), ['s2a'])
  assert.equal(kids[0].name, 'Enkel-Label')
  assert.equal(levelCards(list, dep(), 's2a').length, 0)
})

test('helpers card opens to the helpers, with readable names', () => {
  const helpersId = levelCards(list, dep(), 'lead').find((c) => c.kind === 'helpers').id
  const cards = levelCards(list, dep(), helpersId)
  assert.deepEqual(cards.map((c) => c.id).sort(), ['h1', 'h2', 'h3'])
  assert.ok(cards.every((c) => c.kind === 'helper'))
  assert.equal(cards.find((c) => c.id === 'h1').name, 'Hilfe eins')
  assert.deepEqual(inLane(cards, 'working').map((c) => c.id), ['h2'])
  assert.deepEqual(inLane(cards, 'done').map((c) => c.id), ['h3', 'h1'])   // newest first
})

test('claimed tasks only for group leads, matched by owner name', () => {
  const cards = levelCards(list, dep(), 'lead')
  assert.deepEqual(claimedTasks(dep(), cards.find((c) => c.name === 'strata')).map((t) => t.id), ['t1'])
  assert.deepEqual(claimedTasks(dep(), cards.find((c) => c.kind === 'helpers')), [])
})

test('summary counts work groups and everything that is working below', () => {
  const s = summary(list, dep())
  assert.equal(s.groups, 2)
  assert.equal(s.working, 4)        // exp1, s1, s2a... plus h2 = 4
  assert.equal(s.tasksOpen, 1)
  assert.equal(s.tasksRunning, 1)
  assert.equal(s.tasksDone, 1)
})

test('nameOf prefers the member name, then the catalog label, then a readable title', () => {
  assert.equal(nameOf(list, dep(), 'exp1'), 'strata')
  assert.equal(nameOf(list, dep(), 's1'), 'Red-Team Plan prüfen')
  assert.equal(nameOf(list, dep(), 'lead'), 'STRATA Experte Hausbau')
})

test('laneOf rules for team members', () => {
  assert.equal(laneOf({ phase: 'provisioning', running: false }), 'starting')
  assert.equal(laneOf({ phase: 'resting', running: false }), 'resting')
  assert.equal(laneOf({ phase: 'active', running: true }), 'working')
  assert.equal(laneOf({ phase: 'active', running: false }), 'waiting')
  assert.equal(laneOf({ error: 'x', running: true }), 'failed')
})

test('retired members do not appear', () => {
  const copy = JSON.parse(JSON.stringify(list))
  copy.projectionsBySession.lead.values.agentTeam.members.push({ id: 'old', name: 'old', role: 'teammate', phase: 'retired' })
  const d = buildWorkspaces(copy)[0].departments[0]
  assert.equal(levelCards(copy, d, 'lead').filter((c) => c.kind === 'group-lead').length, 2)
})

test('empty list gives no departments', () => {
  assert.deepEqual(buildWorkspaces({ ids: [], byId: {} }), [])
})

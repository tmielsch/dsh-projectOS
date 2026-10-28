import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildWorkspaces, laneOf, claimedTasks, workersInLane, summary, baseName } from '../.build/model.mjs'

// Data shaped like SPEC B7: byId rows, agentTeam projection on the lead, subagentCatalog on the group lead.
const list = {
  ids: ['lead', 'exp1', 'exp2', 'spec1', 'spec2', 'help1', 'other'],
  byId: {
    lead: { id: 'lead', displayTitle: 'Strata Lead', cwd: '/Users/t/proj', running: false, updatedAt: 1 },
    exp1: { id: 'exp1', displayTitle: 'Experte', cwd: '/Users/t/proj', parentId: 'lead', origin: 'subagent', running: true, updatedAt: 2 },
    exp2: { id: 'exp2', displayTitle: 'Zweiter', cwd: '/Users/t/proj', parentId: 'lead', origin: 'subagent', running: false, updatedAt: 3 },
    spec1: { id: 'spec1', displayTitle: 'Red-Team', parentId: 'exp1', origin: 'subagent', running: true, updatedAt: 4 },
    spec2: { id: 'spec2', displayTitle: 'Messer', parentId: 'exp1', origin: 'subagent', running: false, updatedAt: 5 },
    help1: { id: 'help1', displayTitle: 'Suche', parentId: 'lead', origin: 'subagent', running: false, updatedAt: 6 },
    other: { id: 'other', displayTitle: 'Einzelchat', cwd: '/Users/t/other', running: false, updatedAt: 7 },
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
      { id: 'spec1', mode: 'continuable', label: 'Red-Team' },
      { id: 'spec2', mode: 'one-shot', label: 'Messer' },
    ] } },
    lead2: undefined,
  },
}

test('baseName handles both separators', () => {
  assert.equal(baseName('/a/b/proj'), 'proj')
  assert.equal(baseName('C:\\a\\proj\\'), 'proj')
})

test('only sessions with at least one teammate are departments', () => {
  const groups = buildWorkspaces(list)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].name, 'proj')
  assert.equal(groups[0].departments.length, 1)
  assert.equal(groups[0].departments[0].leadId, 'lead')
})

test('workers: two group leads, two specialists, one helper', () => {
  const dep = buildWorkspaces(list)[0].departments[0]
  const by = (kind) => dep.workers.filter((w) => w.kind === kind)
  assert.equal(by('group-lead').length, 2)
  assert.equal(by('specialist').length, 2)
  assert.equal(by('helper').length, 1)
  assert.equal(dep.workers.length, 5)
})

test('specialists belong to the group of their group lead', () => {
  const dep = buildWorkspaces(list)[0].departments[0]
  for (const w of dep.workers.filter((x) => x.kind === 'specialist')) assert.equal(w.group, 'strata')
})

test('lanes', () => {
  const dep = buildWorkspaces(list)[0].departments[0]
  const lane = (id) => dep.workers.find((w) => w.id === id).lane
  assert.equal(lane('exp1'), 'working')
  assert.equal(lane('exp2'), 'failed')
  assert.equal(lane('spec1'), 'working')
  assert.equal(lane('spec2'), 'done')      // one-shot, not running
  assert.equal(lane('help1'), 'waiting')
})

test('laneOf rules', () => {
  assert.equal(laneOf({ phase: 'provisioning', running: false }), 'starting')
  assert.equal(laneOf({ phase: 'resting', running: false }), 'resting')
  assert.equal(laneOf({ phase: 'active', running: true }), 'working')
  assert.equal(laneOf({ error: 'x', running: true }), 'failed')
})

test('claimed tasks come from ownerName of the group lead only', () => {
  const dep = buildWorkspaces(list)[0].departments[0]
  const exp1 = dep.workers.find((w) => w.id === 'exp1')
  const spec1 = dep.workers.find((w) => w.id === 'spec1')
  assert.deepEqual(claimedTasks(dep, exp1).map((t) => t.id), ['t1'])
  assert.deepEqual(claimedTasks(dep, spec1), [])
})

test('lane listing and summary', () => {
  const dep = buildWorkspaces(list)[0].departments[0]
  assert.deepEqual(workersInLane(dep, 'working').map((w) => w.id), ['exp1', 'spec1'])
  const s = summary(dep)
  assert.equal(s.workers, 5)
  assert.equal(s.working, 2)
  assert.equal(s.tasksOpen, 1)
  assert.equal(s.tasksRunning, 1)
  assert.equal(s.tasksDone, 1)
})

test('empty list gives no departments', () => {
  assert.deepEqual(buildWorkspaces({ ids: [], byId: {} }), [])
})

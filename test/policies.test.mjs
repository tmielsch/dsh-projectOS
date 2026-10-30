import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PolicyController, apply, cardView, enabledBodies, findWorkspace, markRemote, policyDomainSpec,
  policyPromptText, policyRecordSchema, seedCards, sortCards, switchKey, workspaceCards,
} from '../src/host/index.js'

// A stand-in for an opened domain: two maps with the table API the real one has
// (get / entries / values / size / put / delete), writes async like the real ones.
function fakeDomain(cards = [], switches = []) {
  const library = new Map(cards.map((c) => [c.id, c]))
  const workspace = new Map(switches.map((s) => [switchKey(s.workspaceId, s.policyId), s]))
  const table = (map) => ({
    get: (key) => map.get(key),
    entries: () => [...map.entries()],
    values: () => [...map.values()],
    get size() { return map.size },
    put: async (key, value) => { map.set(key, value) },
    delete: async (key) => { map.delete(key) },
  })
  return {
    library, workspace,
    table: (name) => table(name === 'library' ? library : workspace),
    close: async () => {},
  }
}

const card = (id, title, body, order) => ({ id, title, body, order, createdAt: '2026-10-30', updatedAt: '2026-10-30' })
const registry = (items) => ({ list: () => items })

// ---------------------------------------------------------------------------

test('domain spec is valid: name and table names match the storage rules', () => {
  assert.equal(policyDomainSpec.name, 'workspace_policies')
  assert.deepEqual(Object.keys(policyDomainSpec.tables), ['library', 'workspace'])
  assert.match(policyDomainSpec.name, /^[a-z][a-z0-9_]*$/)
  for (const table of Object.keys(policyDomainSpec.tables)) assert.match(table, /^[a-z][a-z0-9_]*$/)
  // a record is validated by its schema; a stray field is rejected
  assert.ok(policyRecordSchema.safeParse(card('x', 'T', 'B', 0)).success)
  assert.ok(!policyRecordSchema.safeParse({ ...card('x', 'T', 'B', 0), extra: 1 }).success)
})

test('switch key is path-safe and reversible by split', () => {
  const key = switchKey('3f2a-uuid', 'lokalmodus')
  assert.match(key, /^[a-zA-Z0-9_-]+$/)
  const [workspaceId, policyId] = key.split('__')
  assert.equal(workspaceId, '3f2a-uuid')
  assert.equal(policyId, 'lokalmodus')
})

test('library order: by order, then title in code-unit order', () => {
  const cards = [card('c', 'Beta', 'b', 1), card('a', 'Alpha', 'a', 1), card('z', 'Zeta', 'z', 0)]
  assert.deepEqual(sortCards(cards).map((c) => c.id), ['z', 'a', 'c'])
})

test('workspace cards carry the switch state; a missing record means off', () => {
  const domain = fakeDomain([card('lokalmodus', 'Lokalmodus', 'BODY', 0)], [{ workspaceId: 'w1', policyId: 'lokalmodus', enabled: true }])
  const cards = workspaceCards(domain, 'w1')
  assert.equal(cards.length, 1)
  assert.equal(cards[0].enabled, true)
  assert.equal(workspaceCards(domain, 'w2')[0].enabled, false)
})

test('enabled bodies drop empty text and keep library order', () => {
  const domain = fakeDomain(
    [card('a', 'A', 'AAA', 1), card('b', 'B', '   ', 0), card('c', 'C', 'CCC', 2)],
    [{ workspaceId: 'w1', policyId: 'a', enabled: true }, { workspaceId: 'w1', policyId: 'b', enabled: true }, { workspaceId: 'w1', policyId: 'c', enabled: true }],
  )
  assert.deepEqual(enabledBodies(domain, 'w1').map((c) => c.id), ['a', 'c'])
})

test('workspace lookup: exact path first, then the longest containing path', () => {
  const items = [
    { id: 'w1', path: '/Users/t/proj' },
    { id: 'w2', path: '/Users/t/proj/sub' },
    { id: 'w3', path: '/Users/t/other' },
  ]
  assert.equal(findWorkspace(registry(items), '/Users/t/proj/sub')?.id, 'w2')
  assert.equal(findWorkspace(registry(items), '/Users/t/proj/sub/deep')?.id, 'w2')
  assert.equal(findWorkspace(registry(items), '/Users/t/proj/')?.id, 'w1')
  assert.equal(findWorkspace(registry(items), '/Users/t/elsewhere'), undefined)
  assert.equal(findWorkspace(registry(items), ''), undefined)
})

test('prompt text: one card gets its title in the heading, several get sections', () => {
  const domain = fakeDomain([card('a', 'A', 'AAA', 0)], [{ workspaceId: 'w1', policyId: 'a', enabled: true }])
  const text = policyPromptText(domain, registry([{ id: 'w1', path: '/Users/t/proj' }]), '/Users/t/proj')
  assert.ok(text.startsWith('# Workspace Policy (A) — active in this workspace'))
  assert.ok(text.includes('AAA'))

  const two = fakeDomain(
    [card('a', 'A', 'AAA', 0), card('b', 'B', 'BBB', 1)],
    [{ workspaceId: 'w1', policyId: 'a', enabled: true }, { workspaceId: 'w1', policyId: 'b', enabled: true }],
  )
  const t2 = policyPromptText(two, registry([{ id: 'w1', path: '/Users/t/proj' }]), '/Users/t/proj')
  assert.ok(t2.startsWith('# Workspace Policies — active in this workspace'))
  assert.ok(t2.includes('## A\nAAA') && t2.includes('## B\nBBB'))

  // nothing enabled, no workspace, no cwd -> empty string
  assert.equal(policyPromptText(fakeDomain([], []), registry([{ id: 'w1', path: '/Users/t/proj' }]), '/Users/t/proj'), '')
  assert.equal(policyPromptText(domain, registry([]), '/Users/t/proj'), '')
  assert.equal(policyPromptText(domain, registry([{ id: 'w1', path: '/Users/t/proj' }]), undefined), '')
})

test('the library seeds the Lokalmodus card once, when it is empty', () => {
  const seeds = seedCards('2026-10-30T12:00:00.000Z')
  assert.equal(seeds.length, 1)
  assert.equal(seeds[0].id, 'lokalmodus')
  assert.equal(seeds[0].title, 'Lokalmodus')
  assert.ok(seeds[0].body.includes('rein sequentiell'))
  assert.ok(seeds[0].body.includes('cosplayt'))
  assert.ok(seeds[0].body.includes('Cache hin und her'))
  assert.ok(seeds[0].body.includes('EINE Compaction'))
})

// ---------------------------------------------------------------------------
// The remote face: five methods, all through the same opened domain.
// ---------------------------------------------------------------------------

function controller(cards, switches) {
  const domain = fakeDomain(cards, switches)
  return { c: new PolicyController({}, Promise.resolve(domain)), domain }
}

test('remote listLibrary and listWorkspace return cards with their switch state', async () => {
  const { c } = controller([card('a', 'A', 'AAA', 0)], [{ workspaceId: 'w1', policyId: 'a', enabled: true }])
  const library = await c.listLibrary({})
  assert.equal(library.ok, true)
  assert.deepEqual(library.cards, [card('a', 'A', 'AAA', 0)])
  const out = await c.listWorkspace({ workspaceId: 'w1' })
  assert.equal(out.ok, true)
  assert.deepEqual(out.cards, [{ ...card('a', 'A', 'AAA', 0), enabled: true }])
  assert.equal((await c.listWorkspace({ workspaceId: 'w2' })).cards[0].enabled, false)
})

test('remote savePolicy creates and edits; empty title/body are refused', async () => {
  const { c } = controller([], [])
  const created = await c.savePolicy({ title: '  Ruhe  ', body: '  Text  ' })
  assert.equal(created.ok, true)
  assert.equal(created.card.title, 'Ruhe')
  assert.equal(created.card.body, 'Text')
  assert.match(created.card.id, /^p[0-9a-f]{16}$/)
  assert.equal((await c.savePolicy({ title: '', body: 'x' })).ok, false)
  assert.equal((await c.savePolicy({ title: 'x', body: '   ' })).ok, false)
  assert.equal((await c.savePolicy({ title: 'x'.repeat(200), body: 'y' })).ok, false)
  const edited = await c.savePolicy({ id: created.card.id, title: 'Ruhig', body: 'Neuer Text' })
  assert.equal(edited.card.title, 'Ruhig')
  assert.equal((await c.savePolicy({ id: 'nope', title: 'a', body: 'b' })).ok, false)
})

test('remote setEnable flips one switch and refuses an unknown card', async () => {
  const { c, domain } = controller([card('a', 'A', 'AAA', 0)], [])
  const on = await c.setEnable({ workspaceId: 'w1', policyId: 'a', enabled: true })
  assert.deepEqual(on, { ok: true, workspaceId: 'w1', policyId: 'a', enabled: true })
  assert.equal(workspaceCards(domain, 'w1')[0].enabled, true)
  const off = await c.setEnable({ workspaceId: 'w1', policyId: 'a', enabled: false })
  assert.equal(off.enabled, false)
  assert.equal(workspaceCards(domain, 'w1')[0].enabled, false)
  assert.equal((await c.setEnable({ workspaceId: 'w1', policyId: 'ghost', enabled: true })).ok, false)
})

test('remote deletePolicy removes the card and every switch naming it', async () => {
  const { c, domain } = controller([card('a', 'A', 'AAA', 0), card('b', 'B', 'BBB', 1)], [
    { workspaceId: 'w1', policyId: 'a', enabled: true },
    { workspaceId: 'w2', policyId: 'a', enabled: true },
    { workspaceId: 'w1', policyId: 'b', enabled: true },
  ])
  const out = await c.deletePolicy({ id: 'a' })
  assert.equal(out.ok, true)
  assert.equal(domain.library.size, 1)
  assert.equal(domain.workspace.size, 1)
  assert.equal(domain.workspace.get(switchKey('w1', 'b')).enabled, true)
  assert.equal((await c.deletePolicy({ id: 'a' })).ok, false)
})

// ---------------------------------------------------------------------------
// The typert marker is written the way the compiled decorator writes it.
// ---------------------------------------------------------------------------

const DESCRIPTOR_KEY = '@deepseek-ai/dsh-typert-protocol/remote-methods'

test('every remote method carries a direct marker on the prototype', () => {
  const descriptor = Object.getOwnPropertyDescriptor(PolicyController.prototype, DESCRIPTOR_KEY).value
  assert.equal(descriptor.version, 1)
  assert.deepEqual(descriptor.methods.map((m) => m.method), ['listLibrary', 'listWorkspace', 'savePolicy', 'deletePolicy', 'setEnable'])
  for (const marker of descriptor.methods) {
    assert.equal(marker.invocation.kind, 'direct')
    assert.equal(marker.exportName, undefined) // export name defaults to the method name
    assert.equal(marker.mode, undefined)
  }
  markRemote(PolicyController.prototype, 'setEnable') // idempotent: no duplicate marker
  assert.equal(Object.getOwnPropertyDescriptor(PolicyController.prototype, DESCRIPTOR_KEY).value.methods.length, 5)
})

test('the marker is a frozen, configurable own property of the prototype (the gateway reads it this way)', () => {
  const property = Object.getOwnPropertyDescriptor(PolicyController.prototype, DESCRIPTOR_KEY)
  assert.equal(property.configurable, true)
  assert.ok(Array.isArray(property.value.methods))
  assert.ok(Object.isFrozen(property.value))
})

test('the gateway discovery path finds the service on a plain registered object', () => {
  // readBinding (api-gateway): typertRemote.service must be THE object the gateway got,
  // serviceKey and namespace must be strings. originalOf() falls back to the receiver when
  // there is no wrapped original, so a plain object is the original.
  const controller = new PolicyController({}, Promise.resolve(fakeDomain([], [])))
  const binding = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(controller), 'typertRemote')?.value ?? controller.typertRemote
  assert.equal(binding.service, controller)
  assert.equal(binding.serviceKey, 'policies')
  assert.equal(binding.namespace, 'policies')
  // remoteMethods(prototype) reads the markers off the same prototype
  const methods = Object.getOwnPropertyDescriptor(PolicyController.prototype, DESCRIPTOR_KEY).value.methods
  assert.ok(methods.some((m) => m.method === 'listWorkspace'))
  // methodParameterNames reads the parameter list from the source text: one plain name each
  for (const marker of methods) {
    const source = Function.prototype.toString.call(PolicyController.prototype[marker.method])
    const params = source.slice(source.indexOf('(') + 1, source.indexOf(')')).trim()
    assert.match(params, /^[A-Za-z_$][\w]*$/, `${marker.method} must have one plain parameter name`)
  }
})

// ---------------------------------------------------------------------------
// apply(): registration is fail-soft — a missing service never stops DSH.
// ---------------------------------------------------------------------------

function fakeCtx(over = {}) {
  const calls = { effects: [], contexts: [], registered: [], warns: [], provided: [] }
  const domain = fakeDomain([], [])
  const ctx = {
    reflect: { provide: () => {} },
    provide: (name, value) => { calls.provided.push([name, value]); return () => {} },
    // a real cordis effect runs its execute at once and keeps what it returns as the disposer
    effect: (execute, label) => { calls.effects.push(label); const disposable = execute(); return () => { if (typeof disposable === 'function') disposable() } },
    sessionProjections: { register: (def) => calls.registered.push(def.key) },
    logger: () => ({ warn: (m) => calls.warns.push(m) }),
    get: (key) => {
      if (key === 'storageDomain') return over.storage === null ? undefined : { open: async () => domain }
      if (key === 'systemPrompt') return over.systemPrompt === null ? undefined : { context: (c) => { calls.contexts.push(c); return () => {} } }
      if (key === 'agents') return over.agents === null ? undefined : { currentInitiator: () => ({ session: { header: { cwd: 'cwd' in over ? over.cwd : '/Users/t/proj' } } }) }
      if (key === 'workspaceRegistry') return over.registry === null ? undefined : registry([{ id: 'w1', path: '/Users/t/proj' }])
      return undefined
    },
  }
  return { ctx, calls, domain }
}

test('apply registers projection, seeds the library, mounts the remote and the prompt context', async () => {
  const { ctx, calls, domain } = fakeCtx()
  await apply(ctx)
  assert.deepEqual(calls.registered, ['projectOsActivity'])
  assert.equal(domain.library.get('lokalmodus').title, 'Lokalmodus')
  assert.ok(calls.effects.includes('project-os: policy domain'))
  assert.ok(calls.effects.includes('project-os: policy prompt'))
  // the policies service is provided as a plain object with its typert binding
  assert.equal(calls.provided[0][0], 'policies')
  assert.equal(calls.provided[0][1].typertRemote.namespace, 'policies')
  assert.equal(calls.contexts[0].name, 'project-os:policies')
  assert.equal(calls.contexts[0].order, 130)

  // the prompt text is read at assembly time, from the agent's session cwd
  await domain.table('workspace').put(switchKey('w1', 'lokalmodus'), { workspaceId: 'w1', policyId: 'lokalmodus', enabled: true })
  const text = calls.contexts[0].text()
  assert.ok(text.includes('# Workspace Policy (Lokalmodus)'))
  assert.ok(text.includes('rein sequentiell'))
})

test('apply is fail-soft: a domain that will not open leaves the projection running', async () => {
  const { ctx, calls } = fakeCtx()
  ctx.get = (key) => {
    if (key === 'storageDomain') return { open: async () => { throw new Error('version-mismatch') } }
    if (key === 'systemPrompt') return { context: () => ({}) }
    if (key === 'agents') return { currentInitiator: () => undefined }
    if (key === 'workspaceRegistry') return registry([])
    return undefined
  }
  await apply(ctx)
  assert.deepEqual(calls.registered, ['projectOsActivity'])
  assert.ok(calls.warns.some((w) => w.includes('version-mismatch')))
  assert.equal(calls.contexts.length, 0)
})

test('apply is fail-soft: a missing storage service stops the policy engine only', async () => {
  const { ctx, calls } = fakeCtx({ storage: null })
  await apply(ctx)
  assert.deepEqual(calls.registered, ['projectOsActivity'])
  assert.ok(calls.warns.some((w) => w.includes('no storage domain service')))
})

test('the prompt side is empty when the agent has no session header cwd', async () => {
  const { ctx, calls, domain } = fakeCtx({ cwd: undefined })
  await apply(ctx)
  await domain.table('workspace').put(switchKey('w1', 'lokalmodus'), { workspaceId: 'w1', policyId: 'lokalmodus', enabled: true })
  assert.equal(calls.contexts[0].text(), '')
})

test('the prompt side is empty when no card is on in that workspace', async () => {
  const { ctx, calls } = fakeCtx()
  await apply(ctx)
  assert.equal(calls.contexts[0].text(), '')
})

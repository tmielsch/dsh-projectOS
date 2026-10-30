import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Loads lib/client.js the way the page does: through a fake module loader, with fake react.
function loadBundle(reactStub) {
  const code = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  let loaded
  globalThis.window = { __ModuleLoader__: { load: (m) => { loaded = m } } }
  globalThis.document = undefined
  new Function('window', code)(globalThis.window)
  if (reactStub === undefined) return loaded.factory(() => ({}))
  const required = []
  const mod = loaded.factory((name) => { required.push(name); return requireModule(name) })
  assert.ok(required.every((n) => n.startsWith('react')), 'only react may be required: ' + required.join(', '))
  return mod
}

const FAKE_REACT = {
  useState: (value) => [value, () => {}],
  useEffect: (fn) => { const disposer = fn(); return typeof disposer === 'function' ? disposer() : undefined },
  useRef: (value) => ({ current: value }),
  useMemo: (fn) => fn(),
  Fragment: 'fragment',
}

/** The fake module loader: react and react/jsx-runtime come from the page. */
function requireModule(name) {
  if (name === 'react') return FAKE_REACT
  if (name === 'react/jsx-runtime' || name === 'react/jsx-dev-runtime') {
    return { jsx: (type, props, key) => ({ type, props, key }), jsxs: (type, props, key) => ({ type, props, key }), Fragment: 'fragment' }
  }
  return {}
}

test('client bundle registers a factory and exports apply and inject', async () => {
  const mod = loadBundle()
  assert.equal(typeof mod.apply, 'function')
  assert.deepEqual(mod.inject, ['slots', 'locale', 'uiWorkspace', 'remote'])
})

test('the bundle carries the wire descriptor of all five policy methods', async () => {
  const mod = loadBundle()
  const remote = mod.TYPERT_REMOTE
  assert.equal(remote.package, '@tmielsch/dsh-projectos')
  assert.deepEqual(remote.descriptors.map((d) => `${d.namespace}/${d.method}`), [
    'policies/listLibrary', 'policies/listWorkspace', 'policies/savePolicy', 'policies/deletePolicy', 'policies/setEnable',
  ])
  for (const descriptor of remote.descriptors) {
    assert.equal(descriptor.invocation.kind, 'direct')
    assert.equal(descriptor.parameters.length, 1)
    assert.equal(descriptor.parameters[0].name, 'request')
    assert.equal(descriptor.parameters[0].codec.mode, 'strict')
    // every codec must build a working zod schema: the client validates inputs with it
    assert.equal(typeof descriptor.parameters[0].codec.create().parse, 'function')
    assert.equal(typeof descriptor.result.create().parse, 'function')
  }
  // the schemas accept what the host returns and reject a stray shape
  const list = remote.descriptors.find((d) => d.method === 'listWorkspace')
  const ok = list.result.create().parse({ ok: true, workspaceId: 'w1', cards: [{ id: 'a', title: 'A', body: 'B', order: 0, createdAt: 'x', updatedAt: 'y', enabled: true }] })
  assert.equal(ok.cards[0].enabled, true)
  assert.throws(() => list.parameters[0].codec.create().parse({ workspaceId: 7 }))
})

/** A client context that records every registration the entry makes. */
function fakeCtx(over = {}) {
  const calls = { locale: [], inject: [], register: [], components: [], mounts: [], plugins: [], effects: [] }
  const remotePolicies = over.policies ?? {}
  const ctx = {
    effect: (fn, label) => { calls.effects.push(label); fn(); return () => {} },
    locale: { register: (ns, d) => { calls.locale.push([ns, Object.keys(d)]) }, bind: () => (k) => k },
    uiWorkspace: { openSession() {} },
    remote: { $mount: async (contribution) => { calls.mounts.push(contribution.package); return () => {} } },
    plugin: async (spec) => {
      calls.plugins.push(spec.inject)
      const sub = { ...ctx, remote: { policies: remotePolicies } }
      return spec.apply(sub)
    },
    slots: {
      inject: (name, cb) => { calls.inject.push(name); cb() },
      register: (opts, component) => { calls.register.push(opts); calls.components.push(component); return () => {} },
    },
  }
  return { ctx, calls }
}

test('apply mounts the remote, registers dictionaries, sidebar row, main page and the overlay window', async () => {
  const mod = loadBundle(FAKE_REACT)
  const { ctx, calls } = fakeCtx()
  await mod.apply(ctx)
  assert.deepEqual(calls.mounts, ['@tmielsch/dsh-projectos'])
  assert.deepEqual(calls.locale, [['project-os', ['en', 'de']]])
  assert.ok(calls.plugins[0].includes('remote.policies'), 'the consumer plugin declares the remote face')
  assert.deepEqual(calls.inject, ['sidebar.panellist', 'main', 'shell.overlay'])
  assert.equal(calls.register[0].id, 'project-os.manager')
  assert.equal(calls.register[1].key, 'project-os.manager')
  assert.equal(calls.register[1].locale, 'project-os')
  assert.equal(calls.register[2].id, 'project-os.policy-window')
  assert.equal(calls.register[2].name, 'shell.overlay')
  // the overlay entry injects the store and the model the window component needs
  const injected = calls.register[2].inject()
  assert.equal(typeof injected.store.open, 'function')
  assert.equal(typeof injected.model.load, 'function')
  // the main page gets the policy tab renderer
  const mainInjected = calls.register[1].inject()
  assert.equal(typeof mainInjected.renderPolicies, 'function')
})

test('the policy tab loads the cards of its workspace through the remote', async () => {
  const mod = loadBundle(FAKE_REACT)
  const seen = []
  const { ctx, calls } = fakeCtx({ policies: {
    listWorkspace: async ({ workspaceId }) => {
      seen.push(workspaceId)
      return { ok: true, workspaceId, cards: [{ id: 'a', title: 'A', body: 'B', order: 0, createdAt: 'x', updatedAt: 'y', enabled: false }] }
    },
  } })
  await mod.apply(ctx)
  const main = calls.register.find((r) => r.key === 'project-os.manager')
  const useWorkspaces = (selector) => selector({ items: [{ workspaceId: 'w1', path: '/p', title: 'P' }] })
  const node = main.inject().renderPolicies(useWorkspaces)
  assert.ok(node !== null && node !== undefined)
  assert.deepEqual(seen, ['w1'])
})

test('the store opens one window per right-click and closes it again', async () => {
  const mod = loadBundle(FAKE_REACT)
  const { ctx, calls } = fakeCtx()
  await mod.apply(ctx)
  const store = calls.register.find((r) => r.id === 'project-os.policy-window').inject().store
  assert.equal(store.current(), null)
  store.open({ workspaceId: 'w1', x: 10, y: 20 })
  assert.deepEqual(store.current(), { workspaceId: 'w1', x: 10, y: 20 })
  store.move(30, 40)
  assert.equal(store.current().x, 30)
  store.open({ workspaceId: 'w2', x: 1, y: 2 }) // one window at a time: it moves to the other workspace
  assert.equal(store.current().workspaceId, 'w2')
  store.close()
  assert.equal(store.current(), null)
})

test('the window component renders nothing when closed and the card list when open', async () => {
  const mod = loadBundle(FAKE_REACT)
  const { ctx, calls } = fakeCtx({ policies: {
    listWorkspace: async ({ workspaceId }) => ({ ok: true, workspaceId, cards: [{ id: 'a', title: 'Lokalmodus', body: 'TEXT', order: 0, createdAt: 'x', updatedAt: 'y', enabled: true }] }),
  } })
  await mod.apply(ctx)
  const index = calls.register.findIndex((r) => r.id === 'project-os.policy-window')
  const entry = calls.register[index]
  const Window = calls.components[index]
  const { store, model } = entry.inject()
  const t = (key) => key
  const useWorkspaces = (selector) => selector({ items: [{ workspaceId: 'w1', path: '/p', title: 'Proj' }] })

  assert.equal(Window({ store, model, t, useWorkspaces }), null)
  store.open({ workspaceId: 'w1', x: 12, y: 30 })
  const node = Window({ store, model, t, useWorkspaces })
  // the window is positioned by the request and carries a draggable header
  assert.equal(node.props.style.left, '12px')
  assert.equal(node.props.style.top, '30px')
  const head = node.props.children[0]
  assert.equal(typeof head.props.onPointerDown, 'function')
  assert.ok(JSON.stringify(head).includes('Proj'))
})

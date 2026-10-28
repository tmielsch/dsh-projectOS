import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Loads lib/client.js the way the page does: through a fake module loader, with fake react.
test('client bundle registers a factory and exports apply and inject', async () => {
  const code = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  let loaded
  globalThis.window = { __ModuleLoader__: { load: (m) => { loaded = m } } }
  globalThis.document = undefined
  new Function('window', code)(globalThis.window)
  assert.equal(loaded.id, '@tmielsch/dsh-projectos')
  const required = []
  const mod = loaded.factory((name) => { required.push(name); return name === 'react' ? { useState() {}, useMemo() {}, useEffect() {} } : {} })
  assert.equal(typeof mod.apply, 'function')
  assert.deepEqual(mod.inject, ['slots', 'locale', 'uiWorkspace'])
  assert.ok(required.every((n) => n.startsWith('react')), 'only react may be required: ' + required)
})

test('apply registers dictionaries, the sidebar row and the main page', () => {
  const code = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  let loaded
  const win = { __ModuleLoader__: { load: (m) => { loaded = m } } }
  new Function('window', code)(win)
  const mod = loaded.factory(() => ({}))
  const calls = { locale: [], inject: [], register: [] }
  const ctx = {
    effect: (fn) => fn(),
    locale: { register: (ns, d) => { calls.locale.push([ns, Object.keys(d)]) }, bind: () => (k) => k },
    uiWorkspace: { openSession() {} },
    slots: {
      inject: (name, cb) => { calls.inject.push(name); cb() },
      register: (opts) => { calls.register.push(opts) },
    },
  }
  mod.apply(ctx)
  assert.deepEqual(calls.locale, [['project-os', ['en', 'de']]])
  assert.deepEqual(calls.inject, ['sidebar.panellist', 'main'])
  assert.equal(calls.register[0].id, 'project-os.manager')
  assert.equal(calls.register[1].key, 'project-os.manager')
  assert.equal(calls.register[1].locale, 'project-os')
})

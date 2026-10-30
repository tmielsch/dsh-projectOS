import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  clampPosition, createPolicyStore, enabledCards, filterCards, matchWorkspace, previewText,
  sortCards, toggleCard, workspaceIdOfRowKey,
} from '../.build/policies.mjs'

const card = (id, title, body, order, enabled = false) => ({ id, title, body, order, createdAt: 'x', updatedAt: 'y', enabled })

// ---------------------------------------------------------------------------
// The card list (the host's library as the browser sees it).
// ---------------------------------------------------------------------------

test('library order: by order, then title in code-unit order', () => {
  const cards = [card('c', 'Beta', 'b', 1), card('a', 'Alpha', 'a', 1), card('z', 'Zeta', 'z', 0)]
  assert.deepEqual(sortCards(cards).map((c) => c.id), ['z', 'a', 'c'])
})

test('enabled cards drop empty bodies and keep library order', () => {
  const cards = [card('a', 'A', 'AAA', 1, true), card('b', 'B', '   ', 0, true), card('c', 'C', 'CCC', 2, true), card('d', 'D', 'DDD', 3, false)]
  assert.deepEqual(enabledCards(cards).map((c) => c.id), ['a', 'c'])
})

test('toggle flips one card and leaves the rest alone', () => {
  const cards = [card('a', 'A', 'x', 0, true), card('b', 'B', 'y', 1, false)]
  const next = toggleCard(cards, 'b', true)
  assert.deepEqual(next.map((c) => c.enabled), [true, true])
  assert.equal(cards[1].enabled, false) // the old list is not mutated
})

test('filter matches title and body, case-insensitive, in library order', () => {
  const cards = [card('a', 'Lokalmodus', 'sequentiell', 1), card('b', 'Stille', 'Kaskade', 0)]
  assert.deepEqual(filterCards(cards, 'LOKAL').map((c) => c.id), ['a'])
  assert.deepEqual(filterCards(cards, 'kaskade').map((c) => c.id), ['b'])
  assert.deepEqual(filterCards(cards, '').map((c) => c.id), ['b', 'a'])
})

test('the preview shows exactly what the host writes into the prompt', () => {
  const one = [card('a', 'A', 'AAA', 0, true)]
  assert.equal(previewText(one), '# Workspace Policy (A) — active in this workspace\n\nAAA')
  const two = [card('a', 'A', 'AAA', 0, true), card('b', 'B', 'BBB', 1, true)]
  assert.ok(previewText(two).startsWith('# Workspace Policies — active in this workspace'))
  assert.ok(previewText(two).includes('## B\nBBB'))
  assert.equal(previewText([card('a', 'A', 'AAA', 0, false)]), '')
})

// ---------------------------------------------------------------------------
// Workspace matching: the window and the tab must pick the same workspace as the host does.
// ---------------------------------------------------------------------------

const items = [
  { workspaceId: 'w1', path: '/Users/t/proj', title: 'Proj' },
  { workspaceId: 'w2', path: '/Users/t/proj/sub', title: 'Sub' },
  { workspaceId: 'w3', path: '/Users/t/other', title: 'Other' },
]

test('workspace match: exact path first, then the longest containing path', () => {
  assert.equal(matchWorkspace(items, '/Users/t/proj/sub/deep').workspaceId, 'w2')
  assert.equal(matchWorkspace(items, '/Users/t/proj/').workspaceId, 'w1')
  assert.equal(matchWorkspace(items, '/Users/t/other'), items[2])
  assert.equal(matchWorkspace(items, '/Users/t/elsewhere'), undefined)
})

// ---------------------------------------------------------------------------
// The window store: one window at a time, draggable, closable.
// ---------------------------------------------------------------------------

test('the store keeps one window; opening another workspace moves it', () => {
  const store = createPolicyStore()
  const heard = []
  const unsubscribe = store.subscribe(() => heard.push(store.current()))
  assert.equal(store.current(), null)

  store.open({ workspaceId: 'w1', x: 10, y: 20 })
  assert.deepEqual(store.current(), { workspaceId: 'w1', x: 10, y: 20 })
  store.move(30, 40)
  assert.deepEqual(store.current(), { workspaceId: 'w1', x: 30, y: 40 })

  store.open({ workspaceId: 'w2', x: 1, y: 2 }) // one window at a time
  assert.equal(store.current().workspaceId, 'w2')
  store.close()
  assert.equal(store.current(), null)
  store.close() // closing twice changes nothing
  assert.equal(heard.length, 4)
  unsubscribe()
  store.open({ workspaceId: 'w3', x: 0, y: 0 })
  assert.equal(heard.length, 4) // unsubscribed listeners hear nothing more
})

test('a window position is clamped into the viewport so the header stays reachable', () => {
  const vw = 1200
  const vh = 800
  const w = 420
  const h = 460
  assert.deepEqual(clampPosition(10, 20, w, h, vw, vh), { x: 10, y: 20 })
  assert.deepEqual(clampPosition(-50, -50, w, h, vw, vh), { x: 0, y: 0 })
  assert.deepEqual(clampPosition(2000, 900, w, h, vw, vh), { x: vw - w, y: vh - h })
})

test('the sidebar row key names the workspace it belongs to', () => {
  assert.equal(workspaceIdOfRowKey('workspace:3f2a'), '3f2a')
  assert.equal(workspaceIdOfRowKey('session:a3678ba1d828'), '')
  assert.equal(workspaceIdOfRowKey(''), '')
})

// ---------------------------------------------------------------------------
// The built bundle must render the policy components as React ELEMENTS, never call them as plain
// functions. Measured cause of React error #310 (the panel went empty on the click on "Policies"):
// ManagerPage has 20 hooks (11 useState, 1 useRef, 5 useMemo, 3 useEffect), PolicyTab 1 (useEffect),
// PolicyList 3 (useState x3). Called as functions inside ManagerPage's render, all 24 hooks counted
// in ONE hook list, so the click grew that list past the previous render — #310 is exactly that check.
// In the built bundle a plain call reads `Name({`; a component element reads `jsx)(Name,`.
// ---------------------------------------------------------------------------

function bundleText() {
  const url = new URL('../lib/client.js', import.meta.url)
  let text
  try {
    text = readFileSync(url, 'utf8')
  } catch {
    assert.fail('lib/client.js is not on disk — run `npm run build` before the tests')
  }
  return text
}

/** Every place where `Name({` appears, with the 9 characters standing in front of it. */
function callSites(text, name) {
  const hits = []
  let i = 0
  while ((i = text.indexOf(`${name}({`, i)) >= 0) {
    hits.push({ at: i, before: text.slice(Math.max(0, i - 9), i) })
    i += name.length
  }
  return hits
}

test('the built bundle defines PolicyTab and PolicyList as component functions', () => {
  const text = bundleText()
  for (const name of ['PolicyTab', 'PolicyList']) {
    assert.ok(text.includes(`function ${name}({`), `${name} is not a function declaration in lib/client.js`)
  }
})

test('the built bundle contains no plain call of PolicyTab or PolicyList', () => {
  const text = bundleText()
  for (const name of ['PolicyTab', 'PolicyList']) {
    const plain = callSites(text, name).filter((hit) => hit.before !== 'function ')
    assert.deepEqual(
      plain.map((hit) => hit.at),
      [],
      `plain call ${name}({ in lib/client.js at offset ${plain.map((hit) => hit.at).join(', ')} — render it as <${name} ... /> so its hooks count in its own component`,
    )
  }
})

test('the built bundle renders PolicyTab and PolicyList as React elements', () => {
  const text = bundleText()
  for (const name of ['PolicyTab', 'PolicyList']) {
    assert.ok(text.includes(`.jsx)(${name},`), `${name} is never rendered as a JSX element in lib/client.js`)
  }
})

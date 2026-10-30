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

// ---------------------------------------------------------------------------
// The window must be painted ABOVE the matrix rain, and its close button must receive its click.
// Measured numbers (the comparison below is arithmetic on them, not text):
//   dsh-matrix canvas: z-index 2147482000 (~/.dsh/profiles/web/node_modules/@weibaohui/dsh-matrix/
//     client/index.js line 230); toast 2147482400 (line 658); modal 2147483000 (client/bundle.js 130).
//   shell overlay layer: z-index 20, position:absolute — its own stacking context
//     (dsh-client-ui-layout/lib/client.js line 73, .pI_x6G_overlayLayer). Measured in Chromium with
//     the exact rules: a window inside that layer loses to the canvas even when its own z-index is
//     raised to 2147483647 (elementFromPoint answers CANVAS); a body-level container wins.
//   close button: scripts/measure-close-click.mjs, variant A = the shipped header code — pointerdown
//     on the button captures the pointer to the header, so pointerup is retargeted
//     ('head pointerup target=head', 'head click target=head') and 'CLOSE CLICK FIRED' is false.
//     Variant B (no capture) and variant C (stopPropagation on the button's own pointerdown) fire.
// ---------------------------------------------------------------------------

const MATRIX_CANVAS_Z = 2147482000
const MATRIX_TOAST_Z = 2147482400
const MATRIX_MODAL_Z = 2147483000

function layerZIndex(text) {
  const m = text.match(/\.pos-window-layer\{[^}]*z-index:(\d+)/)
  return m === null ? -1 : parseInt(m[1], 10)
}

test('the built bundle carries a body-level window layer above every measured matrix height', () => {
  const text = bundleText()
  const z = layerZIndex(text)
  assert.ok(z > MATRIX_CANVAS_Z, `window layer z-index ${z} must be above the canvas ${MATRIX_CANVAS_Z}`)
  assert.ok(z > MATRIX_TOAST_Z, `window layer z-index ${z} must be above the toast ${MATRIX_TOAST_Z}`)
  assert.ok(z > MATRIX_MODAL_Z, `window layer z-index ${z} must be above the modal ${MATRIX_MODAL_Z}`)
  // the window itself is inside that layer: its own z-index no longer has to fight the rain
  assert.ok(text.includes('.pos-window{position:fixed;z-index:1'), 'the window must sit inside the body-level layer, not fight the stacking context of the shell overlay')
})

test('the built bundle portals the window out of the shell overlay layer', () => {
  const text = bundleText()
  assert.ok(text.includes('eval("require")("react-dom")'), 'react-dom is not taken from the page module system, so the portal would need a second React instance')
  assert.ok(text.includes('createPortal'), 'the window is not portaled; it stays inside the z-index:20 overlay layer and loses to the rain')
})

test('the close button stops pointerdown so its own click survives the header capture', () => {
  const text = bundleText()
  const at = text.indexOf('stopPropagation')
  assert.ok(at > 0, 'no stopPropagation in lib/client.js: the header captures the pointer and the ✕ click never fires (measured variant A)')
  const around = text.slice(at - 60, at + 40)
  assert.ok(/onPointerDown:\s*\(e\)\s*=>\s*e\.stopPropagation\(\)/.test(around), `stopPropagation is not on the close button's own pointerdown; found: ${JSON.stringify(around)}`)
})

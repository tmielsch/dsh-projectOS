/**
 * Host half of dsh-projectOS.
 *
 * Two things live here:
 *
 * 1. the session projection `projectOsActivity` (SPEC A15 point 4, B11): per session it keeps
 *    `thought`, `said`, `tool`, `at`. The browser reads it from
 *    `projectionsBySession[id].values.projectOsActivity` and shows it on the cards and in the live
 *    ticker. The fold is pure and synchronous, as DSH requires, keeps tiny state, and never throws.
 *
 * 2. the workspace policy engine (Anordnung des Menschen 2026-10-30): "Workspace Policies sind nur
 *    Prompts, die man per Toggle an/aus schaltet." A DSH-wide library of cards; each card is a title
 *    plus an editable prompt body; a card is switched on for one workspace. Every agent that starts a
 *    turn in a session of that workspace gets the enabled bodies in its system prompt. The Lokalmodus
 *    is one card in this library — not a model toggle, not a path.
 *
 * Storage is one domain `workspace_policies` with two tables: `library` (the cards) and `workspace`
 * (one record per card x workspace, holding the switch). The browser talks to it through the Typert
 * Remote service `policies`; the prompt side reads the same domain synchronously.
 */
import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'

/** Plugin name shown by DSH, and the cordis services this host half needs. */
export const name = 'project-os'
export const inject = ['sessionProjections', 'storageDomain', 'systemPrompt', 'agents', 'workspaceRegistry']

/** Bump when the state fields or the fold change (invalidates persisted cache rows). */
export const STATE_VERSION = 1
export const KEY = 'projectOsActivity'
const MAX_LINE = 240

const stateSchema = z.object({
  thought: z.string(),
  said: z.string(),
  tool: z.string(),
  at: z.number(),
})

/** Last non-empty line of a text, trimmed and cut to MAX_LINE characters. */
export function lastLine(text) {
  if (typeof text !== 'string') return ''
  const lines = text.split(/\r?\n/)
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].replace(/^[\s>#*\-`]+/, '').replace(/[`*]+/g, '').trim()
    if (line !== '') return line.length > MAX_LINE ? `${line.slice(0, MAX_LINE - 1)}…` : line
  }
  return ''
}

/** Pure fold: previous state + one committed event -> next state (same reference when nothing changes). */
export function fold(state, event) {
  try {
    const type = event?.type
    const at = typeof event?.time === 'number' ? event.time : state.at
    if (type === 'assistant/message') {
      const content = event.data?.message?.content
      if (!Array.isArray(content)) return state
      let thought = state.thought
      let said = state.said
      for (const block of content) {
        if (block?.type === 'reasoning') {
          const line = lastLine(block.text)
          if (line !== '') thought = line
        } else if (block?.type === 'text') {
          const line = lastLine(block.text)
          if (line !== '') said = line
        }
      }
      if (thought === state.thought && said === state.said) return state
      return { ...state, thought, said, at }
    }
    if (type === 'tool/call') {
      const name = typeof event.data?.name === 'string' ? event.data.name : ''
      if (name === '' || name === state.tool) return state
      return { ...state, tool: name, at }
    }
    return state
  } catch {
    return state
  }
}

export const definition = {
  key: KEY,
  stateVersion: STATE_VERSION,
  stateSchema,
  init: () => ({ thought: '', said: '', tool: '', at: 0 }),
  apply: fold,
  wire: {
    viewSchema: stateSchema,
    view: (state) => state,
  },
}

// ---------------------------------------------------------------------------
// Workspace policies: storage shape.
// ---------------------------------------------------------------------------

/** One policy card of the DSH-wide library. `id` is a path-safe key. */
export const policyRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  body: z.string(),
  order: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict()

/** One switch: this card is on (or off) in this workspace. Key `<workspaceId>__<policyId>`. */
export const workspaceSwitchSchema = z.object({
  workspaceId: z.string(),
  policyId: z.string(),
  enabled: z.boolean(),
}).strict()

export const policyDomainSpec = defineDomain({
  name: 'workspace_policies',
  version: 1,
  tables: {
    library: domainTable(policyRecordSchema),
    workspace: domainTable(workspaceSwitchSchema),
  },
})

/** The key of one switch record. `__` is path-safe; ids carry only hex, `-` and `_`. */
export function switchKey(workspaceId, policyId) {
  return `${workspaceId}__${policyId}`
}

/** Library order: by `order`, then title in code-unit order (the rule DSH uses for sections). */
export function sortCards(cards) {
  return [...cards].sort((a, b) => a.order - b.order || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0))
}

/** The cards of one workspace with the switch merged in, in library order. */
export function workspaceCards(domain, workspaceId) {
  const switches = domain.table('workspace')
  return sortCards([...domain.table('library').values()]).map((card) => {
    const record = switches.get(switchKey(workspaceId, card.id))
    return { ...cardView(card), enabled: record !== undefined && record.enabled === true }
  })
}

/** The bodies that are on in one workspace, in library order, empty ones dropped. */
export function enabledBodies(domain, workspaceId) {
  return workspaceCards(domain, workspaceId).filter((card) => card.enabled && card.body.trim() !== '')
}

/** The prompt block for one agent: its workspace's enabled cards, or '' when none apply. */
export function policyPromptText(domain, registry, cwd) {
  if (typeof cwd !== 'string' || cwd === '') return ''
  const workspace = findWorkspace(registry, cwd)
  if (workspace === undefined) return ''
  const cards = enabledBodies(domain, String(workspace.id))
  if (cards.length === 0) return ''
  const head = cards.length === 1
    ? `# Workspace Policy (${cards[0].title}) — active in this workspace`
    : '# Workspace Policies — active in this workspace'
  const bodies = cards.map((card) => (cards.length > 1 ? `## ${card.title}\n` : '') + card.body.trim())
  return `${head}\n\n${bodies.join('\n\n')}`
}

/**
 * Sync workspace lookup by directory path. The registry keeps a realpath-normalized path; the session
 * header keeps a validated absolute cwd. Exact match first, then the longest workspace path that
 * contains the cwd (a session started in a subdirectory of its workspace).
 */
export function findWorkspace(registry, cwd) {
  const clean = String(cwd).replace(/[/\\]+$/, '')
  let best
  for (const entity of registry.list()) {
    const path = String(entity.path).replace(/[/\\]+$/, '')
    if (path === clean) return entity
    if (clean.startsWith(path + '/') && (best === undefined || path.length > String(best.path).length)) best = entity
  }
  return best
}

/** The card as it crosses the wire: plain JSON, no zod objects. */
export function cardView(record) {
  return { id: record.id, title: record.title, body: record.body, order: record.order, createdAt: record.createdAt, updatedAt: record.updatedAt }
}

/** The first card the human asked for (Anordnung 2026-10-30), seeded once into an empty library. */
export const LOKALMODUS_BODY = `Lokalmodus: dieses Team arbeitet rein sequentiell.
Der Teamlead ist das gesamte Team — er cosplayt die Rollen (Lead, Facharbeiter, Worker) selbst, eine
nach der anderen, in derselben Sitzung. Er spawnnt keine Teammates und keine Unteragenten für Arbeit,
die er in einer Rolle selbst erledigen kann.
Grund: jeder Wechsel zwischen Agenten schiebt den Prompt-Cache hin und her und ist Zeitverschwendung.
Der Lead stört sich selbst so selten wie möglich: kein Zwischenbericht an sich selbst, keine
Rückfrage-Kaskade, keine Bestätigungsnachrichten.
Er verdichtet seinen Kontext am Ende jeder abgeschlossenen Phase selbst, turn-basiert und gebündelt
(mehrere Szenen in EINE Compaction), nicht erst am Ende der Sitzung.`

/** Seed cards: id, title, body, order. Seeded once, when the library is empty. */
export function seedCards(now) {
  return [{ id: 'lokalmodus', title: 'Lokalmodus', body: LOKALMODUS_BODY, order: 0, createdAt: now, updatedAt: now }]
}

// ---------------------------------------------------------------------------
// Remote service `policies` (plain JS, no typert import).
//
// The gateway finds a remote service by three things on the live object:
//   - `typertRemote = { service: <the object>, serviceKey, namespace }`
//     (`readBinding` in @deepseek-ai/dsh-api-gateway checks exactly these),
//   - a marker descriptor on the PROTOTYPE naming each exported method
//     (byte-for-byte the shape the compiled `@Remote('name')` decorator writes),
//   - the methods themselves on the prototype, with a plain parameter list
//     (`methodParameterNames` reads them back from the source text).
// So the service is registered as a plain object through `ctx.provide`, and the
// markers are written by hand. This keeps the host free of a typert peer
// dependency: the profile resolves only what it already ships.
// ---------------------------------------------------------------------------

const REMOTE_METHOD_DESCRIPTOR = '@deepseek-ai/dsh-typert-protocol/remote-methods'

/** Append one typert Remote marker; byte-for-byte the shape the compiled decorator produces. */
export function markRemote(prototype, method) {
  const existing = Object.getOwnPropertyDescriptor(prototype, REMOTE_METHOD_DESCRIPTOR)?.value
  const methods = existing?.methods ?? []
  if (methods.some((candidate) => candidate.method === method)) return
  const marker = Object.freeze({ method, invocation: Object.freeze({ kind: 'direct' }) })
  Object.defineProperty(prototype, REMOTE_METHOD_DESCRIPTOR, {
    configurable: true,
    value: Object.freeze({ version: 1, methods: Object.freeze([...methods, marker]) }),
  })
}

const MAX_TITLE = 120
const MAX_BODY = 20000

/** Ids must be path-safe storage keys `[a-zA-Z0-9_-]+`: a UUID is not (dashes only at fixed spots). */
function newId() {
  const hex = (n) => Math.floor(n).toString(16).padStart(2, '0')
  return `p${Array.from(crypto.getRandomValues(new Uint8Array(8))).map(hex).join('')}`
}

export class PolicyController {
  /** @param ctx - host context (kept for logging); @param ready - the opened policy domain. */
  constructor(ctx, ready) {
    this.ctx = ctx
    this.ready = ready
    this.name = 'policies'
    this.typertRemote = Object.freeze({ service: this, serviceKey: 'policies', namespace: 'policies' })
  }

  /** Every card of the library, in order. */
  async listLibrary(request) {
    const domain = await this.ready
    return { ok: true, cards: sortCards([...domain.table('library').values()]).map(cardView) }
  }

  /** The library plus the switch state for one workspace. */
  async listWorkspace(request) {
    const domain = await this.ready
    const workspaceId = String(request.workspaceId)
    return { ok: true, workspaceId, cards: workspaceCards(domain, workspaceId) }
  }

  /** Create a card (no `id`) or edit one (`id` given). Title and body are trimmed. */
  async savePolicy(request) {
    const domain = await this.ready
    const title = typeof request.title === 'string' ? request.title.trim() : ''
    const body = typeof request.body === 'string' ? request.body.trim() : ''
    if (title === '') return { ok: false, message: 'policy needs a title' }
    if (body === '') return { ok: false, message: 'policy needs a prompt body' }
    if (title.length > MAX_TITLE || body.length > MAX_BODY) return { ok: false, message: `policy is too large (max ${MAX_TITLE} / ${MAX_BODY} characters)` }
    const now = new Date().toISOString()
    const table = domain.table('library')
    if (typeof request.id === 'string' && request.id !== '') {
      const current = table.get(request.id)
      if (current === undefined) return { ok: false, message: `unknown policy ${request.id}` }
      const next = { ...current, title, body, updatedAt: now }
      await table.put(current.id, next)
      return { ok: true, card: cardView(next) }
    }
    const id = newId()
    const order = [...table.values()].reduce((max, card) => Math.max(max, card.order + 1), 0)
    const record = { id, title, body, order, createdAt: now, updatedAt: now }
    await table.put(id, record)
    return { ok: true, card: cardView(record) }
  }

  /** Delete a card and every switch that names it. */
  async deletePolicy(request) {
    const domain = await this.ready
    const id = String(request.id)
    if (domain.table('library').get(id) === undefined) return { ok: false, message: `unknown policy ${id}` }
    await domain.table('library').delete(id)
    for (const [key, record] of [...domain.table('workspace').entries()]) {
      if (record.policyId === id) await domain.table('workspace').delete(key)
    }
    return { ok: true, id }
  }

  /** Flip one card's switch for one workspace. */
  async setEnable(request) {
    const domain = await this.ready
    const workspaceId = String(request.workspaceId)
    const policyId = String(request.policyId)
    if (domain.table('library').get(policyId) === undefined) return { ok: false, message: `unknown policy ${policyId}` }
    const record = { workspaceId, policyId, enabled: request.enabled === true }
    await domain.table('workspace').put(switchKey(workspaceId, policyId), record)
    return { ok: true, workspaceId, policyId, enabled: record.enabled }
  }
}

for (const method of ['listLibrary', 'listWorkspace', 'savePolicy', 'deletePolicy', 'setEnable']) markRemote(PolicyController.prototype, method)

// ---------------------------------------------------------------------------
// Registration.
// ---------------------------------------------------------------------------

/**
 * Registers the projection and the policy engine. A failure must never stop DSH from starting: each
 * part is tried on its own, logged once, and the rest still runs.
 */
export async function apply(ctx) {
  const log = (message) => { try { ctx.logger?.('project-os')?.warn?.(message) } catch { /* no logger */ } }

  try {
    ctx.effect?.(() => ctx.sessionProjections.register(definition), 'project-os: activity projection')
    if (ctx.effect === undefined) ctx.sessionProjections.register(definition)
  } catch (error) {
    log(`activity projection not registered: ${error instanceof Error ? error.message : String(error)}`)
  }

  const storage = ctx.get?.('storageDomain')
  const systemPrompt = ctx.get?.('systemPrompt')
  const agents = ctx.get?.('agents')
  const registry = ctx.get?.('workspaceRegistry')
  if (storage === undefined) { log('policy engine off: no storage domain service'); return }

  let domain
  try {
    domain = await storage.open(policyDomainSpec)
  } catch (error) {
    log(`policy engine off: domain 'workspace_policies' did not open: ${error instanceof Error ? error.message : String(error)}`)
    return
  }
  ctx.effect?.(() => async () => { await domain.close() }, 'project-os: policy domain')

  // Seed the library once, when it is empty, so the first card the human asked for is there.
  if (domain.table('library').size === 0) {
    for (const card of seedCards(new Date().toISOString())) await domain.table('library').put(card.id, card)
  }

  // The remote face the browser calls: a plain object registered as the service `policies`.
  try {
    const controller = new PolicyController(ctx, Promise.resolve(domain))
    if (ctx.effect === undefined) ctx.provide('policies', controller)
    else ctx.effect(() => ctx.provide('policies', controller), 'project-os: policies service')
  } catch (error) {
    log(`policy engine off: remote service not registered: ${error instanceof Error ? error.message : String(error)}`)
    return
  }

  // The prompt side: one dynamic context, read synchronously at every assembly.
  if (systemPrompt === undefined || agents === undefined || registry === undefined) {
    log('policy engine has no prompt side: systemPrompt/agents/workspaceRegistry missing')
    return
  }
  // `systemPrompt.context()` returns the disposer; the effect must KEEP it, not run it.
  const disposeContext = systemPrompt.context({
    name: 'project-os:policies',
    order: 130,
    text: () => {
      try {
        const agent = typeof agents.currentInitiator === 'function' ? agents.currentInitiator() : undefined
        return policyPromptText(domain, registry, agent?.session?.header?.cwd)
      } catch {
        return ''
      }
    },
  })
  if (ctx.effect === undefined) { return }
  ctx.effect(() => disposeContext, 'project-os: policy prompt')
}

/**
 * Pure data model of the manager page. No React, no DSH imports: it reads the
 * session list snapshot the browser already holds (SPEC B7) and returns
 * departments and, for one level of the hierarchy at a time, worker cards.
 *
 * Source of the data (SPEC B7, measured):
 *  - `byId[id]`                                id, displayTitle, cwd?, parentId?, origin?, running, updatedAt, projectionValues?
 *  - `projectionsBySession[leadId].values.agentTeam`          { members, tasks, failure? }
 *  - `projectionsBySession[parentId].values.subagentCatalog`  [{ id, mode, label?, createdAt }]
 *
 * Levels (Owner, 2026-10-28, SPEC A11): the board shows only the direct children of
 * ONE node. Department lead -> group leads (team members) plus ONE collapsed card for
 * everything else the lead started. A card can be unfolded to peek at its children,
 * and a child card can be entered to see its own board.
 */

export interface SessionRow {
  id: string
  displayTitle: string
  cwd?: string
  parentId?: string
  origin?: 'subagent'
  running: boolean
  updatedAt: number
  projectionValues?: Record<string, any>
}

export interface ListState {
  ids: string[]
  byId: Record<string, SessionRow>
  phase?: string
  projectionsBySession?: Record<string, { values: Record<string, any> } | undefined>
}

export interface TeamMember {
  id: string
  name: string
  role: 'lead' | 'teammate'
  phase: 'provisioning' | 'active' | 'failed' | 'resting' | 'retired'
  error?: string
}

export interface TeamTask {
  id: string
  revision: number
  subject: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'deleted'
  blockedBy: string[]
  writeScopes: string[]
  ownerName?: string
  ready: boolean
  writeScopeWarnings: string[]
}

/** The lane (column) a worker card sits in. */
export type Lane = 'working' | 'waiting' | 'resting' | 'starting' | 'failed' | 'done'
export const LANES: readonly Lane[] = ['working', 'waiting', 'starting', 'resting', 'failed', 'done']

/**
 *  - `group-lead`    a team member of the department (leader of a work group)
 *  - `specialist`    a child started with delegate_task below a group lead or another specialist
 *  - `helper`        a child of the department lead that is not a team member (or a retired one)
 *  - `helpers`       the single collapsed card that stands for all helpers of the department lead
 */
export type WorkerKind = 'group-lead' | 'specialist' | 'helper' | 'helpers'

export interface WorkerCard {
  /** Session id, or `helpers:<leadId>` for the collapsed helpers card. */
  id: string
  name: string
  kind: WorkerKind
  lane: Lane
  model?: string
  error?: string
  mode?: 'one-shot' | 'continuable' | 'unknown'
  createdAt?: number
  /** Last activity of the session (ms), from the session list row. */
  updatedAt?: number
  /** Live note: the `Stand:` line of the task this group lead has in progress (SPEC A13 point 2). */
  note?: string
  /** Number of direct children, and how many of them are working right now. */
  children: number
  childrenWorking: number
  /** Sort key: newest first inside a lane. */
  recency: number
}

export interface Department {
  leadId: string
  title: string
  cwd: string
  leadRunning: boolean
  tasks: TeamTask[]
  members: TeamMember[]
  failure?: string
}

export interface WorkspaceGroup {
  cwd: string
  name: string
  departments: Department[]
}

export const HELPERS_PREFIX = 'helpers:'
export const isHelpersId = (id: string): boolean => id.startsWith(HELPERS_PREFIX)

/** Last path segment of a directory, tolerant of both separators. */
export function baseName(path: string): string {
  const parts = path.split(/[\\/]+/).filter((part) => part !== '')
  return parts.length === 0 ? path : parts[parts.length - 1]!
}

/**
 * A readable name from a session title. Titles are the first line of the first
 * prompt, so they start with markup or a system tag; strip the markup, and fall
 * back to the short id when only a tag or nothing is left.
 */
export function readableTitle(title: string | undefined, id: string): string {
  const short = id.replace(/^session-/, '').slice(0, 8)
  if (title === undefined) return short
  let text = title.trim()
  if (text.startsWith('<')) return short
  text = text.replace(/^[`>#*\-\s]+/, '').replace(/[`*]+/g, '').trim()
  return text === '' ? short : text
}

interface CatalogInfo { parentId: string; label?: string; mode?: WorkerCard['mode']; createdAt?: number }

/** child id -> what its parent's catalog says about it. */
export function catalogIndex(list: ListState): Map<string, CatalogInfo> {
  const index = new Map<string, CatalogInfo>()
  const projections = list.projectionsBySession ?? {}
  for (const parentId of Object.keys(projections)) {
    const entries = projections[parentId]?.values?.subagentCatalog
    if (!Array.isArray(entries)) continue
    for (const entry of entries) {
      const info: CatalogInfo = { parentId }
      if (typeof entry.label === 'string' && entry.label.trim() !== '') info.label = entry.label.trim()
      if (entry.mode === 'one-shot' || entry.mode === 'continuable' || entry.mode === 'unknown') info.mode = entry.mode
      if (typeof entry.createdAt === 'number') info.createdAt = entry.createdAt
      index.set(entry.id, info)
    }
  }
  return index
}

/** Direct child ids of one session: catalog entries plus rows that name it as parent. */
export function childIdsOf(list: ListState, parentId: string, index = catalogIndex(list)): string[] {
  const out = new Set<string>()
  for (const [childId, info] of index) if (info.parentId === parentId) out.add(childId)
  for (const id of Object.keys(list.byId)) if (list.byId[id]?.parentId === parentId) out.add(id)
  return [...out]
}

function modelOf(list: ListState, id: string): string | undefined {
  const fromProjection = list.projectionsBySession?.[id]?.values?.modelSelection?.next?.model
  if (typeof fromProjection === 'string') return fromProjection
  const fromRow = list.byId[id]?.projectionValues?.modelSelection?.next?.model
  return typeof fromRow === 'string' ? fromRow : undefined
}

/** Lane of a group lead (a team member). */
export function laneOf(input: { phase?: TeamMember['phase']; error?: string; running: boolean }): Lane {
  if (input.error !== undefined || input.phase === 'failed') return 'failed'
  if (input.phase === 'provisioning') return 'starting'
  if (input.phase === 'resting') return 'resting'
  return input.running ? 'working' : 'waiting'
}

/** Every started subagent is either working or finished; only group leads wait for orders. */
export function subagentLane(running: boolean): Lane {
  return running ? 'working' : 'done'
}

/** Count all descendants that are working, with a depth guard against cycles. */
function workingBelow(list: ListState, id: string, index: Map<string, CatalogInfo>, depth = 0, seen = new Set<string>()): number {
  if (depth > 6 || seen.has(id)) return 0
  seen.add(id)
  let count = 0
  for (const childId of childIdsOf(list, id, index)) {
    if (list.byId[childId]?.running === true) count += 1
    count += workingBelow(list, childId, index, depth + 1, seen)
  }
  return count
}

function departmentOf(list: ListState, leadId: string): Department | undefined {
  const team = list.projectionsBySession?.[leadId]?.values?.agentTeam as
    | { members: TeamMember[]; tasks: TeamTask[]; failure?: string }
    | undefined
  const leadRow = list.byId[leadId]
  if (team === undefined || leadRow === undefined) return undefined
  const department: Department = {
    leadId,
    title: readableTitle(leadRow.displayTitle, leadId),
    cwd: leadRow.cwd ?? '',
    leadRunning: leadRow.running,
    tasks: team.tasks,
    members: team.members.filter((m) => m.role === 'teammate' && m.phase !== 'retired'),
  }
  if (team.failure !== undefined) department.failure = team.failure
  return department
}

/** Every session that carries a team with at least one teammate is a department. */
export function buildWorkspaces(list: ListState): WorkspaceGroup[] {
  const byCwd = new Map<string, Department[]>()
  const projections = list.projectionsBySession ?? {}
  for (const leadId of Object.keys(projections)) {
    const team = projections[leadId]?.values?.agentTeam as { members?: TeamMember[] } | undefined
    if (team?.members === undefined || team.members.filter((m) => m.role === 'teammate' && m.phase !== 'retired').length === 0) continue
    const department = departmentOf(list, leadId)
    if (department === undefined) continue
    const bucket = byCwd.get(department.cwd)
    if (bucket === undefined) byCwd.set(department.cwd, [department])
    else bucket.push(department)
  }
  const groups: WorkspaceGroup[] = []
  for (const [cwd, departments] of byCwd) {
    departments.sort((a, b) => a.title.localeCompare(b.title))
    groups.push({ cwd, name: cwd === '' ? '' : baseName(cwd), departments })
  }
  groups.sort((a, b) => a.name.localeCompare(b.name))
  return groups
}

/** Name shown for any id on the path (breadcrumb) or on a card. */
export function nameOf(list: ListState, department: Department, id: string, index = catalogIndex(list)): string {
  if (id === department.leadId) return department.title
  if (isHelpersId(id)) return ''
  const member = department.members.find((m) => m.id === id)
  if (member !== undefined) return member.name
  const info = index.get(id)
  if (info?.label !== undefined) return info.label
  return readableTitle(list.byId[id]?.displayTitle, id)
}

function cardOf(list: ListState, department: Department, id: string, kind: WorkerKind, index: Map<string, CatalogInfo>, member?: TeamMember): WorkerCard {
  const row = list.byId[id]
  const info = index.get(id)
  const running = row?.running === true
  const kids = childIdsOf(list, id, index)
  const card: WorkerCard = {
    id,
    name: nameOf(list, department, id, index),
    kind,
    lane: member !== undefined
      ? laneOf({ phase: member.phase, ...(member.error !== undefined ? { error: member.error } : {}), running })
      : subagentLane(running),
    children: kids.length,
    childrenWorking: kids.filter((k) => list.byId[k]?.running === true).length,
    recency: info?.createdAt ?? row?.updatedAt ?? 0,
  }
  const model = modelOf(list, id)
  if (model !== undefined) card.model = model
  if (member?.error !== undefined) card.error = member.error
  if (info?.mode !== undefined) card.mode = info.mode
  if (info?.createdAt !== undefined) card.createdAt = info.createdAt
  if (row?.updatedAt !== undefined && row.updatedAt > 0) card.updatedAt = row.updatedAt
  if (member !== undefined) {
    const note = liveNoteOf(department, card.name)
    if (note !== undefined) card.note = note
  }
  return card
}

/**
 * The live note of a task (SPEC A13 point 2): the agent who works on a task writes ONE line
 * `Stand: <what I am doing right now>` at the top of its description. Returns that line's text.
 */
export function liveNote(task: Pick<TeamTask, 'description'>): string | undefined {
  for (const line of String(task.description ?? '').split(/\r?\n/)) {
    const match = /^\s*(?:Stand|Status|Now)\s*:\s*(.+?)\s*$/i.exec(line)
    if (match !== null) return match[1]!
  }
  return undefined
}

/** The live note of the task `name` has in progress (first one with a note), if any. */
export function liveNoteOf(department: Department, name: string): string | undefined {
  for (const task of department.tasks) {
    if (task.ownerName !== name || task.status !== 'in_progress') continue
    const note = liveNote(task)
    if (note !== undefined) return note
  }
  return undefined
}

/** Ids of the lead's children that are neither active team members nor the lead itself. */
export function helperIds(list: ListState, department: Department, index = catalogIndex(list)): string[] {
  const memberIds = new Set(department.members.map((m) => m.id))
  return childIdsOf(list, department.leadId, index).filter((id) => !memberIds.has(id))
}

/**
 * The cards of ONE level: the direct children of `focusId`.
 *  - the department lead: its group leads, plus one collapsed card for all helpers
 *  - the helpers card: the helpers themselves
 *  - anything else: its direct subagents
 */
export function levelCards(list: ListState, department: Department, focusId: string): WorkerCard[] {
  const index = catalogIndex(list)
  const cards: WorkerCard[] = []
  if (focusId === department.leadId) {
    for (const member of department.members) cards.push(cardOf(list, department, member.id, 'group-lead', index, member))
    const helpers = helperIds(list, department, index)
    if (helpers.length > 0) {
      const working = helpers.filter((id) => list.byId[id]?.running === true).length
      cards.push({
        id: HELPERS_PREFIX + department.leadId,
        name: '',
        kind: 'helpers',
        lane: subagentLane(working > 0),
        children: helpers.length,
        childrenWorking: working,
        recency: Math.max(0, ...helpers.map((id) => index.get(id)?.createdAt ?? list.byId[id]?.updatedAt ?? 0)),
      })
    }
  } else if (isHelpersId(focusId)) {
    for (const id of helperIds(list, department, index)) cards.push(cardOf(list, department, id, 'helper', index))
  } else {
    for (const id of childIdsOf(list, focusId, index)) cards.push(cardOf(list, department, id, 'specialist', index))
  }
  return cards
}

/** The direct children of one card, for the unfolded preview. */
export function childCards(list: ListState, department: Department, card: WorkerCard): WorkerCard[] {
  return levelCards(list, department, card.id)
}

/** Cards of one lane: working ones by name, the rest newest first. */
export function inLane(cards: WorkerCard[], lane: Lane): WorkerCard[] {
  return cards
    .filter((card) => card.lane === lane)
    .sort((a, b) => (lane === 'working' ? a.name.localeCompare(b.name) : b.recency - a.recency || a.name.localeCompare(b.name)))
}

/** Tasks a worker has claimed. The team plugin stores the owner by name. */
export function claimedTasks(department: Department, card: WorkerCard): TeamTask[] {
  if (card.kind !== 'group-lead') return []
  return department.tasks.filter((task) => task.ownerName === card.name)
}

/** Numbers for the header of one department. */
export function summary(list: ListState, department: Department): {
  groups: number
  working: number
  tasksOpen: number
  tasksRunning: number
  tasksDone: number
} {
  const index = catalogIndex(list)
  const working = workingBelow(list, department.leadId, index)
  return {
    groups: department.members.length,
    working,
    tasksOpen: department.tasks.filter((t) => t.status === 'pending').length,
    tasksRunning: department.tasks.filter((t) => t.status === 'in_progress').length,
    tasksDone: department.tasks.filter((t) => t.status === 'completed').length,
  }
}

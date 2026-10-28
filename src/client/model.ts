/**
 * Pure data model of the manager page. No React, no DSH imports: it reads the
 * session list snapshot the browser already holds (SPEC B7) and returns
 * departments, work groups and worker cards.
 *
 * Source of the data (SPEC B7, measured):
 *  - `byId[id]`            id, displayTitle, cwd?, parentId?, origin?, running, updatedAt, projectionValues?
 *  - `projectionsBySession[leadId].values.agentTeam`     { members, tasks, failure? }
 *  - `projectionsBySession[expertId].values.subagentCatalog`  [{ id, mode, label? }]
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

/** The order the lanes are drawn in. */
export const LANES: readonly Lane[] = ['working', 'waiting', 'starting', 'resting', 'failed', 'done']

/**
 * What a card is:
 *  - `group-lead`   a team member of the department (the leader of a work group)
 *  - `specialist`   a child of a group lead started with delegate_task
 *  - `helper`       a child of the department lead that is not a team member
 */
export type WorkerKind = 'group-lead' | 'specialist' | 'helper'

export interface WorkerCard {
  id: string
  name: string
  kind: WorkerKind
  lane: Lane
  /** Name of the work group this worker belongs to (the group lead's name). */
  group: string
  model?: string
  description?: string
  error?: string
  /** `one-shot` specialists end with their order; everything else keeps waiting. */
  mode?: 'one-shot' | 'continuable' | 'unknown'
}

export interface Department {
  leadId: string
  title: string
  cwd: string
  leadRunning: boolean
  tasks: TeamTask[]
  workers: WorkerCard[]
  failure?: string
}

export interface WorkspaceGroup {
  cwd: string
  name: string
  departments: Department[]
}

/** Last path segment of a directory, tolerant of both separators. */
export function baseName(path: string): string {
  const parts = path.split(/[\\/]+/).filter((part) => part !== '')
  return parts.length === 0 ? path : parts[parts.length - 1]!
}

function modelOf(row: SessionRow | undefined, projection: { values: Record<string, any> } | undefined): string | undefined {
  const fromProjection = projection?.values?.modelSelection?.next?.model
  if (typeof fromProjection === 'string') return fromProjection
  const fromRow = row?.projectionValues?.modelSelection?.next?.model
  return typeof fromRow === 'string' ? fromRow : undefined
}

/** Decide the lane of one worker from facts the browser already has. */
export function laneOf(input: {
  phase?: TeamMember['phase']
  error?: string
  running: boolean
  mode?: WorkerCard['mode']
}): Lane {
  if (input.error !== undefined || input.phase === 'failed') return 'failed'
  if (input.phase === 'provisioning') return 'starting'
  if (input.phase === 'resting') return 'resting'
  if (input.running) return 'working'
  if (input.mode === 'one-shot') return 'done'
  return 'waiting'
}

function childrenOf(list: ListState, parentId: string): SessionRow[] {
  const out: SessionRow[] = []
  for (const id of list.ids) {
    const row = list.byId[id]
    if (row !== undefined && row.parentId === parentId) out.push(row)
  }
  // The browser also adds subagents that are only known through the parent's catalog.
  for (const id of Object.keys(list.byId)) {
    if (list.ids.includes(id)) continue
    const row = list.byId[id]
    if (row !== undefined && row.parentId === parentId) out.push(row)
  }
  return out
}

function catalogOf(list: ListState, sessionId: string): Array<{ id: string; mode: WorkerCard['mode']; label?: string }> {
  const entries = list.projectionsBySession?.[sessionId]?.values?.subagentCatalog
  return Array.isArray(entries) ? entries : []
}

/** Build one department from a lead session that carries an agentTeam projection. */
export function buildDepartment(list: ListState, leadId: string): Department | undefined {
  const team = list.projectionsBySession?.[leadId]?.values?.agentTeam as
    | { members: TeamMember[]; tasks: TeamTask[]; failure?: string }
    | undefined
  const leadRow = list.byId[leadId]
  if (team === undefined || leadRow === undefined) return undefined

  const workers: WorkerCard[] = []
  const memberIds = new Set<string>()

  for (const member of team.members) {
    if (member.role === 'lead' || member.phase === 'retired') continue
    memberIds.add(member.id)
    const row = list.byId[member.id]
    const projection = list.projectionsBySession?.[member.id]
    const card: WorkerCard = {
      id: member.id,
      name: member.name,
      kind: 'group-lead',
      lane: laneOf({
        phase: member.phase,
        ...(member.error !== undefined ? { error: member.error } : {}),
        running: row?.running === true,
      }),
      group: member.name,
    }
    const model = modelOf(row, projection)
    if (model !== undefined) card.model = model
    if (member.error !== undefined) card.error = member.error
    workers.push(card)
  }

  // Specialists: direct children of every group lead that are not team members.
  for (const member of team.members) {
    if (member.role === 'lead' || member.phase === 'retired') continue
    const catalog = catalogOf(list, member.id)
    const seen = new Set<string>()
    const rows = [
      ...catalog.map((entry) => ({ id: entry.id, mode: entry.mode, label: entry.label })),
      ...childrenOf(list, member.id).map((row) => ({ id: row.id, mode: undefined as WorkerCard['mode'], label: undefined as string | undefined })),
    ]
    for (const entry of rows) {
      if (seen.has(entry.id) || memberIds.has(entry.id)) continue
      seen.add(entry.id)
      const row = list.byId[entry.id]
      const mode = entry.mode ?? catalog.find((c) => c.id === entry.id)?.mode
      const card: WorkerCard = {
        id: entry.id,
        name: row?.displayTitle ?? entry.label ?? entry.id,
        kind: 'specialist',
        lane: laneOf({ running: row?.running === true, ...(mode !== undefined ? { mode } : {}) }),
        group: member.name,
      }
      if (mode !== undefined) card.mode = mode
      const model = modelOf(row, list.projectionsBySession?.[entry.id])
      if (model !== undefined) card.model = model
      workers.push(card)
    }
  }

  // Helpers of the department lead itself (children that are not team members).
  const seenHelpers = new Set<string>()
  for (const entry of [
    ...catalogOf(list, leadId).map((e) => ({ id: e.id, mode: e.mode, label: e.label })),
    ...childrenOf(list, leadId).map((row) => ({ id: row.id, mode: undefined as WorkerCard['mode'], label: undefined as string | undefined })),
  ]) {
    if (seenHelpers.has(entry.id) || memberIds.has(entry.id)) continue
    seenHelpers.add(entry.id)
    const row = list.byId[entry.id]
    const mode = entry.mode
    const card: WorkerCard = {
      id: entry.id,
      name: row?.displayTitle ?? entry.label ?? entry.id,
      kind: 'helper',
      lane: laneOf({ running: row?.running === true, ...(mode !== undefined ? { mode } : {}) }),
      group: '',
    }
    if (mode !== undefined) card.mode = mode
    workers.push(card)
  }

  const department: Department = {
    leadId,
    title: leadRow.displayTitle,
    cwd: leadRow.cwd ?? '',
    leadRunning: leadRow.running,
    tasks: team.tasks,
    workers,
  }
  if (team.failure !== undefined) department.failure = team.failure
  return department
}

/**
 * Every session that carries a team with at least one teammate is a department.
 * A session with only the lead itself is no department yet.
 */
export function buildWorkspaces(list: ListState): WorkspaceGroup[] {
  const byCwd = new Map<string, Department[]>()
  const projections = list.projectionsBySession ?? {}
  for (const leadId of Object.keys(projections)) {
    const team = projections[leadId]?.values?.agentTeam as { members?: TeamMember[] } | undefined
    if (team?.members === undefined || team.members.filter((m) => m.role === 'teammate').length === 0) continue
    const department = buildDepartment(list, leadId)
    if (department === undefined) continue
    const key = department.cwd
    const bucket = byCwd.get(key)
    if (bucket === undefined) byCwd.set(key, [department])
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

/** Tasks a worker has claimed. The team plugin stores the owner by name. */
export function claimedTasks(department: Department, worker: WorkerCard): TeamTask[] {
  if (worker.kind !== 'group-lead') return []
  return department.tasks.filter((task) => task.ownerName === worker.name)
}

/** Workers of one lane, group leads first, then specialists of the same group together. */
export function workersInLane(department: Department, lane: Lane): WorkerCard[] {
  const rank: Record<WorkerKind, number> = { 'group-lead': 0, specialist: 1, helper: 2 }
  return department.workers
    .filter((worker) => worker.lane === lane)
    .sort((a, b) => a.group.localeCompare(b.group) || rank[a.kind] - rank[b.kind] || a.name.localeCompare(b.name))
}

/** How many workers and tasks a department has, for its header. */
export function summary(department: Department): {
  workers: number
  working: number
  tasksOpen: number
  tasksRunning: number
  tasksDone: number
} {
  return {
    workers: department.workers.length,
    working: department.workers.filter((w) => w.lane === 'working').length,
    tasksOpen: department.tasks.filter((t) => t.status === 'pending').length,
    tasksRunning: department.tasks.filter((t) => t.status === 'in_progress').length,
    tasksDone: department.tasks.filter((t) => t.status === 'completed').length,
  }
}

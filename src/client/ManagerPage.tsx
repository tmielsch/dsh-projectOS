import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  LANES,
  agoOf,
  applyNames,
  baselineOf,
  buildWorkspaces,
  departmentActivity,
  diffTicker,
  feedOf,
  trimTicker,
  type Baseline,
  type FeedLine,
  type TickerEvent,
  childCards,
  claimedTasks,
  inLane,
  isHelpersId,
  levelCards,
  liveNote,
  nameOf,
  summary,
  type Department,
  type ListState,
  type WorkerCard,
} from './model'
import type { Key } from './locales'

type T = (key: Key, params?: Record<string, unknown>) => string

export interface ManagerPageProps {
  useSessions: <R>(selector: (state: ListState) => R) => R
  /** Workspace snapshot, a standard prop of the `main` slot (measured in its catalog). */
  useWorkspaces?: <R>(selector: (state: { items: { workspaceId: string; path: string; title: string }[] }) => R) => R
  t: T
  openSession: (sessionId: string) => void
  /** Department the page should show first (set by the chat button). */
  focusLead?: () => string | undefined
  /** The Policy-Manager tab, built by the entry (the entry owns the remote face). */
  renderPolicies?: (useWorkspaces: NonNullable<ManagerPageProps['useWorkspaces']>) => ReactNode
}

/** Icon of the sidebar row: one box over three boxes, a hierarchy. */
export function ManagerIcon({ size = 16 }: { size?: number }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5.5" y="1.5" width="5" height="3.5" rx="1" />
      <rect x="1.5" y="11" width="3.5" height="3.5" rx="1" />
      <rect x="6.25" y="11" width="3.5" height="3.5" rx="1" />
      <rect x="11" y="11" width="3.5" height="3.5" rx="1" />
      <path d="M8 5v3M3.25 11V8h9.5v3M8 8v3" />
    </svg>
  )
}

const LANE_LIMIT = 8
const PEEK_LIMIT = 6

function cardTitle(card: WorkerCard, t: T): string {
  return card.kind === 'helpers' ? t('helpersCard') : card.name
}

function cardSubtitle(card: WorkerCard, t: T): string {
  if (card.kind === 'helpers') return t('helpersCount', { count: card.children, working: card.childrenWorking })
  const kind = t(`kind.${card.kind}` as Key)
  return card.children > 0 ? `${kind} · ${t('childrenCount', { count: card.children, working: card.childrenWorking })}` : kind
}

const NAMES_KEY = 'project-os.names'

function loadNames(): Record<string, string> {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(NAMES_KEY)
    const parsed = raw === null ? {} : JSON.parse(raw)
    return parsed !== null && typeof parsed === 'object' ? parsed as Record<string, string> : {}
  } catch { return {} }
}

function saveNames(names: Record<string, string>): void {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(NAMES_KEY, JSON.stringify(names)) } catch { /* private mode */ }
}

function ago(at: number, now: number, t: T): string {
  const { unit, n } = agoOf(at, now)
  return t(`ago.${unit}` as Key, { n })
}

function feedText(line: FeedLine, t: T): string {
  if (line.kind === 'thought' || line.kind === 'said') return `${line.who}: ${line.text}`
  if (line.kind === 'tool') return `${line.who} · ${line.text}`
  const e = line.event!
  return t(`tick.${e.kind}` as Key, {
    who: e.who, subject: e.subject ?? '', note: e.note ?? '', error: e.error ?? '',
    status: e.status === undefined ? '' : t(`status.${e.status === 'deleted' ? 'completed' : e.status}` as Key),
  })
}

function Feed({ lines, now, t }: { lines: FeedLine[]; now: number; t: T }): ReactNode {
  if (lines.length === 0) return <p className="pos-empty">{t('dept.quiet')}</p>
  return (
    <ul className="pos-feed" data-pos-feed="">
      {lines.map((line) => (
        <li key={line.id} data-kind={line.kind}>
          <span className="pos-feedtime">{ago(line.at, now, t)}</span>
          <span className="pos-feedtext">{feedText(line, t)}</span>
        </li>
      ))}
    </ul>
  )
}

function Detail({ department, card, t, openSession, onClose }: {
  department: Department
  card: WorkerCard
  t: T
  openSession: (id: string) => void
  onClose: () => void
}): ReactNode {
  const tasks = claimedTasks(department, card)
  return (
    <aside className="pos-detail" data-pos-detail="">
      <h2>{cardTitle(card, t)}</h2>
      <small>{t(`kind.${card.kind}` as Key)}</small>
      <dl>
        <dt>{t('state')}</dt>
        <dd>{t(`lane.${card.lane}` as Key)}</dd>
        {card.model !== undefined && (<><dt>{t('model')}</dt><dd>{card.model}</dd></>)}
        {card.mode !== undefined && (<><dt>{t('mode')}</dt><dd>{t(`mode.${card.mode}` as Key)}</dd></>)}
        {card.thought !== undefined && (<><dt>{t('thoughtNow')}</dt><dd>{card.thought}</dd></>)}
        {card.tool !== undefined && (<><dt>{t('toolLast')}</dt><dd>{card.tool}</dd></>)}
        {card.updatedAt !== undefined && (<><dt>{t('lastActive')}</dt><dd>{new Date(card.updatedAt).toLocaleString()}</dd></>)}
        {card.kind === 'group-lead' && (<><dt>{t('noteNow')}</dt><dd>{card.note ?? <span className="pos-empty">{t('noteNone')}</span>}</dd></>)}
        {card.error !== undefined && (<><dt className="pos-err">{t('error')}</dt><dd className="pos-err">{card.error}</dd></>)}
      </dl>
      {card.kind === 'group-lead' && (
        <>
          <h3>{t('claimed')}</h3>
          {tasks.length === 0 && <p className="pos-empty">{t('claimedNone')}</p>}
          {tasks.map((task) => (
            <div className="pos-task" key={task.id}>
              <strong>{task.subject}</strong>
              {liveNote(task) !== undefined && <em className="pos-note-line">{liveNote(task)}</em>}
              <small>
                {t(`status.${task.status === 'deleted' ? 'completed' : task.status}` as Key)}
                {task.status === 'pending' ? ` · ${task.ready ? t('ready') : t('blocked')}` : ''}
                {task.blockedBy.length > 0 ? ` · ${t('blockedBy')}: ${task.blockedBy.join(', ')}` : ''}
              </small>
            </div>
          ))}
        </>
      )}
      <div className="pos-actions">
        {card.kind !== 'helpers' && (
          <button type="button" className="pos-btn" onClick={() => openSession(card.id)}>{t('open')}</button>
        )}
        <button type="button" className="pos-btn" onClick={onClose}>{t('close')}</button>
      </div>
    </aside>
  )
}

/** The manager page: department tabs, a path, and the board of ONE hierarchy level. */
export function ManagerPage({ useSessions, useWorkspaces, t, openSession, focusLead, renderPolicies }: ManagerPageProps): ReactNode {
  const list = useSessions((state) => state)
  const [names, setNames] = useState<Record<string, string>>(loadNames)
  const [renaming, setRenaming] = useState<string | undefined>(undefined)
  const [now, setNow] = useState(() => Date.now())
  const [events, setEvents] = useState<TickerEvent[]>([])
  const baselines = useRef<Record<string, Baseline>>({})
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | undefined>(undefined)
  /** The tab strip of the page: the kanban board and the policy editor (Anordnung 2026-10-30). */
  const [tab, setTab] = useState<'board' | 'policies'>('board')

  const workspaces = useMemo(() => applyNames(buildWorkspaces(list), names), [list, names])
  const workspace = workspaces.find((w) => w.cwd === selectedWorkspace) ?? workspaces[0]
  const departments = useMemo(
    () => (workspace?.departments ?? []).map((d) => ({ workspace: workspace?.name ?? '', department: d })),
    [workspace],
  )
  const allDepartments = useMemo(() => workspaces.flatMap((w) => w.departments), [workspaces])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(timer)
  }, [])

  // Live ticker: remember what every department looked like and turn each change into a line.
  useEffect(() => {
    const at = Date.now()
    const fresh: TickerEvent[] = []
    for (const department of allDepartments) {
      const next = baselineOf(list, department)
      fresh.push(...diffTicker(baselines.current[department.leadId], next, department.leadId, at, fresh.length))
      baselines.current[department.leadId] = next
    }
    if (fresh.length > 0) setEvents((previous) => trimTicker([...previous, ...fresh], 120))
  }, [list, allDepartments])

  const [selectedLead, setSelectedLead] = useState<string | undefined>(undefined)
  /** Path below the department lead: the last entry is the card whose board is shown. */
  const [path, setPath] = useState<string[]>([])
  const [unfolded, setUnfolded] = useState<Record<string, boolean>>({})
  const [detailId, setDetailId] = useState<string | undefined>(undefined)
  const [expandedLanes, setExpandedLanes] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const wanted = focusLead?.()
    if (wanted === undefined) return
    const owner = workspaces.find((w) => w.departments.some((d) => d.leadId === wanted))
    if (owner !== undefined) {
      setSelectedWorkspace(owner.cwd)
      setSelectedLead(wanted)
      setPath([])
    }
  }, [focusLead, workspaces])

  const current = departments.find((d) => d.department.leadId === selectedLead) ?? departments[0]
  const department = current?.department
  const focusId = department === undefined ? '' : path.length === 0 ? department.leadId : path[path.length - 1]!

  const cards = useMemo(
    () => (department === undefined ? [] : levelCards(list, department, focusId)),
    [list, department, focusId],
  )

  const detail = useMemo(() => {
    if (department === undefined || detailId === undefined) return undefined
    const all = [...cards, ...cards.flatMap((c) => (unfolded[c.id] ? childCards(list, department, c) : []))]
    return all.find((c) => c.id === detailId)
  }, [department, detailId, cards, unfolded, list])

  const enter = (id: string): void => {
    setPath((previous) => [...previous, id])
    setDetailId(undefined)
  }
  const goTo = (depth: number): void => {
    setPath((previous) => previous.slice(0, depth))
    setDetailId(undefined)
  }
  const toggle = (id: string): void => setUnfolded((previous) => ({ ...previous, [id]: !previous[id] }))
  const select = (id: string): void => setDetailId((previous) => (previous === id ? undefined : id))

  const stats = department === undefined ? undefined : summary(list, department)

  return (
    <div className="pos-page" data-pos-page="" data-dsh-plugin="project-os">
      <header className="pos-head">
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </header>

      <nav className="pos-tabs" role="tablist" aria-label={t('tabs')}>
        <button type="button" role="tab" className="pos-tab" aria-pressed={tab === 'board'} onClick={() => setTab('board')}>{t('tabBoard')}</button>
        {renderPolicies !== undefined && useWorkspaces !== undefined && (
          <button type="button" role="tab" className="pos-tab" aria-pressed={tab === 'policies'} onClick={() => setTab('policies')}>{t('tabPolicies')}</button>
        )}
      </nav>

      {tab === 'policies' && useWorkspaces !== undefined && renderPolicies !== undefined && (
        <div className="pos-policytab">{renderPolicies(useWorkspaces)}</div>
      )}

      {tab === 'board' && (<>
      {list.phase === 'pending' && workspaces.length === 0 && <p className="pos-note">{t('loading')}</p>}
      {list.phase !== 'pending' && workspaces.length === 0 && <p className="pos-note">{t('empty')}</p>}

      {workspaces.length > 0 && (
        <div className="pos-workspaces" role="tablist" aria-label={t('workspacePick')}>
          <span className="pos-label">{t('workspacePick')}</span>
          {workspaces.map((w) => (
            <button
              type="button"
              role="tab"
              key={w.cwd}
              className="pos-ws"
              aria-pressed={w.cwd === workspace?.cwd}
              onClick={() => { setSelectedWorkspace(w.cwd); setSelectedLead(undefined); setPath([]); setDetailId(undefined) }}
            >
              {w.name === '' ? '–' : w.name}
              <span className="pos-count">{w.departments.length}</span>
            </button>
          ))}
          <span className="pos-hint pos-onlyteams">{t('onlyTeams')}</span>
        </div>
      )}

      {departments.length > 0 && (
        <div className="pos-depts" data-pos-depts="">
          {departments.map(({ department: d }) => {
            const act = departmentActivity(list, d)
            const feed = feedOf(list, d, events.filter((e) => e.kind !== 'seed'), now, { limit: act.active ? 3 : 1 })
            const isRenaming = renaming === d.leadId
            return (
              <div
                className="pos-dept"
                key={d.leadId}
                data-active={act.active}
                aria-current={d.leadId === department?.leadId}
              >
                <div className="pos-depthead">
                  <span className="pos-dot" data-lane={act.active ? 'working' : 'done'} />
                  {isRenaming ? (
                    <input
                      className="pos-nameinput"
                      autoFocus
                      defaultValue={d.title}
                      aria-label={t('dept.renameHint')}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setRenaming(undefined)
                        if (e.key === 'Enter') {
                          const next = { ...names }
                          const value = (e.target as HTMLInputElement).value.trim()
                          if (value === '') delete next[d.leadId]; else next[d.leadId] = value
                          setNames(next); saveNames(next); setRenaming(undefined)
                        }
                      }}
                      onBlur={() => setRenaming(undefined)}
                    />
                  ) : (
                    <button type="button" className="pos-deptname" onClick={() => { setSelectedLead(d.leadId); setPath([]); setDetailId(undefined) }}>
                      {d.title}
                    </button>
                  )}
                  <button type="button" className="pos-mini pos-pencil" title={t('dept.rename')} aria-label={t('dept.rename')} onClick={() => setRenaming(d.leadId)}>✎</button>
                  <span className="pos-badge" data-active={act.active}>{t(act.active ? 'dept.active' : 'dept.inactive')}</span>
                </div>
                <small className="pos-deptmeta">
                  {t('dept.groups', { n: d.members.length })}
                  {act.working > 0 ? ` · ${t('dept.working', { n: act.working })}` : ''}
                  {act.lastActiveAt > 0 ? ` · ${t('dept.last', { when: ago(act.lastActiveAt, now, t) })}` : ''}
                </small>
                <Feed lines={feed} now={now} t={t} />
              </div>
            )
          })}
        </div>
      )}

      {department !== undefined && stats !== undefined && (
        <>
          <div className="pos-stats">
            <span><b>{stats.groups}</b> {t('groups')}</span>
            <span><b>{stats.working}</b> {t('working')}</span>
            <span><b>{stats.tasksOpen}</b> {t('tasksOpen')}</span>
            <span><b>{stats.tasksRunning}</b> {t('tasksRunning')}</span>
            <span><b>{stats.tasksDone}</b> {t('tasksDone')}</span>
          </div>
          {department.failure !== undefined && <p className="pos-failure">{t('teamFailure', { message: department.failure })}</p>}

          <nav className="pos-path" aria-label="path">
            <button type="button" className="pos-crumb" onClick={() => goTo(0)} aria-current={path.length === 0}>
              {t('top')}: {department.title}
            </button>
            {path.map((id, depth) => (
              <Fragment key={id}>
                <span className="pos-sep">›</span>
                <button type="button" className="pos-crumb" onClick={() => goTo(depth + 1)} aria-current={depth === path.length - 1}>
                  {isHelpersId(id) ? t('helpersCard') : nameOf(list, department, id)}
                </button>
              </Fragment>
            ))}
            <button type="button" className="pos-btn pos-leadbtn" title={department.title} onClick={() => openSession(department.leadId)}>
              {t('openLead')}
            </button>
            <span className="pos-hint">{t('levelHint')}</span>
          </nav>

          <section className="pos-live" data-pos-live="">
            <h2><span className="pos-dot" data-lane={stats.working > 0 ? 'working' : 'done'} />{t('live')}</h2>
            <Feed lines={feedOf(list, department, events.filter((e) => e.kind !== 'seed'), now, { limit: 10 })} now={now} t={t} />
          </section>

          <div className="pos-body">
            <div className="pos-board" data-pos-board="">
              {cards.length === 0 && <p className="pos-note">{t('nothingBelow')}</p>}
              {LANES.map((lane) => {
                const all = inLane(cards, lane)
                if (all.length === 0 && lane !== 'working' && lane !== 'waiting') return null
                if (all.length === 0 && cards.length === 0) return null
                const open = expandedLanes[lane] === true
                const shown = open ? all : all.slice(0, LANE_LIMIT)
                return (
                  <section className="pos-lane" key={lane} data-lane={lane}>
                    <h2>
                      <span className="pos-dot" data-lane={lane} />
                      {t(`lane.${lane}` as Key)}
                      <span className="pos-count">{all.length}</span>
                    </h2>
                    {all.length === 0 && <p className="pos-empty">{t('lane.empty')}</p>}
                    {shown.map((card) => {
                      const isOpen = unfolded[card.id] === true
                      const kids = isOpen ? childCards(list, department, card) : []
                      return (
                        <div className="pos-cardwrap" key={card.id}>
                          <div className="pos-cardrow">
                            <button
                              type="button"
                              className="pos-card"
                              aria-pressed={card.id === detailId}
                              aria-expanded={card.children > 0 ? isOpen : undefined}
                              title={card.children > 0 ? t(isOpen ? 'fold' : 'unfold') : t('details')}
                              onClick={() => (card.children > 0 ? toggle(card.id) : select(card.id))}
                            >
                              <strong>
                                {card.children > 0 && <span className="pos-chev">{isOpen ? '▾' : '▸'}</span>}
                                {cardTitle(card, t)}
                              </strong>
                              <small>{cardSubtitle(card, t)}</small>
                              {card.model !== undefined && <small>{card.model}</small>}
                              {card.note !== undefined && <em className="pos-note-line">{card.note}</em>}
                              {card.thought !== undefined && card.lane === 'working' && <em className="pos-thought">{card.thought}</em>}
                            </button>
                            <div className="pos-cardtools">
                              {card.children > 0 && (
                                <button type="button" className="pos-mini" title={t('enter')} aria-label={t('enter')} onClick={() => enter(card.id)}>→</button>
                              )}
                              <button type="button" className="pos-mini" title={t('details')} aria-label={t('details')} onClick={() => select(card.id)}>i</button>
                            </div>
                          </div>
                          {isOpen && (
                            <div className="pos-kids">
                              {kids.length === 0 && <p className="pos-empty">{t('nothingBelow')}</p>}
                              {kids.slice(0, PEEK_LIMIT).map((kid) => (
                                <button
                                  type="button"
                                  className="pos-kid"
                                  key={kid.id}
                                  data-lane={kid.lane}
                                  title={kid.children > 0 ? t('enter') : t('details')}
                                  onClick={() => (kid.children > 0 ? enter(kid.id) : select(kid.id))}
                                >
                                  <span className="pos-dot" data-lane={kid.lane} />
                                  <span className="pos-kidname">{cardTitle(kid, t)}</span>
                                  <span className="pos-kidstate">{t(`lane.${kid.lane}` as Key)}</span>
                                </button>
                              ))}
                              {kids.length > PEEK_LIMIT && (
                                <button type="button" className="pos-more" onClick={() => enter(card.id)}>
                                  {t('moreCards', { count: kids.length - PEEK_LIMIT })}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {all.length > LANE_LIMIT && (
                      <button type="button" className="pos-more" onClick={() => setExpandedLanes((p) => ({ ...p, [lane]: !open }))}>
                        {open ? t('fewerCards') : t('moreCards', { count: all.length - LANE_LIMIT })}
                      </button>
                    )}
                  </section>
                )
              })}
            </div>
            {detail !== undefined && (
              <Detail department={department} card={detail} t={t} openSession={openSession} onClose={() => setDetailId(undefined)} />
            )}
          </div>
        </>
      )}
      </>)}
    </div>
  )
}

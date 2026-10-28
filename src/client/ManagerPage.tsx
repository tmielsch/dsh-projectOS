import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  LANES,
  buildWorkspaces,
  childCards,
  claimedTasks,
  inLane,
  isHelpersId,
  levelCards,
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
  t: T
  openSession: (sessionId: string) => void
  /** Department the page should show first (set by the chat button). */
  focusLead?: () => string | undefined
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
        {card.error !== undefined && (<><dt className="pos-err">{t('error')}</dt><dd className="pos-err">{card.error}</dd></>)}
      </dl>
      {card.kind === 'group-lead' && (
        <>
          <h3>{t('claimed')}</h3>
          {tasks.length === 0 && <p className="pos-empty">{t('claimedNone')}</p>}
          {tasks.map((task) => (
            <div className="pos-task" key={task.id}>
              <strong>{task.subject}</strong>
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
export function ManagerPage({ useSessions, t, openSession, focusLead }: ManagerPageProps): ReactNode {
  const list = useSessions((state) => state)
  const workspaces = useMemo(() => buildWorkspaces(list), [list])
  const departments = useMemo(
    () => workspaces.flatMap((w) => w.departments.map((d) => ({ workspace: w.name, department: d }))),
    [workspaces],
  )

  const [selectedLead, setSelectedLead] = useState<string | undefined>(undefined)
  /** Path below the department lead: the last entry is the card whose board is shown. */
  const [path, setPath] = useState<string[]>([])
  const [unfolded, setUnfolded] = useState<Record<string, boolean>>({})
  const [detailId, setDetailId] = useState<string | undefined>(undefined)
  const [expandedLanes, setExpandedLanes] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const wanted = focusLead?.()
    if (wanted !== undefined && departments.some((d) => d.department.leadId === wanted)) {
      setSelectedLead(wanted)
      setPath([])
    }
  }, [focusLead, departments])

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

      {list.phase === 'pending' && departments.length === 0 && <p className="pos-note">{t('loading')}</p>}
      {list.phase !== 'pending' && departments.length === 0 && <p className="pos-note">{t('empty')}</p>}

      {departments.length > 0 && (
        <div className="pos-tabs" role="tablist" aria-label={t('department')}>
          {departments.map(({ workspace, department: d }) => (
            <button
              type="button"
              role="tab"
              key={d.leadId}
              className="pos-tab"
              aria-pressed={d.leadId === department?.leadId}
              onClick={() => { setSelectedLead(d.leadId); setPath([]); setDetailId(undefined) }}
            >
              {d.title}
              <small>{t('workspace')}: {workspace === '' ? '–' : workspace}</small>
            </button>
          ))}
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
    </div>
  )
}

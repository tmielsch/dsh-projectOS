import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  LANES,
  buildWorkspaces,
  claimedTasks,
  summary,
  workersInLane,
  type Department,
  type ListState,
  type WorkerCard,
} from './model'
import type { Key } from './locales'

type T = (key: Key, params?: Record<string, unknown>) => string

/** Props the main slot passes in (standard kit) plus what this plugin injects. */
export interface ManagerPageProps {
  useSessions: <R>(selector: (state: ListState) => R) => R
  t: T
  openSession: (sessionId: string) => void
  /** Department the page should show first (set by the chat button). */
  focusLead?: () => string | undefined
}

/** Icon of the sidebar row: three boxes under one box, a hierarchy. */
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

function WorkerDetail({ department, worker, t, openSession, onClose }: {
  department: Department
  worker: WorkerCard
  t: T
  openSession: (id: string) => void
  onClose: () => void
}): ReactNode {
  const tasks = claimedTasks(department, worker)
  return (
    <aside className="pos-detail" data-pos-detail="">
      <h2>{worker.name}</h2>
      <small>{t(`kind.${worker.kind}` as Key)}</small>
      <dl>
        <dt>{t('group')}</dt>
        <dd>{worker.group === '' ? t('noGroup') : worker.group}</dd>
        <dt>{t('state')}</dt>
        <dd>{t(`lane.${worker.lane}` as Key)}</dd>
        {worker.model !== undefined && (<><dt>{t('model')}</dt><dd>{worker.model}</dd></>)}
        {worker.mode !== undefined && (<><dt>{t('mode')}</dt><dd>{t(`mode.${worker.mode}` as Key)}</dd></>)}
        {worker.error !== undefined && (<><dt className="pos-err">{t('error')}</dt><dd className="pos-err">{worker.error}</dd></>)}
      </dl>
      <h3>{t('claimed')}</h3>
      {worker.kind === 'specialist' && <p className="pos-empty">{t('claimedSpecialist')}</p>}
      {worker.kind === 'helper' && <p className="pos-empty">{t('claimedHelper')}</p>}
      {worker.kind === 'group-lead' && tasks.length === 0 && <p className="pos-empty">{t('claimedNone')}</p>}
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
      <div className="pos-actions">
        <button type="button" className="pos-btn" onClick={() => openSession(worker.id)}>{t('open')}</button>
        <button type="button" className="pos-btn" onClick={onClose}>{t('close')}</button>
      </div>
    </aside>
  )
}

/** The manager page: one tab per department, a worker board, a detail card. */
export function ManagerPage({ useSessions, t, openSession, focusLead }: ManagerPageProps): ReactNode {
  const list = useSessions((state) => state)
  const workspaces = useMemo(() => buildWorkspaces(list), [list])
  const departments = useMemo(() => workspaces.flatMap((w) => w.departments.map((d) => ({ workspace: w.name, department: d }))), [workspaces])

  const [selectedLead, setSelectedLead] = useState<string | undefined>(undefined)
  const [selectedWorker, setSelectedWorker] = useState<string | undefined>(undefined)

  // The chat button asks for a particular department; honor it once when it appears.
  useEffect(() => {
    const wanted = focusLead?.()
    if (wanted !== undefined && departments.some((d) => d.department.leadId === wanted)) setSelectedLead(wanted)
  }, [focusLead, departments])

  const current = departments.find((d) => d.department.leadId === selectedLead) ?? departments[0]
  const department = current?.department
  const worker = department?.workers.find((w) => w.id === selectedWorker)

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
              onClick={() => { setSelectedLead(d.leadId); setSelectedWorker(undefined) }}
            >
              {d.title}
              <small>{t('workspace')}: {workspace === '' ? '–' : workspace}</small>
            </button>
          ))}
        </div>
      )}

      {department !== undefined && (() => {
        const s = summary(department)
        return (
          <>
            <div className="pos-stats">
              <span><b>{s.workers}</b> {t('workers')}</span>
              <span><b>{s.working}</b> {t('working')}</span>
              <span><b>{s.tasksOpen}</b> {t('tasksOpen')}</span>
              <span><b>{s.tasksRunning}</b> {t('tasksRunning')}</span>
              <span><b>{s.tasksDone}</b> {t('tasksDone')}</span>
            </div>
            {department.failure !== undefined && <p className="pos-failure">{t('teamFailure', { message: department.failure })}</p>}
            <div className="pos-body">
              <div className="pos-board" data-pos-board="">
                {LANES.map((lane) => {
                  const cards = workersInLane(department, lane)
                  if (cards.length === 0 && (lane === 'starting' || lane === 'done' || lane === 'failed')) return null
                  return (
                    <section className="pos-lane" key={lane} data-lane={lane}>
                      <h2>
                        <span className="pos-dot" data-lane={lane} />
                        {t(`lane.${lane}` as Key)}
                        <span className="pos-count">{cards.length}</span>
                      </h2>
                      {cards.length === 0 && <p className="pos-empty">{t('lane.empty')}</p>}
                      {cards.map((card) => (
                        <button
                          type="button"
                          className="pos-card"
                          key={card.id}
                          aria-pressed={card.id === worker?.id}
                          onClick={() => setSelectedWorker(card.id === selectedWorker ? undefined : card.id)}
                        >
                          <strong>{card.name}</strong>
                          <small>{t(`kind.${card.kind}` as Key)}{card.group !== '' ? ` · ${card.group}` : ''}</small>
                          {card.model !== undefined && <small>{card.model}</small>}
                        </button>
                      ))}
                    </section>
                  )
                })}
              </div>
              {worker !== undefined && (
                <WorkerDetail department={department} worker={worker} t={t} openSession={openSession}
                  onClose={() => setSelectedWorker(undefined)} />
              )}
            </div>
          </>
        )
      })()}
    </div>
  )
}

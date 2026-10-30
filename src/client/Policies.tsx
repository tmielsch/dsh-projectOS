/**
 * Policy UI of dsh-projectOS: the Policy-Manager tab and the right-click policy window.
 *
 * A policy is a prompt card: title + body + one switch per workspace (Anordnung des Menschen
 * 2026-10-30: "Workspace Policies sind nur Prompts, die man per Toggle an/aus schaltet"). The
 * truth lives in the host domain `workspace_policies`; this page reads and writes it through the
 * injected remote face `policies` and keeps one shared view model, so the tab and the floating
 * window always show the same cards.
 */
import { useEffect, useRef, useState } from 'react'
import { clampPosition } from './policy-store'

/**
 * react-dom comes from the page's own module system: measured in the shell bundle
 * (index-5SrrfWpU.js line 126) that "react-dom" and "react-dom/client" are registered there, so a
 * portal rendered through it uses the SAME React instance as the page. `eval('require')` reaches
 * that require from inside the built bundle (measured: runtime result 'function'). A plain import
 * of react-dom would not be externalized by scripts/build-client.mjs (not in my allowed files),
 * so this is the measured way in.
 */
const rdom: { createPortal?: (children: any, container: any) => any } = eval('require')('react-dom')
import { sortCards, toggleCard, type PolicyCard, type WorkspaceItem } from './policy-model'
import type { Key } from './locales'

type T = (key: Key, params?: Record<string, unknown>) => string

/** The remote face, injected by the entry: one function per host method. */
export interface PolicyApi {
  listWorkspace(workspaceId: string): Promise<{ ok: boolean; cards?: PolicyCard[]; message?: string }>
  savePolicy(request: { id?: string; title: string; body: string }): Promise<{ ok: boolean; card?: PolicyCard; message?: string }>
  deletePolicy(id: string): Promise<{ ok: boolean; message?: string }>
  setEnable(workspaceId: string, policyId: string, enabled: boolean): Promise<{ ok: boolean; message?: string }>
}

/** One view model shared by the tab and the window: cards per workspace + listeners. */
export interface PolicyModel {
  cards(workspaceId: string): PolicyCard[] | null
  load(workspaceId: string): void
  save(workspaceId: string, request: { id?: string; title: string; body: string }): void
  remove(workspaceId: string, id: string): void
  flip(workspaceId: string, policyId: string, enabled: boolean): void
  subscribe(listener: () => void): () => void
}

export function createPolicyModel(api: PolicyApi): PolicyModel {
  const byWorkspace = new Map<string, PolicyCard[] | null>()
  const listeners = new Set<() => void>()
  const emit = () => { for (const listener of listeners) listener() }

  return {
    cards: (workspaceId) => byWorkspace.get(workspaceId) ?? null,
    load(workspaceId) {
      if (byWorkspace.has(workspaceId)) return
      byWorkspace.set(workspaceId, null)
      emit()
      api.listWorkspace(workspaceId).then((result) => {
        byWorkspace.set(workspaceId, result.ok === true && Array.isArray(result.cards) ? result.cards : null)
        emit()
      })
    },
    save(workspaceId, request) {
      const list = byWorkspace.get(workspaceId) ?? []
      api.savePolicy(request).then((result) => {
        if (result.ok !== true || result.card === undefined) return
        const next = list.some((card) => card.id === result.card!.id)
          ? list.map((card) => (card.id === result.card!.id ? { ...result.card!, enabled: card.enabled } : card))
          : [...list, { ...result.card!, enabled: false }]
        byWorkspace.set(workspaceId, sortCards(next))
        emit()
      })
    },
    remove(workspaceId, id) {
      const list = byWorkspace.get(workspaceId) ?? []
      api.deletePolicy(id).then((result) => {
        if (result.ok !== true) return
        byWorkspace.set(workspaceId, list.filter((card) => card.id !== id))
        emit()
      })
    },
    flip(workspaceId, policyId, enabled) {
      const list = byWorkspace.get(workspaceId) ?? []
      api.setEnable(workspaceId, policyId, enabled).then((result) => {
        if (result.ok !== true) return
        byWorkspace.set(workspaceId, toggleCard(list, policyId, enabled))
        emit()
      })
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

/** One card row: the switch, the title, the editable body, and its two actions. */
function CardRow({ card, model, workspaceId, t }: {
  card: PolicyCard
  model: PolicyModel
  workspaceId: string
  t: T
}) {
  const [title, setTitle] = useState(card.title)
  const [body, setBody] = useState(card.body)
  const [note, setNote] = useState('')
  const dirty = title.trim() !== card.title || body.trim() !== card.body

  return (
    <div className="pos-policy" data-on={card.enabled}>
      <div className="pos-policyhead">
        <button
          type="button"
          role="switch"
          className="pos-switch"
          aria-checked={card.enabled}
          aria-label={`${t('policyToggle')}: ${card.title}`}
          onClick={() => model.flip(workspaceId, card.id, !card.enabled)}
        >
          <span className="pos-knob" />
        </button>
        <input className="pos-policytitle" value={title} aria-label={t('policyTitleHint')} onChange={(e) => setTitle(e.target.value)} />
        <button type="button" className="pos-mini" title={t('policyDelete')} aria-label={t('policyDelete')} onClick={() => model.remove(workspaceId, card.id)}>✕</button>
      </div>
      <textarea
        className="pos-policybody"
        value={body}
        rows={card.enabled ? 6 : 3}
        aria-label={`${t('policyBodyHint')}: ${card.title}`}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="pos-policyfoot">
        {note !== '' && <span className="pos-err">{note}</span>}
        {dirty && (
          <button type="button" className="pos-btn" onClick={() => {
            model.save(workspaceId, { id: card.id, title, body })
            setNote('')
          }}>{t('policySave')}</button>
        )}
        <span className="pos-hint">{card.enabled ? t('policyOn') : t('policyOff')}</span>
      </div>
    </div>
  )
}

/** All cards of one workspace, in library order, plus the add form. */
export function PolicyList({ workspaceId, model, t }: {
  workspaceId: string
  model: PolicyModel
  t: T
}): any {
  const cards = model.cards(workspaceId)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')

  if (cards === null) return <p className="pos-empty">{t('policyLoading')}</p>
  return (
    <>
      {cards.length === 0 && <p className="pos-empty">{t('policyEmpty')}</p>}
      {cards.map((card) => (
        <CardRow key={card.id} card={card} model={model} workspaceId={workspaceId} t={t} />
      ))}
      {!adding ? (
        <button type="button" className="pos-btn pos-add" onClick={() => setAdding(true)}>{t('policyAdd')}</button>
      ) : (
        <div className="pos-policy">
          <input className="pos-policytitle" value={newTitle} placeholder={t('policyNewTitle')} aria-label={t('policyTitleHint')} onChange={(e) => setNewTitle(e.target.value)} />
          <textarea className="pos-policybody" value={newBody} rows={4} placeholder={t('policyNewBody')} aria-label={t('policyBodyHint')} onChange={(e) => setNewBody(e.target.value)} />
          <div className="pos-policyfoot">
            <button
              type="button"
              className="pos-btn"
              disabled={newTitle.trim() === '' || newBody.trim() === ''}
              onClick={() => {
                model.save(workspaceId, { title: newTitle, body: newBody })
                setAdding(false); setNewTitle(''); setNewBody('')
              }}
            >{t('policyCreate')}</button>
            <button type="button" className="pos-btn" onClick={() => { setAdding(false); setNewTitle(''); setNewBody('') }}>{t('close')}</button>
          </div>
        </div>
      )}
    </>
  )
}

/** The Policy-Manager tab of the projectOS page. */
export function PolicyTab({ useWorkspaces, model, t }: {
  useWorkspaces: <R>(selector: (state: { items: WorkspaceItem[] }) => R) => R
  model: PolicyModel
  t: T
}): any {
  const items = useWorkspaces((state) => state.items)
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const active = selected ?? items[0]?.workspaceId

  useEffect(() => {
    if (active !== undefined) model.load(active)
  }, [active, model])

  return (
    <div className="pos-policies" data-pos-policies="">
      <div className="pos-workspaces" role="tablist" aria-label={t('policyWorkspace')}>
        <span className="pos-label">{t('workspacePick')}</span>
        {items.map((item) => (
          <button
            key={item.workspaceId}
            type="button"
            role="tab"
            className="pos-ws"
            aria-pressed={item.workspaceId === active}
            onClick={() => setSelected(item.workspaceId)}
          >
            {item.title === '' ? '–' : item.title}
          </button>
        ))}
        <span className="pos-hint">{t('policyHint')}</span>
      </div>
      {active === undefined ? (
        <p className="pos-note">{t('policyNoWorkspace')}</p>
      ) : (
        <PolicyList workspaceId={active} model={model} t={t} />
      )}
    </div>
  )
}

const WINDOW_WIDTH = 420
const WINDOW_HEIGHT = 460

/** The floating window opened by a right-click on a workspace row in the sidebar. */
export function PolicyWindow({ store, model, t, useWorkspaces }: {
  store: import('./policy-store').PolicyStore
  model: PolicyModel
  t: T
  useWorkspaces: <R>(selector: (state: { items: WorkspaceItem[] }) => R) => R
}): any {
  const items = useWorkspaces((state) => state.items)
  const [request, setRequest] = useState(store.current())

  useEffect(() => store.subscribe(() => setRequest(store.current())), [store])

  const drag = useRef<{ dx: number; dy: number } | null>(null)
  // The layer the window is painted into. Measured cause of the window hiding behind the rain:
  // the shell overlay layer (.pI_x6G_overlayLayer, dsh-client-ui-layout/lib/client.js line 73) is
  // `z-index:20; position:absolute` — a stacking context of its own. Measured in Chromium with the
  // exact rules: a window inside that layer loses to the matrix canvas at z-index 2147482000 even
  // when its own z-index is raised to 2147483647 (elementFromPoint answers CANVAS), while a
  // body-level container above the rain wins. So the window is portaled out of the overlay layer
  // into one container at the document body, above the measured matrix heights (canvas 2147482000,
  // toast 2147482400, modal 2147483000). dsh-matrix is not touched.
  const [layer, setLayer] = useState<any>(null)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const host = document.createElement('div')
    host.setAttribute('data-pos-window-layer', '')
    host.className = 'pos-window-layer'
    document.body.appendChild(host)
    setLayer(host)
    return () => { host.remove() }
  }, [])
  if (request === null) return null
  const workspace = items.find((item) => item.workspaceId === request.workspaceId)
  const title = workspace?.title ?? ''

  const windowNode = (
    <div
      className="pos-window"
      data-pos-window=""
      style={{ left: `${request.x}px`, top: `${request.y}px`, width: `${WINDOW_WIDTH}px` }}
    >
      <div
        className="pos-windowhead"
        onPointerDown={(e) => {
          drag.current = { dx: e.clientX - request.x, dy: e.clientY - request.y }
          const node = e.currentTarget as HTMLElement
          if (typeof node.setPointerCapture === 'function') node.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (drag.current === null) return
          const moved = clampPosition(e.clientX - drag.current.dx, e.clientY - drag.current.dy, WINDOW_WIDTH, WINDOW_HEIGHT, window.innerWidth, window.innerHeight)
          store.move(moved.x, moved.y)
        }}
        onPointerUp={() => { drag.current = null }}
        onPointerCancel={() => { drag.current = null }}
      >
        <span className="pos-windowtitle">{title === '' ? t('policyWindowNoTitle') : title}</span>
        <button
          type="button"
          className="pos-mini"
          aria-label={t('close')}
          // Measured cause of the dead ✕: the header's onPointerDown calls setPointerCapture on the
          // header. In Chromium (scripts/measure-close-click.mjs, variant A = the shipped code) a
          // pointerdown on the button captures the pointer to the header, so the matching pointerup
          // is retargeted to the header (`head pointerup target=head`, `head click target=head`) and
          // the button's own click never fires (`CLOSE CLICK FIRED` false). Without capture (variant
          // B) and with stopPropagation on the button's own pointerdown (variant C), the click fires
          // and the window closes. Stopping here keeps dragging from the rest of the header working.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => store.close()}
        >✕</button>
      </div>
      <div className="pos-windowbody">
        <PolicyList workspaceId={request.workspaceId} model={model} t={t} />
      </div>
    </div>
  )
  if (layer === null || rdom.createPortal === undefined) return windowNode
  return rdom.createPortal(windowNode, layer)
}

/**
 * Browser entry of dsh-projectOS. Registers:
 *  - the dictionaries (en, de),
 *  - a row "Project OS" in the sidebar panel list (next to the Task Board),
 *  - the page in the `main` slot (board tab + Policy-Manager tab),
 *  - the policy window in `shell.overlay`, opened by a right-click on a workspace row,
 *  - the typert remote face `policies`. The host owns the service; this bundle carries its wire
 *    descriptor, built from the same schema file the host reads (src/client/policy-schemas.ts),
 *    so both ends share one source of truth. zod is bundled into this file by esbuild.
 * The chat button comes later (SPEC A4).
 */
import { CSS, CSS_TAG } from './styles'
import { ManagerIcon, ManagerPage } from './ManagerPage'
import { NS, de, en } from './locales'
import { PolicyTab, PolicyWindow, createPolicyModel, type PolicyApi } from './Policies'
import { createPolicyStore, workspaceIdOfRowKey } from './policy-store'
import {
  deletePolicy_request$schema, deletePolicy_result$schema,
  listLibrary_request$schema, listLibrary_result$schema,
  listWorkspace_request$schema, listWorkspace_result$schema,
  savePolicy_request$schema, savePolicy_result$schema,
  setEnable_request$schema, setEnable_result$schema,
} from './policy-schemas'

export const PANEL_ID = 'project-os.manager'
const PANEL_ORDER = 30

/** Services this entry needs (cordis names, not package names). */
export const inject = ['slots', 'locale', 'uiWorkspace', 'remote']

const PKG = '@tmielsch/dsh-projectos'

/** The wire descriptor of the `policies` remote: five direct methods, one JSON parameter each. */
export const TYPERT_REMOTE = {
  package: PKG,
  descriptors: [
    { id: `${PKG}#policies/listLibrary`, service: 'policies', namespace: 'policies', method: 'listLibrary',
      invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: `${PKG}/policy-schemas#ListLibraryRequest`, create: () => listLibrary_request$schema } }],
      result: { mode: 'strict', typeSymbol: `${PKG}/policy-schemas#ListLibraryResult`, create: () => listLibrary_result$schema },
      sourceLocation: { file: 'src/client/policy-schemas.ts', line: 1, column: 1 } },
    { id: `${PKG}#policies/listWorkspace`, service: 'policies', namespace: 'policies', method: 'listWorkspace',
      invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: `${PKG}/policy-schemas#ListWorkspaceRequest`, create: () => listWorkspace_request$schema } }],
      result: { mode: 'strict', typeSymbol: `${PKG}/policy-schemas#ListWorkspaceResult`, create: () => listWorkspace_result$schema },
      sourceLocation: { file: 'src/client/policy-schemas.ts', line: 1, column: 1 } },
    { id: `${PKG}#policies/savePolicy`, service: 'policies', namespace: 'policies', method: 'savePolicy',
      invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: `${PKG}/policy-schemas#SavePolicyRequest`, create: () => savePolicy_request$schema } }],
      result: { mode: 'strict', typeSymbol: `${PKG}/policy-schemas#SavePolicyResult`, create: () => savePolicy_result$schema },
      sourceLocation: { file: 'src/client/policy-schemas.ts', line: 1, column: 1 } },
    { id: `${PKG}#policies/deletePolicy`, service: 'policies', namespace: 'policies', method: 'deletePolicy',
      invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: `${PKG}/policy-schemas#DeletePolicyRequest`, create: () => deletePolicy_request$schema } }],
      result: { mode: 'strict', typeSymbol: `${PKG}/policy-schemas#DeletePolicyResult`, create: () => deletePolicy_result$schema },
      sourceLocation: { file: 'src/client/policy-schemas.ts', line: 1, column: 1 } },
    { id: `${PKG}#policies/setEnable`, service: 'policies', namespace: 'policies', method: 'setEnable',
      invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: `${PKG}/policy-schemas#SetEnableRequest`, create: () => setEnable_request$schema } }],
      result: { mode: 'strict', typeSymbol: `${PKG}/policy-schemas#SetEnableResult`, create: () => setEnable_result$schema },
      sourceLocation: { file: 'src/client/policy-schemas.ts', line: 1, column: 1 } },
  ],
}

function addStyle(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector('style[data-plugin-css=' + JSON.stringify(CSS_TAG) + ']') !== null) return
  const tag = document.createElement('style')
  tag.dataset.plugin = PKG
  tag.dataset.pluginCss = CSS_TAG
  tag.textContent = CSS
  document.head.appendChild(tag)
}

export async function apply(ctx: any): Promise<void> {
  addStyle()
  ctx.effect(() => ctx.locale.register(NS, { en, de }), 'project-os: dictionaries')
  const t = ctx.locale.bind(NS) as (key: string) => string

  // Mount the remote face first. The consumer plugin below declares `remote.policies` and uses it;
  // the top entry must not, because it is the only provider of that namespace.
  const disposeMount = await ctx.remote.$mount(TYPERT_REMOTE)
  ctx.effect(() => disposeMount, 'project-os: policies remote')

  await ctx.plugin({
    inject: ['slots', 'locale', 'uiWorkspace', 'remote', 'remote.policies'],
    apply: async (sub: any) => {
      const api: PolicyApi = {
        listWorkspace: (workspaceId: string) => sub.remote.policies.listWorkspace({ workspaceId }),
        savePolicy: (request: { id?: string; title: string; body: string }) => sub.remote.policies.savePolicy(request),
        deletePolicy: (id: string) => sub.remote.policies.deletePolicy({ id }),
        setEnable: (workspaceId: string, policyId: string, enabled: boolean) => sub.remote.policies.setEnable({ workspaceId, policyId, enabled }),
      }
      const model = createPolicyModel(api)
      const store = createPolicyStore()

      sub.slots.inject('sidebar.panellist', () => sub.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: PANEL_ORDER,
        label: () => t('panel'),
      }, ManagerIcon))

      sub.slots.inject('main', () => sub.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
        inject: () => ({
          openSession: (sessionId: string) => sub.uiWorkspace.openSession(sessionId),
          // A React ELEMENT, never a plain call. Measured hook counts: ManagerPage has 20 hooks
          // (11 useState, 1 useRef, 5 useMemo, 3 useEffect), PolicyTab 1 (useEffect), PolicyList 3
          // (useState x3). Called as functions inside ManagerPage's render, all 24 counted in ONE hook
          // list; the click on "Policies" grew that list past the previous render, and React error #310
          // is exactly that check. As an element, PolicyTab counts its hooks in its own component.
          // The first workspace's cards are loaded here so the tab shows content on the first render.
          renderPolicies: (useWorkspaces: any) => {
            const items = useWorkspaces((state: { items: { workspaceId: string }[] }) => state.items)
            const first = items[0]?.workspaceId
            if (first !== undefined) model.load(first)
            return <PolicyTab useWorkspaces={useWorkspaces} model={model} t={t} />
          },
        }),
      }, ManagerPage))

      // The floating window: one entry in the frame-wide overlay layer.
      sub.slots.inject('shell.overlay', () => sub.slots.register({
        name: 'shell.overlay',
        id: 'project-os.policy-window',
        order: 40,
        locale: NS,
        inject: () => ({ store, model }),
      }, PolicyWindow))

      // Right-click on a workspace row in the sidebar: the row carries `data-row-key="workspace:<id>"`.
      if (typeof document !== 'undefined') {
        const onContextMenu = (event: MouseEvent): void => {
          const target = event.target as HTMLElement | null
          if (target === null || typeof target.closest !== 'function') return
          const row = target.closest('[data-row-key^="workspace:"]') as HTMLElement | null
          if (row === null) return
          const workspaceId = workspaceIdOfRowKey(String(row.dataset.rowKey ?? ''))
          if (workspaceId === '') return
          event.preventDefault()
          store.open({ workspaceId, x: event.clientX + 8, y: event.clientY + 8 })
        }
        sub.effect(() => {
          document.addEventListener('contextmenu', onContextMenu)
          return () => document.removeEventListener('contextmenu', onContextMenu)
        }, 'project-os: workspace right-click')
      }
    },
  })
}

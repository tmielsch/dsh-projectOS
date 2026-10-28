/**
 * Browser entry of dsh-projectOS. Registers:
 *  - the dictionaries (en, de),
 *  - a row "Project Manager" in the sidebar panel list (next to the Task Board),
 *  - the page in the `main` slot.
 * The chat button comes later (SPEC A4).
 */
import { CSS, CSS_TAG } from './styles'
import { ManagerIcon, ManagerPage } from './ManagerPage'
import { NS, de, en } from './locales'

export const PANEL_ID = 'project-os.manager'
const PANEL_ORDER = 30

/** Services this entry needs (cordis names, not package names). */
export const inject = ['slots', 'locale', 'uiWorkspace']

function addStyle(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector('style[data-plugin-css=' + JSON.stringify(CSS_TAG) + ']') !== null) return
  const tag = document.createElement('style')
  tag.dataset.plugin = '@tmielsch/dsh-projectos'
  tag.dataset.pluginCss = CSS_TAG
  tag.textContent = CSS
  document.head.appendChild(tag)
}

export function apply(ctx: any): void {
  addStyle()
  ctx.effect(() => ctx.locale.register(NS, { en, de }), 'project-os: dictionaries')
  const t = ctx.locale.bind(NS) as (key: string) => string

  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: PANEL_ORDER,
    label: () => t('panel'),
  }, ManagerIcon))

  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
    locale: NS,
    inject: () => ({
      openSession: (sessionId: string) => ctx.uiWorkspace.openSession(sessionId),
    }),
  }, ManagerPage))
}

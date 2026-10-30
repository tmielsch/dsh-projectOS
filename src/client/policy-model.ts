/**
 * Pure policy logic for the browser half (no React, no DSH): testable in node.
 *
 * A workspace card list comes from the host remote `policies/listWorkspace`:
 * `{ ok, workspaceId, cards: [{id,title,body,order,createdAt,updatedAt,enabled}] }`.
 */

export interface PolicyCard {
  id: string
  title: string
  body: string
  order: number
  createdAt: string
  updatedAt: string
  enabled: boolean
}

export interface WorkspaceItem {
  workspaceId: string
  path: string
  title: string
}

/** Library order: by `order`, then title in code-unit order (the rule DSH uses for sections). */
export function sortCards(cards: PolicyCard[]): PolicyCard[] {
  return [...cards].sort((a, b) => a.order - b.order || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0))
}

/** The workspace whose path is the cwd, or the longest workspace path that contains it. */
export function matchWorkspace(items: WorkspaceItem[], cwd: string): WorkspaceItem | undefined {
  const clean = String(cwd).replace(/[/\\]+$/, '')
  let best: WorkspaceItem | undefined
  for (const item of items) {
    const path = String(item.path).replace(/[/\\]+$/, '')
    if (path === clean) return item
    if (clean.startsWith(path + '/') && (best === undefined || path.length > best.path.length)) best = item
  }
  return best
}

/** Cards that are on, in library order. */
export function enabledCards(cards: PolicyCard[]): PolicyCard[] {
  return sortCards(cards).filter((card) => card.enabled && card.body.trim() !== '')
}

/** The same cards with one switch flipped (the host keeps the truth; this is the optimistic view). */
export function toggleCard(cards: PolicyCard[], id: string, enabled: boolean): PolicyCard[] {
  return cards.map((card) => (card.id === id ? { ...card, enabled } : card))
}

/** Cards whose title or body contains the filter text (case-insensitive), in library order. */
export function filterCards(cards: PolicyCard[], text: string): PolicyCard[] {
  const needle = text.trim().toLowerCase()
  const sorted = sortCards(cards)
  if (needle === '') return sorted
  return sorted.filter((card) => card.title.toLowerCase().includes(needle) || card.body.toLowerCase().includes(needle))
}

/** A window position kept inside the viewport. */
export function clampPosition(x: number, y: number, width: number, height: number, vw: number, vh: number): { x: number; y: number } {
  const limitX = Math.max(0, vw - width)
  const limitY = Math.max(0, vh - height)
  return { x: Math.min(Math.max(x, 0), limitX), y: Math.min(Math.max(y, 0), limitY) }
}

/** The workspace id carried by a sidebar row key `workspace:<id>`, or '' when the row is not a workspace. */
export function workspaceIdOfRowKey(key: string): string {
  const prefix = 'workspace:'
  return key.startsWith(prefix) ? key.slice(prefix.length) : ''
}

/** The prompt text the host would build for these cards — shown in the editor as a live preview. */
export function previewText(cards: PolicyCard[]): string {
  const on = enabledCards(cards)
  if (on.length === 0) return ''
  const head = on.length === 1 ? `# Workspace Policy (${on[0].title}) — active in this workspace` : '# Workspace Policies — active in this workspace'
  const bodies = on.map((card) => (on.length > 1 ? `## ${card.title}\n` : '') + card.body.trim())
  return `${head}\n\n${bodies.join('\n\n')}`
}

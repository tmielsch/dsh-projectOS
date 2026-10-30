/**
 * Pure store of the policy window (no React, no DSH): testable in node.
 *
 * A right-click on a workspace row in the sidebar puts a request here; the shell overlay entry
 * renders it as one draggable window. One window at a time: opening another workspace moves the
 * window there, which is what the human asked for ("Rechtsklick auf Workspace → Set Policies →
 * Pop-up mit den Policies").
 */

export interface PolicyWindowRequest {
  workspaceId: string
  x: number
  y: number
}

export interface PolicyStore {
  open(request: PolicyWindowRequest): void
  close(): void
  current(): PolicyWindowRequest | null
  move(x: number, y: number): void
  subscribe(listener: () => void): () => void
}

export function createPolicyStore(): PolicyStore {
  let current: PolicyWindowRequest | null = null
  const listeners = new Set<() => void>()
  const emit = () => { for (const listener of listeners) listener() }
  return {
    open(request) {
      current = request
      emit()
    },
    close() {
      if (current === null) return
      current = null
      emit()
    },
    current() { return current },
    move(x, y) {
      if (current === null) return
      current = { ...current, x, y }
      emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

/** The workspace id a sidebar row key `workspace:<id>` carries; '' when the key is not a workspace row. */
export function workspaceIdOfRowKey(key: string): string {
  const prefix = 'workspace:'
  return key.startsWith(prefix) ? key.slice(prefix.length) : ''
}

/** The window position kept inside the viewport (the header must stay reachable). */
export function clampPosition(x: number, y: number, width: number, height: number, vw: number, vh: number): { x: number; y: number } {
  const limitX = Math.max(0, vw - width)
  const limitY = Math.max(0, vh - height)
  return { x: Math.min(Math.max(x, 0), limitX), y: Math.min(Math.max(y, 0), limitY) }
}

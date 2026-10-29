/**
 * Host half of dsh-projectOS.
 *
 * One session projection, `projectOsActivity` (SPEC A15 point 4, B11): per session it keeps
 *   - `thought`  the last line of the model's last reasoning block,
 *   - `said`     the last line of the model's last answer text,
 *   - `tool`     the name of the last tool the session called,
 *   - `at`       the time of the event that changed it (ms).
 * The browser reads it from `projectionsBySession[id].values.projectOsActivity` and shows it
 * on the cards and in the live ticker. The fold is pure and synchronous, as DSH requires
 * (`dsh-session-projection/lib/types/index.d.ts`), keeps tiny state, and never throws.
 */
import { z } from 'zod'

/** Plugin name shown by DSH, and the cordis services this host half needs. */
export const name = 'project-os'
export const inject = ['sessionProjections']

/** Bump when the state fields or the fold change (invalidates persisted cache rows). */
export const STATE_VERSION = 1
export const KEY = 'projectOsActivity'
const MAX_LINE = 240

const stateSchema = z.object({
  thought: z.string(),
  said: z.string(),
  tool: z.string(),
  at: z.number(),
})

/** Last non-empty line of a text, trimmed and cut to MAX_LINE characters. */
export function lastLine(text) {
  if (typeof text !== 'string') return ''
  const lines = text.split(/\r?\n/)
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].replace(/^[\s>#*\-`]+/, '').replace(/[`*]+/g, '').trim()
    if (line !== '') return line.length > MAX_LINE ? `${line.slice(0, MAX_LINE - 1)}…` : line
  }
  return ''
}

/** Pure fold: previous state + one committed event -> next state (same reference when nothing changes). */
export function fold(state, event) {
  try {
    const type = event?.type
    const at = typeof event?.time === 'number' ? event.time : state.at
    if (type === 'assistant/message') {
      const content = event.data?.message?.content
      if (!Array.isArray(content)) return state
      let thought = state.thought
      let said = state.said
      for (const block of content) {
        if (block?.type === 'reasoning') {
          const line = lastLine(block.text)
          if (line !== '') thought = line
        } else if (block?.type === 'text') {
          const line = lastLine(block.text)
          if (line !== '') said = line
        }
      }
      if (thought === state.thought && said === state.said) return state
      return { ...state, thought, said, at }
    }
    if (type === 'tool/call') {
      const name = typeof event.data?.name === 'string' ? event.data.name : ''
      if (name === '' || name === state.tool) return state
      return { ...state, tool: name, at }
    }
    return state
  } catch {
    return state
  }
}

export const definition = {
  key: KEY,
  stateVersion: STATE_VERSION,
  stateSchema,
  init: () => ({ thought: '', said: '', tool: '', at: 0 }),
  apply: fold,
  wire: {
    viewSchema: stateSchema,
    view: (state) => state,
  },
}

/**
 * Registers the projection. A failure here must never stop DSH from starting, so it only
 * logs one warning and the page falls back to showing no thought lines.
 */
export function apply(ctx) {
  try {
    ctx.effect?.(() => ctx.sessionProjections.register(definition), 'project-os: activity projection')
    if (ctx.effect === undefined) ctx.sessionProjections.register(definition)
  } catch (error) {
    ctx.logger?.('project-os')?.warn?.(`activity projection not registered: ${error instanceof Error ? error.message : String(error)}`)
  }
}

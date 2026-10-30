// Wire schemas of the `policies` remote, as ONE extraction region: scripts/build-client.mjs
// copies this block verbatim into the browser bundle (the `z.` prefix is stripped there), so
// host and client share one source of truth. Keep every definition a plain JS expression and
// write no `z.null()` inside the region (the strip turns it into the reserved `null()` call).
import { z } from 'zod'

// project-os wire schemas start
export const libCard$schema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  order: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const wsCard$schema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  order: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  enabled: z.boolean(),
})

export const listLibrary_request$schema = z.object({})
export const listLibrary_result$schema = z.object({ ok: z.boolean(), cards: z.array(libCard$schema) })

export const listWorkspace_request$schema = z.object({ workspaceId: z.string() })
export const listWorkspace_result$schema = z.object({
  ok: z.boolean(),
  workspaceId: z.string(),
  cards: z.array(wsCard$schema),
})

export const savePolicy_request$schema = z.object({
  id: z.string().optional(),
  title: z.string(),
  body: z.string(),
})
export const savePolicy_result$schema = z.object({
  ok: z.boolean(),
  card: wsCard$schema.optional(),
  message: z.string().optional(),
})

export const deletePolicy_request$schema = z.object({ id: z.string() })
export const deletePolicy_result$schema = z.object({
  ok: z.boolean(),
  id: z.string().optional(),
  message: z.string().optional(),
})

export const setEnable_request$schema = z.object({
  workspaceId: z.string(),
  policyId: z.string(),
  enabled: z.boolean(),
})
export const setEnable_result$schema = z.object({
  ok: z.boolean(),
  workspaceId: z.string().optional(),
  policyId: z.string().optional(),
  enabled: z.boolean().optional(),
  message: z.string().optional(),
})
// project-os wire schemas end

export type LibCard = z.infer<typeof libCard$schema>
export type WsCard = z.infer<typeof wsCard$schema>

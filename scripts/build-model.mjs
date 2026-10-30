// Bundles the pure model for the tests (no React, no DSH).
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
esbuild.buildSync({
  entryPoints: [join(root, 'src/client/model.ts')],
  outfile: join(root, '.build/model.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  logLevel: 'silent',
})
// The pure policy logic and the window store, as one module for the tests.
// The names are listed on purpose: `export *` lets esbuild drop what no consumer in the bundle
// uses (measured 2026-10-30: clampPosition and workspaceIdOfRowKey vanished from the bundle).
const reexports = `import * as model from ${JSON.stringify(join(root, 'src/client/policy-model.ts'))}
import * as store from ${JSON.stringify(join(root, 'src/client/policy-store.ts'))}
export const { sortCards, matchWorkspace, enabledCards, toggleCard, filterCards, previewText } = model
export const { createPolicyStore, workspaceIdOfRowKey, clampPosition } = store
`
esbuild.buildSync({
  stdin: { contents: reexports, resolveDir: root, loader: 'ts' },
  outfile: join(root, '.build/policies.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  logLevel: 'silent',
})
console.log('.build/model.mjs written')
console.log('.build/policies.mjs written')

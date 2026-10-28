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
console.log('.build/model.mjs written')

// Builds lib/client.js: the browser half of the plugin.
// The React view is bundled with esbuild (react stays external: the page provides
// it through the ClientModuleSystem); the result is wrapped into the module
// loader call every DSH client bundle uses (SPEC B7).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const built = esbuild.buildSync({
  entryPoints: [join(root, 'src/client/entry.tsx')],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  logLevel: 'silent',
})
if (built.errors.length > 0) throw new Error('esbuild failed:\n' + built.errors.map((e) => e.text).join('\n'))

const body = built.outputFiles[0].text
const bundle = `window.__ModuleLoader__.load({
	id: ${JSON.stringify(pkg.name)},
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
${body}
		return module.exports;
	}
});
`
mkdirSync(join(root, 'lib'), { recursive: true })
writeFileSync(join(root, 'lib/client.js'), bundle)
console.log('lib/client.js written,', bundle.length, 'bytes')

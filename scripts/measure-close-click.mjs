// Messung, nicht Raterei: blockiert setPointerCapture auf dem Fensterkopf den Klick auf ✕?
// Drei Varianten in einem echten Chromium, gemessen an den Ereignissen selbst.
// Variante A: Kopf mit setPointerCapture, Knopf darin (Ist-Zustand von Policies.tsx Zeile 245-259).
// Variante B: derselbe Kopf ohne setPointerCapture (Kontrolle).
// Variante C: Knopf mit stopPropagation im eigenen pointerdown (Kandidat für den Fix).
import { createRequire } from 'node:module'
const require = createRequire('/opt/homebrew/lib/node_modules/')
const { chromium } = require('playwright')

function html(variant) {
  return '<!doctype html><body style="margin:0">' +
    '<div id="head" style="width:200px;height:40px;background:#888;padding:8px">' +
    '<span>Titel</span>' +
    '<button id="close" style="width:24px;height:24px">X</button>' +
    '</div>' +
    '<script>' +
    'const head = document.getElementById("head");' +
    'const close = document.getElementById("close");' +
    'const log = []; window.log = log;' +
    (variant === 'A' || variant === 'C'
      ? 'head.addEventListener("pointerdown", function(e){ log.push("head pointerdown target=" + e.target.id); if (typeof head.setPointerCapture === "function") head.setPointerCapture(e.pointerId); log.push("captured=" + head.hasPointerCapture(e.pointerId)); });'
      : '') +
    (variant === 'C'
      ? 'close.addEventListener("pointerdown", function(e){ e.stopPropagation(); log.push("close pointerdown stopped"); }, true);'
      : '') +
    'head.addEventListener("pointerup", function(e){ log.push("head pointerup target=" + e.target.id); });' +
    'head.addEventListener("click", function(e){ log.push("head click target=" + e.target.id); });' +
    'close.addEventListener("click", function(){ log.push("CLOSE CLICK FIRED"); });' +
    '</script></body>'
}

const results = []
const browser = await chromium.launch()
for (const variant of ['A', 'B', 'C']) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 300 } })
  const p = await ctx.newPage()
  await p.setContent(html(variant))
  const box = await p.locator('#close').boundingBox()
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await p.mouse.down()
  await p.mouse.up()
  await p.waitForTimeout(150)
  const log = await p.evaluate(() => window.log)
  results.push({ variant, events: log, closeFired: log.some((l) => l.includes('CLOSE CLICK FIRED')) })
  await ctx.close()
}
await browser.close()
console.log(JSON.stringify(results, null, 2))
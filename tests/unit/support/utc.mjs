// Registers each Test Plan UTC as a Vitest describe() / it() pair.
import { describe, it, expect } from 'vitest'
import { UTC } from './utc-map.mjs'

export { expect }

let hooks = []
export function resetHooks() { hooks = [] }
export function beforeEachCase(fn) { hooks.push(fn) }

const pad = (n) => String(n).padStart(2, '0')

/** utc(fnId, { prereq, data, cases: [{ desc, td, expected, run }] }) */
export function utc(fnId, spec) {
  const u = UTC[fnId]
  if (!u) return
  const id = `UTC-${pad(u.no)}`
  const before = [...hooks]
  describe(`${id}: Test-${u.name} [${fnId}]`, () => {
    spec.cases.forEach((c, i) => {
      it(`${id}-TC${pad(i + 1)}: ${c.desc}`, async () => {
        for (const h of before) await h()
        await c.run()
      })
    })
  })
}

export async function rejects(promiseOrFn) {
  try {
    await (typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn)
  } catch (e) {
    return e
  }
  throw new Error('expected a rejection, but it resolved')
}

export const tick = () => new Promise((r) => setTimeout(r, 0))
export async function flush(n = 5) { for (let i = 0; i < n; i++) await tick() }

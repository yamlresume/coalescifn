/**
 * MIT License
 *
 * Copyright (c) 2025–Present Xiao Hanyu (https://github.com/xiaohanyu)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

import { describe, expect, it, vi } from 'vitest'
import { coalesce } from './coalesce'

describe(coalesce, () => {
  it('runs immediately when idle', () => {
    const fn = vi.fn()
    const run = coalesce(fn)

    run()

    expect(fn).toBeCalledTimes(1)
  })

  it('rethrows sync errors and resets state', () => {
    const err = new Error('boom')
    const run = coalesce(() => {
      throw err
    })

    expect(() => run()).toThrow('boom')
  })

  it('coalesces calls during async run into single follow-up', async () => {
    const fn = vi.fn()
    const resolves: Array<() => void> = []

    const run = coalesce(async () => {
      await new Promise<void>((r) => resolves.push(r))
      fn()
    })

    run()
    run()
    run()
    run()

    resolves[0]()

    // wait microtasks so the follow-up is scheduled and stored
    for (let i = 0; i < 5 && resolves.length < 2; i++) {
      await Promise.resolve()
    }

    resolves[1]()
    await Promise.resolve()

    expect(fn).toBeCalledTimes(2)
  })
})

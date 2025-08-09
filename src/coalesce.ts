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

/**
 * Create a runner that coalesces calls while the wrapped function is running.
 *
 * Behavior:
 * - If called while `fn` is running, schedule exactly one follow-up run.
 * - After the current run completes (sync or async), if a follow-up was
 *   scheduled, run once more.
 * - Additional calls during the run are coalesced.
 *
 * Works for both synchronous and Promise-returning functions.
 *
 * @param fn - The function to wrap.
 * @returns A function that coalesces calls if the wrapped function is running.
 */
export function coalesce<T extends (...args: unknown[]) => unknown>(fn: T) {
  let isRunning = false
  let hasPending = false

  const run = (...args: Parameters<T>): void => {
    if (isRunning) {
      hasPending = true
      return
    }

    isRunning = true

    const complete = () => {
      isRunning = false
      if (hasPending) {
        hasPending = false
        run(...args)
      }
    }

    try {
      const result = fn(...(args as Parameters<T>)) as unknown
      if (
        result !== null &&
        (typeof result === 'object' || typeof result === 'function') &&
        // biome-ignore lint/suspicious/noExplicitAny: runtime promise duck-typing
        typeof (result as any).then === 'function'
      ) {
        ;(result as Promise<unknown>).catch(() => {}).finally(complete)
        return
      }
    } catch (error) {
      complete()
      throw error
    }

    complete()
  }

  return run
}

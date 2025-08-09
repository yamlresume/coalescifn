# coalescifn

Coalescifn can coalesce function calls while a function is running in progress.

- When idle, the first call runs immediately.
- While running, additional calls do not invoke the function immediately; they
  only mark a pending rerun.
- After the current run completes, if there were any calls during the run, the
  function runs once more (at most one follow-up).

This is useful when an operation can be triggered rapidly (e.g., UI changes,
file/watch events) but you only want to execute it once now and at most once
again after it finishes.

## Installation

```bash
# using pnpm (recommended)
pnpm add coalescifn

# npm
npm i coalescifn

# yarn
yarn add coalescifn
```

## Quick start

```ts
import { coalesce } from "coalescifn"

// Your task function (can be sync or async)
async function save(payload: { id: string; value: string }) {
  // ... perform work, e.g., network/storage
}

// Wrap it with coalesce
const runSave = coalesce(save)

// Rapid calls
runSave({ id: "1", value: "A" }) // executes immediately
runSave({ id: "1", value: "B" }) // during run → coalesced
runSave({ id: "1", value: "C" }) // during run → still just one follow-up

// After the first execution settles, one follow-up execution is scheduled.
// Note: the follow-up uses the arguments from the previous execution.
```

## API

```ts
export function coalesce<T extends (...args: unknown[]) => unknown>(
  fn: T,
): (...args: Parameters<T>) => void
```

### Semantics

- **Immediate on idle**: If not currently running, the call runs immediately.
- **Coalesce while running**: Calls made while running are collapsed into a
  single follow-up run.
- **Follow-up arguments**: The follow-up run reuses the arguments from the
  previous execution. If you need "latest-args" semantics, see FAQ below.
- **Return value**: The returned runner function returns `void`. Handle results
  or state inside your `fn`.
- **Errors**:
  - Synchronous errors are rethrown and the internal state is reset so
    subsequent calls still work.
  - If `fn` returns a Promise, its rejection is caught to avoid unhandled
    rejections; handle async errors inside `fn`.

## Examples

### Synchronous work

```ts
import { coalesce } from "coalescifn"

let counter = 0;
const run = coalesce(() => {
  // do something that takes a while
  counter += 1
})

run() // counter = 1 (runs immediately)
run() // coalesced during run
run() // coalesced during run → still only one follow-up
// After it finishes → one follow-up runs → counter = 2
```

### Asynchronous work

```ts
import { coalesce } from "coalescifn"

const run = coalesce(async (n: number) => {
  await new Promise((r) => setTimeout(r, 100))
  console.log("ran with", n)
});

run(1) // immediate
run(2) // coalesced
run(3) // coalesced → still just one follow-up
// Output after ~100ms: "ran with 1"
// Then one follow-up (with args from previous execution): "ran with 1"
```

## FAQ

- "I need the follow-up to use the latest arguments, not the previous
  execution's arguments."

  Store the latest value in a shared place and read it inside the task:

  ```ts
  interface Payload {
    id: string
    value: string
  }

  let latest: Payload | null = null

  const run = coalesce(async () => {
    if (!latest) return
    await save(latest)
  });

  function trigger(p: Payload) {
    latest = p
    run() // triggers now or schedules a single follow-up
  }
  ```

- "Can I get the return value of my function?"

  The runner returns `void`. If you need results, update shared state or use callbacks/emitters within `fn`.

## Development

```bash
pnpm i
pnpm test
pnpm build
```

- Node.js: >= 20
- Build: `pnpm build` for dev and `pnpm build:prod` for production
- Tests: `pnpm test`

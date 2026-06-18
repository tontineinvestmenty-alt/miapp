---
name: RN async UI races (PIN pad, confirm dialogs)
description: Avoiding stale-closure double-submit and stuck promises in numeric PIN pads and promise-based confirm dialogs in this Expo/RN-web app.
---

# Async UI race patterns

**Rule:** Any handler that appends to state and then triggers an async verify on a threshold (e.g. a numeric PIN pad that validates when length hits 4) must use a functional `setState(prev => ...)` and read the threshold off `prev` — never `const next = pin + k` from the closed-over render value. Fast taps before re-render otherwise validate a stale/incomplete value, causing intermittent "wrong PIN" on the first attempt. Also add an in-flight `useRef` guard so concurrent taps during the async verify are ignored.

**Rule:** Screens that submit PIN actions (set/change/disable) need a `submitting` state guard at the top of each handler to block double-submit, which otherwise fires concurrent verify calls and surfaces a transient error.

**Rule:** A promise-based `useConfirm()` provider must (1) single-flight: if a new `confirm()` arrives while one is pending, resolve the previous with `false` before replacing the resolver, and (2) resolve any pending resolver with `false` in a `useEffect` unmount cleanup — otherwise `await confirm(...)` can hang forever.

**Why:** An architect review + e2e of the Inventario PIN/confirm feature surfaced an intermittent "PIN incorrecto" on the first disable attempt traced to the stale-closure pattern; the confirm provider had no cleanup/single-flight.

**How to apply:** Applies to `components/LockScreen.tsx`, `app/seguridad.tsx`, `contexts/ConfirmContext.tsx` and any future numeric-entry or promise-dialog UI in this app.

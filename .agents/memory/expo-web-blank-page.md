---
name: Expo web blank page debugging
description: How to find the real error when an Expo Router web app renders a blank white page
---

# Expo web blank page = Metro compile error

When the Expo web preview is a blank white page and the browser console shows:
- `Failed to load resource: ... 500` on a `...entry.bundle?platform=web...` URL, and
- `Refused to execute script ... because its MIME type ('application/json') is not executable`

…it means **Metro failed to compile the bundle** and returned a JSON error payload instead of JS. The 500/MIME message is a symptom, not the cause.

**How to apply:** `curl` the failing bundle URL (copy it from the console) against the local Expo port, e.g.
`curl -s "http://localhost:<PORT>/node_modules/.pnpm/.../expo-router/entry.bundle?platform=web&dev=true&transform.routerRoot=app"`
The response JSON contains `{"type":"TransformError"|"UnableToResolveError", "filename", "lineNumber", "message"}` pointing at the exact source file and line.

**Why:** A `tsc --noEmit` typecheck can pass at one moment but the file shown in the preview may differ if you edited JSX afterward without re-running typecheck. A mismatched JSX closing tag (e.g. opening `<Pressable>` but closing `</View>`) breaks the Metro bundle but is easy to miss. **Always re-run `pnpm --filter @workspace/<slug> run typecheck` after any structural JSX edit** — it catches mismatched tags before they reach the bundler.

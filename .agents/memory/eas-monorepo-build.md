---
name: EAS GitHub build of Expo app inside pnpm monorepo
description: Why EAS Build fails for an Expo app in this pnpm workspace, and how to make it build standalone.
---

# EAS Build (GitHub integration) for an Expo app inside a pnpm monorepo

When the user builds the Expo artifact (`artifacts/inventario`) via expo.dev's GitHub
integration (EAS Build), two distinct failures show up:

1. **"Failed to read .../package.json"** at click time → the expo.dev **Base directory**
   field was set wrong (e.g. the full GitHub URL). It must be the app's path within the
   repo: `artifacts/inventario` (no `https://`, no `.git`).

2. **Fast failure (~20-30s total) at the *install dependencies* step** → the app's
   `package.json` uses pnpm-workspace-only protocols that EAS cannot resolve when it
   treats the app dir as a standalone project:
   - `catalog:` version refs (resolved from root `pnpm-workspace.yaml`)
   - `workspace:*` deps (e.g. `@workspace/api-client-react`)

**Fix for #2:** make the app self-contained — replace every `catalog:` with the explicit
version from the root catalog, and remove any `workspace:*` dep that isn't actually
imported in source (grep the source, not just package.json). Also drop the matching
`references` entry in `tsconfig.json`. Then `pnpm install` (lockfile stays consistent)
and `pnpm --filter @workspace/inventario run typecheck`.

**Why:** EAS GitHub builds run install with the app dir as project root and do not get
the pnpm workspace catalog/workspace resolution, so any `catalog:`/`workspace:*` token
breaks install immediately.

**How to apply:** only when the user is doing their own EAS/expo.dev Android build.
Replit does NOT officially support Android builds, and the expo skill forbids running
EAS CLI — diagnose from config + the red build step, never by running `eas-cli`.

**APK vs AAB:** the user wants an installable `.apk` → they must pick the **`preview`**
build profile in expo.dev (eas.json `preview` = android buildType `apk`). The
**`production`** profile makes an `.aab` (Google Play only, not directly installable).

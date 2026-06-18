---
name: Expo SDK 54 filesystem & media APIs
description: Where the classic FileSystem API lives in SDK 54 and how to persist picked media durably.
---

# Expo SDK 54 filesystem & media

- `expo-file-system` in SDK 54 splits its API: the new `File`/`Directory`/`Paths`
  classes are the root export (`expo-file-system`), and the classic procedural API
  (`documentDirectory`, `copyAsync`, `deleteAsync`, `getInfoAsync`) is at
  `expo-file-system/legacy`. The package's reported version string can look odd
  (e.g. `56.0.7`) but it is the SDK-54-aligned package.

- Document/media picker results (`expo-document-picker`, image picker) return
  **cache** URIs that are temporary and can be evicted after restart. To persist a
  user-chosen file, copy it into `FileSystem.documentDirectory` (via the legacy API)
  and store that path — do not store the raw picker cache URI.
  **Why:** persisted cache URIs silently break later; document dir is app-owned and durable.

- Native audio playback uses `expo-audio` (`createAudioPlayer({ uri })` → `.play()`,
  `.seekTo()`); web uses the HTML5 `Audio` constructor. Guard custom playback so a
  failed/stale file falls back to the default sound: on web attach `onerror` + catch
  the `play()` promise to trigger the fallback, since `play()` is async and the call
  itself returns before failure is known.

- Lazy `require("expo-file-system/legacy")` / `require("expo-audio")` inside the
  native-only branch keeps these out of the web runtime path while still being a
  static string Metro can bundle.

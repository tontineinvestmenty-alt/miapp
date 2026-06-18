---
name: react-native-web Modal stuck open
description: Why a RN Modal fails to close on web when a heavy state change happens in the same handler
---

# RN Modal won't close on web when a heavy re-render coincides with the close

**Symptom:** A `<Modal animationType="fade">` (react-native-web / Expo web) stays visible after `setVisible(false)`, even though the same handler's other state updates (e.g. applying a theme) clearly took effect behind the still-open overlay.

**Cause:** The fade-out close animation gets interrupted/cancelled by a heavy synchronous re-render triggered in the same commit (e.g. recomputing and applying a whole new color palette across the app). The Modal ends up stuck mounted.

**Fix that works:** Set `animationType="none"` on that Modal. Deferring the heavy update with `setTimeout(0)` does NOT fix it — the interrupted-animation path is the root cause, not render timing.

**How to apply:** If a Modal that triggers an app-wide restyle/heavy update on confirm won't dismiss on web, drop its close animation (`animationType="none"`). A lighter state change in the same modal (e.g. switching only a preset id) may close fine with `"fade"`, which can mask the bug during partial testing — test the heavy path explicitly.

---
name: RN Web flex TextInput overflow
description: Why a TextInput in a flex row overflows off-screen on React Native Web and the fix.
---

# RN Web flex TextInput overflow

- A `TextInput` with `flex: 1` inside a `flexDirection: "row"` container can push the
  row past the right edge of the screen on React Native Web.
  **Why:** the underlying `<input>` has an intrinsic minimum width and flex items
  default to `min-width: auto`, so it refuses to shrink below that intrinsic size and
  overflows instead of fitting the container.
  **How to apply:** add `minWidth: 0` to the flex-growing input/child style so it can
  shrink within the row. Same fix applies to any flex child with intrinsic content
  width (long text, inputs) that overflows.

---
name: Inventario stock model & transfers
description: How per-warehouse stock is stored and the rule for any multi-key stock mutation (transfers).
---

# Inventario stock model

- Stock lives in one AsyncStorage record keyed `${almacenId}::${articuloId}` → quantity
  (not on the Almacen/Articulo objects). Helpers in `utils/storage.ts`:
  `getStock`, `getStockAlmacen`, `updateStock` (delta, clamps at 0), `setStockDirect`,
  `transferirStock`.

- **Any operation that moves stock between keys must be a single read-modify-write
  over the full stock map, and must derive the moved amount from the *current*
  persisted source quantity — not from a value captured in UI state.**
  **Why:** two separate `updateStock(-n)` + `updateStock(+n)` calls are non-atomic and,
  because `updateStock` clamps at 0, can credit the destination more than was actually
  debited from the source (stock created from nothing) if the source changed after the
  modal opened. `transferirStock` does `moved = min(requested, available)` in one
  `getStock` → mutate both keys → single `set`, and returns the real moved amount.
  **How to apply:** log movement history with the returned `moved`, and no-op with user
  feedback when it is 0.

- Movement history (`Movimiento`) only has `tipo: "entrada" | "salida"`. A transfer is
  recorded as a `salida` in the source warehouse plus an `entrada` in the destination.

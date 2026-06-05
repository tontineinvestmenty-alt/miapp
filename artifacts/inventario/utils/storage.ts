import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Almacen {
  id: string;
  nombre: string;
  foto?: string;
  creadoEn: string;
}

export interface Articulo {
  id: string;
  nombre: string;
  foto?: string;
  precio?: number;
  creadoEn: string;
}

export interface StockEntry {
  articuloId: string;
  cantidad: number;
}

export interface Movimiento {
  id: string;
  almacenId: string;
  articuloId: string;
  articuloNombre: string;
  tipo: "entrada" | "salida";
  cantidad: number;
  fecha: string;
  hora: string;
}

export type EstadoPedido = "comprado" | "en_casillero" | "enviado_cuba" | "en_almacen";

export interface PedidoArticulo {
  articuloId: string;
  articuloNombre: string;
  cantidad: number;
}

export interface Pedido {
  id: string;
  numeroCompra: string;
  numeroSeguimiento: string;
  fechaCompra: string;
  estado: EstadoPedido;
  articulos: PedidoArticulo[];
  almacenId?: string;
  almacenNombre?: string;
  notas?: string;
  creadoEn: string;
}

const KEYS = {
  almacenes: "inventario_almacenes",
  articulos: "inventario_articulos",
  stock: "inventario_stock",
  historial: "inventario_historial",
  pedidos: "inventario_pedidos",
};

export function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function fechaHoy() {
  return new Date().toLocaleDateString("es-ES");
}

export function horaAhora() {
  return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

async function get<T>(key: string): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : ([] as unknown as T);
  } catch {
    return [] as unknown as T;
  }
}

async function set<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ─── Almacenes ────────────────────────────────────────────────────────────────

export async function getAlmacenes(): Promise<Almacen[]> {
  return get<Almacen[]>(KEYS.almacenes);
}

export async function saveAlmacenes(list: Almacen[]): Promise<void> {
  return set(KEYS.almacenes, list);
}

export async function getAlmacenById(id: string): Promise<Almacen | undefined> {
  const list = await getAlmacenes();
  return list.find((a) => a.id === id);
}

// ─── Artículos ────────────────────────────────────────────────────────────────

export async function getArticulos(): Promise<Articulo[]> {
  return get<Articulo[]>(KEYS.articulos);
}

export async function saveArticulos(list: Articulo[]): Promise<void> {
  return set(KEYS.articulos, list);
}

// ─── Stock ────────────────────────────────────────────────────────────────────

export async function getStock(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.stock);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function stockKey(almacenId: string, articuloId: string) {
  return `${almacenId}::${articuloId}`;
}

export async function getStockAlmacen(almacenId: string): Promise<StockEntry[]> {
  const all = await getStock();
  const entries: StockEntry[] = [];
  for (const [k, cantidad] of Object.entries(all)) {
    if (k.startsWith(`${almacenId}::`)) {
      const articuloId = k.split("::")[1];
      if (cantidad > 0) entries.push({ articuloId, cantidad });
    }
  }
  return entries;
}

export async function updateStock(
  almacenId: string,
  articuloId: string,
  delta: number
): Promise<number> {
  const all = await getStock();
  const key = stockKey(almacenId, articuloId);
  const prev = all[key] ?? 0;
  const next = Math.max(0, prev + delta);
  all[key] = next;
  await set(KEYS.stock, all);
  return next;
}

export async function setStockDirect(
  almacenId: string,
  articuloId: string,
  cantidad: number
): Promise<void> {
  const all = await getStock();
  all[stockKey(almacenId, articuloId)] = Math.max(0, cantidad);
  await set(KEYS.stock, all);
}

// ─── Pedidos ──────────────────────────────────────────────────────────────────

export async function getPedidos(): Promise<Pedido[]> {
  return get<Pedido[]>(KEYS.pedidos);
}

export async function savePedidos(list: Pedido[]): Promise<void> {
  return set(KEYS.pedidos, list);
}

// ─── Historial ────────────────────────────────────────────────────────────────

export async function getHistorial(): Promise<Movimiento[]> {
  return get<Movimiento[]>(KEYS.historial);
}

export async function getHistorialAlmacen(almacenId: string): Promise<Movimiento[]> {
  const all = await getHistorial();
  return all.filter((m) => m.almacenId === almacenId);
}

export async function agregarMovimiento(mov: Omit<Movimiento, "id" | "fecha" | "hora">): Promise<void> {
  const all = await getHistorial();
  const nuevo: Movimiento = {
    ...mov,
    id: genId(),
    fecha: fechaHoy(),
    hora: horaAhora(),
  };
  all.unshift(nuevo);
  await set(KEYS.historial, all);
}

// ─── Backup ───────────────────────────────────────────────────────────────────

export interface BackupData {
  version: 1;
  exportadoEn: string;
  almacenes: Almacen[];
  articulos: Articulo[];
  stock: Record<string, number>;
  historial: Movimiento[];
  pedidos: Pedido[];
}

export async function crearBackup(): Promise<BackupData> {
  const [almacenes, articulos, stock, historial, pedidos] = await Promise.all([
    getAlmacenes(), getArticulos(), getStock(), getHistorial(), getPedidos(),
  ]);
  return { version: 1, exportadoEn: new Date().toISOString(), almacenes, articulos, stock, historial, pedidos };
}

export async function restaurarBackup(data: BackupData): Promise<void> {
  if (!data || data.version !== 1) throw new Error("Formato de backup inválido");
  await Promise.all([
    set(KEYS.almacenes, data.almacenes ?? []),
    set(KEYS.articulos, data.articulos ?? []),
    set(KEYS.stock, data.stock ?? {}),
    set(KEYS.historial, data.historial ?? []),
    set(KEYS.pedidos, data.pedidos ?? []),
  ]);
}

// ─── Exportar ─────────────────────────────────────────────────────────────────

const ESTADO_LABEL: Record<string, string> = {
  comprado: "Comprado",
  en_casillero: "En casillero",
  enviado_cuba: "Enviado a Cuba",
  en_almacen: "En almacén",
};

export async function exportarTexto(): Promise<string> {
  const [almacenes, articulos, stock, pedidos] = await Promise.all([
    getAlmacenes(), getArticulos(), getStock(), getPedidos(),
  ]);

  const stockPorArticulo: Record<string, number> = {};
  for (const [k, cant] of Object.entries(stock)) {
    const artId = k.split("::")[1];
    stockPorArticulo[artId] = (stockPorArticulo[artId] ?? 0) + cant;
  }

  const totalValor = articulos.reduce((s, a) => {
    return s + (stockPorArticulo[a.id] ?? 0) * (a.precio ?? 0);
  }, 0);

  const sep = "─".repeat(30);
  const L: string[] = [];

  L.push(`📦 INVENTARIO · ${fechaHoy()}`);
  L.push(sep);
  L.push("");

  L.push(`🏪 ALMACENES (${almacenes.length})`);
  if (almacenes.length === 0) {
    L.push("  (sin almacenes)");
  } else {
    for (const a of almacenes) L.push(`  · ${a.nombre}`);
  }
  L.push("");

  L.push(`📦 ARTÍCULOS (${articulos.length})`);
  if (articulos.length === 0) {
    L.push("  (sin artículos)");
  } else {
    for (const a of articulos) {
      const uds = stockPorArticulo[a.id] ?? 0;
      const p = a.precio != null ? `$${a.precio.toFixed(2)}/u` : "sin precio";
      const v = a.precio != null ? ` = $${(uds * a.precio).toFixed(2)}` : "";
      L.push(`  · ${a.nombre}: ${uds} uds · ${p}${v}`);
    }
  }
  L.push("");

  L.push(`💰 VALOR TOTAL: $${totalValor.toFixed(2)}`);
  L.push("");

  const activos = pedidos.filter(p => p.estado !== "en_almacen");
  const enAlmacen = pedidos.filter(p => p.estado === "en_almacen");

  L.push(`🚚 PEDIDOS EN CURSO (${activos.length})`);
  if (activos.length === 0) {
    L.push("  (sin pedidos activos)");
  } else {
    for (const p of activos) {
      const arts = p.articulos?.length ? ` · ${p.articulos.length} art.` : "";
      L.push(`  · #${p.numeroCompra} → ${ESTADO_LABEL[p.estado] ?? p.estado}${arts}`);
    }
  }
  L.push("");

  if (enAlmacen.length > 0) {
    L.push(`✅ RECIBIDOS EN ALMACÉN (${enAlmacen.length})`);
    for (const p of enAlmacen) {
      const dest = p.almacenNombre ? ` → ${p.almacenNombre}` : "";
      L.push(`  · #${p.numeroCompra}${dest}`);
    }
    L.push("");
  }

  L.push("_Exportado desde Inventario_");

  return L.join("\n");
}

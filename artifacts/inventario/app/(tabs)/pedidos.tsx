import { Feather } from "@expo/vector-icons";
import { Sounds } from "@/utils/sounds";
import { pedirPermisoNotificaciones, programarAlertasPedidos, programarRecordatorioDiario } from "@/utils/notifications";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import CalendarPicker from "@/components/CalendarPicker";
import { useColors } from "@/hooks/useColors";
import {
  Almacen,
  Articulo,
  EstadoPedido,
  Pedido,
  PedidoArticulo,
  agregarMovimiento,
  genId,
  fechaHoy,
  getAlmacenes,
  getArticulos,
  getPedidos,
  savePedidos,
  updateStock,
} from "@/utils/storage";

const TAB_BAR_HEIGHT = Platform.OS === "web" ? 96 : 100;

const ESTADOS: { key: EstadoPedido; label: string; color: string; bg: string; icono: string }[] = [
  { key: "comprado",     label: "Comprado",      color: "#2563eb", bg: "#dbeafe", icono: "shopping-cart" },
  { key: "en_casillero", label: "En casillero",  color: "#d97706", bg: "#fef3c7", icono: "inbox" },
  { key: "enviado_cuba", label: "Enviado a Cuba", color: "#7c3aed", bg: "#ede9fe", icono: "send" },
  { key: "en_almacen",   label: "En almacén",    color: "#16a34a", bg: "#dcfce7", icono: "check-circle" },
];

function estadoInfo(k: EstadoPedido) { return ESTADOS.find(e => e.key === k) ?? ESTADOS[0]; }
function estadoSiguiente(k: EstadoPedido): EstadoPedido | null {
  const idx = ESTADOS.findIndex(e => e.key === k);
  return idx >= 0 && idx < ESTADOS.length - 1 ? ESTADOS[idx + 1].key : null;
}

export default function PedidosScreen() {
  const colors = useColors();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [todosArticulos, setTodosArticulos] = useState<Articulo[]>([]);

  // modals
  const [modalCrear, setModalCrear] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [modalAlmacen, setModalAlmacen] = useState(false);
  const [modalPickArt, setModalPickArt] = useState(false);
  const [modalAvanzar, setModalAvanzar] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null);

  // estado modal avanzar
  const [cantAvance, setCantAvance] = useState<Record<string, number>>({});
  const [nuevoSeguimientoAvance, setNuevoSeguimientoAvance] = useState("");

  // confirmación universal (reemplaza Alert.alert — funciona en web y nativo)
  const [confirm, setConfirm] = useState<{
    titulo: string;
    mensaje: string;
    confirmLabel: string;
    destructivo: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  function pedirConfirmacion(opts: {
    titulo: string;
    mensaje: string;
    confirmLabel: string;
    destructivo?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }) {
    setConfirm({ destructivo: false, ...opts });
  }

  // búsqueda y filtro
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | null>(null);

  // form
  const [numCompra, setNumCompra] = useState("");
  const [numSeguimiento, setNumSeguimiento] = useState("");
  const [fechaCompra, setFechaCompra] = useState("");
  const [notas, setNotas] = useState("");
  const [articulosPedido, setArticulosPedido] = useState<PedidoArticulo[]>([]);

  useFocusEffect(useCallback(() => {
    Promise.all([getPedidos(), getAlmacenes(), getArticulos()]).then(([p, a, arts]) => {
      setPedidos(p);
      setAlmacenes(a);
      setTodosArticulos(arts);
      pedirPermisoNotificaciones().then((ok) => {
        if (ok) {
          programarAlertasPedidos(p);
          programarRecordatorioDiario(p);
        }
      });
    });
  }, []));

  // ── Crear ──────────────────────────────────────────────────────────────────

  function abrirCrear() {
    setNumCompra(""); setNumSeguimiento(""); setFechaCompra("");
    setNotas(""); setArticulosPedido([]);
    setModalCrear(true);
  }

  function abrirPickArt() { setModalPickArt(true); }

  function agregarArticuloPedido(art: Articulo) {
    if (articulosPedido.some(a => a.articuloId === art.id)) return;
    setArticulosPedido(prev => [...prev, { articuloId: art.id, articuloNombre: art.nombre, cantidad: 1 }]);
    setModalPickArt(false);
  }

  function cambiarCantidad(artId: string, delta: number) {
    setArticulosPedido(prev =>
      prev.map(a => a.articuloId === artId
        ? { ...a, cantidad: Math.max(1, a.cantidad + delta) }
        : a
      )
    );
  }

  function quitarArticuloPedido(artId: string) {
    setArticulosPedido(prev => prev.filter(a => a.articuloId !== artId));
  }

  async function crear() {
    if (!numCompra.trim()) return;
    const nuevo: Pedido = {
      id: genId(),
      numeroCompra: numCompra.trim(),
      numeroSeguimiento: numSeguimiento.trim(),
      fechaCompra: fechaCompra || fechaHoy(),
      estado: "comprado",
      articulos: articulosPedido,
      notas: notas.trim() || undefined,
      creadoEn: fechaHoy(),
      fechaUltimoEstado: fechaHoy(),
    };
    const lista = [nuevo, ...pedidos];
    setPedidos(lista);
    await savePedidos(lista);
    setModalCrear(false);
    Sounds.crear();
  }

  // ── Detalle / estado ───────────────────────────────────────────────────────

  function abrirDetalle(p: Pedido) { setPedidoActivo(p); setModalDetalle(true); }

  function estadoAnterior(k: EstadoPedido): EstadoPedido | null {
    const idx = ESTADOS.findIndex(e => e.key === k);
    return idx > 0 ? ESTADOS[idx - 1].key : null;
  }

  function avanzarEstado(p: Pedido) {
    const sig = estadoSiguiente(p.estado);
    if (!sig) return;
    // inicializar cantidades al máximo de cada artículo
    const init: Record<string, number> = {};
    for (const pa of p.articulos ?? []) init[pa.articuloId] = pa.cantidad;
    setCantAvance(init);
    setNuevoSeguimientoAvance("");
    setModalDetalle(false);
    setModalAvanzar(true);
  }

  async function confirmarAvance() {
    if (!pedidoActivo) return;
    const sig = estadoSiguiente(pedidoActivo.estado);
    if (!sig) return;

    const hoy = fechaHoy();

    // artículos con la cantidad elegida (excluir los que quedaron en 0)
    const articulosAvance = (pedidoActivo.articulos ?? [])
      .map(pa => ({ ...pa, cantidad: cantAvance[pa.articuloId] ?? pa.cantidad }))
      .filter(pa => pa.cantidad > 0);

    const pedidoActualizado: Pedido = {
      ...pedidoActivo,
      articulos: articulosAvance,
      ...(nuevoSeguimientoAvance.trim()
        ? { numeroSeguimiento: nuevoSeguimientoAvance.trim() }
        : {}),
    };

    setModalAvanzar(false);

    if (sig === "en_almacen") {
      // guardar cambios de cantidad/seguimiento antes de elegir almacén
      const listaTemp = pedidos.map(p => p.id === pedidoActivo.id ? pedidoActualizado : p);
      setPedidos(listaTemp);
      await savePedidos(listaTemp);
      setPedidoActivo(pedidoActualizado);
      setModalAlmacen(true);
      return;
    }

    // avanzar estado en un solo guardado
    const lista = pedidos.map(p =>
      p.id === pedidoActivo.id
        ? { ...pedidoActualizado, estado: sig, fechaUltimoEstado: hoy }
        : p
    );
    setPedidos(lista);
    await savePedidos(lista);
    pedirPermisoNotificaciones().then(ok => {
      if (ok) { programarAlertasPedidos(lista); programarRecordatorioDiario(lista); }
    });
    setPedidoActivo(null);
    Sounds.avanzar();
  }

  async function retrocederEstado(p: Pedido) {
    const prev = estadoAnterior(p.estado);
    if (!prev) return;
    const prevI = estadoInfo(prev);

    const tieneStock = p.estado === "en_almacen" && p.almacenId && p.articulos?.length > 0;
    const totalUds = p.articulos?.reduce((s, a) => s + a.cantidad, 0) ?? 0;
    const avisoStock = tieneStock
      ? `\n\n⚠️ Se revertirán ${totalUds} unidades del stock en "${p.almacenNombre}".`
      : "";

    setModalDetalle(false);
    pedirConfirmacion({
      titulo: `Retroceder a "${prevI.label}"`,
      mensaje: `¿Deshacer el avance del pedido #${p.numeroCompra}? Volverá a "${prevI.label}".${avisoStock}`,
      confirmLabel: "Retroceder",
      destructivo: true,
      onCancel: () => setModalDetalle(true),
      onConfirm: async () => {
        if (tieneStock && p.almacenId) {
          for (const pa of p.articulos) {
            await updateStock(p.almacenId!, pa.articuloId, -pa.cantidad);
            await agregarMovimiento({
              almacenId: p.almacenId!,
              articuloId: pa.articuloId,
              articuloNombre: pa.articuloNombre,
              tipo: "salida",
              cantidad: pa.cantidad,
            });
          }
        }
        const lista = pedidos.map(x =>
          x.id === p.id
            ? { ...x, estado: prev, almacenId: tieneStock ? undefined : x.almacenId, almacenNombre: tieneStock ? undefined : x.almacenNombre }
            : x
        );
        setPedidos(lista);
        await savePedidos(lista);
        setPedidoActivo(lista.find(x => x.id === p.id) ?? null);
        Sounds.retroceder();
      },
    });
  }

  async function actualizarEstado(id: string, estado: EstadoPedido, almacen?: Almacen) {
    const hoy = fechaHoy();
    const lista = pedidos.map(p => {
      if (p.id !== id) return p;
      const extra = almacen
        ? { almacenId: almacen.id, almacenNombre: almacen.nombre }
        : {};
      return { ...p, estado, fechaUltimoEstado: hoy, ...extra };
    });
    setPedidos(lista);
    await savePedidos(lista);
    pedirPermisoNotificaciones().then(ok => {
      if (ok) { programarAlertasPedidos(lista); programarRecordatorioDiario(lista); }
    });
  }

  async function enviarAlmacen(almacen: Almacen) {
    if (!pedidoActivo) return;

    // secuencial para evitar race condition al leer/escribir el mismo mapa de stock
    for (const pa of pedidoActivo.articulos) {
      await updateStock(almacen.id, pa.articuloId, pa.cantidad);
      await agregarMovimiento({
        almacenId: almacen.id,
        articuloId: pa.articuloId,
        articuloNombre: pa.articuloNombre,
        tipo: "entrada",
        cantidad: pa.cantidad,
      });
    }

    await actualizarEstado(pedidoActivo.id, "en_almacen", almacen);
    setModalAlmacen(false);
    setPedidoActivo(null);
    Sounds.crear();
  }

  function confirmarEliminar(id: string) {
    setModalDetalle(false);
    pedirConfirmacion({
      titulo: "Eliminar pedido",
      mensaje: "¿Seguro que quieres eliminar este pedido?",
      confirmLabel: "Eliminar",
      destructivo: true,
      onCancel: () => setModalDetalle(true),
      onConfirm: async () => {
        const lista = pedidos.filter(p => p.id !== id);
        setPedidos(lista);
        await savePedidos(lista);
      },
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const fabBottom = TAB_BAR_HEIGHT + 16;
  const s = makeStyles(colors, fabBottom);
  const activo = pedidoActivo ? estadoInfo(pedidoActivo.estado) : ESTADOS[0];
  const sig = pedidoActivo ? estadoSiguiente(pedidoActivo.estado) : null;
  const sigInfo = sig ? estadoInfo(sig) : null;

  // filtrado combinado: texto + estado
  const q = busqueda.trim().toLowerCase();
  const pedidosFiltrados = pedidos.filter(p => {
    if (filtroEstado && p.estado !== filtroEstado) return false;
    if (q) return (
      p.numeroCompra.toLowerCase().includes(q) ||
      (p.numeroSeguimiento?.toLowerCase().includes(q) ?? false)
    );
    return true;
  });

  // conteo por estado para los chips
  const conteoEstados = ESTADOS.reduce<Record<string, number>>((acc, e) => {
    acc[e.key] = pedidos.filter(p => p.estado === e.key).length;
    return acc;
  }, {});

  // artículos no añadidos aún al pedido actual
  const articulosDisponibles = todosArticulos.filter(
    a => !articulosPedido.some(p => p.articuloId === a.id)
  );

  return (
    <View style={s.container}>
      {/* ── Barra de búsqueda ── */}
      <View style={s.searchBar}>
        <Feather name="search" size={16} color={colors.mutedForeground} style={s.searchIco} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar por n° compra o seguimiento…"
          placeholderTextColor={colors.mutedForeground}
          value={busqueda}
          onChangeText={setBusqueda}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x-circle" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filtro por estado ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filtroScroll}
        contentContainerStyle={s.filtroContent}
      >
        {/* Chip "Todos" */}
        <TouchableOpacity
          style={[s.chip, filtroEstado === null && s.chipActivo]}
          onPress={() => { Sounds.tap(); setFiltroEstado(null); }}
          activeOpacity={0.75}
        >
          <Text style={[s.chipTxt, filtroEstado === null && s.chipTxtActivo]}>
            Todos
          </Text>
          <View style={[s.chipBadge, filtroEstado === null && s.chipBadgeActivo]}>
            <Text style={[s.chipBadgeTxt, filtroEstado === null && s.chipBadgeTxtActivo]}>
              {pedidos.length}
            </Text>
          </View>
        </TouchableOpacity>

        {ESTADOS.map(e => {
          const activo = filtroEstado === e.key;
          const n = conteoEstados[e.key] ?? 0;
          return (
            <TouchableOpacity
              key={e.key}
              style={[s.chip, activo && { backgroundColor: e.bg, borderColor: e.color }]}
              onPress={() => { Sounds.tap(); setFiltroEstado(activo ? null : e.key); }}
              activeOpacity={0.75}
            >
              <Feather name={e.icono as any} size={13} color={activo ? e.color : colors.mutedForeground} />
              <Text style={[s.chipTxt, activo && { color: e.color, fontFamily: "Inter_700Bold" }]}>
                {e.label}
              </Text>
              {n > 0 && (
                <View style={[s.chipBadge, activo && { backgroundColor: e.color }]}>
                  <Text style={[s.chipBadgeTxt, activo && s.chipBadgeTxtActivo]}>{n}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={pedidosFiltrados}
        keyExtractor={p => p.id}
        contentContainerStyle={[s.lista, pedidosFiltrados.length === 0 && { flex: 1 }]}
        ListEmptyComponent={
          <View style={s.vacio}>
            <Feather name={q ? "search" : "package"} size={52} color={colors.mutedForeground} />
            <Text style={s.vacioTitulo}>{q ? "Sin resultados" : "Sin pedidos"}</Text>
            <Text style={s.vacioTexto}>
              {q
                ? `No hay pedidos con "${busqueda}"`
                : "Toca + para registrar un pedido en camino"}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const est = estadoInfo(item.estado);
          const totalArts = item.articulos?.reduce((s, a) => s + a.cantidad, 0) ?? 0;
          return (
            <TouchableOpacity style={s.card} onPress={() => abrirDetalle(item)} activeOpacity={0.8}>
              <View style={s.cardTop}>
                <View style={[s.estadoBadge, { backgroundColor: est.bg }]}>
                  <Feather name={est.icono as any} size={12} color={est.color} />
                  <Text style={[s.estadoBadgeTxt, { color: est.color }]}>{est.label}</Text>
                </View>
                <Text style={s.cardFecha}>{item.fechaCompra}</Text>
              </View>
              <Text style={s.cardNumCompra}>#{item.numeroCompra}</Text>
              {item.numeroSeguimiento ? (
                <Text style={s.cardSeguimiento}>📍 {item.numeroSeguimiento}</Text>
              ) : null}
              {totalArts > 0 && (
                <Text style={s.cardArts}>
                  {item.articulos.length} artículo{item.articulos.length !== 1 ? "s" : ""} · {totalArts} uds
                </Text>
              )}
              {item.almacenNombre ? (
                <Text style={s.cardAlmacen}>✓ {item.almacenNombre}</Text>
              ) : null}
              <View style={s.progreso}>
                {ESTADOS.map((e, i) => {
                  const idx = ESTADOS.findIndex(x => x.key === item.estado);
                  const ok = i <= idx;
                  return (
                    <React.Fragment key={e.key}>
                      <View style={[s.progPunto, ok ? { backgroundColor: e.color } : s.progPuntoInactivo]} />
                      {i < ESTADOS.length - 1 && (
                        <View style={[s.progLinea, ok && i < idx ? { backgroundColor: ESTADOS[i].color } : s.progLineaInactiva]} />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={s.fab} onPress={abrirCrear} activeOpacity={0.85}>
        <Feather name="plus" size={20} color="#fff" />
        <Text style={s.fabTxt}>Nuevo</Text>
      </TouchableOpacity>

      {/* ── Modal Crear ── */}
      <Modal visible={modalCrear} transparent animationType="slide" onRequestClose={() => setModalCrear(false)}>
        <Pressable style={s.overlayBottom} onPress={() => setModalCrear(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitulo}>Nuevo pedido</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <Text style={s.fieldLabel}>Número de compra *</Text>
              <TextInput style={s.input} placeholder="Ej: ORD-2024-001" placeholderTextColor={colors.mutedForeground}
                value={numCompra} onChangeText={setNumCompra} autoFocus maxLength={60} />

              <Text style={s.fieldLabel}>Número de seguimiento</Text>
              <TextInput style={s.input} placeholder="Ej: 1Z999AA10123456784" placeholderTextColor={colors.mutedForeground}
                value={numSeguimiento} onChangeText={setNumSeguimiento} maxLength={80} />

              <Text style={s.fieldLabel}>Fecha de compra</Text>
              <TouchableOpacity style={s.dateBtn} onPress={() => setCalendarVisible(true)}>
                <Feather name="calendar" size={16} color={fechaCompra ? colors.primary : colors.mutedForeground} />
                <Text style={[s.dateBtnTxt, { color: fechaCompra ? colors.foreground : colors.mutedForeground }]}>
                  {fechaCompra || "Seleccionar fecha"}
                </Text>
              </TouchableOpacity>

              {/* ── Artículos del pedido ── */}
              <View style={s.artSeccionHeader}>
                <Text style={s.fieldLabel}>Artículos del pedido</Text>
                <TouchableOpacity style={s.addArtBtn} onPress={abrirPickArt}>
                  <Feather name="plus" size={14} color={colors.primary} />
                  <Text style={s.addArtTxt}>Añadir</Text>
                </TouchableOpacity>
              </View>

              {articulosPedido.length === 0 ? (
                <TouchableOpacity style={s.artVacioArea} onPress={abrirPickArt}>
                  <Feather name="box" size={20} color={colors.mutedForeground} />
                  <Text style={s.artVacioTxt}>Toca para seleccionar artículos</Text>
                </TouchableOpacity>
              ) : (
                articulosPedido.map(pa => (
                  <View key={pa.articuloId} style={s.artFila}>
                    {(() => { const f = todosArticulos.find(a => a.id === pa.articuloId)?.foto; return f ? (
                      <Image source={{ uri: f }} style={s.artFilaFoto} contentFit="cover" />
                    ) : (
                      <View style={s.artFilaIco}><Feather name="box" size={14} color={colors.primary} /></View>
                    ); })()}
                    <Text style={s.artFilaNombre} numberOfLines={1}>{pa.articuloNombre}</Text>
                    <View style={s.artFilaCant}>
                      <TouchableOpacity style={s.cantBtn} onPress={() => cambiarCantidad(pa.articuloId, -1)}>
                        <Feather name="minus" size={13} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text style={s.cantNum}>{pa.cantidad}</Text>
                      <TouchableOpacity style={s.cantBtn} onPress={() => cambiarCantidad(pa.articuloId, 1)}>
                        <Feather name="plus" size={13} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => quitarArticuloPedido(pa.articuloId)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
                      <Feather name="x" size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <Text style={[s.fieldLabel, { marginTop: 10 }]}>Notas (opcional)</Text>
              <TextInput style={[s.input, s.inputMulti]} placeholder="Descripción del pedido..."
                placeholderTextColor={colors.mutedForeground} value={notas} onChangeText={setNotas}
                multiline numberOfLines={3} maxLength={200} />

              <View style={s.modalBotones}>
                <TouchableOpacity style={[s.boton, s.botonCancelar]} onPress={() => setModalCrear(false)}>
                  <Text style={s.botonCancelarTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.boton, s.botonCrear, !numCompra.trim() && s.botonDisabled]}
                  onPress={crear} disabled={!numCompra.trim()}>
                  <Text style={s.botonCrearTxt}>Registrar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal Pick Artículo ── */}
      <Modal visible={modalPickArt} transparent animationType="fade" onRequestClose={() => setModalPickArt(false)}>
        <Pressable style={s.overlayCenter} onPress={() => setModalPickArt(false)}>
          <Pressable style={s.modalCenter} onPress={() => {}}>
            <Text style={s.sheetTitulo}>Seleccionar artículo</Text>
            {articulosDisponibles.length === 0 ? (
              <View style={s.pickVacio}>
                <Feather name="inbox" size={32} color={colors.mutedForeground} />
                <Text style={s.artVacioTxt}>
                  {todosArticulos.length === 0
                    ? "Crea artículos en la pestaña Artículos primero"
                    : "Ya añadiste todos los artículos disponibles"}
                </Text>
              </View>
            ) : (
              <FlatList
                data={articulosDisponibles}
                keyExtractor={a => a.id}
                style={{ maxHeight: 340 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={s.pickFila} onPress={() => agregarArticuloPedido(item)}>
                    {item.foto ? (
                      <Image source={{ uri: item.foto }} style={s.pickFoto} contentFit="cover" />
                    ) : (
                      <View style={s.pickIco}><Feather name="box" size={16} color={colors.primary} /></View>
                    )}
                    <Text style={s.pickNombre}>{item.nombre}</Text>
                    {item.precio != null && (
                      <Text style={s.pickPrecio}>💲{item.precio.toFixed(2)}/u</Text>
                    )}
                    <Feather name="plus-circle" size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={[s.boton, s.botonCancelar, { marginTop: 8 }]} onPress={() => setModalPickArt(false)}>
              <Text style={s.botonCancelarTxt}>Cerrar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal Detalle ── */}
      {pedidoActivo && (
        <Modal visible={modalDetalle} transparent animationType="fade" onRequestClose={() => setModalDetalle(false)}>
          <Pressable style={s.overlayCenter} onPress={() => setModalDetalle(false)}>
            <Pressable style={s.modalCenter} onPress={() => {}}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[s.detalleEstadoBanner, { backgroundColor: activo.bg }]}>
                  <Feather name={activo.icono as any} size={20} color={activo.color} />
                  <Text style={[s.detalleEstadoTxt, { color: activo.color }]}>{activo.label}</Text>
                </View>

                <View style={s.detalleRow}>
                  <Feather name="hash" size={14} color={colors.mutedForeground} />
                  <View><Text style={s.detalleLbl}>N° de compra</Text>
                    <Text style={s.detalleVal}>{pedidoActivo.numeroCompra}</Text></View>
                </View>
                {pedidoActivo.numeroSeguimiento ? (
                  <View style={s.detalleRow}>
                    <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                    <View><Text style={s.detalleLbl}>N° de seguimiento</Text>
                      <Text style={s.detalleVal}>{pedidoActivo.numeroSeguimiento}</Text></View>
                  </View>
                ) : null}
                <View style={s.detalleRow}>
                  <Feather name="calendar" size={14} color={colors.mutedForeground} />
                  <View><Text style={s.detalleLbl}>Fecha de compra</Text>
                    <Text style={s.detalleVal}>{pedidoActivo.fechaCompra}</Text></View>
                </View>

                {/* Artículos del pedido */}
                {pedidoActivo.articulos?.length > 0 && (
                  <View style={s.detalleArtsBox}>
                    <Text style={s.detalleArtsTitle}>
                      <Feather name="package" size={13} color={colors.primary} /> Artículos
                    </Text>
                    {pedidoActivo.articulos.map(pa => {
                      const foto = todosArticulos.find(a => a.id === pa.articuloId)?.foto;
                      return (
                      <View key={pa.articuloId} style={s.detalleArtFila}>
                        {foto ? (
                          <Image source={{ uri: foto }} style={s.detalleArtFoto} contentFit="cover" />
                        ) : (
                          <View style={s.detalleArtIco}><Feather name="box" size={12} color={colors.primary} /></View>
                        )}
                        <Text style={s.detalleArtNombre}>{pa.articuloNombre}</Text>
                        <View style={s.detalleArtCantBadge}>
                          <Text style={s.detalleArtCant}>{pa.cantidad} uds</Text>
                        </View>
                      </View>
                      );
                    })}
                  </View>
                )}

                {pedidoActivo.almacenNombre ? (
                  <View style={s.detalleRow}>
                    <Feather name="archive" size={14} color="#16a34a" />
                    <View><Text style={s.detalleLbl}>Almacén destino</Text>
                      <Text style={[s.detalleVal, { color: "#16a34a" }]}>{pedidoActivo.almacenNombre}</Text></View>
                  </View>
                ) : null}
                {pedidoActivo.notas ? (
                  <View style={s.detalleRow}>
                    <Feather name="file-text" size={14} color={colors.mutedForeground} />
                    <View style={{ flex: 1 }}><Text style={s.detalleLbl}>Notas</Text>
                      <Text style={s.detalleVal}>{pedidoActivo.notas}</Text></View>
                  </View>
                ) : null}

                {sigInfo && (
                  <TouchableOpacity style={[s.botonAvanzar, { backgroundColor: sigInfo.color }]}
                    onPress={() => avanzarEstado(pedidoActivo)}>
                    <Feather name={sigInfo.icono as any} size={16} color="#fff" />
                    <Text style={s.botonAvanzarTxt}>
                      {sig === "en_almacen" ? "Enviar a almacén →" : `Marcar: ${sigInfo.label}`}
                    </Text>
                  </TouchableOpacity>
                )}

                {estadoAnterior(pedidoActivo.estado) && (
                  <TouchableOpacity style={s.botonRetroceder}
                    onPress={() => retrocederEstado(pedidoActivo)}>
                    <Feather name="chevron-left" size={14} color={colors.mutedForeground} />
                    <Text style={s.botonRetrocederTxt}>
                      Retroceder a "{estadoInfo(estadoAnterior(pedidoActivo.estado)!).label}"
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={s.modalBotones}>
                  <TouchableOpacity style={[s.boton, s.botonCancelar]} onPress={() => setModalDetalle(false)}>
                    <Text style={s.botonCancelarTxt}>Cerrar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.boton, { backgroundColor: "#fee2e2" }]}
                    onPress={() => confirmarEliminar(pedidoActivo.id)}>
                    <Feather name="trash-2" size={15} color="#dc2626" />
                    <Text style={{ color: "#dc2626", fontWeight: "600", fontFamily: "Inter_600SemiBold" }}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ── Modal Selección Almacén ── */}
      <Modal visible={modalAlmacen} transparent animationType="fade" onRequestClose={() => setModalAlmacen(false)}>
        <Pressable style={s.overlayCenter} onPress={() => setModalAlmacen(false)}>
          <Pressable style={s.modalCenter} onPress={() => {}}>
            <Text style={s.sheetTitulo}>¿A qué almacén llega?</Text>
            {pedidoActivo?.articulos?.length ? (
              <View style={s.almacenResumen}>
                <Feather name="info" size={13} color={colors.primary} />
                <Text style={s.almacenResumenTxt}>
                  Se añadirán {pedidoActivo.articulos.reduce((s, a) => s + a.cantidad, 0)} unidades
                  de {pedidoActivo.articulos.length} artículo{pedidoActivo.articulos.length !== 1 ? "s" : ""} al stock
                </Text>
              </View>
            ) : null}
            {almacenes.length === 0 ? (
              <Text style={s.artVacioTxt}>No hay almacenes. Crea uno en la pestaña Almacenes.</Text>
            ) : (
              almacenes.map(a => (
                <TouchableOpacity key={a.id} style={s.almacenOpcion} onPress={() => enviarAlmacen(a)}>
                  <View style={s.almacenIcono}>
                    <Feather name="package" size={18} color={colors.primary} />
                  </View>
                  <Text style={s.almacenNombre}>{a.nombre}</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={[s.boton, s.botonCancelar, { marginTop: 4 }]} onPress={() => setModalAlmacen(false)}>
              <Text style={s.botonCancelarTxt}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal Confirmación ── */}
      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <Pressable style={s.overlayCenter} onPress={() => { const fn = confirm?.onCancel; setConfirm(null); fn?.(); }}>
          <Pressable style={s.modalCenter} onPress={() => {}}>
            <Text style={s.sheetTitulo}>{confirm?.titulo}</Text>
            <Text style={s.confirmMensaje}>{confirm?.mensaje}</Text>
            <View style={s.modalBotones}>
              <TouchableOpacity style={[s.boton, s.botonCancelar]} onPress={() => {
                const fn = confirm?.onCancel;
                setConfirm(null);
                fn?.();
              }}>
                <Text style={s.botonCancelarTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.boton, confirm?.destructivo ? s.botonDestructivo : s.botonCrear]}
                onPress={() => { const fn = confirm?.onConfirm; setConfirm(null); fn?.(); }}
              >
                <Text style={s.botonCrearTxt}>{confirm?.confirmLabel}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal Avanzar Estado ── */}
      {pedidoActivo && (
        <Modal visible={modalAvanzar} transparent animationType="slide" onRequestClose={() => { setModalAvanzar(false); setModalDetalle(true); }}>
          <Pressable style={s.overlayBottom} onPress={() => { setModalAvanzar(false); setModalDetalle(true); }}>
            <Pressable style={s.sheetAvanzar} onPress={() => {}}>
              {/* Cabecera */}
              {(() => {
                const sig2 = estadoSiguiente(pedidoActivo.estado);
                const sigI2 = sig2 ? estadoInfo(sig2) : null;
                const esCasilleroACuba = pedidoActivo.estado === "en_casillero" && sig2 === "enviado_cuba";
                const tieneArts = (pedidoActivo.articulos?.length ?? 0) > 0;
                return (
                  <>
                    <View style={[s.avanzarHeader, { backgroundColor: sigI2?.bg ?? colors.card }]}>
                      <Feather name={(sigI2?.icono ?? "arrow-right") as any} size={18} color={sigI2?.color ?? colors.primary} />
                      <Text style={[s.avanzarHeaderTxt, { color: sigI2?.color ?? colors.primary }]}>
                        Avanzar a "{sigI2?.label ?? ""}"
                      </Text>
                    </View>

                    {/* Artículos con steppers */}
                    {tieneArts && (
                      <View style={s.avanzarSeccion}>
                        <Text style={s.avanzarSeccionTitulo}>¿Cuántas unidades avanzan?</Text>
                        {pedidoActivo.articulos.map(pa => {
                          const foto = todosArticulos.find(a => a.id === pa.articuloId)?.foto;
                          const cant = cantAvance[pa.articuloId] ?? pa.cantidad;
                          return (
                            <View key={pa.articuloId} style={s.stepperFila}>
                              {foto ? (
                                <Image source={{ uri: foto }} style={s.stepperFoto} contentFit="cover" />
                              ) : (
                                <View style={s.stepperIco}><Feather name="box" size={14} color={colors.primary} /></View>
                              )}
                              <Text style={s.stepperNombre} numberOfLines={1}>{pa.articuloNombre}</Text>
                              <View style={s.stepper}>
                                <TouchableOpacity
                                  style={[s.stepperBtn, cant <= 0 && s.stepperBtnOff]}
                                  onPress={() => setCantAvance(prev => ({ ...prev, [pa.articuloId]: Math.max(0, cant - 1) }))}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Feather name="minus" size={14} color={cant <= 0 ? colors.mutedForeground : colors.primary} />
                                </TouchableOpacity>
                                <Text style={[s.stepperVal, cant === 0 && s.stepperValCero]}>
                                  {cant}<Text style={s.stepperMax}>/{pa.cantidad}</Text>
                                </Text>
                                <TouchableOpacity
                                  style={[s.stepperBtn, cant >= pa.cantidad && s.stepperBtnOff]}
                                  onPress={() => setCantAvance(prev => ({ ...prev, [pa.articuloId]: Math.min(pa.cantidad, cant + 1) }))}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Feather name="plus" size={14} color={cant >= pa.cantidad ? colors.mutedForeground : colors.primary} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Campo seguimiento (solo casillero → cuba) */}
                    {esCasilleroACuba && (
                      <View style={s.avanzarSeccion}>
                        <Text style={s.avanzarSeccionTitulo}>
                          <Feather name="send" size={13} color="#7c3aed" /> Nuevo n° de seguimiento (opcional)
                        </Text>
                        <Text style={s.avanzarSeccionSub}>
                          {pedidoActivo.numeroSeguimiento
                            ? `Actual: ${pedidoActivo.numeroSeguimiento}`
                            : "Este envío aún no tiene número de seguimiento"}
                        </Text>
                        <View style={s.seguimientoInput}>
                          <Feather name="map-pin" size={15} color="#7c3aed" />
                          <TextInput
                            style={s.seguimientoTxt}
                            placeholder="Ej. CUCU123456789…"
                            placeholderTextColor={colors.mutedForeground}
                            value={nuevoSeguimientoAvance}
                            onChangeText={setNuevoSeguimientoAvance}
                            autoCorrect={false}
                            autoCapitalize="characters"
                          />
                          {nuevoSeguimientoAvance.length > 0 && (
                            <TouchableOpacity onPress={() => setNuevoSeguimientoAvance("")}>
                              <Feather name="x-circle" size={15} color={colors.mutedForeground} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Botones */}
                    <View style={s.modalBotones}>
                      <TouchableOpacity style={[s.boton, s.botonCancelar]} onPress={() => { setModalAvanzar(false); setModalDetalle(true); }}>
                        <Text style={s.botonCancelarTxt}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.boton, s.botonCrear, { backgroundColor: sigI2?.color ?? colors.primary }]}
                        onPress={confirmarAvance}
                      >
                        <Feather name="check" size={15} color="#fff" />
                        <Text style={s.botonCrearTxt}>Confirmar</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                );
              })()}
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ── Calendar ── */}
      <CalendarPicker
        visible={calendarVisible}
        value={fechaCompra}
        onConfirm={(f) => { setFechaCompra(f); setCalendarVisible(false); }}
        onClose={() => setCalendarVisible(false)}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, fabBottom: number) {
  const cardShadow = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  };
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 10, gap: 10, marginHorizontal: 16, marginTop: 12, marginBottom: 0, borderRadius: 16, ...cardShadow },
    searchIco: {},
    searchInput: { flex: 1, fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", paddingVertical: 4 },
    // chips de filtro
    filtroScroll: { flexGrow: 0 },
    filtroContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: "row" },
    chip: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
      backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
      ...cardShadow,
    },
    chipActivo: { backgroundColor: colors.accent, borderColor: colors.primary },
    chipTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    chipTxtActivo: { color: colors.primary, fontFamily: "Inter_700Bold" },
    chipBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
    chipBadgeActivo: { backgroundColor: colors.primary },
    chipBadgeTxt: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold", color: colors.mutedForeground },
    chipBadgeTxtActivo: { color: "#fff" },
    lista: { padding: 16, gap: 10, paddingBottom: TAB_BAR_HEIGHT + 80 },
    vacio: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 14 },
    vacioTitulo: { fontSize: 22, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    vacioTexto: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 40, fontFamily: "Inter_400Regular", lineHeight: 20 },
    card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 6, ...cardShadow },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    estadoBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    estadoBadgeTxt: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
    cardFecha: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    cardNumCompra: { fontSize: 17, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    cardSeguimiento: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    cardArts: { fontSize: 12, color: colors.primary, fontFamily: "Inter_600SemiBold" },
    cardAlmacen: { fontSize: 12, color: "#2f9e44", fontFamily: "Inter_600SemiBold" },
    progreso: { flexDirection: "row", alignItems: "center", marginTop: 8 },
    progPunto: { width: 10, height: 10, borderRadius: 5 },
    progPuntoInactivo: { backgroundColor: colors.border },
    progLinea: { flex: 1, height: 2, borderRadius: 1 },
    progLineaInactiva: { backgroundColor: colors.border },
    fab: {
      position: "absolute", right: 20, bottom: fabBottom,
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 22, paddingVertical: 16, borderRadius: 28,
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45,
      shadowRadius: 12,
      elevation: 10,
    },
    fabTxt: { fontSize: 15, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
    // overlays
    overlayBottom: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
    overlayCenter: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 20 },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, gap: 10, maxHeight: "92%" },
    sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 8 },
    sheetTitulo: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", marginBottom: 4 },
    modalCenter: { backgroundColor: colors.card, borderRadius: 24, padding: 20, width: "100%", maxWidth: 400, gap: 10, maxHeight: "85%" },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
    input: { borderWidth: 1.5, borderColor: colors.input, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: colors.foreground, backgroundColor: colors.muted, fontFamily: "Inter_400Regular", marginBottom: 8 },
    inputMulti: { height: 72, textAlignVertical: "top" },
    dateBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: colors.input, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, backgroundColor: colors.muted, marginBottom: 8 },
    dateBtnTxt: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground },
    // artículos en formulario
    artSeccionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    addArtBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    addArtTxt: { fontSize: 12, fontWeight: "700", color: colors.primary, fontFamily: "Inter_700Bold" },
    artVacioArea: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed", borderRadius: 14, padding: 16, marginBottom: 8, justifyContent: "center" },
    artVacioTxt: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    artFila: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.muted, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
    artFilaIco: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    artFilaFoto: { width: 30, height: 30, borderRadius: 8 },
    artFilaNombre: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    artFilaCant: { flexDirection: "row", alignItems: "center", gap: 8 },
    cantBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", ...cardShadow },
    cantNum: { fontSize: 15, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", minWidth: 24, textAlign: "center" },
    // pick artículo modal
    pickVacio: { alignItems: "center", paddingVertical: 28, gap: 10 },
    pickFila: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
    pickIco: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    pickFoto: { width: 36, height: 36, borderRadius: 10 },
    pickNombre: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    pickPrecio: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    // detalle
    detalleEstadoBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, marginBottom: 6 },
    detalleEstadoTxt: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
    detalleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 5 },
    detalleLbl: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    detalleVal: { fontSize: 14, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    detalleArtsBox: { backgroundColor: colors.muted, borderRadius: 14, padding: 14, gap: 8, marginVertical: 4 },
    detalleArtsTitle: { fontSize: 12, fontWeight: "700", color: colors.primary, fontFamily: "Inter_700Bold", marginBottom: 2 },
    detalleArtFila: { flexDirection: "row", alignItems: "center", gap: 10 },
    detalleArtFoto: { width: 28, height: 28, borderRadius: 7 },
    detalleArtIco: { width: 28, height: 28, borderRadius: 7, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    detalleArtNombre: { flex: 1, fontSize: 13, color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    detalleArtCantBadge: { backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    detalleArtCant: { fontSize: 12, fontWeight: "700", color: colors.primary, fontFamily: "Inter_700Bold" },
    botonAvanzar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14, marginTop: 6 },
    botonAvanzarTxt: { fontSize: 16, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
    botonRetroceder: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border },
    botonRetrocederTxt: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    modalBotones: { flexDirection: "row", gap: 10, marginTop: 4 },
    boton: { flex: 1, flexDirection: "row", paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 6 },
    botonCancelar: { backgroundColor: colors.muted },
    botonCancelarTxt: { fontSize: 15, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
    botonCrear: { backgroundColor: colors.primary },
    botonCrearTxt: { fontSize: 15, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
    botonDisabled: { opacity: 0.35 },
    botonDestructivo: { backgroundColor: "#e03131" },
    confirmMensaje: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    // almacén
    almacenResumen: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: colors.accent, padding: 12, borderRadius: 14 },
    almacenResumenTxt: { flex: 1, fontSize: 12, color: colors.primary, fontFamily: "Inter_400Regular" },
    almacenOpcion: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    almacenIcono: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    almacenNombre: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    // modal avanzar estado
    sheetAvanzar: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: 24, paddingBottom: 44, gap: 12, maxHeight: "88%",
    },
    avanzarHeader: {
      flexDirection: "row", alignItems: "center", gap: 10,
      padding: 14, borderRadius: 16, marginBottom: 4,
    },
    avanzarHeaderTxt: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
    avanzarSeccion: { gap: 10 },
    avanzarSeccionTitulo: { fontSize: 13, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    avanzarSeccionSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: -6 },
    // stepper filas
    stepperFila: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: colors.muted, borderRadius: 14,
      paddingHorizontal: 12, paddingVertical: 10,
    },
    stepperFoto: { width: 32, height: 32, borderRadius: 8 },
    stepperIco: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    stepperNombre: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
    stepperBtn: {
      width: 30, height: 30, borderRadius: 9,
      backgroundColor: colors.card, alignItems: "center", justifyContent: "center",
      ...cardShadow,
    },
    stepperBtnOff: { opacity: 0.4 },
    stepperVal: { fontSize: 15, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", minWidth: 34, textAlign: "center" },
    stepperValCero: { color: colors.mutedForeground },
    stepperMax: { fontSize: 11, fontWeight: "400", color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    // campo seguimiento nuevo
    seguimientoInput: {
      flexDirection: "row", alignItems: "center", gap: 10,
      borderWidth: 1.5, borderColor: "#7c3aed33",
      borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
      backgroundColor: "#ede9fe55",
    },
    seguimientoTxt: { flex: 1, fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular" },
  });
}

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : 49;

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
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null);

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
    };
    const lista = [nuevo, ...pedidos];
    setPedidos(lista);
    await savePedidos(lista);
    setModalCrear(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // ── Detalle / estado ───────────────────────────────────────────────────────

  function abrirDetalle(p: Pedido) { setPedidoActivo(p); setModalDetalle(true); }

  async function avanzarEstado(p: Pedido) {
    const sig = estadoSiguiente(p.estado);
    if (!sig) return;
    if (sig === "en_almacen") {
      setPedidoActivo(p);
      setModalDetalle(false);
      setModalAlmacen(true);
      return;
    }
    await actualizarEstado(p.id, sig);
    setModalDetalle(false);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function actualizarEstado(id: string, estado: EstadoPedido, almacen?: Almacen) {
    const lista = pedidos.map(p =>
      p.id === id ? { ...p, estado, almacenId: almacen?.id, almacenNombre: almacen?.nombre } : p
    );
    setPedidos(lista);
    await savePedidos(lista);
  }

  async function enviarAlmacen(almacen: Almacen) {
    if (!pedidoActivo) return;

    // suma stock de cada artículo del pedido en el almacén elegido
    await Promise.all(
      pedidoActivo.articulos.map(async (pa) => {
        await updateStock(almacen.id, pa.articuloId, pa.cantidad);
        await agregarMovimiento({
          almacenId: almacen.id,
          articuloId: pa.articuloId,
          articuloNombre: pa.articuloNombre,
          tipo: "entrada",
          cantidad: pa.cantidad,
        });
      })
    );

    await actualizarEstado(pedidoActivo.id, "en_almacen", almacen);
    setModalAlmacen(false);
    setPedidoActivo(null);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function confirmarEliminar(id: string) {
    Alert.alert("Eliminar pedido", "¿Seguro que quieres eliminar este pedido?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive", onPress: async () => {
          const lista = pedidos.filter(p => p.id !== id);
          setPedidos(lista);
          await savePedidos(lista);
          setModalDetalle(false);
        },
      },
    ]);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const fabBottom = TAB_BAR_HEIGHT + 16;
  const s = makeStyles(colors, fabBottom);
  const activo = pedidoActivo ? estadoInfo(pedidoActivo.estado) : ESTADOS[0];
  const sig = pedidoActivo ? estadoSiguiente(pedidoActivo.estado) : null;
  const sigInfo = sig ? estadoInfo(sig) : null;

  // artículos no añadidos aún al pedido actual
  const articulosDisponibles = todosArticulos.filter(
    a => !articulosPedido.some(p => p.articuloId === a.id)
  );

  return (
    <View style={s.container}>
      <FlatList
        data={pedidos}
        keyExtractor={p => p.id}
        contentContainerStyle={[s.lista, pedidos.length === 0 && { flex: 1 }]}
        ListEmptyComponent={
          <View style={s.vacio}>
            <Feather name="package" size={52} color={colors.mutedForeground} />
            <Text style={s.vacioTitulo}>Sin pedidos</Text>
            <Text style={s.vacioTexto}>Toca + para registrar un pedido en camino</Text>
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
        <Feather name="plus" size={28} color="#fff" />
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
                    <View style={s.artFilaIco}>
                      <Feather name="box" size={14} color={colors.primary} />
                    </View>
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
                    <View style={s.pickIco}>
                      <Feather name="box" size={16} color={colors.primary} />
                    </View>
                    <Text style={s.pickNombre}>{item.nombre}</Text>
                    {item.precio != null && (
                      <Text style={s.pickPrecio}>${item.precio.toFixed(2)}</Text>
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
                    {pedidoActivo.articulos.map(pa => (
                      <View key={pa.articuloId} style={s.detalleArtFila}>
                        <Feather name="box" size={13} color={colors.primary} />
                        <Text style={s.detalleArtNombre}>{pa.articuloNombre}</Text>
                        <View style={s.detalleArtCantBadge}>
                          <Text style={s.detalleArtCant}>{pa.cantidad} uds</Text>
                        </View>
                      </View>
                    ))}
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
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    lista: { padding: 16, paddingBottom: TAB_BAR_HEIGHT + 80 },
    vacio: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
    vacioTitulo: { fontSize: 20, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    vacioTexto: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 24, fontFamily: "Inter_400Regular" },
    card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, gap: 5 },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    estadoBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    estadoBadgeTxt: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
    cardFecha: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    cardNumCompra: { fontSize: 16, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    cardSeguimiento: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    cardArts: { fontSize: 12, color: colors.primary, fontFamily: "Inter_600SemiBold" },
    cardAlmacen: { fontSize: 12, color: "#16a34a", fontFamily: "Inter_600SemiBold" },
    progreso: { flexDirection: "row", alignItems: "center", marginTop: 6 },
    progPunto: { width: 10, height: 10, borderRadius: 5 },
    progPuntoInactivo: { backgroundColor: colors.border },
    progLinea: { flex: 1, height: 2 },
    progLineaInactiva: { backgroundColor: colors.border },
    fab: { position: "absolute", right: 20, bottom: fabBottom, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
    // overlays
    overlayBottom: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
    overlayCenter: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 20 },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 40, gap: 10, maxHeight: "92%" },
    sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 6 },
    sheetTitulo: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", marginBottom: 6 },
    modalCenter: { backgroundColor: colors.card, borderRadius: 18, padding: 20, width: "100%", maxWidth: 400, gap: 10, maxHeight: "85%" },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.foreground, backgroundColor: colors.background, fontFamily: "Inter_400Regular", marginBottom: 10 },
    inputMulti: { height: 70, textAlignVertical: "top" },
    dateBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.background, marginBottom: 10 },
    dateBtnTxt: { fontSize: 15, fontFamily: "Inter_400Regular" },
    // artículos en formulario
    artSeccionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    addArtBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    addArtTxt: { fontSize: 12, fontWeight: "600", color: colors.primary, fontFamily: "Inter_600SemiBold" },
    artVacioArea: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed", borderRadius: 10, padding: 14, marginBottom: 10, justifyContent: "center" },
    artVacioTxt: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    artFila: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.muted, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6 },
    artFilaIco: { width: 28, height: 28, borderRadius: 7, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    artFilaNombre: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    artFilaCant: { flexDirection: "row", alignItems: "center", gap: 6 },
    cantBtn: { width: 26, height: 26, borderRadius: 7, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
    cantNum: { fontSize: 14, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", minWidth: 22, textAlign: "center" },
    // pick artículo modal
    pickVacio: { alignItems: "center", paddingVertical: 24, gap: 8 },
    pickFila: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    pickIco: { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    pickNombre: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    pickPrecio: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    // detalle
    detalleEstadoBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, marginBottom: 4 },
    detalleEstadoTxt: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
    detalleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 },
    detalleLbl: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    detalleVal: { fontSize: 14, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    detalleArtsBox: { backgroundColor: colors.muted, borderRadius: 10, padding: 12, gap: 6, marginVertical: 4 },
    detalleArtsTitle: { fontSize: 12, fontWeight: "700", color: colors.primary, fontFamily: "Inter_700Bold", marginBottom: 4 },
    detalleArtFila: { flexDirection: "row", alignItems: "center", gap: 8 },
    detalleArtNombre: { flex: 1, fontSize: 13, color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    detalleArtCantBadge: { backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    detalleArtCant: { fontSize: 12, fontWeight: "700", color: colors.primary, fontFamily: "Inter_700Bold" },
    botonAvanzar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 4 },
    botonAvanzarTxt: { fontSize: 15, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
    modalBotones: { flexDirection: "row", gap: 10, marginTop: 4 },
    boton: { flex: 1, flexDirection: "row", paddingVertical: 13, borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 6 },
    botonCancelar: { backgroundColor: colors.muted },
    botonCancelarTxt: { fontSize: 14, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
    botonCrear: { backgroundColor: colors.primary },
    botonCrearTxt: { fontSize: 14, fontWeight: "600", color: "#fff", fontFamily: "Inter_600SemiBold" },
    botonDisabled: { opacity: 0.4 },
    // almacén
    almacenResumen: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: colors.accent, padding: 10, borderRadius: 10 },
    almacenResumenTxt: { flex: 1, fontSize: 12, color: colors.primary, fontFamily: "Inter_400Regular" },
    almacenOpcion: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
    almacenIcono: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    almacenNombre: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
  });
}

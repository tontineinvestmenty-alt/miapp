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
  EstadoPedido,
  Pedido,
  genId,
  fechaHoy,
  getAlmacenes,
  getPedidos,
  savePedidos,
} from "@/utils/storage";

const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : 49;

const ESTADOS: { key: EstadoPedido; label: string; color: string; bg: string; icono: string }[] = [
  { key: "comprado",      label: "Comprado",       color: "#2563eb", bg: "#dbeafe", icono: "shopping-cart" },
  { key: "en_casillero",  label: "En casillero",   color: "#d97706", bg: "#fef3c7", icono: "inbox" },
  { key: "enviado_cuba",  label: "Enviado a Cuba",  color: "#7c3aed", bg: "#ede9fe", icono: "send" },
  { key: "en_almacen",    label: "En almacén",      color: "#16a34a", bg: "#dcfce7", icono: "check-circle" },
];

function estadoInfo(k: EstadoPedido) {
  return ESTADOS.find(e => e.key === k) ?? ESTADOS[0];
}

function estadoSiguiente(k: EstadoPedido): EstadoPedido | null {
  const idx = ESTADOS.findIndex(e => e.key === k);
  if (idx >= 0 && idx < ESTADOS.length - 1) return ESTADOS[idx + 1].key;
  return null;
}

export default function PedidosScreen() {
  const colors = useColors();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);

  const [modalCrear, setModalCrear] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [modalAlmacen, setModalAlmacen] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null);

  const [numCompra, setNumCompra] = useState("");
  const [numSeguimiento, setNumSeguimiento] = useState("");
  const [fechaCompra, setFechaCompra] = useState("");
  const [notas, setNotas] = useState("");

  useFocusEffect(useCallback(() => {
    Promise.all([getPedidos(), getAlmacenes()]).then(([p, a]) => {
      setPedidos(p);
      setAlmacenes(a);
    });
  }, []));

  function abrirCrear() {
    setNumCompra(""); setNumSeguimiento(""); setFechaCompra(""); setNotas("");
    setModalCrear(true);
  }

  async function crear() {
    if (!numCompra.trim()) return;
    const nuevo: Pedido = {
      id: genId(),
      numeroCompra: numCompra.trim(),
      numeroSeguimiento: numSeguimiento.trim(),
      fechaCompra: fechaCompra || fechaHoy(),
      estado: "comprado",
      notas: notas.trim() || undefined,
      creadoEn: fechaHoy(),
    };
    const lista = [nuevo, ...pedidos];
    setPedidos(lista);
    await savePedidos(lista);
    setModalCrear(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function abrirDetalle(p: Pedido) {
    setPedidoActivo(p);
    setModalDetalle(true);
  }

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
        }
      },
    ]);
  }

  const fabBottom = TAB_BAR_HEIGHT + 16;
  const s = makeStyles(colors, fabBottom);

  const activo = pedidoActivo ? estadoInfo(pedidoActivo.estado) : ESTADOS[0];
  const sig = pedidoActivo ? estadoSiguiente(pedidoActivo.estado) : null;
  const sigInfo = sig ? estadoInfo(sig) : null;

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
                <Text style={s.cardSeguimiento}>
                  <Feather name="map-pin" size={11} color={colors.mutedForeground} /> {item.numeroSeguimiento}
                </Text>
              ) : null}
              {item.almacenNombre ? (
                <Text style={s.cardAlmacen}>
                  <Feather name="archive" size={11} color="#16a34a" /> {item.almacenNombre}
                </Text>
              ) : null}
              <View style={s.progreso}>
                {ESTADOS.map((e, i) => {
                  const idx = ESTADOS.findIndex(x => x.key === item.estado);
                  const activo = i <= idx;
                  return (
                    <React.Fragment key={e.key}>
                      <View style={[s.progPunto, activo ? { backgroundColor: e.color } : s.progPuntoInactivo]} />
                      {i < ESTADOS.length - 1 && (
                        <View style={[s.progLinea, activo && i < idx ? { backgroundColor: ESTADOS[i].color } : s.progLineaInactiva]} />
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
        <Pressable style={s.overlay} onPress={() => setModalCrear(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitulo}>Nuevo pedido</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>Número de compra *</Text>
              <TextInput
                style={s.input}
                placeholder="Ej: ORD-2024-001"
                placeholderTextColor={colors.mutedForeground}
                value={numCompra}
                onChangeText={setNumCompra}
                autoFocus
                maxLength={60}
              />
              <Text style={s.fieldLabel}>Número de seguimiento</Text>
              <TextInput
                style={s.input}
                placeholder="Ej: 1Z999AA10123456784"
                placeholderTextColor={colors.mutedForeground}
                value={numSeguimiento}
                onChangeText={setNumSeguimiento}
                maxLength={80}
              />
              <Text style={s.fieldLabel}>Fecha de compra</Text>
              <TouchableOpacity style={s.dateBtn} onPress={() => setCalendarVisible(true)}>
                <Feather name="calendar" size={16} color={fechaCompra ? colors.primary : colors.mutedForeground} />
                <Text style={[s.dateBtnTxt, fechaCompra ? { color: colors.foreground } : { color: colors.mutedForeground }]}>
                  {fechaCompra || "Seleccionar fecha"}
                </Text>
              </TouchableOpacity>
              <Text style={s.fieldLabel}>Notas (opcional)</Text>
              <TextInput
                style={[s.input, s.inputMulti]}
                placeholder="Descripción del pedido..."
                placeholderTextColor={colors.mutedForeground}
                value={notas}
                onChangeText={setNotas}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <View style={s.modalBotones}>
                <TouchableOpacity style={[s.boton, s.botonCancelar]} onPress={() => setModalCrear(false)}>
                  <Text style={s.botonCancelarTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.boton, s.botonCrear, !numCompra.trim() && s.botonDisabled]}
                  onPress={crear}
                  disabled={!numCompra.trim()}
                >
                  <Text style={s.botonCrearTxt}>Registrar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal Detalle ── */}
      {pedidoActivo && (
        <Modal visible={modalDetalle} transparent animationType="fade" onRequestClose={() => setModalDetalle(false)}>
          <Pressable style={s.overlay} onPress={() => setModalDetalle(false)}>
            <Pressable style={s.modal} onPress={() => {}}>
              <View style={[s.detalleEstadoBanner, { backgroundColor: activo.bg }]}>
                <Feather name={activo.icono as any} size={20} color={activo.color} />
                <Text style={[s.detalleEstadoTxt, { color: activo.color }]}>{activo.label}</Text>
              </View>

              <View style={s.detalleRow}>
                <Feather name="hash" size={14} color={colors.mutedForeground} />
                <View>
                  <Text style={s.detalleLbl}>N° de compra</Text>
                  <Text style={s.detalleVal}>{pedidoActivo.numeroCompra}</Text>
                </View>
              </View>
              {pedidoActivo.numeroSeguimiento ? (
                <View style={s.detalleRow}>
                  <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                  <View>
                    <Text style={s.detalleLbl}>N° de seguimiento</Text>
                    <Text style={s.detalleVal}>{pedidoActivo.numeroSeguimiento}</Text>
                  </View>
                </View>
              ) : null}
              <View style={s.detalleRow}>
                <Feather name="calendar" size={14} color={colors.mutedForeground} />
                <View>
                  <Text style={s.detalleLbl}>Fecha de compra</Text>
                  <Text style={s.detalleVal}>{pedidoActivo.fechaCompra}</Text>
                </View>
              </View>
              {pedidoActivo.almacenNombre ? (
                <View style={s.detalleRow}>
                  <Feather name="archive" size={14} color="#16a34a" />
                  <View>
                    <Text style={s.detalleLbl}>Almacén destino</Text>
                    <Text style={[s.detalleVal, { color: "#16a34a" }]}>{pedidoActivo.almacenNombre}</Text>
                  </View>
                </View>
              ) : null}
              {pedidoActivo.notas ? (
                <View style={s.detalleRow}>
                  <Feather name="file-text" size={14} color={colors.mutedForeground} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.detalleLbl}>Notas</Text>
                    <Text style={s.detalleVal}>{pedidoActivo.notas}</Text>
                  </View>
                </View>
              ) : null}

              {sigInfo && (
                <TouchableOpacity
                  style={[s.botonAvanzar, { backgroundColor: sigInfo.color }]}
                  onPress={() => avanzarEstado(pedidoActivo)}
                >
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
                <TouchableOpacity
                  style={[s.boton, { backgroundColor: "#fee2e2" }]}
                  onPress={() => confirmarEliminar(pedidoActivo.id)}
                >
                  <Feather name="trash-2" size={15} color="#dc2626" />
                  <Text style={{ color: "#dc2626", fontWeight: "600", fontFamily: "Inter_600SemiBold" }}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ── Modal Selección Almacén ── */}
      <Modal visible={modalAlmacen} transparent animationType="fade" onRequestClose={() => setModalAlmacen(false)}>
        <Pressable style={s.overlay} onPress={() => setModalAlmacen(false)}>
          <Pressable style={s.modal} onPress={() => {}}>
            <Text style={s.sheetTitulo}>Seleccionar almacén</Text>
            <Text style={s.fieldLabel}>¿A qué almacén llega este pedido?</Text>
            {almacenes.length === 0 ? (
              <Text style={s.vacioTexto}>No hay almacenes creados. Ve a la pestaña Almacenes y crea uno primero.</Text>
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
    card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, gap: 6 },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    estadoBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    estadoBadgeTxt: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
    cardFecha: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    cardNumCompra: { fontSize: 16, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    cardSeguimiento: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    cardAlmacen: { fontSize: 12, color: "#16a34a", fontFamily: "Inter_600SemiBold" },
    progreso: { flexDirection: "row", alignItems: "center", marginTop: 6 },
    progPunto: { width: 10, height: 10, borderRadius: 5 },
    progPuntoInactivo: { backgroundColor: colors.border },
    progLinea: { flex: 1, height: 2 },
    progLineaInactiva: { backgroundColor: colors.border },
    fab: { position: "absolute", right: 20, bottom: fabBottom, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 40, gap: 10, maxHeight: "90%" },
    sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 6 },
    sheetTitulo: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", marginBottom: 4 },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.foreground, backgroundColor: colors.background, fontFamily: "Inter_400Regular", marginBottom: 10 },
    inputMulti: { height: 80, textAlignVertical: "top" },
    dateBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.background, marginBottom: 10 },
    dateBtnTxt: { fontSize: 15, fontFamily: "Inter_400Regular" },
    modal: { backgroundColor: colors.card, borderRadius: 18, padding: 20, margin: 20, gap: 12, alignSelf: "stretch" },
    detalleEstadoBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12 },
    detalleEstadoTxt: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
    detalleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 },
    detalleLbl: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    detalleVal: { fontSize: 14, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    botonAvanzar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
    botonAvanzarTxt: { fontSize: 15, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
    modalBotones: { flexDirection: "row", gap: 10 },
    boton: { flex: 1, flexDirection: "row", paddingVertical: 13, borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 6 },
    botonCancelar: { backgroundColor: colors.muted },
    botonCancelarTxt: { fontSize: 14, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
    botonCrear: { backgroundColor: colors.primary },
    botonCrearTxt: { fontSize: 14, fontWeight: "600", color: "#fff", fontFamily: "Inter_600SemiBold" },
    botonDisabled: { opacity: 0.4 },
    almacenOpcion: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
    almacenIcono: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    almacenNombre: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
  });
}

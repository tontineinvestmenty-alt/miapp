import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  Almacen,
  Articulo,
  Movimiento,
  StockEntry,
  agregarMovimiento,
  getAlmacenById,
  getArticulos,
  getHistorialAlmacen,
  getStockAlmacen,
  updateStock,
} from "@/utils/storage";

type Vista = "stock" | "historial";

export default function AlmacenDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [almacen, setAlmacen] = useState<Almacen | null>(null);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [historial, setHistorial] = useState<Movimiento[]>([]);
  const [vista, setVista] = useState<Vista>("stock");

  const [modalAgregar, setModalAgregar] = useState(false);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null);
  const [modalMovimiento, setModalMovimiento] = useState(false);
  const [tipoMov, setTipoMov] = useState<"entrada" | "salida">("entrada");
  const [cantidadTexto, setCantidadTexto] = useState("1");

  const cargar = useCallback(async () => {
    if (!id) return;
    const [alm, arts, stk, hist] = await Promise.all([
      getAlmacenById(id),
      getArticulos(),
      getStockAlmacen(id),
      getHistorialAlmacen(id),
    ]);
    setAlmacen(alm ?? null);
    setArticulos(arts);
    setStock(stk);
    setHistorial(hist);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  function articuloNombre(artId: string) {
    return articulos.find((a) => a.id === artId)?.nombre ?? artId;
  }

  const articulosDisponibles = articulos.filter(
    (a) => !stock.some((s) => s.articuloId === a.id)
  );

  function abrirAgregarArticulo() {
    if (articulosDisponibles.length === 0) {
      const msg = articulos.length === 0
        ? "Crea artículos en la pestaña Artículos primero."
        : "Todos tus artículos ya están en este almacén.";
      Alert.alert("Sin artículos disponibles", msg);
      return;
    }
    setModalAgregar(true);
  }

  function seleccionarArticulo(art: Articulo) {
    setArticuloSeleccionado(art);
    setModalAgregar(false);
    setTipoMov("entrada");
    setCantidadTexto("1");
    setModalMovimiento(true);
  }

  function abrirMovimiento(art: StockEntry, tipo: "entrada" | "salida") {
    const a = articulos.find((x) => x.id === art.articuloId);
    if (!a) return;
    setArticuloSeleccionado(a);
    setTipoMov(tipo);
    setCantidadTexto("1");
    setModalMovimiento(true);
  }

  async function confirmarMovimiento() {
    if (!articuloSeleccionado || !id) return;
    const cant = parseInt(cantidadTexto, 10);
    if (!cant || cant <= 0) return;
    const delta = tipoMov === "entrada" ? cant : -cant;
    const nuevo = await updateStock(id, articuloSeleccionado.id, delta);

    await agregarMovimiento({
      almacenId: id,
      articuloId: articuloSeleccionado.id,
      articuloNombre: articuloSeleccionado.nombre,
      tipo: tipoMov,
      cantidad: cant,
    });

    setModalMovimiento(false);
    setArticuloSeleccionado(null);
    await cargar();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function confirmarQuitarArticulo(artId: string) {
    Alert.alert("Quitar artículo", "¿Quitar este artículo del almacén? El historial se conserva.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quitar", style: "destructive", onPress: async () => {
          await updateStock(id!, artId, -99999);
          await cargar();
        }
      },
    ]);
  }

  const styles = makeStyles(colors, insets);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        {almacen?.foto ? (
          <Image source={{ uri: almacen.foto }} style={styles.headerFoto} contentFit="cover" />
        ) : null}
        <Text style={styles.headerTitulo} numberOfLines={1}>
          {almacen?.nombre ?? "Almacén"}
        </Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, vista === "stock" && styles.tabActivo]}
          onPress={() => setVista("stock")}
        >
          <Text style={[styles.tabTexto, vista === "stock" && styles.tabTextoActivo]}>Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, vista === "historial" && styles.tabActivo]}
          onPress={() => setVista("historial")}
        >
          <Text style={[styles.tabTexto, vista === "historial" && styles.tabTextoActivo]}>Historial</Text>
        </TouchableOpacity>
      </View>

      {vista === "stock" ? (
        <>
          <FlatList
            data={stock}
            keyExtractor={(item) => item.articuloId}
            contentContainerStyle={[styles.lista, stock.length === 0 && { flex: 1 }]}
            ListEmptyComponent={
              <View style={styles.vacio}>
                <Feather name="inbox" size={48} color={colors.mutedForeground} />
                <Text style={styles.vacioTitulo}>Sin artículos</Text>
                <Text style={styles.vacioTexto}>Toca + para añadir artículos a este almacén</Text>
              </View>
            }
            renderItem={({ item }) => {
              const artFoto = articulos.find(a => a.id === item.articuloId)?.foto;
              return (
              <View style={styles.artCard}>
                {artFoto ? (
                  <Image source={{ uri: artFoto }} style={styles.artFoto} contentFit="cover" />
                ) : (
                  <View style={styles.artIcono}>
                    <Feather name="box" size={18} color={colors.primary} />
                  </View>
                )}
                <View style={styles.artInfo}>
                  <Text style={styles.artNombre}>{articuloNombre(item.articuloId)}</Text>
                  <Text style={styles.artCantidad}>
                    <Text style={styles.cantNum}>{item.cantidad}</Text> unidades
                  </Text>
                </View>
                <View style={styles.artBotones}>
                  <TouchableOpacity
                    style={[styles.btnCant, styles.btnMenos]}
                    onPress={() => abrirMovimiento(item, "salida")}
                  >
                    <Feather name="minus" size={16} color={colors.destructive} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnCant, styles.btnMas]}
                    onPress={() => abrirMovimiento(item, "entrada")}
                  >
                    <Feather name="plus" size={16} color={colors.primaryForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmarQuitarArticulo(item.articuloId)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Feather name="x" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
              );
            }}
          />
          <TouchableOpacity style={styles.fab} onPress={abrirAgregarArticulo} activeOpacity={0.85}>
            <Feather name="plus" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      ) : (
        <FlatList
          data={historial}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.lista, historial.length === 0 && { flex: 1 }]}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Feather name="clock" size={48} color={colors.mutedForeground} />
              <Text style={styles.vacioTitulo}>Sin movimientos</Text>
              <Text style={styles.vacioTexto}>Aquí aparecerá el historial de entradas y salidas</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.movCard}>
              <View style={[styles.movIcono, item.tipo === "entrada" ? styles.movEntradaBg : styles.movSalidaBg]}>
                <Feather
                  name={item.tipo === "entrada" ? "arrow-down-circle" : "arrow-up-circle"}
                  size={18}
                  color={item.tipo === "entrada" ? "#16a34a" : "#dc2626"}
                />
              </View>
              <View style={styles.movInfo}>
                <Text style={styles.movNombre}>{item.articuloNombre}</Text>
                <Text style={styles.movFecha}>{item.fecha} · {item.hora}</Text>
              </View>
              <View style={styles.movDerecha}>
                <Text style={[styles.movTipo, item.tipo === "entrada" ? styles.movEntradaTexto : styles.movSalidaTexto]}>
                  {item.tipo === "entrada" ? "+" : "-"}{item.cantidad}
                </Text>
                <Text style={styles.movTipoLabel}>{item.tipo === "entrada" ? "Entrada" : "Salida"}</Text>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalAgregar} transparent animationType="fade" onRequestClose={() => setModalAgregar(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalAgregar(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitulo}>Seleccionar artículo</Text>
            <FlatList
              data={articulosDisponibles}
              keyExtractor={(a) => a.id}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.artOpcion} onPress={() => seleccionarArticulo(item)}>
                  {item.foto ? (
                    <Image source={{ uri: item.foto }} style={styles.artOpcionFoto} contentFit="cover" />
                  ) : (
                    <View style={styles.artOpcionIco}><Feather name="box" size={16} color={colors.primary} /></View>
                  )}
                  <Text style={styles.artOpcionTexto}>{item.nombre}</Text>
                  <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={[styles.boton, styles.botonCancelar]} onPress={() => setModalAgregar(false)}>
              <Text style={styles.botonCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={modalMovimiento} transparent animationType="fade" onRequestClose={() => setModalMovimiento(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalMovimiento(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitulo}>
              {tipoMov === "entrada" ? "Añadir" : "Quitar"} — {articuloSeleccionado?.nombre}
            </Text>
            <View style={styles.tipoRow}>
              <TouchableOpacity
                style={[styles.tipoBtn, tipoMov === "entrada" && styles.tipoBtnEntrada]}
                onPress={() => setTipoMov("entrada")}
              >
                <Feather name="arrow-down-circle" size={15} color={tipoMov === "entrada" ? "#16a34a" : colors.mutedForeground} />
                <Text style={[styles.tipoBtnTexto, tipoMov === "entrada" && { color: "#16a34a", fontWeight: "700" }]}>Entrada</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tipoBtn, tipoMov === "salida" && styles.tipoBtnSalida]}
                onPress={() => setTipoMov("salida")}
              >
                <Feather name="arrow-up-circle" size={15} color={tipoMov === "salida" ? "#dc2626" : colors.mutedForeground} />
                <Text style={[styles.tipoBtnTexto, tipoMov === "salida" && { color: "#dc2626", fontWeight: "700" }]}>Salida</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cantRow}>
              <TouchableOpacity
                style={styles.cantBtn}
                onPress={() => {
                  const v = Math.max(1, parseInt(cantidadTexto || "1", 10) - 1);
                  setCantidadTexto(String(v));
                }}
              >
                <Feather name="minus" size={20} color={colors.foreground} />
              </TouchableOpacity>
              <TextInput
                style={styles.cantInput}
                value={cantidadTexto}
                onChangeText={(t) => setCantidadTexto(t.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                textAlign="center"
                selectTextOnFocus
              />
              <TouchableOpacity
                style={styles.cantBtn}
                onPress={() => {
                  const v = parseInt(cantidadTexto || "0", 10) + 1;
                  setCantidadTexto(String(v));
                }}
              >
                <Feather name="plus" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBotones}>
              <TouchableOpacity style={[styles.boton, styles.botonCancelar]} onPress={() => setModalMovimiento(false)}>
                <Text style={styles.botonCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.boton, tipoMov === "entrada" ? styles.botonEntrada : styles.botonSalida,
                  (!cantidadTexto || parseInt(cantidadTexto) <= 0) && styles.botonDeshabilitado]}
                onPress={confirmarMovimiento}
                disabled={!cantidadTexto || parseInt(cantidadTexto) <= 0}
              >
                <Text style={styles.botonCrearTexto}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
    backBtn: { padding: 4 },
    headerFoto: { width: 32, height: 32, borderRadius: 8 },
    headerTitulo: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    tabs: { flexDirection: "row", backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
    tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
    tabActivo: { borderBottomWidth: 2, borderBottomColor: colors.primary },
    tabTexto: { fontSize: 14, fontWeight: "500", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
    tabTextoActivo: { color: colors.primary },
    lista: { padding: 16, paddingBottom: 100 },
    vacio: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
    vacioTitulo: { fontSize: 18, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    vacioTexto: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 32, fontFamily: "Inter_400Regular" },
    artCard: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, gap: 10 },
    artIcono: { width: 38, height: 38, borderRadius: 9, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    artFoto: { width: 38, height: 38, borderRadius: 9 },
    artInfo: { flex: 1 },
    artNombre: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    artCantidad: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, fontFamily: "Inter_400Regular" },
    cantNum: { fontWeight: "700", color: colors.foreground },
    artBotones: { flexDirection: "row", alignItems: "center", gap: 6 },
    btnCant: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    btnMenos: { backgroundColor: "#fee2e2" },
    btnMas: { backgroundColor: colors.primary },
    movCard: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, gap: 10 },
    movIcono: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    movEntradaBg: { backgroundColor: "#dcfce7" },
    movSalidaBg: { backgroundColor: "#fee2e2" },
    movInfo: { flex: 1 },
    movNombre: { fontSize: 14, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    movFecha: { fontSize: 11, color: colors.mutedForeground, marginTop: 2, fontFamily: "Inter_400Regular" },
    movDerecha: { alignItems: "flex-end" },
    movTipo: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
    movEntradaTexto: { color: "#16a34a" },
    movSalidaTexto: { color: "#dc2626" },
    movTipoLabel: { fontSize: 10, color: colors.mutedForeground, marginTop: 2, fontFamily: "Inter_400Regular" },
    fab: { position: "absolute", right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
    modal: { backgroundColor: colors.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 380, gap: 14 },
    modalTitulo: { fontSize: 17, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    artOpcion: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
    artOpcionFoto: { width: 32, height: 32, borderRadius: 7 },
    artOpcionIco: { width: 32, height: 32, borderRadius: 7, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    artOpcionTexto: { flex: 1, fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular" },
    tipoRow: { flexDirection: "row", gap: 10 },
    tipoBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.muted },
    tipoBtnEntrada: { borderColor: "#16a34a", backgroundColor: "#dcfce7" },
    tipoBtnSalida: { borderColor: "#dc2626", backgroundColor: "#fee2e2" },
    tipoBtnTexto: { fontSize: 13, fontWeight: "500", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
    cantRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    cantBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
    cantInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, fontSize: 22, fontWeight: "700", color: colors.foreground, backgroundColor: colors.background, fontFamily: "Inter_700Bold" },
    modalBotones: { flexDirection: "row", gap: 10 },
    boton: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: "center" },
    botonCancelar: { backgroundColor: colors.muted },
    botonCancelarTexto: { fontSize: 15, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
    botonEntrada: { backgroundColor: "#16a34a" },
    botonSalida: { backgroundColor: "#dc2626" },
    botonCrearTexto: { fontSize: 15, fontWeight: "600", color: "#fff", fontFamily: "Inter_600SemiBold" },
    botonDeshabilitado: { opacity: 0.4 },
  });
}

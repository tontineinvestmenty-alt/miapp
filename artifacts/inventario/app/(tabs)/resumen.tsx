import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  Articulo,
  getAlmacenes,
  getArticulos,
  getStock,
} from "@/utils/storage";

interface FilaResumen {
  articulo: Articulo;
  totalUnidades: number;
  valorTotal: number;
}

const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : 49;

function fmt(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ResumenScreen() {
  const colors = useColors();
  const [filas, setFilas] = useState<FilaResumen[]>([]);
  const [totalUnidades, setTotalUnidades] = useState(0);
  const [totalValor, setTotalValor] = useState(0);
  const [numAlmacenes, setNumAlmacenes] = useState(0);
  const [modalUnidades, setModalUnidades] = useState(false);

  useFocusEffect(
    useCallback(() => {
      calcular();
    }, [])
  );

  async function calcular() {
    const [articulos, almacenes, stock] = await Promise.all([
      getArticulos(),
      getAlmacenes(),
      getStock(),
    ]);
    setNumAlmacenes(almacenes.length);

    const map: Record<string, number> = {};
    for (const [k, cant] of Object.entries(stock)) {
      const artId = k.split("::")[1];
      map[artId] = (map[artId] ?? 0) + cant;
    }

    const rows: FilaResumen[] = articulos.map((art) => {
      const unidades = map[art.id] ?? 0;
      const valor = unidades * (art.precio ?? 0);
      return { articulo: art, totalUnidades: unidades, valorTotal: valor };
    });

    rows.sort((a, b) => b.valorTotal - a.valorTotal);

    const tu = rows.reduce((s, r) => s + r.totalUnidades, 0);
    const tv = rows.reduce((s, r) => s + r.valorTotal, 0);
    setFilas(rows);
    setTotalUnidades(tu);
    setTotalValor(tv);
  }

  // sorted by units for the modal
  const filasPorUnidades = [...filas].sort((a, b) => b.totalUnidades - a.totalUnidades);

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: TAB_BAR_HEIGHT + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          {/* Almacenes — static */}
          <View style={[styles.statCard, { flex: 1 }]}>
            <Feather name="archive" size={20} color={colors.primary} />
            <Text style={styles.statNum}>{numAlmacenes}</Text>
            <Text style={styles.statLabel}>Almacenes</Text>
          </View>

          {/* Unidades — tappable */}
          <TouchableOpacity
            style={[styles.statCard, styles.statCardTap, { flex: 1 }]}
            onPress={() => setModalUnidades(true)}
            activeOpacity={0.75}
          >
            <Feather name="layers" size={20} color={colors.primary} />
            <Text style={styles.statNum}>{totalUnidades.toLocaleString("es-ES")}</Text>
            <Text style={styles.statLabel}>Unidades totales</Text>
            <View style={styles.statTapHint}>
              <Feather name="list" size={10} color={colors.primary} />
              <Text style={styles.statTapTxt}>Ver lista</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.valorCard}>
          <View style={styles.valorCardTop}>
            <Feather name="trending-up" size={22} color="#fff" />
            <Text style={styles.valorCardLabel}>Valor total del inventario</Text>
          </View>
          <Text style={styles.valorCardNum}>${fmt(totalValor)}</Text>
          <Text style={styles.valorCardSub}>USD · suma de todos los almacenes</Text>
        </View>

        <Text style={styles.seccionTitulo}>Por artículo</Text>

        {filas.length === 0 ? (
          <View style={styles.vacio}>
            <Feather name="bar-chart-2" size={44} color={colors.mutedForeground} />
            <Text style={styles.vacioTitulo}>Sin datos</Text>
            <Text style={styles.vacioTexto}>
              Añade artículos y stock para ver el resumen
            </Text>
          </View>
        ) : (
          filas.map((fila) => (
            <View key={fila.articulo.id} style={styles.filaCard}>
              {fila.articulo.foto ? (
                <Image source={{ uri: fila.articulo.foto }} style={styles.fotoMini} contentFit="cover" />
              ) : (
                <View style={styles.iconoArt}>
                  <Feather name="box" size={18} color={colors.primary} />
                </View>
              )}
              <View style={styles.filaInfo}>
                <Text style={styles.filaNombre}>{fila.articulo.nombre}</Text>
                <Text style={styles.filaDetalle}>
                  {fila.totalUnidades.toLocaleString("es-ES")} uds
                  {fila.articulo.precio != null
                    ? ` · $${fmt(fila.articulo.precio)} c/u`
                    : " · sin precio"}
                </Text>
              </View>
              <View style={styles.filaValor}>
                <Text style={styles.filaValorNum}>
                  {fila.articulo.precio != null ? `$${fmt(fila.valorTotal)}` : "—"}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Modal unidades por artículo ── */}
      <Modal
        visible={modalUnidades}
        transparent
        animationType="slide"
        onRequestClose={() => setModalUnidades(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalUnidades(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitulo}>Unidades por artículo</Text>
                <Text style={styles.sheetSub}>
                  {totalUnidades.toLocaleString("es-ES")} uds en total · {filas.length} artículos
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalUnidades(false)} style={styles.cerrarBtn}>
                <Feather name="x" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={filasPorUnidades}
              keyExtractor={(f) => f.articulo.id}
              showsVerticalScrollIndicator={false}
              style={styles.modalLista}
              ListEmptyComponent={
                <View style={styles.modalVacio}>
                  <Feather name="inbox" size={36} color={colors.mutedForeground} />
                  <Text style={styles.modalVacioTxt}>Sin artículos con stock</Text>
                </View>
              }
              renderItem={({ item, index }) => {
                const pct = totalUnidades > 0 ? item.totalUnidades / totalUnidades : 0;
                return (
                  <View style={styles.modalFila}>
                    <Text style={styles.modalRank}>#{index + 1}</Text>
                    {item.articulo.foto ? (
                      <Image source={{ uri: item.articulo.foto }} style={styles.modalFoto} contentFit="cover" />
                    ) : (
                      <View style={styles.modalIcono}>
                        <Feather name="box" size={16} color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.modalFilaInfo}>
                      <View style={styles.modalFilaTop}>
                        <Text style={styles.modalNombre} numberOfLines={1}>{item.articulo.nombre}</Text>
                        <Text style={styles.modalUds}>
                          {item.totalUnidades.toLocaleString("es-ES")} uds
                        </Text>
                      </View>
                      <View style={styles.barraFondo}>
                        <View style={[styles.barraRelleno, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: colors.primary }]} />
                      </View>
                      <Text style={styles.modalPct}>{Math.round(pct * 100)}% del total</Text>
                    </View>
                  </View>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 16, gap: 12 },
    statsRow: { flexDirection: "row", gap: 10 },
    statCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statCardTap: {
      borderColor: colors.primary,
      borderWidth: 1.5,
    },
    statNum: { fontSize: 26, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    statLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    statTapHint: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
    statTapTxt: { fontSize: 10, color: colors.primary, fontFamily: "Inter_600SemiBold" },
    valorCard: { backgroundColor: colors.primary, borderRadius: 16, padding: 20, gap: 6 },
    valorCardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
    valorCardLabel: { fontSize: 14, color: "rgba(255,255,255,0.85)", fontFamily: "Inter_600SemiBold" },
    valorCardNum: { fontSize: 36, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
    valorCardSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular" },
    seccionTitulo: { fontSize: 16, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", marginTop: 4 },
    vacio: { alignItems: "center", paddingTop: 40, gap: 10 },
    vacioTitulo: { fontSize: 18, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    vacioTexto: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 32, fontFamily: "Inter_400Regular" },
    filaCard: { backgroundColor: colors.card, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, gap: 10 },
    fotoMini: { width: 42, height: 42, borderRadius: 9 },
    iconoArt: { width: 42, height: 42, borderRadius: 9, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    filaInfo: { flex: 1 },
    filaNombre: { fontSize: 14, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    filaDetalle: { fontSize: 11, color: colors.mutedForeground, marginTop: 2, fontFamily: "Inter_400Regular" },
    filaValor: { alignItems: "flex-end" },
    filaValorNum: { fontSize: 15, fontWeight: "700", color: colors.primary, fontFamily: "Inter_700Bold" },
    // Modal
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 40, maxHeight: "85%" },
    sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 },
    sheetHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
    sheetTitulo: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    sheetSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, fontFamily: "Inter_400Regular" },
    cerrarBtn: { padding: 4 },
    modalLista: { flexGrow: 0 },
    modalVacio: { alignItems: "center", paddingVertical: 40, gap: 10 },
    modalVacioTxt: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    modalFila: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
    modalRank: { fontSize: 12, fontWeight: "700", color: colors.mutedForeground, fontFamily: "Inter_700Bold", width: 24, textAlign: "center" },
    modalFoto: { width: 38, height: 38, borderRadius: 8 },
    modalIcono: { width: 38, height: 38, borderRadius: 8, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    modalFilaInfo: { flex: 1, gap: 4 },
    modalFilaTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    modalNombre: { fontSize: 14, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
    modalUds: { fontSize: 14, fontWeight: "700", color: colors.primary, fontFamily: "Inter_700Bold" },
    barraFondo: { height: 5, backgroundColor: colors.muted, borderRadius: 3, overflow: "hidden" },
    barraRelleno: { height: 5, borderRadius: 3 },
    modalPct: { fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });
}

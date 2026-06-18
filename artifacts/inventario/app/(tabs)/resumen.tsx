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
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { exportarArchivoBackup, seleccionarArchivoBackup } from "@/utils/backup";
import { Sounds } from "@/utils/sounds";
import {
  Articulo,
  BackupData,
  exportarTexto,
  getAlmacenes,
  getArticulos,
  getStock,
  registrarActividad,
  restaurarBackup,
} from "@/utils/storage";

interface FilaResumen {
  articulo: Articulo;
  totalUnidades: number;
  valorTotal: number;
}

const TAB_BAR_HEIGHT = Platform.OS === "web" ? 96 : 100;

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
  const [exportando, setExportando] = useState(false);
  const [modalExport, setModalExport] = useState(false);
  const [textoExport, setTextoExport] = useState("");
  const [backupExportando, setBackupExportando] = useState(false);
  const [backupImportando, setBackupImportando] = useState(false);
  const [backupPendiente, setBackupPendiente] = useState<BackupData | null>(null);
  const [modalConfirmRestore, setModalConfirmRestore] = useState(false);
  const [mensajeBackup, setMensajeBackup] = useState<{ ok: boolean; texto: string } | null>(null);

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

  async function compartir() {
    setExportando(true);
    try {
      const texto = await exportarTexto();
      if (Platform.OS === "web") {
        setTextoExport(texto);
        setModalExport(true);
      } else {
        await Share.share({ message: texto, title: "Inventario" });
      }
    } finally {
      setExportando(false);
    }
  }

  async function copiarAlPortapapeles() {
    try {
      await navigator.clipboard.writeText(textoExport);
    } catch {}
    setModalExport(false);
  }

  async function hacerExportBackup() {
    setBackupExportando(true);
    setMensajeBackup(null);
    try {
      await exportarArchivoBackup();
      Sounds.backup();
      setMensajeBackup({ ok: true, texto: "Backup exportado correctamente." });
    } catch {
      setMensajeBackup({ ok: false, texto: "Error al exportar el backup." });
    } finally {
      setBackupExportando(false);
    }
  }

  async function seleccionarBackup() {
    setBackupImportando(true);
    setMensajeBackup(null);
    try {
      const data = await seleccionarArchivoBackup();
      if (!data) { setBackupImportando(false); return; }
      setBackupPendiente(data);
      setModalConfirmRestore(true);
    } catch {
      setMensajeBackup({ ok: false, texto: "No se pudo leer el archivo." });
    } finally {
      setBackupImportando(false);
    }
  }

  async function confirmarRestaurar() {
    if (!backupPendiente) return;
    setModalConfirmRestore(false);
    setMensajeBackup(null);
    try {
      await restaurarBackup(backupPendiente);
      await registrarActividad({ tipo: "sistema", accion: "restaurar", titulo: "Backup restaurado", detalle: "Todos los datos fueron reemplazados" });
      setBackupPendiente(null);
      calcular();
      Sounds.backup();
      setMensajeBackup({ ok: true, texto: "Backup restaurado. Todos los datos han sido reemplazados." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setMensajeBackup({ ok: false, texto: `Error: ${msg}` });
    }
  }

  const filasPorUnidades = [...filas].sort((a, b) => b.totalUnidades - a.totalUnidades);
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Feather name="archive" size={20} color={colors.primary} />
            <Text style={styles.statNum}>{numAlmacenes}</Text>
            <Text style={styles.statLabel}>Almacenes</Text>
          </View>

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

        {/* ── Sección Backup ── */}
        <Text style={styles.seccionTitulo}>Copia de seguridad</Text>

        {mensajeBackup && (
          <View style={[styles.mensajeBackup, { backgroundColor: mensajeBackup.ok ? colors.secondary : "#fef2f2", borderColor: mensajeBackup.ok ? colors.primary : colors.destructive }]}>
            <Feather name={mensajeBackup.ok ? "check-circle" : "alert-circle"} size={16} color={mensajeBackup.ok ? colors.primary : colors.destructive} />
            <Text style={[styles.mensajeBackupTxt, { color: mensajeBackup.ok ? colors.primary : colors.destructive }]}>{mensajeBackup.texto}</Text>
          </View>
        )}

        <View style={styles.backupCard}>
          <View style={styles.backupFila}>
            <View style={[styles.backupIconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="download" size={20} color={colors.primary} />
            </View>
            <View style={styles.backupTexto}>
              <Text style={styles.backupTitulo}>Exportar backup</Text>
              <Text style={styles.backupSub}>Descarga un archivo .json con todos los datos</Text>
            </View>
            <TouchableOpacity
              style={[styles.backupBtn, { backgroundColor: colors.primary }]}
              onPress={hacerExportBackup}
              disabled={backupExportando}
              activeOpacity={0.8}
            >
              <Text style={styles.backupBtnTxt}>{backupExportando ? "…" : "Exportar"}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.backupDivisor, { backgroundColor: colors.border }]} />

          <View style={styles.backupFila}>
            <View style={[styles.backupIconWrap, { backgroundColor: "#fff7ed" }]}>
              <Feather name="upload" size={20} color="#ea580c" />
            </View>
            <View style={styles.backupTexto}>
              <Text style={styles.backupTitulo}>Restaurar backup</Text>
              <Text style={styles.backupSub}>Carga un archivo .json y reemplaza los datos</Text>
            </View>
            <TouchableOpacity
              style={[styles.backupBtn, { backgroundColor: "#ea580c" }]}
              onPress={seleccionarBackup}
              disabled={backupImportando}
              activeOpacity={0.8}
            >
              <Text style={styles.backupBtnTxt}>{backupImportando ? "…" : "Cargar"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* FAB Compartir */}
      <TouchableOpacity
        style={styles.fabCompartir}
        onPress={compartir}
        activeOpacity={0.85}
        disabled={exportando}
      >
        <Feather name={exportando ? "loader" : "share-2"} size={18} color="#fff" />
        <Text style={styles.fabCompartirTxt}>{exportando ? "Exportando…" : "Exportar"}</Text>
      </TouchableOpacity>

      {/* ── Modal Confirmar Restaurar ── */}
      <Modal visible={modalConfirmRestore} transparent animationType="fade" onRequestClose={() => setModalConfirmRestore(false)}>
        <Pressable style={styles.overlayCenter} onPress={() => { setModalConfirmRestore(false); setBackupPendiente(null); }}>
          <Pressable style={styles.confirmCard} onPress={() => {}}>
            <View style={styles.confirmIcono}>
              <Feather name="alert-triangle" size={28} color="#ea580c" />
            </View>
            <Text style={styles.confirmTitulo}>Restaurar backup</Text>
            <Text style={styles.confirmMensaje}>
              {`Esto reemplazará TODOS los datos actuales (almacenes, artículos, pedidos, stock) con los del archivo seleccionado.\n\nExportado el: ${backupPendiente ? new Date(backupPendiente.exportadoEn).toLocaleString("es-ES") : ""}`}
            </Text>
            <View style={styles.confirmBotones}>
              <TouchableOpacity style={styles.btnCancelar} onPress={() => { setModalConfirmRestore(false); setBackupPendiente(null); }}>
                <Text style={styles.btnCancelarTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnRestaurar} onPress={confirmarRestaurar}>
                <Text style={styles.btnRestaurarTxt}>Restaurar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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

      {/* ── Modal Exportar (web) ── */}
      <Modal
        visible={modalExport}
        transparent
        animationType="fade"
        onRequestClose={() => setModalExport(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalExport(false)}>
          <Pressable style={styles.exportModal} onPress={() => {}}>
            <View style={styles.exportHeader}>
              <Text style={styles.sheetTitulo}>Exportar inventario</Text>
              <TouchableOpacity onPress={() => setModalExport(false)} style={styles.cerrarBtn}>
                <Feather name="x" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.exportScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.exportTexto}>{textoExport}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.copiarBtn} onPress={copiarAlPortapapeles}>
              <Feather name="copy" size={16} color="#fff" />
              <Text style={styles.copiarBtnTxt}>Copiar al portapapeles</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  const cardShadow = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  };
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 16, gap: 14, paddingBottom: TAB_BAR_HEIGHT + 20 },
    statsRow: { flexDirection: "row", gap: 12 },
    statCard: { backgroundColor: colors.card, borderRadius: 18, padding: 18, alignItems: "center", gap: 6, ...cardShadow },
    statCardTap: { borderWidth: 2, borderColor: colors.primary },
    statNum: { fontSize: 30, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    statLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    statTapHint: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
    statTapTxt: { fontSize: 10, color: colors.primary, fontFamily: "Inter_600SemiBold" },
    valorCard: {
      backgroundColor: colors.primary, borderRadius: 22, padding: 22, gap: 6,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
    valorCardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
    valorCardLabel: { fontSize: 14, color: "rgba(255,255,255,0.85)", fontFamily: "Inter_600SemiBold" },
    valorCardNum: { fontSize: 42, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: -1 },
    valorCardSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular" },
    seccionTitulo: { fontSize: 17, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", marginTop: 4 },
    vacio: { alignItems: "center", paddingTop: 40, gap: 12 },
    vacioTitulo: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    vacioTexto: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 32, fontFamily: "Inter_400Regular", lineHeight: 20 },
    filaCard: { backgroundColor: colors.card, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, ...cardShadow },
    fotoMini: { width: 46, height: 46, borderRadius: 13 },
    iconoArt: { width: 46, height: 46, borderRadius: 13, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    filaInfo: { flex: 1 },
    filaNombre: { fontSize: 15, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    filaDetalle: { fontSize: 11, color: colors.mutedForeground, marginTop: 3, fontFamily: "Inter_400Regular" },
    filaValor: { alignItems: "flex-end" },
    filaValorNum: { fontSize: 16, fontWeight: "700", color: colors.primary, fontFamily: "Inter_700Bold" },
    fabCompartir: {
      position: "absolute", right: 20, bottom: TAB_BAR_HEIGHT + 10,
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 20, paddingVertical: 14, borderRadius: 28,
      backgroundColor: "#2f9e44",
      shadowColor: "#2f9e44",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    fabCompartirTxt: { fontSize: 14, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
    // Modal unidades
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: "85%" },
    sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 },
    sheetHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
    sheetTitulo: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    sheetSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 3, fontFamily: "Inter_400Regular" },
    cerrarBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
    modalLista: { flexGrow: 0 },
    modalVacio: { alignItems: "center", paddingVertical: 40, gap: 10 },
    modalVacioTxt: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    modalFila: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
    modalRank: { fontSize: 12, fontWeight: "700", color: colors.mutedForeground, fontFamily: "Inter_700Bold", width: 26, textAlign: "center" },
    modalFoto: { width: 40, height: 40, borderRadius: 10 },
    modalIcono: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    modalFilaInfo: { flex: 1, gap: 5 },
    modalFilaTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    modalNombre: { fontSize: 14, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
    modalUds: { fontSize: 15, fontWeight: "700", color: colors.primary, fontFamily: "Inter_700Bold" },
    barraFondo: { height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: "hidden" },
    barraRelleno: { height: 6, borderRadius: 3 },
    modalPct: { fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    // Modal exportar
    exportModal: { backgroundColor: colors.card, borderRadius: 24, padding: 22, width: "100%", maxWidth: 460, maxHeight: "80%", gap: 14, alignSelf: "center", marginHorizontal: 20 },
    exportHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    exportScroll: { maxHeight: 340, backgroundColor: colors.muted, borderRadius: 14, padding: 16 },
    exportTexto: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    copiarBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#2f9e44", borderRadius: 14, paddingVertical: 14 },
    copiarBtnTxt: { fontSize: 15, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
    // Backup
    backupCard: { backgroundColor: colors.card, borderRadius: 18, overflow: "hidden", ...cardShadow },
    backupFila: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
    backupIconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    backupTexto: { flex: 1 },
    backupTitulo: { fontSize: 15, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    backupSub: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 3 },
    backupBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
    backupBtnTxt: { fontSize: 13, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
    backupDivisor: { height: 1, marginHorizontal: 16, backgroundColor: colors.border },
    mensajeBackup: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1.5, padding: 14 },
    mensajeBackupTxt: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
    // Modal confirmar restaurar
    overlayCenter: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
    confirmCard: { backgroundColor: colors.card, borderRadius: 24, padding: 26, width: "100%", maxWidth: 380, gap: 14, alignItems: "center", ...cardShadow },
    confirmIcono: { width: 64, height: 64, borderRadius: 22, backgroundColor: "#fff7ed", alignItems: "center", justifyContent: "center" },
    confirmTitulo: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", textAlign: "center" },
    confirmMensaje: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
    confirmBotones: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
    btnCancelar: { flex: 1, backgroundColor: colors.muted, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
    btnCancelarTxt: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    btnRestaurar: { flex: 1, backgroundColor: "#e8590c", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
    btnRestaurarTxt: { fontSize: 15, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
  });
}

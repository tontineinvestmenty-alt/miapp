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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { Articulo, genId, fechaHoy, getArticulos, saveArticulos } from "@/utils/storage";

export default function ArticulosScreen() {
  const colors = useColors();
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");

  useFocusEffect(
    useCallback(() => {
      getArticulos().then(setArticulos);
    }, [])
  );

  function abrirModal() {
    setNuevoNombre("");
    setModalVisible(true);
  }

  async function crear() {
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    const nuevo: Articulo = { id: genId(), nombre, creadoEn: fechaHoy() };
    const lista = [nuevo, ...articulos];
    setArticulos(lista);
    await saveArticulos(lista);
    setModalVisible(false);
    setNuevoNombre("");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function confirmarEliminar(id: string, nombre: string) {
    Alert.alert("Eliminar artículo", `¿Seguro que quieres eliminar "${nombre}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => eliminar(id) },
    ]);
  }

  async function eliminar(id: string) {
    const lista = articulos.filter((a) => a.id !== id);
    setArticulos(lista);
    await saveArticulos(lista);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <FlatList
        data={articulos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.lista, { paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0) }]}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Feather name="box" size={52} color={colors.mutedForeground} />
            <Text style={styles.vacioTitulo}>Sin artículos</Text>
            <Text style={styles.vacioTexto}>
              Toca el botón + para crear tu primer artículo
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.tarjeta}>
            <View style={styles.icono}>
              <Feather name="box" size={20} color={colors.primary} />
            </View>
            <View style={styles.tarjetaInfo}>
              <Text style={styles.tarjetaNombre}>{item.nombre}</Text>
              <Text style={styles.tarjetaFecha}>Creado: {item.creadoEn}</Text>
            </View>
            <TouchableOpacity
              onPress={() => confirmarEliminar(item.id, item.nombre)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="trash-2" size={17} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={abrirModal} activeOpacity={0.85}>
        <Feather name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitulo}>Nuevo artículo</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del artículo"
              placeholderTextColor={colors.mutedForeground}
              value={nuevoNombre}
              onChangeText={setNuevoNombre}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={crear}
              maxLength={60}
            />
            <View style={styles.modalBotones}>
              <TouchableOpacity style={[styles.boton, styles.botonCancelar]} onPress={() => setModalVisible(false)}>
                <Text style={styles.botonCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.boton, styles.botonCrear, !nuevoNombre.trim() && styles.botonDeshabilitado]}
                onPress={crear}
                disabled={!nuevoNombre.trim()}
              >
                <Text style={styles.botonCrearTexto}>Crear</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    lista: { padding: 16, flexGrow: 1 },
    vacio: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
    vacioTitulo: { fontSize: 20, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    vacioTexto: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 32, fontFamily: "Inter_400Regular" },
    tarjeta: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, gap: 12 },
    icono: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    tarjetaInfo: { flex: 1 },
    tarjetaNombre: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    tarjetaFecha: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, fontFamily: "Inter_400Regular" },
    fab: { position: "absolute", right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
    modal: { backgroundColor: colors.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 380, gap: 16 },
    modalTitulo: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.foreground, backgroundColor: colors.background, fontFamily: "Inter_400Regular" },
    modalBotones: { flexDirection: "row", gap: 10 },
    boton: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: "center" },
    botonCancelar: { backgroundColor: colors.muted },
    botonCancelarTexto: { fontSize: 15, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
    botonCrear: { backgroundColor: colors.primary },
    botonCrearTexto: { fontSize: 15, fontWeight: "600", color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
    botonDeshabilitado: { opacity: 0.4 },
  });
}

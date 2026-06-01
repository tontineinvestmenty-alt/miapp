import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
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

const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : 49;

function fmtPrecio(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ArticulosScreen() {
  const colors = useColors();
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<Articulo | null>(null);
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [fotoUri, setFotoUri] = useState<string | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      getArticulos().then(setArticulos);
    }, [])
  );

  function abrirCrear() {
    setEditando(null);
    setNombre("");
    setPrecio("");
    setFotoUri(undefined);
    setModalVisible(true);
  }

  function abrirEditar(art: Articulo) {
    setEditando(art);
    setNombre(art.nombre);
    setPrecio(art.precio != null ? String(art.precio) : "");
    setFotoUri(art.foto);
    setModalVisible(true);
  }

  async function elegirFoto() {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso necesario", "Necesitamos acceso a tu galería para añadir fotos.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      setFotoUri(result.assets[0].uri);
    }
  }

  function quitarFoto() {
    Alert.alert("Quitar foto", "¿Quitar la foto de este artículo?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Quitar", style: "destructive", onPress: () => setFotoUri(undefined) },
    ]);
  }

  async function guardar() {
    const nombreFinal = nombre.trim();
    if (!nombreFinal) return;
    const precioNum = precio.trim() ? parseFloat(precio.replace(",", ".")) : undefined;
    const precioFinal = precioNum && !isNaN(precioNum) ? precioNum : undefined;

    let lista: Articulo[];
    if (editando) {
      lista = articulos.map((a) =>
        a.id === editando.id
          ? { ...a, nombre: nombreFinal, foto: fotoUri, precio: precioFinal }
          : a
      );
    } else {
      const nuevo: Articulo = {
        id: genId(),
        nombre: nombreFinal,
        foto: fotoUri,
        precio: precioFinal,
        creadoEn: fechaHoy(),
      };
      lista = [nuevo, ...articulos];
    }

    setArticulos(lista);
    await saveArticulos(lista);
    setModalVisible(false);
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function confirmarEliminar(id: string, nombreArt: string) {
    Alert.alert("Eliminar artículo", `¿Seguro que quieres eliminar "${nombreArt}"?`, [
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

  const fabBottom = TAB_BAR_HEIGHT + 16;
  const styles = makeStyles(colors, fabBottom);
  const modoEditar = editando !== null;

  return (
    <View style={styles.container}>
      <FlatList
        data={articulos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.lista, articulos.length === 0 && { flex: 1 }]}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Feather name="box" size={52} color={colors.mutedForeground} />
            <Text style={styles.vacioTitulo}>Sin artículos</Text>
            <Text style={styles.vacioTexto}>
              Toca el botón azul + para crear tu primer artículo
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.tarjeta}>
            <TouchableOpacity onPress={() => abrirEditar(item)} activeOpacity={0.8}>
              {item.foto ? (
                <Image source={{ uri: item.foto }} style={styles.fotoMiniatura} contentFit="cover" />
              ) : (
                <View style={styles.icono}>
                  <Feather name="box" size={20} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.tarjetaInfo}>
              <Text style={styles.tarjetaNombre}>{item.nombre}</Text>
              <Text style={styles.tarjetaFecha}>
                {item.precio != null
                  ? `$${fmtPrecio(item.precio)} USD · ${item.creadoEn}`
                  : `Sin precio · ${item.creadoEn}`}
              </Text>
            </View>
            <View style={styles.acciones}>
              <TouchableOpacity
                onPress={() => abrirEditar(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              >
                <Feather name="edit-2" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmarEliminar(item.id, item.nombre)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={abrirCrear} activeOpacity={0.85}>
        <Feather name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>
                {modoEditar ? "Editar artículo" : "Nuevo artículo"}
              </Text>
              {modoEditar && (
                <View style={styles.editBadge}>
                  <Feather name="edit-2" size={11} color={colors.primary} />
                  <Text style={styles.editBadgeTxt}>Editando</Text>
                </View>
              )}
            </View>

            {/* Foto */}
            <View style={styles.fotoRow}>
              <TouchableOpacity style={styles.fotoPickerArea} onPress={elegirFoto} activeOpacity={0.8}>
                {fotoUri ? (
                  <Image source={{ uri: fotoUri }} style={styles.fotoPreview} contentFit="cover" />
                ) : (
                  <View style={styles.fotoPlaceholder}>
                    <Feather name="camera" size={26} color={colors.mutedForeground} />
                    <Text style={styles.fotoPlaceholderTexto}>Añadir foto</Text>
                  </View>
                )}
                <View style={styles.fotoEditar}>
                  <Feather name={fotoUri ? "edit-2" : "plus"} size={12} color="#fff" />
                </View>
              </TouchableOpacity>
              {fotoUri && (
                <TouchableOpacity style={styles.quitarFotoBtn} onPress={quitarFoto}>
                  <Feather name="x" size={13} color={colors.destructive} />
                  <Text style={styles.quitarFotoTxt}>Quitar foto</Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nombre del artículo"
              placeholderTextColor={colors.mutedForeground}
              value={nombre}
              onChangeText={setNombre}
              autoFocus
              returnKeyType="next"
              maxLength={60}
            />

            <View style={styles.precioRow}>
              <Text style={styles.precioSimbolo}>$</Text>
              <TextInput
                style={[styles.input, styles.precioInput]}
                placeholder="Precio en USD (opcional)"
                placeholderTextColor={colors.mutedForeground}
                value={precio}
                onChangeText={(t) => setPrecio(t.replace(/[^0-9.,]/g, ""))}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={guardar}
              />
            </View>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={[styles.boton, styles.botonCancelar]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.botonCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.boton, styles.botonCrear, !nombre.trim() && styles.botonDeshabilitado]}
                onPress={guardar}
                disabled={!nombre.trim()}
              >
                <Feather
                  name={modoEditar ? "check" : "plus"}
                  size={15}
                  color="#fff"
                />
                <Text style={styles.botonCrearTexto}>
                  {modoEditar ? "Guardar" : "Crear"}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, fabBottom: number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    lista: { padding: 16, paddingBottom: TAB_BAR_HEIGHT + 80 },
    vacio: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
    vacioTitulo: { fontSize: 20, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    vacioTexto: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 32, fontFamily: "Inter_400Regular" },
    tarjeta: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, gap: 12 },
    fotoMiniatura: { width: 44, height: 44, borderRadius: 10 },
    icono: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    tarjetaInfo: { flex: 1 },
    tarjetaNombre: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    tarjetaFecha: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, fontFamily: "Inter_400Regular" },
    acciones: { flexDirection: "row", alignItems: "center", gap: 14 },
    fab: { position: "absolute", right: 20, bottom: fabBottom, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
    modal: { backgroundColor: colors.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 380, gap: 14 },
    modalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    modalTitulo: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", flex: 1 },
    editBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    editBadgeTxt: { fontSize: 11, fontWeight: "600", color: colors.primary, fontFamily: "Inter_600SemiBold" },
    fotoRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    fotoPickerArea: { position: "relative" },
    fotoPlaceholder: { width: 90, height: 90, borderRadius: 12, backgroundColor: colors.muted, borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 6 },
    fotoPlaceholderTexto: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    fotoPreview: { width: 90, height: 90, borderRadius: 12 },
    fotoEditar: { position: "absolute", bottom: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    quitarFotoBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
    quitarFotoTxt: { fontSize: 13, color: colors.destructive, fontFamily: "Inter_400Regular" },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.foreground, backgroundColor: colors.background, fontFamily: "Inter_400Regular" },
    precioRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    precioSimbolo: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    precioInput: { flex: 1 },
    modalBotones: { flexDirection: "row", gap: 10 },
    boton: { flex: 1, flexDirection: "row", paddingVertical: 13, borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 6 },
    botonCancelar: { backgroundColor: colors.muted },
    botonCancelarTexto: { fontSize: 15, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
    botonCrear: { backgroundColor: colors.primary },
    botonCrearTexto: { fontSize: 15, fontWeight: "600", color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
    botonDeshabilitado: { opacity: 0.4 },
  });
}

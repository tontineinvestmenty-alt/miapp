import { Feather } from "@expo/vector-icons";
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
import { Sounds } from "@/utils/sounds";
import { Articulo, genId, fechaHoy, getArticulos, saveArticulos } from "@/utils/storage";

const TAB_BAR_HEIGHT = Platform.OS === "web" ? 96 : 100;

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
    Sounds.abrir();
    setModalVisible(true);
  }

  function abrirEditar(art: Articulo) {
    setEditando(art);
    setNombre(art.nombre);
    setPrecio(art.precio != null ? String(art.precio) : "");
    setFotoUri(art.foto);
    Sounds.abrir();
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
    setFotoUri(undefined);
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
      const nuevo: Articulo = { id: genId(), nombre: nombreFinal, foto: fotoUri, precio: precioFinal, creadoEn: fechaHoy() };
      lista = [nuevo, ...articulos];
    }

    setArticulos(lista);
    await saveArticulos(lista);
    setModalVisible(false);
    Sounds.crear();
  }

  async function eliminar(id: string, nombreArt: string) {
    const lista = articulos.filter((a) => a.id !== id);
    setArticulos(lista);
    await saveArticulos(lista);
    Sounds.eliminar();
    if (Platform.OS === "web") {
      alert(`"${nombreArt}" eliminado.`);
    }
  }

  const fabBottom = TAB_BAR_HEIGHT + 10;
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
            <View style={[styles.vacioBg, { backgroundColor: colors.secondary }]}>
              <Feather name="box" size={38} color={colors.primary} />
            </View>
            <Text style={styles.vacioTitulo}>Sin artículos</Text>
            <Text style={styles.vacioTexto}>
              Toca el botón + para crear tu primer artículo
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.tarjeta} activeOpacity={0.8} onPress={() => abrirEditar(item)}>
            {item.foto ? (
              <Image source={{ uri: item.foto }} style={styles.fotoMiniatura} contentFit="cover" />
            ) : (
              <View style={styles.icono}>
                <Feather name="box" size={20} color={colors.primary} />
              </View>
            )}
            <View style={styles.tarjetaInfo}>
              <Text style={styles.tarjetaNombre}>{item.nombre}</Text>
              <Text style={styles.tarjetaFecha}>
                {item.precio != null
                  ? `Precio: $${fmtPrecio(item.precio)} USD`
                  : "Sin precio registrado"}
              </Text>
            </View>
            <View style={styles.acciones}>
              <TouchableOpacity
                onPress={() => abrirEditar(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 4 }}
                style={styles.accionBtn}
              >
                <Feather name="edit-2" size={15} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => eliminar(item.id, item.nombre)}
                hitSlop={{ top: 10, bottom: 10, left: 4, right: 10 }}
                style={[styles.accionBtn, { backgroundColor: "#fff0f0" }]}
              >
                <Feather name="trash-2" size={15} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={abrirCrear} activeOpacity={0.85}>
        <Feather name="plus" size={26} color="#fff" />
        <Text style={styles.fabTxt}>Artículo</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <View style={styles.modalBar} />
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

            <View style={styles.fotoRow}>
              <TouchableOpacity style={styles.fotoPickerArea} onPress={elegirFoto} activeOpacity={0.8}>
                {fotoUri ? (
                  <Image source={{ uri: fotoUri }} style={styles.fotoPreview} contentFit="cover" />
                ) : (
                  <View style={styles.fotoPlaceholder}>
                    <Feather name="camera" size={28} color={colors.mutedForeground} />
                    <Text style={styles.fotoPlaceholderTexto}>Foto</Text>
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

            <Text style={styles.fieldLabel}>Precio unitario (opcional)</Text>
            <View style={styles.precioRow}>
              <Text style={styles.precioSimbolo}>$</Text>
              <TextInput
                style={[styles.input, styles.precioInput]}
                placeholder="0.00 USD"
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
                <Feather name={modoEditar ? "check" : "plus"} size={16} color="#fff" />
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
  const cardShadow = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  };

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    lista: { padding: 16, gap: 10, paddingBottom: TAB_BAR_HEIGHT + 20 },
    vacio: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
    vacioBg: { width: 88, height: 88, borderRadius: 28, alignItems: "center", justifyContent: "center" },
    vacioTitulo: { fontSize: 22, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    vacioTexto: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 40, fontFamily: "Inter_400Regular", lineHeight: 20 },
    tarjeta: {
      backgroundColor: colors.card, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14,
      flexDirection: "row", alignItems: "center", gap: 14, ...cardShadow,
    },
    fotoMiniatura: { width: 50, height: 50, borderRadius: 14 },
    icono: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    tarjetaInfo: { flex: 1 },
    tarjetaNombre: { fontSize: 16, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    tarjetaFecha: { fontSize: 12, color: colors.mutedForeground, marginTop: 3, fontFamily: "Inter_400Regular" },
    acciones: { flexDirection: "row", alignItems: "center", gap: 8 },
    accionBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
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
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
    modal: { backgroundColor: colors.card, borderRadius: 24, padding: 24, width: "100%", maxWidth: 380, gap: 16 },
    modalBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 4 },
    modalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    modalTitulo: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", flex: 1 },
    editBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    editBadgeTxt: { fontSize: 11, fontWeight: "600", color: colors.primary, fontFamily: "Inter_600SemiBold" },
    fotoRow: { flexDirection: "row", alignItems: "center", gap: 16 },
    fotoPickerArea: { position: "relative" },
    fotoPlaceholder: { width: 96, height: 96, borderRadius: 20, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", gap: 6 },
    fotoPlaceholderTexto: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    fotoPreview: { width: 96, height: 96, borderRadius: 20 },
    fotoEditar: { position: "absolute", bottom: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    quitarFotoBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
    quitarFotoTxt: { fontSize: 13, color: colors.destructive, fontFamily: "Inter_400Regular" },
    input: {
      borderWidth: 1.5, borderColor: colors.input, borderRadius: 14,
      paddingHorizontal: 16, paddingVertical: 14,
      fontSize: 15, color: colors.foreground, backgroundColor: colors.muted,
      fontFamily: "Inter_400Regular",
    },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginBottom: 6, marginTop: 4 },
    precioRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    precioSimbolo: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    precioInput: { flex: 1 },
    modalBotones: { flexDirection: "row", gap: 10, marginTop: 4 },
    boton: { flex: 1, flexDirection: "row", paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 6 },
    botonCancelar: { backgroundColor: colors.muted },
    botonCancelarTexto: { fontSize: 15, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
    botonCrear: { backgroundColor: colors.primary },
    botonCrearTexto: { fontSize: 15, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
    botonDeshabilitado: { opacity: 0.35 },
  });
}

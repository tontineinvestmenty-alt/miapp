import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
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
import { Almacen, genId, fechaHoy, getAlmacenes, registrarActividad, saveAlmacenes } from "@/utils/storage";

const TAB_BAR_HEIGHT = Platform.OS === "web" ? 96 : 100;

export default function AlmacenesScreen() {
  const colors = useColors();
  const router = useRouter();
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaFoto, setNuevaFoto] = useState<string | undefined>(undefined);
  const [confirm, setConfirm] = useState<{ id: string; nombre: string } | null>(null);

  const cargar = useCallback(async () => {
    setAlmacenes(await getAlmacenes());
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function elegirFoto(): Promise<string | undefined> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return undefined;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      return a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
    }
    return undefined;
  }

  function abrirModal() {
    setNuevoNombre("");
    setNuevaFoto(undefined);
    Sounds.abrir();
    setModalVisible(true);
  }

  async function crearAlmacen() {
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    const nuevo: Almacen = { id: genId(), nombre, foto: nuevaFoto, creadoEn: fechaHoy() };
    const lista = [nuevo, ...almacenes];
    setAlmacenes(lista);
    await saveAlmacenes(lista);
    await registrarActividad({ tipo: "almacen", accion: "crear", titulo: `Almacén creado · ${nombre}` });
    setModalVisible(false);
    setNuevoNombre("");
    setNuevaFoto(undefined);
    Sounds.crear();
  }

  async function cambiarFoto(id: string) {
    const foto = await elegirFoto();
    if (!foto) return;
    const lista = almacenes.map(a => a.id === id ? { ...a, foto } : a);
    setAlmacenes(lista);
    await saveAlmacenes(lista);
    Sounds.tap();
  }

  async function eliminar(id: string) {
    const nombre = almacenes.find((a) => a.id === id)?.nombre ?? "almacén";
    const lista = almacenes.filter((a) => a.id !== id);
    setAlmacenes(lista);
    await saveAlmacenes(lista);
    await registrarActividad({ tipo: "almacen", accion: "eliminar", titulo: `Almacén eliminado · ${nombre}` });
    setConfirm(null);
    Sounds.eliminar();
  }

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <FlatList
        data={almacenes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.lista, almacenes.length === 0 && { flex: 1 }]}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <View style={[styles.vacioBg, { backgroundColor: colors.secondary }]}>
              <Feather name="archive" size={38} color={colors.primary} />
            </View>
            <Text style={styles.vacioTitulo}>Sin almacenes</Text>
            <Text style={styles.vacioTexto}>Toca el botón + para crear tu primer almacén</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tarjeta}
            activeOpacity={0.8}
            onPress={() => { Sounds.tap(); router.push(`/almacen/${item.id}`); }}
          >
            <TouchableOpacity onPress={() => cambiarFoto(item.id)} activeOpacity={0.8}>
              {item.foto ? (
                <Image source={{ uri: item.foto }} style={styles.fotoAlmacen} contentFit="cover" />
              ) : (
                <View style={styles.iconoAlmacen}>
                  <Feather name="camera" size={20} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.tarjetaInfo}>
              <Text style={styles.tarjetaNombre}>{item.nombre}</Text>
              <Text style={styles.tarjetaFecha}>{item.creadoEn}</Text>
            </View>
            <View style={styles.tarjetaDerecha}>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              <TouchableOpacity
                onPress={() => setConfirm({ id: item.id, nombre: item.nombre })}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 4 }}
              >
                <Feather name="trash-2" size={17} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={abrirModal} activeOpacity={0.85}>
        <Feather name="plus" size={26} color="#fff" />
        <Text style={styles.fabTxt}>Nuevo</Text>
      </TouchableOpacity>

      {/* ── Modal Crear ── */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <View style={styles.modalBar} />
            <Text style={styles.modalTitulo}>Nuevo almacén</Text>

            <TouchableOpacity style={styles.fotoPickerBtn} onPress={async () => {
              const f = await elegirFoto();
              if (f) setNuevaFoto(f);
            }} activeOpacity={0.8}>
              {nuevaFoto ? (
                <Image source={{ uri: nuevaFoto }} style={styles.fotoPreview} contentFit="cover" />
              ) : (
                <View style={styles.fotoPlaceholder}>
                  <Feather name="camera" size={28} color={colors.mutedForeground} />
                  <Text style={styles.fotoPlaceholderTxt}>Añadir foto</Text>
                </View>
              )}
              <View style={styles.fotoEditar}>
                <Feather name={nuevaFoto ? "edit-2" : "plus"} size={12} color="#fff" />
              </View>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Nombre del almacén"
              placeholderTextColor={colors.mutedForeground}
              value={nuevoNombre}
              onChangeText={setNuevoNombre}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={crearAlmacen}
              maxLength={50}
            />
            <View style={styles.modalBotones}>
              <TouchableOpacity style={[styles.boton, styles.botonCancelar]} onPress={() => setModalVisible(false)}>
                <Text style={styles.botonCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.boton, styles.botonCrear, !nuevoNombre.trim() && styles.botonDeshabilitado]}
                onPress={crearAlmacen}
                disabled={!nuevoNombre.trim()}
              >
                <Feather name="plus" size={16} color="#fff" />
                <Text style={styles.botonCrearTexto}>Crear</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal Confirmar Eliminar ── */}
      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <Pressable style={styles.overlay} onPress={() => setConfirm(null)}>
          <Pressable style={styles.confirmModal} onPress={() => {}}>
            <View style={[styles.confirmIcono, { backgroundColor: "#fff0f0" }]}>
              <Feather name="trash-2" size={24} color={colors.destructive} />
            </View>
            <Text style={styles.confirmTitulo}>Eliminar almacén</Text>
            <Text style={styles.confirmMensaje}>
              {`¿Seguro que quieres eliminar "${confirm?.nombre}"?`}
            </Text>
            <View style={styles.modalBotones}>
              <TouchableOpacity style={[styles.boton, styles.botonCancelar]} onPress={() => setConfirm(null)}>
                <Text style={styles.botonCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.boton, { backgroundColor: colors.destructive }]}
                onPress={() => confirm && eliminar(confirm.id)}
              >
                <Feather name="trash-2" size={15} color="#fff" />
                <Text style={styles.botonCrearTexto}>Eliminar</Text>
              </TouchableOpacity>
            </View>
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
  const fabShadow = {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
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
    fotoAlmacen: { width: 50, height: 50, borderRadius: 14 },
    iconoAlmacen: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    tarjetaInfo: { flex: 1 },
    tarjetaNombre: { fontSize: 16, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    tarjetaFecha: { fontSize: 12, color: colors.mutedForeground, marginTop: 3, fontFamily: "Inter_400Regular" },
    tarjetaDerecha: { flexDirection: "row", alignItems: "center", gap: 14 },
    fab: {
      position: "absolute", right: 20, bottom: TAB_BAR_HEIGHT + 10,
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 22, paddingVertical: 16, borderRadius: 28,
      backgroundColor: colors.primary, ...fabShadow,
    },
    fabTxt: { fontSize: 15, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
    modal: { backgroundColor: colors.card, borderRadius: 24, padding: 24, width: "100%", maxWidth: 380, gap: 16, alignItems: "stretch" },
    modalBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 4 },
    modalTitulo: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    fotoPickerBtn: { alignSelf: "center", position: "relative" },
    fotoPreview: { width: 96, height: 96, borderRadius: 20 },
    fotoPlaceholder: { width: 96, height: 96, borderRadius: 20, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", gap: 6 },
    fotoPlaceholderTxt: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    fotoEditar: { position: "absolute", bottom: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    input: {
      borderWidth: 1.5, borderColor: colors.input, borderRadius: 14,
      paddingHorizontal: 16, paddingVertical: 14,
      fontSize: 15, color: colors.foreground, backgroundColor: colors.muted,
      fontFamily: "Inter_400Regular",
    },
    modalBotones: { flexDirection: "row", gap: 10, marginTop: 4 },
    boton: { flex: 1, flexDirection: "row", paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 6 },
    botonCancelar: { backgroundColor: colors.muted },
    botonCancelarTexto: { fontSize: 15, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
    botonCrear: { backgroundColor: colors.primary },
    botonCrearTexto: { fontSize: 15, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
    botonDeshabilitado: { opacity: 0.35 },
    confirmModal: { backgroundColor: colors.card, borderRadius: 24, padding: 24, width: "100%", maxWidth: 360, gap: 12, alignItems: "center" },
    confirmIcono: { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    confirmTitulo: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    confirmMensaje: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 20 },
  });
}

import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useConfirm } from "@/contexts/ConfirmContext";
import { useColors } from "@/hooks/useColors";
import { Actividad, ActividadTipo, getActividad, limpiarActividad } from "@/utils/storage";

const TIPO_META: Record<ActividadTipo, { icon: keyof typeof Feather.glyphMap; color: string }> = {
  almacen: { icon: "archive", color: "#3b5bdb" },
  articulo: { icon: "box", color: "#7048e8" },
  pedido: { icon: "truck", color: "#f08c00" },
  stock: { icon: "repeat", color: "#2f9e44" },
  sistema: { icon: "settings", color: "#868e96" },
};

export default function ActividadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const confirm = useConfirm();
  const [items, setItems] = useState<Actividad[]>([]);

  const cargar = useCallback(() => {
    getActividad().then(setItems);
  }, []);

  useFocusEffect(cargar);

  async function onLimpiar() {
    const ok = await confirm({
      titulo: "Borrar actividad",
      mensaje: "¿Borrar todo el registro de actividad? Esto no afecta a tus datos, solo al historial.",
      confirmLabel: "Borrar",
      destructivo: true,
    });
    if (!ok) return;
    await limpiarActividad();
    cargar();
  }

  const s = makeStyles(colors);

  // group by day label
  const grupos: { fecha: string; entradas: Actividad[] }[] = [];
  for (const it of items) {
    const last = grupos[grupos.length - 1];
    if (last && last.fecha === it.fecha) last.entradas.push(it);
    else grupos.push({ fecha: it.fecha, entradas: [it] });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}>
        {items.length === 0 ? (
          <View style={s.vacio}>
            <Feather name="clock" size={44} color={colors.mutedForeground} />
            <Text style={s.vacioTitulo}>Sin actividad todavía</Text>
            <Text style={s.vacioSub}>
              Aquí verás todo lo que pasa: almacenes, artículos, pedidos y movimientos de stock.
            </Text>
          </View>
        ) : (
          <>
            <TouchableOpacity style={s.limpiarBtn} onPress={onLimpiar}>
              <Feather name="trash-2" size={15} color={colors.destructive} />
              <Text style={[s.limpiarTxt, { color: colors.destructive }]}>Borrar registro</Text>
            </TouchableOpacity>

            {grupos.map((g) => (
              <View key={g.fecha} style={s.grupo}>
                <Text style={s.fecha}>{g.fecha}</Text>
                <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {g.entradas.map((it, idx) => {
                    const meta = TIPO_META[it.tipo] ?? TIPO_META.sistema;
                    return (
                      <View key={it.id}>
                        {idx > 0 && <View style={s.sep} />}
                        <View style={s.fila}>
                          <View style={[s.icono, { backgroundColor: meta.color + "22" }]}>
                            <Feather name={meta.icon} size={16} color={meta.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.titulo}>{it.titulo}</Text>
                            {!!it.detalle && <Text style={s.detalle}>{it.detalle}</Text>}
                          </View>
                          <Text style={s.hora}>{it.hora}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    content: { padding: 16 },
    vacio: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32, gap: 10 },
    vacioTitulo: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", marginTop: 6 },
    vacioSub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
    limpiarBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 4, marginBottom: 6 },
    limpiarTxt: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
    grupo: { marginBottom: 18 },
    fecha: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginBottom: 8, marginLeft: 4 },
    card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
    sep: { height: 1, backgroundColor: colors.border, marginLeft: 56 },
    fila: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
    icono: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    titulo: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    detalle: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    hora: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });
}

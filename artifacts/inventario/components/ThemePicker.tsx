import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { TEMAS, ThemeId } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { Sounds } from "@/utils/sounds";

export function ThemePickerButton() {
  const colors = useColors();
  const { themeId, setThemeId } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => { Sounds.abrir(); setVisible(true); }}
        style={s.headerBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={[s.headerBtnInner, { backgroundColor: colors.secondary }]}>
          <Feather name="sliders" size={17} color={colors.primary} />
        </View>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={s.overlay} onPress={() => setVisible(false)}>
          <Pressable style={[s.card, { backgroundColor: colors.card, shadowColor: "#000" }]} onPress={() => {}}>
            <View style={s.handle} />
            <Text style={[s.titulo, { color: colors.foreground }]}>Tema de color</Text>
            <Text style={[s.subtitulo, { color: colors.mutedForeground }]}>Elige la paleta que prefieras</Text>
            <View style={s.swatches}>
              {TEMAS.map((t) => {
                const activo = t.id === themeId;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={s.swatchCol}
                    onPress={() => { Sounds.tap(); setThemeId(t.id); setVisible(false); }}
                    activeOpacity={0.75}
                  >
                    <View style={[
                      s.swatch,
                      { backgroundColor: t.color },
                      activo && s.swatchActivo,
                    ]}>
                      {activo && <Feather name="check" size={20} color="#fff" />}
                    </View>
                    <Text style={[s.swatchLabel, { color: activo ? t.color : colors.mutedForeground, fontWeight: activo ? "700" : "500" }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  headerBtn: { marginRight: 12 },
  headerBtnInner: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    borderRadius: 28, padding: 28, width: "100%", maxWidth: 380, gap: 6,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.12)", alignSelf: "center", marginBottom: 8 },
  titulo: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitulo: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 6 },
  swatches: { flexDirection: "row", justifyContent: "space-around", marginTop: 8 },
  swatchCol: { alignItems: "center", gap: 10 },
  swatch: {
    width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  swatchActivo: { transform: [{ scale: 1.12 }] },
  swatchLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});

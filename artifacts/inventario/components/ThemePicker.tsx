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

export function ThemePickerButton() {
  const colors = useColors();
  const { themeId, setThemeId } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={{ marginRight: 14, padding: 4 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="sliders" size={20} color={colors.primary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={s.overlay} onPress={() => setVisible(false)}>
          <Pressable style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[s.titulo, { color: colors.foreground }]}>Tema de color</Text>
            <View style={s.swatches}>
              {TEMAS.map((t) => {
                const activo = t.id === themeId;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={s.swatchCol}
                    onPress={() => { setThemeId(t.id); setVisible(false); }}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      s.swatch,
                      { backgroundColor: t.color },
                      activo && s.swatchActivo,
                    ]}>
                      {activo && <Feather name="check" size={18} color="#fff" />}
                    </View>
                    <Text style={[s.swatchLabel, { color: activo ? t.color : colors.mutedForeground }]}>
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
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { borderRadius: 18, padding: 24, width: "100%", maxWidth: 380, borderWidth: 1, gap: 18 },
  titulo: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center" },
  swatches: { flexDirection: "row", justifyContent: "space-around" },
  swatchCol: { alignItems: "center", gap: 8 },
  swatch: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  swatchActivo: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },
  swatchLabel: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});

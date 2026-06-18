import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  buildCustomPalette,
  CustomThemeConfig,
  DEFAULT_ESTADOS,
  ESTADO_PALETA,
  EstadoColors,
  hslToHex,
  TEMAS,
} from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useSound } from "@/contexts/SoundContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Sounds, SoundEffect } from "@/utils/sounds";

const RAINBOW = ["#ff0000", "#ffae00", "#3bdb3b", "#00c8d6", "#3b5bdb", "#a13bdb", "#ff0080"] as const;

const ESTADOS_EDIT: { key: keyof EstadoColors; label: string }[] = [
  { key: "comprado", label: "Comprado" },
  { key: "casillero", label: "En casillero" },
  { key: "enviado", label: "A Cuba" },
  { key: "almacen", label: "En almacén" },
];

const SONIDOS_EDIT: { key: SoundEffect; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "crear", label: "Crear o guardar", icon: "plus-circle" },
  { key: "avanzar", label: "Avanzar pedido", icon: "arrow-right-circle" },
  { key: "retroceder", label: "Retroceder pedido", icon: "arrow-left-circle" },
  { key: "eliminar", label: "Eliminar", icon: "trash-2" },
  { key: "abrir", label: "Abrir menú", icon: "maximize-2" },
  { key: "tap", label: "Toque / botón", icon: "circle" },
  { key: "backup", label: "Copia de seguridad", icon: "save" },
];

function ColorSlider({
  gradient,
  value,
  thumbColor,
  onChange,
}: {
  gradient: readonly string[];
  value: number;
  thumbColor: string;
  onChange: (v: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);

  const update = (x: number) => {
    const w = widthRef.current;
    if (w <= 0) return;
    onChange(Math.max(0, Math.min(1, x / w)));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => update(e.nativeEvent.locationX),
      onPanResponderMove: (e) => update(e.nativeEvent.locationX),
    }),
  ).current;

  const thumbLeft = Math.max(0, Math.min(width - 26, value * width - 13));

  return (
    <View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        widthRef.current = w;
        setWidth(w);
      }}
      {...pan.panHandlers}
      style={sl.track}
    >
      <View style={sl.bar}>
        <LinearGradient
          colors={gradient as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={[sl.thumb, { left: thumbLeft, backgroundColor: thumbColor }]} />
    </View>
  );
}

export function ThemePickerButton() {
  const colors = useColors();
  const { themeId, setThemeId, customConfig, setCustomConfig } = useTheme();
  const { customSounds, pickSound, resetSound, previewSound } = useSound();
  const [visible, setVisible] = useState(false);
  const [screen, setScreen] = useState<"presets" | "editor" | "sounds">("presets");
  const [draft, setDraft] = useState<CustomThemeConfig>(customConfig);

  function abrir() {
    Sounds.abrir();
    setScreen("presets");
    setVisible(true);
  }

  function abrirEditor() {
    Sounds.tap();
    setDraft(customConfig);
    setScreen("editor");
  }

  function abrirSonidos() {
    Sounds.tap();
    setScreen("sounds");
  }

  function aplicarCustom() {
    Sounds.tap();
    setCustomConfig(draft);
    setThemeId("custom");
    setScreen("presets");
    setVisible(false);
  }

  const preview = buildCustomPalette(draft);
  const satGradient = [hslToHex(draft.hue, 0, 55), hslToHex(draft.hue, 100, 50)] as const;
  const customActivo = themeId === "custom";
  const sonidosActivos = Object.keys(customSounds).length;

  return (
    <>
      <TouchableOpacity
        onPress={abrir}
        style={s.headerBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={[s.headerBtnInner, { backgroundColor: colors.secondary }]}>
          <Feather name="sliders" size={17} color={colors.primary} />
        </View>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="none" onRequestClose={() => setVisible(false)}>
        <Pressable style={s.overlay} onPress={() => setVisible(false)}>
          <Pressable style={[s.card, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={s.handle} />

            {screen === "presets" ? (
              <>
                <Text style={[s.titulo, { color: colors.foreground }]}>Tema de color</Text>
                <Text style={[s.subtitulo, { color: colors.mutedForeground }]}>
                  Elige la paleta que prefieras
                </Text>

                <View style={s.swatches}>
                  {TEMAS.map((t) => {
                    const activo = t.id === themeId;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={s.swatchCol}
                        onPress={() => {
                          Sounds.tap();
                          setThemeId(t.id);
                          setVisible(false);
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={[s.swatch, { backgroundColor: t.color }, activo && s.swatchActivo]}>
                          {activo && <Feather name="check" size={20} color="#fff" />}
                        </View>
                        <Text
                          style={[
                            s.swatchLabel,
                            { color: activo ? t.color : colors.mutedForeground, fontWeight: activo ? "700" : "500" },
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={[s.divider, { backgroundColor: colors.border }]} />

                <TouchableOpacity
                  style={[s.customRow, { backgroundColor: colors.muted, borderColor: customActivo ? colors.primary : "transparent" }]}
                  onPress={abrirEditor}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={RAINBOW as unknown as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.customSwatch}
                  >
                    {customActivo ? (
                      <Feather name="check" size={18} color="#fff" />
                    ) : (
                      <Feather name="plus" size={18} color="#fff" />
                    )}
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.customTitulo, { color: colors.foreground }]}>
                      {customActivo ? "Mi tema personalizado" : "Personalizar"}
                    </Text>
                    <Text style={[s.customSub, { color: colors.mutedForeground }]}>
                      {customActivo ? "Tema activo · toca para editar" : "Crea tu propia paleta"}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.customRow, { backgroundColor: colors.muted, borderColor: "transparent", marginTop: 10 }]}
                  onPress={abrirSonidos}
                  activeOpacity={0.8}
                >
                  <View style={[s.customSwatch, { backgroundColor: colors.primary }]}>
                    <Feather name="music" size={18} color={colors.primaryForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.customTitulo, { color: colors.foreground }]}>Sonidos</Text>
                    <Text style={[s.customSub, { color: colors.mutedForeground }]}>
                      {sonidosActivos > 0 ? `${sonidosActivos} personalizado${sonidosActivos > 1 ? "s" : ""}` : "Usa tus propios audios"}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </>
            ) : screen === "sounds" ? (
              <ScrollView
                style={s.editorScroll}
                contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
                showsVerticalScrollIndicator={false}
              >
                <View style={s.editorHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      Sounds.tap();
                      setScreen("presets");
                    }}
                    style={[s.backBtn, { backgroundColor: colors.muted }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="chevron-left" size={20} color={colors.foreground} />
                  </TouchableOpacity>
                  <Text style={[s.titulo, { color: colors.foreground, flex: 1 }]}>Sonidos</Text>
                </View>
                <Text style={[s.subtitulo, { color: colors.mutedForeground, textAlign: "left", marginBottom: 4 }]}>
                  Asigna un audio de tu dispositivo a cada efecto. Sin audio se usa el sonido por defecto.
                </Text>

                {SONIDOS_EDIT.map((e) => {
                  const custom = !!customSounds[e.key];
                  return (
                    <View key={e.key} style={[s.soundRow, { backgroundColor: colors.muted }]}>
                      <View style={[s.soundIcon, { backgroundColor: colors.card }]}>
                        <Feather name={e.icon} size={16} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.soundLabel, { color: colors.foreground }]}>{e.label}</Text>
                        <Text style={[s.soundState, { color: custom ? colors.primary : colors.mutedForeground }]}>
                          {custom ? "Audio personalizado" : "Sonido por defecto"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => previewSound(e.key)}
                        style={[s.soundBtn, { backgroundColor: colors.card }]}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Feather name="play" size={15} color={colors.foreground} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => pickSound(e.key)}
                        style={[s.soundBtn, { backgroundColor: colors.card }]}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Feather name="upload" size={15} color={colors.foreground} />
                      </TouchableOpacity>
                      {custom && (
                        <TouchableOpacity
                          onPress={() => {
                            Sounds.tap();
                            resetSound(e.key);
                          }}
                          style={[s.soundBtn, { backgroundColor: colors.card }]}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Feather name="x" size={15} color={colors.destructive} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <ScrollView
                style={s.editorScroll}
                contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
                showsVerticalScrollIndicator={false}
              >
                <View style={s.editorHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      Sounds.tap();
                      setScreen("presets");
                    }}
                    style={[s.backBtn, { backgroundColor: colors.muted }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="chevron-left" size={20} color={colors.foreground} />
                  </TouchableOpacity>
                  <Text style={[s.titulo, { color: colors.foreground, flex: 1 }]}>Personalizar tema</Text>
                </View>

                {/* Vista previa */}
                <View style={[s.preview, { backgroundColor: preview.background, borderColor: preview.border }]}>
                  <View style={[s.previewCard, { backgroundColor: preview.card }]}>
                    <Text style={[s.previewTitle, { color: preview.foreground }]}>Vista previa</Text>
                    <View style={s.previewChips}>
                      <View style={[s.previewChip, { backgroundColor: preview.estadoCompradoBg }]}>
                        <Text style={[s.previewChipTxt, { color: preview.estadoComprado }]}>Comprado</Text>
                      </View>
                      <View style={[s.previewChip, { backgroundColor: preview.estadoCasilleroBg }]}>
                        <Text style={[s.previewChipTxt, { color: preview.estadoCasillero }]}>Casillero</Text>
                      </View>
                    </View>
                    <View style={s.previewChips}>
                      <View style={[s.previewChip, { backgroundColor: preview.estadoEnviadoBg }]}>
                        <Text style={[s.previewChipTxt, { color: preview.estadoEnviado }]}>A Cuba</Text>
                      </View>
                      <View style={[s.previewChip, { backgroundColor: preview.estadoAlmacenBg }]}>
                        <Text style={[s.previewChipTxt, { color: preview.estadoAlmacen }]}>En almacén</Text>
                      </View>
                    </View>
                    <View style={[s.previewBtn, { backgroundColor: preview.primary }]}>
                      <Text style={[s.previewBtnTxt, { color: preview.primaryForeground }]}>Botón principal</Text>
                    </View>
                  </View>
                </View>

                {/* Color (hue) */}
                <Text style={[s.fieldLabel, { color: colors.foreground }]}>Color</Text>
                <ColorSlider
                  gradient={RAINBOW}
                  value={draft.hue / 360}
                  thumbColor={hslToHex(draft.hue, Math.max(draft.sat, 60), 50)}
                  onChange={(v) => setDraft((d) => ({ ...d, hue: Math.round(v * 360) }))}
                />

                {/* Intensidad (saturation) */}
                <Text style={[s.fieldLabel, { color: colors.foreground }]}>Intensidad</Text>
                <ColorSlider
                  gradient={satGradient}
                  value={draft.sat / 100}
                  thumbColor={hslToHex(draft.hue, draft.sat, 50)}
                  onChange={(v) => setDraft((d) => ({ ...d, sat: Math.round(v * 100) }))}
                />

                {/* Modo */}
                <Text style={[s.fieldLabel, { color: colors.foreground }]}>Modo</Text>
                <View style={[s.modeRow, { backgroundColor: colors.muted }]}>
                  {(["claro", "oscuro"] as const).map((m) => {
                    const activo = draft.mode === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[s.modeBtn, activo && { backgroundColor: colors.card }]}
                        onPress={() => {
                          Sounds.tap();
                          setDraft((d) => ({ ...d, mode: m }));
                        }}
                        activeOpacity={0.8}
                      >
                        <Feather
                          name={m === "claro" ? "sun" : "moon"}
                          size={15}
                          color={activo ? colors.primary : colors.mutedForeground}
                        />
                        <Text
                          style={[
                            s.modeTxt,
                            { color: activo ? colors.foreground : colors.mutedForeground, fontWeight: activo ? "700" : "500" },
                          ]}
                        >
                          {m === "claro" ? "Claro" : "Oscuro"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Colores de estados */}
                <Text style={[s.fieldLabel, { color: colors.foreground }]}>Colores de estados</Text>
                {ESTADOS_EDIT.map((e) => {
                  const sel = (draft.estados ?? DEFAULT_ESTADOS)[e.key];
                  return (
                    <View key={e.key} style={s.estadoRow}>
                      <Text style={[s.estadoLabel, { color: colors.mutedForeground }]}>{e.label}</Text>
                      <View style={s.estadoDots}>
                        {ESTADO_PALETA.map((c) => {
                          const activo = c.toLowerCase() === sel.toLowerCase();
                          return (
                            <TouchableOpacity
                              key={c}
                              onPress={() => {
                                Sounds.tap();
                                setDraft((d) => ({
                                  ...d,
                                  estados: { ...(d.estados ?? DEFAULT_ESTADOS), [e.key]: c },
                                }));
                              }}
                              activeOpacity={0.7}
                              style={[s.estadoDot, { backgroundColor: c }, activo && s.estadoDotActivo]}
                            >
                              {activo && <Feather name="check" size={13} color="#fff" />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={[s.aplicarBtn, { backgroundColor: preview.primary }]}
                  onPress={aplicarCustom}
                  activeOpacity={0.85}
                >
                  <Feather name="check" size={18} color={preview.primaryForeground} />
                  <Text style={[s.aplicarTxt, { color: preview.primaryForeground }]}>Aplicar tema</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const sl = StyleSheet.create({
  track: { height: 28, justifyContent: "center", marginTop: 8, marginBottom: 4 },
  bar: { height: 16, borderRadius: 8, overflow: "hidden" },
  thumb: {
    position: "absolute",
    top: 1,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});

const s = StyleSheet.create({
  headerBtn: { marginRight: 12 },
  headerBtnInner: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    borderRadius: 28,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    gap: 6,
    shadowColor: "#000",
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
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  swatchActivo: { transform: [{ scale: 1.12 }] },
  swatchLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, marginVertical: 16, opacity: 0.7 },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  customSwatch: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  customTitulo: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  customSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  editorScroll: { maxHeight: 480 },
  editorHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  backBtn: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  preview: { borderRadius: 18, padding: 12, borderWidth: 1, marginTop: 6, marginBottom: 10 },
  previewCard: { borderRadius: 14, padding: 14, gap: 10 },
  previewTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  previewChips: { flexDirection: "row", gap: 8 },
  previewChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9 },
  previewChipTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  previewBtn: { paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  previewBtnTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  estadoRow: { marginTop: 10 },
  estadoLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  estadoDots: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  estadoDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  estadoDotActivo: { borderWidth: 2, borderColor: "#fff", transform: [{ scale: 1.12 }] },
  soundRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, marginTop: 8 },
  soundIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  soundLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  soundState: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  soundBtn: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  modeRow: { flexDirection: "row", borderRadius: 14, padding: 4, marginTop: 8 },
  modeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 11 },
  modeTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  aplicarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 18,
  },
  aplicarTxt: { fontSize: 15, fontFamily: "Inter_700Bold" },
});

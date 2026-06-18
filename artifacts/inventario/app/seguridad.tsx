import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useConfirm } from "@/contexts/ConfirmContext";
import { useSecurity } from "@/contexts/SecurityContext";
import { useColors } from "@/hooks/useColors";

type Mode = "idle" | "set" | "change" | "disable";

export default function SeguridadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const confirm = useConfirm();
  const {
    pinEnabled,
    biometricEnabled,
    biometricAvailable,
    setPin,
    changePin,
    disablePin,
    setBiometricEnabled,
  } = useSecurity();

  const [mode, setMode] = useState<Mode>("idle");
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [oldPin, setOldPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const s = makeStyles(colors);

  function reset() {
    setMode("idle");
    setPin1("");
    setPin2("");
    setOldPin("");
    setError(null);
    setSubmitting(false);
  }

  function flash(msg: string) {
    setOk(msg);
    setTimeout(() => setOk(null), 2500);
  }

  const validPin = (p: string) => /^\d{4}$/.test(p);

  async function guardarNuevo() {
    if (submitting) return;
    setError(null);
    if (!validPin(pin1)) return setError("El PIN debe tener 4 dígitos");
    if (pin1 !== pin2) return setError("Los PIN no coinciden");
    setSubmitting(true);
    await setPin(pin1);
    reset();
    flash("Bloqueo activado");
  }

  async function guardarCambio() {
    if (submitting) return;
    setError(null);
    if (!validPin(pin1)) return setError("El nuevo PIN debe tener 4 dígitos");
    if (pin1 !== pin2) return setError("Los PIN nuevos no coinciden");
    setSubmitting(true);
    const okc = await changePin(oldPin, pin1);
    if (!okc) {
      setSubmitting(false);
      return setError("El PIN actual es incorrecto");
    }
    reset();
    flash("PIN actualizado");
  }

  async function confirmarDesactivar() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const okd = await disablePin(oldPin);
    if (!okd) {
      setSubmitting(false);
      return setError("PIN incorrecto");
    }
    reset();
    flash("Bloqueo desactivado");
  }

  async function onToggleBiometric(value: boolean) {
    if (value) {
      const okb = await setBiometricEnabled(true);
      if (!okb) {
        await confirm({
          titulo: "Biometría no disponible",
          mensaje:
            "Este dispositivo no tiene huella o Face ID configurado, o no es compatible.",
          confirmLabel: "Entendido",
          cancelLabel: "Cerrar",
        });
      }
    } else {
      await setBiometricEnabled(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}>
        <View style={[s.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.heroIcon, { backgroundColor: pinEnabled ? colors.primary : colors.muted }]}>
            <Feather name="shield" size={24} color={pinEnabled ? colors.primaryForeground : colors.mutedForeground} />
          </View>
          <Text style={s.heroTitulo}>
            {pinEnabled ? "Bloqueo activado" : "Bloqueo desactivado"}
          </Text>
          <Text style={s.heroSub}>
            {pinEnabled
              ? "La app pedirá tu PIN al abrirla."
              : "Protege la app con un PIN de 4 dígitos."}
          </Text>
        </View>

        {ok && (
          <View style={[s.banner, { backgroundColor: colors.primary }]}>
            <Feather name="check" size={16} color={colors.primaryForeground} />
            <Text style={[s.bannerTxt, { color: colors.primaryForeground }]}>{ok}</Text>
          </View>
        )}

        {/* ── Idle: main options ── */}
        {mode === "idle" && (
          <View style={s.group}>
            {!pinEnabled && (
              <TouchableOpacity style={s.row} onPress={() => setMode("set")}>
                <Feather name="lock" size={20} color={colors.primary} />
                <Text style={s.rowTxt}>Activar bloqueo con PIN</Text>
                <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}

            {pinEnabled && (
              <>
                <TouchableOpacity style={s.row} onPress={() => setMode("change")}>
                  <Feather name="edit-2" size={20} color={colors.primary} />
                  <Text style={s.rowTxt}>Cambiar PIN</Text>
                  <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>

                <View style={s.sep} />

                <View style={s.row}>
                  <Feather name="smartphone" size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTxt}>Huella / Face ID</Text>
                    {!biometricAvailable && (
                      <Text style={s.rowHint}>No disponible en este dispositivo</Text>
                    )}
                  </View>
                  <Switch
                    value={biometricEnabled}
                    onValueChange={onToggleBiometric}
                    disabled={!biometricAvailable}
                    trackColor={{ true: colors.primary, false: colors.border }}
                  />
                </View>

                <View style={s.sep} />

                <TouchableOpacity style={s.row} onPress={() => setMode("disable")}>
                  <Feather name="unlock" size={20} color={colors.destructive} />
                  <Text style={[s.rowTxt, { color: colors.destructive }]}>Desactivar bloqueo</Text>
                  <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ── Set new PIN ── */}
        {mode === "set" && (
          <View style={s.group}>
            <Text style={s.formTitulo}>Crea tu PIN</Text>
            <PinField label="Nuevo PIN" value={pin1} onChange={setPin1} colors={colors} />
            <PinField label="Repite el PIN" value={pin2} onChange={setPin2} colors={colors} />
            {error && <Text style={s.error}>{error}</Text>}
            <FormButtons onCancel={reset} onSave={guardarNuevo} saveLabel="Activar" colors={colors} />
          </View>
        )}

        {/* ── Change PIN ── */}
        {mode === "change" && (
          <View style={s.group}>
            <Text style={s.formTitulo}>Cambiar PIN</Text>
            <PinField label="PIN actual" value={oldPin} onChange={setOldPin} colors={colors} />
            <PinField label="Nuevo PIN" value={pin1} onChange={setPin1} colors={colors} />
            <PinField label="Repite el nuevo PIN" value={pin2} onChange={setPin2} colors={colors} />
            {error && <Text style={s.error}>{error}</Text>}
            <FormButtons onCancel={reset} onSave={guardarCambio} saveLabel="Guardar" colors={colors} />
          </View>
        )}

        {/* ── Disable ── */}
        {mode === "disable" && (
          <View style={s.group}>
            <Text style={s.formTitulo}>Desactivar bloqueo</Text>
            <Text style={s.formSub}>Introduce tu PIN para confirmar.</Text>
            <PinField label="PIN actual" value={oldPin} onChange={setOldPin} colors={colors} />
            {error && <Text style={s.error}>{error}</Text>}
            <FormButtons onCancel={reset} onSave={confirmarDesactivar} saveLabel="Desactivar" destructive colors={colors} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PinField({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const s = makeStyles(colors);
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, "").slice(0, 4))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        placeholder="••••"
        placeholderTextColor={colors.mutedForeground}
      />
    </View>
  );
}

function FormButtons({
  onCancel,
  onSave,
  saveLabel,
  destructive,
  colors,
}: {
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
  destructive?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const s = makeStyles(colors);
  return (
    <View style={s.btnRow}>
      <TouchableOpacity style={[s.btn, { backgroundColor: colors.muted }]} onPress={onCancel}>
        <Text style={[s.btnTxt, { color: colors.mutedForeground }]}>Cancelar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.btn, { backgroundColor: destructive ? colors.destructive : colors.primary }]}
        onPress={onSave}>
        <Text style={[s.btnTxt, { color: destructive ? colors.destructiveForeground : colors.primaryForeground }]}>
          {saveLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    content: { padding: 16, gap: 16 },
    hero: { borderRadius: 18, borderWidth: 1, padding: 22, alignItems: "center" },
    heroIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    heroTitulo: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    heroSub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4, textAlign: "center" },
    banner: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
    bannerTxt: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
    group: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 6 },
    row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 14 },
    rowTxt: { flex: 1, fontSize: 16, fontWeight: "500", color: colors.foreground, fontFamily: "Inter_500Medium" },
    rowHint: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    sep: { height: 1, backgroundColor: colors.border, marginHorizontal: 14 },
    formTitulo: { fontSize: 17, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", padding: 12, paddingBottom: 4 },
    formSub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", paddingHorizontal: 12, marginBottom: 4 },
    field: { paddingHorizontal: 12, paddingVertical: 8 },
    fieldLabel: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 22,
      letterSpacing: 8,
      color: colors.foreground,
      backgroundColor: colors.background,
      fontFamily: "Inter_700Bold",
    },
    error: { color: colors.destructive, fontSize: 13, fontFamily: "Inter_500Medium", paddingHorizontal: 12, marginTop: 4 },
    btnRow: { flexDirection: "row", gap: 10, padding: 12, marginTop: 4 },
    btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
    btnTxt: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  });
}

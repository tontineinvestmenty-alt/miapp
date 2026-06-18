import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export interface ConfirmOptions {
  titulo: string;
  mensaje: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructivo?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    return new Promise<boolean>((resolve) => {
      const prev = resolver.current;
      if (prev) prev(false);
      resolver.current = resolve;
      setOpts(o);
      setVisible(true);
    });
  }, []);

  const cerrar = useCallback((resultado: boolean) => {
    setVisible(false);
    const r = resolver.current;
    resolver.current = null;
    setTimeout(() => {
      setOpts(null);
      r?.(resultado);
    }, 0);
  }, []);

  useEffect(() => {
    return () => {
      const r = resolver.current;
      resolver.current = null;
      r?.(false);
    };
  }, []);

  const destructivo = opts?.destructivo ?? false;
  const confirmBg = destructivo ? colors.destructive : colors.primary;
  const confirmFg = destructivo ? colors.destructiveForeground : colors.primaryForeground;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal visible={visible} transparent animationType="none" onRequestClose={() => cerrar(false)}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.titulo, { color: colors.foreground }]}>{opts?.titulo}</Text>
            <Text style={[styles.mensaje, { color: colors.mutedForeground }]}>{opts?.mensaje}</Text>
            <View style={styles.botones}>
              <TouchableOpacity
                style={[styles.boton, { backgroundColor: colors.muted }]}
                onPress={() => cerrar(false)}>
                <Text style={[styles.botonTexto, { color: colors.mutedForeground }]}>
                  {opts?.cancelLabel ?? "Cancelar"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.boton, { backgroundColor: confirmBg }]}
                onPress={() => cerrar(true)}>
                <Text style={[styles.botonTexto, { color: confirmFg }]}>
                  {opts?.confirmLabel ?? "Confirmar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
  },
  titulo: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 8 },
  mensaje: { fontSize: 15, lineHeight: 21, fontFamily: "Inter_400Regular", marginBottom: 20 },
  botones: { flexDirection: "row", gap: 10 },
  boton: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  botonTexto: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});

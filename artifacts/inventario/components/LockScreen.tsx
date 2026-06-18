import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSecurity } from "@/contexts/SecurityContext";
import { useColors } from "@/hooks/useColors";

const PIN_LENGTH = 4;
const KEYS: (string | "del" | "bio")[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "bio", "0", "del"];

export function LockScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { verifyAndUnlock, tryBiometric, biometricEnabled } = useSecurity();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const verifying = useRef(false);
  const shake = useState(() => new Animated.Value(0))[0];

  const triggerBio = useCallback(async () => {
    const ok = await tryBiometric();
    if (!ok && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [tryBiometric]);

  useEffect(() => {
    if (biometricEnabled) triggerBio();
  }, [biometricEnabled, triggerBio]);

  const fail = useCallback(() => {
    setError(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(() => setPin(""));
  }, [shake]);

  const onKey = useCallback(
    (k: string) => {
      if (verifying.current) return;
      if (k === "bio") {
        triggerBio();
        return;
      }
      if (k === "del") {
        setError(false);
        setPin((p) => p.slice(0, -1));
        return;
      }
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
      setError(false);
      setPin((p) => {
        if (p.length >= PIN_LENGTH) return p;
        const next = p + k;
        if (next.length === PIN_LENGTH) {
          verifying.current = true;
          verifyAndUnlock(next).then((ok) => {
            verifying.current = false;
            if (!ok) fail();
          });
        }
        return next;
      });
    },
    [verifyAndUnlock, fail, triggerBio]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary }]}>
          <Feather name="lock" size={30} color={colors.primaryForeground} />
        </View>
        <Text style={[styles.titulo, { color: colors.foreground }]}>Inventario bloqueado</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {error ? "PIN incorrecto, inténtalo de nuevo" : "Introduce tu PIN para continuar"}
        </Text>

        <Animated.View style={[styles.dots, { transform: [{ translateX: shake }] }]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => {
            const filled = i < pin.length;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    borderColor: error ? colors.destructive : colors.border,
                    backgroundColor: filled ? (error ? colors.destructive : colors.primary) : "transparent",
                  },
                ]}
              />
            );
          })}
        </Animated.View>
      </View>

      <View style={styles.pad}>
        {KEYS.map((k) => {
          if (k === "bio") {
            return (
              <View key="bio" style={styles.keyCell}>
                {biometricEnabled ? (
                  <TouchableOpacity
                    style={[styles.key, { backgroundColor: "transparent" }]}
                    onPress={() => onKey("bio")}>
                    <Feather name="smartphone" size={26} color={colors.primary} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.key} />
                )}
              </View>
            );
          }
          if (k === "del") {
            return (
              <View key="del" style={styles.keyCell}>
                <TouchableOpacity style={styles.key} onPress={() => onKey("del")}>
                  <Feather name="delete" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            );
          }
          return (
            <View key={k} style={styles.keyCell}>
              <TouchableOpacity
                style={[styles.key, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => onKey(k)}>
                <Text style={[styles.keyTxt, { color: colors.foreground }]}>{k}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "space-between", paddingHorizontal: 32 },
  top: { alignItems: "center" },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  titulo: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 6, textAlign: "center" },
  dots: { flexDirection: "row", gap: 18, marginTop: 30 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  pad: { flexDirection: "row", flexWrap: "wrap", width: 300, justifyContent: "center" },
  keyCell: { width: 100, alignItems: "center", justifyContent: "center", marginVertical: 8 },
  key: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent" },
  keyTxt: { fontSize: 28, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

const isWeb = Platform.OS === "web";

const PIN_HASH_KEY = "inventario_pin_hash";
const FLAGS_KEY = "inventario_security_flags";
const SALT = "inventario.v1.salt";

interface Flags {
  pinEnabled: boolean;
  biometricEnabled: boolean;
}

async function secureSet(key: string, value: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function secureGet(key: string): Promise<string | null> {
  if (isWeb) {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function secureDelete(key: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, SALT + pin);
}

interface SecurityState {
  ready: boolean;
  locked: boolean;
  pinEnabled: boolean;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  setPin: (pin: string) => Promise<void>;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  disablePin: (pin: string) => Promise<boolean>;
  verifyAndUnlock: (pin: string) => Promise<boolean>;
  setBiometricEnabled: (enabled: boolean) => Promise<boolean>;
  tryBiometric: () => Promise<boolean>;
  lock: () => void;
}

const SecurityContext = createContext<SecurityState | null>(null);

export function useSecurity(): SecurityState {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error("useSecurity debe usarse dentro de SecurityProvider");
  return ctx;
}

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const persistFlags = useCallback(async (flags: Flags) => {
    await AsyncStorage.setItem(FLAGS_KEY, JSON.stringify(flags));
  }, []);

  useEffect(() => {
    (async () => {
      let flags: Flags = { pinEnabled: false, biometricEnabled: false };
      try {
        const raw = await AsyncStorage.getItem(FLAGS_KEY);
        if (raw) flags = { ...flags, ...JSON.parse(raw) };
      } catch {}

      // A PIN is only really enabled if a hash exists.
      const hash = await secureGet(PIN_HASH_KEY);
      const realPinEnabled = flags.pinEnabled && !!hash;

      let available = false;
      try {
        if (!isWeb) {
          const hw = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          available = hw && enrolled;
        }
      } catch {}

      setPinEnabled(realPinEnabled);
      setBiometricEnabledState(flags.biometricEnabled && available);
      setBiometricAvailable(available);
      setLocked(realPinEnabled);
      setReady(true);
    })();
  }, []);

  // Re-lock when the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appState.current;
      appState.current = next;
      if (next === "active" && (prev === "background" || prev === "inactive")) {
        setPinEnabled((enabled) => {
          if (enabled) setLocked(true);
          return enabled;
        });
      }
    });
    return () => sub.remove();
  }, []);

  const setPin = useCallback(
    async (pin: string) => {
      const hash = await hashPin(pin);
      await secureSet(PIN_HASH_KEY, hash);
      await persistFlags({ pinEnabled: true, biometricEnabled });
      setPinEnabled(true);
      setLocked(false);
    },
    [biometricEnabled, persistFlags]
  );

  const verifyPinInternal = useCallback(async (pin: string) => {
    const stored = await secureGet(PIN_HASH_KEY);
    if (!stored) return false;
    const hash = await hashPin(pin);
    return hash === stored;
  }, []);

  const verifyAndUnlock = useCallback(
    async (pin: string) => {
      const ok = await verifyPinInternal(pin);
      if (ok) setLocked(false);
      return ok;
    },
    [verifyPinInternal]
  );

  const changePin = useCallback(
    async (oldPin: string, newPin: string) => {
      const ok = await verifyPinInternal(oldPin);
      if (!ok) return false;
      await setPin(newPin);
      return true;
    },
    [setPin, verifyPinInternal]
  );

  const disablePin = useCallback(
    async (pin: string) => {
      const ok = await verifyPinInternal(pin);
      if (!ok) return false;
      await secureDelete(PIN_HASH_KEY);
      await persistFlags({ pinEnabled: false, biometricEnabled: false });
      setPinEnabled(false);
      setBiometricEnabledState(false);
      setLocked(false);
      return true;
    },
    [persistFlags, verifyPinInternal]
  );

  const setBiometricEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled && !biometricAvailable) return false;
      await persistFlags({ pinEnabled, biometricEnabled: enabled });
      setBiometricEnabledState(enabled);
      return true;
    },
    [biometricAvailable, pinEnabled, persistFlags]
  );

  const tryBiometric = useCallback(async () => {
    if (!biometricAvailable || !biometricEnabled) return false;
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Desbloquear Inventario",
        cancelLabel: "Usar PIN",
        disableDeviceFallback: true,
      });
      if (res.success) {
        setLocked(false);
        return true;
      }
    } catch {}
    return false;
  }, [biometricAvailable, biometricEnabled]);

  const lock = useCallback(() => {
    if (pinEnabled) setLocked(true);
  }, [pinEnabled]);

  return (
    <SecurityContext.Provider
      value={{
        ready,
        locked,
        pinEnabled,
        biometricEnabled,
        biometricAvailable,
        setPin,
        changePin,
        disablePin,
        verifyAndUnlock,
        setBiometricEnabled,
        tryBiometric,
        lock,
      }}>
      {children}
    </SecurityContext.Provider>
  );
}

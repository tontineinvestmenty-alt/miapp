import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert, Platform } from "react-native";

import {
  CustomSoundMap,
  setCustomSoundMap,
  SoundEffect,
  Sounds,
} from "@/utils/sounds";

const SOUNDS_KEY = "inventario_sonidos";
const VALID: SoundEffect[] = ["crear", "tap", "avanzar", "retroceder", "eliminar", "abrir", "backup"];
// Web stores audio as base64 data URIs in AsyncStorage; cap to keep storage sane.
const MAX_WEB_BYTES = 2 * 1024 * 1024;

interface SoundContextValue {
  customSounds: CustomSoundMap;
  pickSound: (effect: SoundEffect) => Promise<void>;
  resetSound: (effect: SoundEffect) => void;
  previewSound: (effect: SoundEffect) => void;
}

const SoundContext = createContext<SoundContextValue>({
  customSounds: {},
  pickSound: async () => {},
  resetSound: () => {},
  previewSound: () => {},
});

function sanitize(raw: unknown): CustomSoundMap {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: CustomSoundMap = {};
  for (const k of VALID) {
    const v = src[k];
    if (typeof v === "string" && v.length > 0) out[k] = v;
  }
  return out;
}

async function uriToDataUri(uri: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [customSounds, setCustomSounds] = useState<CustomSoundMap>({});

  useEffect(() => {
    AsyncStorage.getItem(SOUNDS_KEY).then((v) => {
      if (!v) return;
      try {
        const map = sanitize(JSON.parse(v));
        setCustomSounds(map);
        setCustomSoundMap(map);
      } catch {
        // ignore corrupt value
      }
    });
  }, []);

  function persist(map: CustomSoundMap) {
    setCustomSounds(map);
    setCustomSoundMap(map);
    AsyncStorage.setItem(SOUNDS_KEY, JSON.stringify(map));
  }

  async function pickSound(effect: SoundEffect) {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets || res.assets.length === 0) return;
      const asset = res.assets[0];

      let stored = asset.uri;
      if (Platform.OS === "web") {
        if (typeof asset.size === "number" && asset.size > MAX_WEB_BYTES) {
          Alert.alert("Archivo muy grande", "Elige un audio de menos de 2 MB para guardarlo en la app.");
          return;
        }
        stored = await uriToDataUri(asset.uri);
        if (stored.length > MAX_WEB_BYTES * 1.4) {
          Alert.alert("Archivo muy grande", "Elige un audio más corto o más ligero.");
          return;
        }
      } else {
        // Cache URIs from the picker are temporary; copy into the app's
        // document directory so the sound survives restarts.
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const FileSystem = require("expo-file-system/legacy");
          const dir: string | null = FileSystem.documentDirectory;
          if (dir) {
            const ext = (asset.name?.split(".").pop() || "m4a").replace(/[^a-zA-Z0-9]/g, "").slice(0, 5) || "m4a";
            const dest = `${dir}snd_${effect}.${ext}`;
            await FileSystem.deleteAsync(dest, { idempotent: true });
            await FileSystem.copyAsync({ from: asset.uri, to: dest });
            stored = dest;
          }
        } catch {
          // fall back to the picked URI if copying is unavailable
        }
      }

      persist({ ...customSounds, [effect]: stored });
    } catch {
      Alert.alert("No se pudo cargar", "Ocurrió un problema al elegir el sonido.");
    }
  }

  function resetSound(effect: SoundEffect) {
    const next = { ...customSounds };
    delete next[effect];
    persist(next);
  }

  function previewSound(effect: SoundEffect) {
    Sounds[effect]();
  }

  return (
    <SoundContext.Provider value={{ customSounds, pickSound, resetSound, previewSound }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  return useContext(SoundContext);
}

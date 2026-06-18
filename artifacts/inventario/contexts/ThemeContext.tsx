import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

import {
  CustomThemeConfig,
  DEFAULT_CUSTOM,
  DEFAULT_ESTADOS,
  EstadoColors,
  ThemeId,
} from "@/constants/colors";

const THEME_KEY = "inventario_tema";
const CUSTOM_KEY = "inventario_tema_custom";

interface ThemeContextValue {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  customConfig: CustomThemeConfig;
  setCustomConfig: (cfg: CustomThemeConfig) => void;
}

function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
}

function sanitizeEstados(e: unknown): EstadoColors | undefined {
  if (!e || typeof e !== "object") return undefined;
  const src = e as Record<string, unknown>;
  return {
    comprado: isHex(src.comprado) ? src.comprado : DEFAULT_ESTADOS.comprado,
    casillero: isHex(src.casillero) ? src.casillero : DEFAULT_ESTADOS.casillero,
    enviado: isHex(src.enviado) ? src.enviado : DEFAULT_ESTADOS.enviado,
    almacen: isHex(src.almacen) ? src.almacen : DEFAULT_ESTADOS.almacen,
  };
}

function sanitizeCustom(p: Partial<CustomThemeConfig>): CustomThemeConfig {
  const hue = typeof p.hue === "number" && Number.isFinite(p.hue) ? Math.min(360, Math.max(0, p.hue)) : DEFAULT_CUSTOM.hue;
  const sat = typeof p.sat === "number" && Number.isFinite(p.sat) ? Math.min(100, Math.max(0, p.sat)) : DEFAULT_CUSTOM.sat;
  const mode = p.mode === "claro" || p.mode === "oscuro" ? p.mode : DEFAULT_CUSTOM.mode;
  const estados = sanitizeEstados(p.estados);
  return estados ? { hue, sat, mode, estados } : { hue, sat, mode };
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: "azul",
  setThemeId: () => {},
  customConfig: DEFAULT_CUSTOM,
  setCustomConfig: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>("azul");
  const [customConfig, setCustomConfigState] = useState<CustomThemeConfig>(DEFAULT_CUSTOM);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((v) => {
      if (v) setThemeIdState(v as ThemeId);
    });
    AsyncStorage.getItem(CUSTOM_KEY).then((v) => {
      if (v) {
        try {
          const parsed = JSON.parse(v) as Partial<CustomThemeConfig>;
          setCustomConfigState(sanitizeCustom(parsed));
        } catch {
          // ignore corrupt value
        }
      }
    });
  }, []);

  function setThemeId(id: ThemeId) {
    setThemeIdState(id);
    AsyncStorage.setItem(THEME_KEY, id);
  }

  function setCustomConfig(cfg: CustomThemeConfig) {
    setCustomConfigState(cfg);
    AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(cfg));
  }

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, customConfig, setCustomConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

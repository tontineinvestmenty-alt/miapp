export type PresetThemeId = "azul" | "verde" | "morado" | "naranja" | "oscuro";
export type ThemeId = PresetThemeId | "custom";

export interface ColorPalette {
  text: string;
  tint: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  shadow: string;
  // colores por estado de pedido (theme-aware)
  estadoComprado: string;
  estadoCompradoBg: string;
  estadoCasillero: string;
  estadoCasilleroBg: string;
  estadoEnviado: string;
  estadoEnviadoBg: string;
  estadoAlmacen: string;
  estadoAlmacenBg: string;
}

const themes: Record<PresetThemeId, ColorPalette> = {
  azul: {
    text: "#11131a",
    tint: "#3b5bdb",
    background: "#f3f5fc",
    foreground: "#11131a",
    card: "#ffffff",
    cardForeground: "#11131a",
    primary: "#3b5bdb",
    primaryForeground: "#ffffff",
    secondary: "#e7edff",
    secondaryForeground: "#2846c0",
    muted: "#eef0f8",
    mutedForeground: "#6c748a",
    accent: "#dde6ff",
    accentForeground: "#2846c0",
    destructive: "#e03131",
    destructiveForeground: "#ffffff",
    border: "#e4e8f4",
    input: "#e4e8f4",
    shadow: "#3b5bdb",
    estadoComprado:    "#0284c7",
    estadoCompradoBg:  "#e0f2fe",
    estadoCasillero:   "#b45309",
    estadoCasilleroBg: "#fef3c7",
    estadoEnviado:     "#7c3aed",
    estadoEnviadoBg:   "#ede9fe",
    estadoAlmacen:     "#059669",
    estadoAlmacenBg:   "#d1fae5",
  },
  verde: {
    text: "#0d1f14",
    tint: "#2f9e44",
    background: "#f2faf5",
    foreground: "#0d1f14",
    card: "#ffffff",
    cardForeground: "#0d1f14",
    primary: "#2f9e44",
    primaryForeground: "#ffffff",
    secondary: "#d3f9d8",
    secondaryForeground: "#1a6e2e",
    muted: "#edf7f0",
    mutedForeground: "#4e7a5a",
    accent: "#c3f0cc",
    accentForeground: "#1a6e2e",
    destructive: "#e03131",
    destructiveForeground: "#ffffff",
    border: "#cdecd4",
    input: "#cdecd4",
    shadow: "#2f9e44",
    estadoComprado:    "#0891b2",
    estadoCompradoBg:  "#cffafe",
    estadoCasillero:   "#b45309",
    estadoCasilleroBg: "#fef3c7",
    estadoEnviado:     "#4338ca",
    estadoEnviadoBg:   "#e0e7ff",
    estadoAlmacen:     "#16a34a",
    estadoAlmacenBg:   "#dcfce7",
  },
  morado: {
    text: "#16103a",
    tint: "#6741d9",
    background: "#f6f3ff",
    foreground: "#16103a",
    card: "#ffffff",
    cardForeground: "#16103a",
    primary: "#6741d9",
    primaryForeground: "#ffffff",
    secondary: "#ede5ff",
    secondaryForeground: "#4b2db5",
    muted: "#f0eaff",
    mutedForeground: "#7060a0",
    accent: "#ddd4ff",
    accentForeground: "#4b2db5",
    destructive: "#e03131",
    destructiveForeground: "#ffffff",
    border: "#e4d8ff",
    input: "#e4d8ff",
    shadow: "#6741d9",
    estadoComprado:    "#0e7490",
    estadoCompradoBg:  "#cffafe",
    estadoCasillero:   "#b45309",
    estadoCasilleroBg: "#fef3c7",
    estadoEnviado:     "#9333ea",
    estadoEnviadoBg:   "#f3e8ff",
    estadoAlmacen:     "#0d9488",
    estadoAlmacenBg:   "#ccfbf1",
  },
  naranja: {
    text: "#3d1404",
    tint: "#e8590c",
    background: "#fef7f0",
    foreground: "#3d1404",
    card: "#ffffff",
    cardForeground: "#3d1404",
    primary: "#e8590c",
    primaryForeground: "#ffffff",
    secondary: "#ffe5d0",
    secondaryForeground: "#b34108",
    muted: "#fff0e6",
    mutedForeground: "#935535",
    accent: "#ffd4b2",
    accentForeground: "#b34108",
    destructive: "#cc2200",
    destructiveForeground: "#ffffff",
    border: "#ffd9bb",
    input: "#ffd9bb",
    shadow: "#e8590c",
    estadoComprado:    "#0284c7",
    estadoCompradoBg:  "#e0f2fe",
    estadoCasillero:   "#ca8a04",
    estadoCasilleroBg: "#fefce8",
    estadoEnviado:     "#c2410c",
    estadoEnviadoBg:   "#ffedd5",
    estadoAlmacen:     "#059669",
    estadoAlmacenBg:   "#d1fae5",
  },
  oscuro: {
    text: "#eef0f8",
    tint: "#748ffc",
    background: "#0d0e12",
    foreground: "#eef0f8",
    card: "#17181e",
    cardForeground: "#eef0f8",
    primary: "#748ffc",
    primaryForeground: "#0d0e12",
    secondary: "#1e2040",
    secondaryForeground: "#a5b4fc",
    muted: "#1e1f26",
    mutedForeground: "#7a7e94",
    accent: "#1e2040",
    accentForeground: "#a5b4fc",
    destructive: "#f03e3e",
    destructiveForeground: "#ffffff",
    border: "rgba(255,255,255,0.07)",
    input: "rgba(255,255,255,0.09)",
    shadow: "#748ffc",
    estadoComprado:    "#38bdf8",
    estadoCompradoBg:  "#0c2233",
    estadoCasillero:   "#fbbf24",
    estadoCasilleroBg: "#241c04",
    estadoEnviado:     "#a78bfa",
    estadoEnviadoBg:   "#1a1040",
    estadoAlmacen:     "#34d399",
    estadoAlmacenBg:   "#072718",
  },
};

// ── Custom theme support ──────────────────────────────────────────────
export interface CustomThemeConfig {
  hue: number; // 0-360
  sat: number; // 0-100
  mode: "claro" | "oscuro";
}

export const DEFAULT_CUSTOM: CustomThemeConfig = { hue: 280, sat: 72, mode: "claro" };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function buildCustomPalette(cfg: CustomThemeConfig): ColorPalette {
  const { hue, sat, mode } = cfg;
  if (mode === "oscuro") {
    const primary = hslToHex(hue, Math.min(sat + 10, 95), 70);
    return {
      text: hslToHex(hue, 20, 95),
      tint: primary,
      background: hslToHex(hue, 16, 7),
      foreground: hslToHex(hue, 20, 95),
      card: hslToHex(hue, 14, 11),
      cardForeground: hslToHex(hue, 20, 95),
      primary,
      primaryForeground: hslToHex(hue, 35, 10),
      secondary: hslToHex(hue, 32, 20),
      secondaryForeground: hslToHex(hue, 55, 82),
      muted: hslToHex(hue, 12, 15),
      mutedForeground: hslToHex(hue, 10, 60),
      accent: hslToHex(hue, 32, 22),
      accentForeground: hslToHex(hue, 55, 82),
      destructive: "#f03e3e",
      destructiveForeground: "#ffffff",
      border: "rgba(255,255,255,0.08)",
      input: "rgba(255,255,255,0.10)",
      shadow: primary,
      estadoComprado: "#38bdf8", estadoCompradoBg: "#0c2233",
      estadoCasillero: "#fbbf24", estadoCasilleroBg: "#241c04",
      estadoEnviado: "#a78bfa", estadoEnviadoBg: "#1a1040",
      estadoAlmacen: "#34d399", estadoAlmacenBg: "#072718",
    };
  }
  const primary = hslToHex(hue, sat, 50);
  const darkText = hslToHex(hue, Math.max(sat * 0.3, 15), 11);
  return {
    text: darkText,
    tint: primary,
    background: hslToHex(hue, Math.min(sat, 42), 97),
    foreground: darkText,
    card: "#ffffff",
    cardForeground: darkText,
    primary,
    primaryForeground: "#ffffff",
    secondary: hslToHex(hue, Math.min(sat, 78), 92),
    secondaryForeground: hslToHex(hue, Math.min(sat, 85), 38),
    muted: hslToHex(hue, Math.min(sat, 30), 95),
    mutedForeground: hslToHex(hue, Math.min(sat, 22), 47),
    accent: hslToHex(hue, Math.min(sat, 78), 89),
    accentForeground: hslToHex(hue, Math.min(sat, 85), 38),
    destructive: "#e03131",
    destructiveForeground: "#ffffff",
    border: hslToHex(hue, Math.min(sat, 42), 90),
    input: hslToHex(hue, Math.min(sat, 42), 90),
    shadow: primary,
    estadoComprado: "#0284c7", estadoCompradoBg: "#e0f2fe",
    estadoCasillero: "#b45309", estadoCasilleroBg: "#fef3c7",
    estadoEnviado: "#7c3aed", estadoEnviadoBg: "#ede9fe",
    estadoAlmacen: "#059669", estadoAlmacenBg: "#d1fae5",
  };
}

export const TEMAS: { id: PresetThemeId; label: string; color: string }[] = [
  { id: "azul",    label: "Azul",    color: "#3b5bdb" },
  { id: "verde",   label: "Verde",   color: "#2f9e44" },
  { id: "morado",  label: "Morado",  color: "#6741d9" },
  { id: "naranja", label: "Naranja", color: "#e8590c" },
  { id: "oscuro",  label: "Oscuro",  color: "#17181e" },
];

const colors = { themes, radius: 16 };
export default colors;

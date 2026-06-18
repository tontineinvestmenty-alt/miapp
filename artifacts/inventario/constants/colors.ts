export type ThemeId = "azul" | "verde" | "morado" | "naranja" | "oscuro";

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

const themes: Record<ThemeId, ColorPalette> = {
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

export const TEMAS: { id: ThemeId; label: string; color: string }[] = [
  { id: "azul",    label: "Azul",    color: "#3b5bdb" },
  { id: "verde",   label: "Verde",   color: "#2f9e44" },
  { id: "morado",  label: "Morado",  color: "#6741d9" },
  { id: "naranja", label: "Naranja", color: "#e8590c" },
  { id: "oscuro",  label: "Oscuro",  color: "#17181e" },
];

const colors = { themes, radius: 16 };
export default colors;

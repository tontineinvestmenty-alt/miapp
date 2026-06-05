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
}

const themes: Record<ThemeId, ColorPalette> = {
  azul: {
    text: "#0f172a",
    tint: "#1d4ed8",
    background: "#f8fafc",
    foreground: "#0f172a",
    card: "#ffffff",
    cardForeground: "#0f172a",
    primary: "#1d4ed8",
    primaryForeground: "#ffffff",
    secondary: "#eff6ff",
    secondaryForeground: "#1e40af",
    muted: "#f1f5f9",
    mutedForeground: "#64748b",
    accent: "#dbeafe",
    accentForeground: "#1e40af",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    border: "#e2e8f0",
    input: "#e2e8f0",
  },
  verde: {
    text: "#052e16",
    tint: "#16a34a",
    background: "#f0fdf4",
    foreground: "#052e16",
    card: "#ffffff",
    cardForeground: "#052e16",
    primary: "#16a34a",
    primaryForeground: "#ffffff",
    secondary: "#dcfce7",
    secondaryForeground: "#166534",
    muted: "#f0fdf4",
    mutedForeground: "#4a7c5e",
    accent: "#bbf7d0",
    accentForeground: "#166534",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    border: "#bbf7d0",
    input: "#bbf7d0",
  },
  morado: {
    text: "#1e1b4b",
    tint: "#7c3aed",
    background: "#faf5ff",
    foreground: "#1e1b4b",
    card: "#ffffff",
    cardForeground: "#1e1b4b",
    primary: "#7c3aed",
    primaryForeground: "#ffffff",
    secondary: "#ede9fe",
    secondaryForeground: "#4c1d95",
    muted: "#f5f3ff",
    mutedForeground: "#7c6aab",
    accent: "#ddd6fe",
    accentForeground: "#4c1d95",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    border: "#e4daff",
    input: "#e4daff",
  },
  naranja: {
    text: "#431407",
    tint: "#ea580c",
    background: "#fff7ed",
    foreground: "#431407",
    card: "#ffffff",
    cardForeground: "#431407",
    primary: "#ea580c",
    primaryForeground: "#ffffff",
    secondary: "#ffedd5",
    secondaryForeground: "#7c2d12",
    muted: "#fff7ed",
    mutedForeground: "#9a6344",
    accent: "#fed7aa",
    accentForeground: "#7c2d12",
    destructive: "#dc2626",
    destructiveForeground: "#ffffff",
    border: "#fed7aa",
    input: "#fed7aa",
  },
  oscuro: {
    text: "#f8fafc",
    tint: "#60a5fa",
    background: "#0f172a",
    foreground: "#f1f5f9",
    card: "#1e293b",
    cardForeground: "#f1f5f9",
    primary: "#60a5fa",
    primaryForeground: "#0f172a",
    secondary: "#1e3a5f",
    secondaryForeground: "#93c5fd",
    muted: "#1e293b",
    mutedForeground: "#94a3b8",
    accent: "#1e3a5f",
    accentForeground: "#93c5fd",
    destructive: "#f87171",
    destructiveForeground: "#ffffff",
    border: "#334155",
    input: "#334155",
  },
};

export const TEMAS: { id: ThemeId; label: string; color: string }[] = [
  { id: "azul",    label: "Azul",    color: "#1d4ed8" },
  { id: "verde",   label: "Verde",   color: "#16a34a" },
  { id: "morado",  label: "Morado",  color: "#7c3aed" },
  { id: "naranja", label: "Naranja", color: "#ea580c" },
  { id: "oscuro",  label: "Oscuro",  color: "#334155" },
];

const colors = { themes, radius: 12 };
export default colors;

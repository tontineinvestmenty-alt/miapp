import colors, { buildCustomPalette } from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

export function useColors() {
  const { themeId, customConfig } = useTheme();
  if (themeId === "custom") {
    return { ...buildCustomPalette(customConfig), radius: colors.radius };
  }
  const palette = colors.themes[themeId] ?? colors.themes.azul;
  return { ...palette, radius: colors.radius };
}

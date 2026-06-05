import colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

export function useColors() {
  const { themeId } = useTheme();
  const palette = colors.themes[themeId] ?? colors.themes.azul;
  return { ...palette, radius: colors.radius };
}

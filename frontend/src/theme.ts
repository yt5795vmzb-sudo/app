// Design tokens for TBIB-courses. Keys match the "color" block of /app/design_guidelines.json.
import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#F2F7F8",
  onSurface: "#0F1F24",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1B2E33",
  surfaceTertiary: "#E8F0F2",
  onSurfaceTertiary: "#35494F",
  surfaceInverse: "#0F1F24",
  onSurfaceInverse: "#FFFFFF",
  muted: "#64777D",

  brand: "#0B4F5C",
  brandDeep: "#06323B",
  onBrand: "#FFFFFF",
  brandPrimary: "#0E9F9A",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#5EEAD4",
  onBrandSecondary: "#0B4F5C",
  brandTertiary: "#DDF4F2",
  onBrandTertiary: "#0B4F5C",
  accent: "#E5484D",
  onAccent: "#FFFFFF",
  accentSoft: "#FDECEC",

  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#FFFFFF",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#6B7280",
  onInfo: "#FFFFFF",

  border: "#DCE7EA",
  borderStrong: "#C5D5D9",
  divider: "#EAF1F3",

  scrim: "rgba(4,30,36,0.82)",
  overlay: "rgba(6,50,59,0.45)",
  glass: "rgba(255,255,255,0.16)",
  glassBorder: "rgba(255,255,255,0.28)",
  star: "#F59E0B",
  warningSoft: "#FEF3C7",
  errorSoft: "#FEE2E2",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };
export const font = { sm: 12, base: 14, lg: 16, xl: 20, xxl: 24 };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

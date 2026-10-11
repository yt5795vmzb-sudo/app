import React from "react";
import { Text, View, StyleProp, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { makeStyles, useTheme, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { Icon, IconName } from "@/src/components/ui";

const ECG = "M0 20 H70 L78 20 L84 8 L90 32 L97 2 L104 38 L110 20 H180 L186 20 L191 12 L196 26 L201 20 H300";

export function EcgLine({ color, height = 40, opacity = 1, style }: { color?: string; height?: number; opacity?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ height, opacity }, style]} pointerEvents="none">
      <Svg width="100%" height={height} viewBox="0 0 300 40" preserveAspectRatio="none">
        <Path d={ECG} stroke={color ?? colors.brandSecondary} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const PATTERN: { icon: IconName; top: number; left?: number; right?: number; size: number }[] = [
  { icon: "plus-thick", top: 18, right: 24, size: 34 },
  { icon: "heart-pulse", top: 92, right: 110, size: 26 },
  { icon: "pill", top: 40, left: 140, size: 22 },
  { icon: "dna", top: 120, left: 16, size: 30 },
  { icon: "plus-thick", top: 150, right: 40, size: 18 },
];

export function MedPattern({ color }: { color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }} pointerEvents="none">
      {PATTERN.map((p, i) => (
        <View key={i} style={{ position: "absolute", top: p.top, left: p.left, right: p.right, opacity: 0.12 }}>
          <Icon name={p.icon} size={p.size} color={color ?? colors.onBrand} />
        </View>
      ))}
    </View>
  );
}

export function InstructorBadge({ type, small, testID, verified }: { type?: string | null; small?: boolean; testID?: string; verified?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t, row } = useI18n();
  if (!type) return null;
  const isDoc = type === "doctor";
  return (
    <View style={[{ flexDirection: row, gap: 4, alignItems: "center", flexWrap: "wrap" }]}>
      <View testID={testID} style={[styles.badge, { flexDirection: row, backgroundColor: isDoc ? colors.brandTertiary : colors.accentSoft }, small && styles.small]}>
        <Icon name={isDoc ? "doctor" : "school-outline"} size={small ? 12 : 14} color={isDoc ? colors.onBrandTertiary : colors.accent} />
        <Text style={[styles.text, small && { fontSize: 10 }, { color: isDoc ? colors.onBrandTertiary : colors.accent }]} numberOfLines={1}>
          {isDoc ? t("doctor") : t("topStudent")}
        </Text>
      </View>
      {verified && (
        <View testID={testID ? `${testID}-verified` : undefined} style={[styles.badge, { flexDirection: row, backgroundColor: colors.brand }, small && styles.small]}>
          <Icon name="check-decagram" size={small ? 12 : 14} color={colors.brandSecondary} />
          {!small && <Text style={[styles.text, { color: colors.onBrand }]}>{t("verified")}</Text>}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  badge: { alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start" },
  small: { paddingHorizontal: 6, paddingVertical: 2 },
  text: { fontSize: font.sm, fontWeight: "700" },
}));

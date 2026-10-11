import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme, spacing, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { Button, Icon } from "@/src/components/ui";
import { IMAGES } from "@/src/constants";
import { EcgLine } from "@/src/components/Medical";

export default function Welcome() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang, setLang, ta, row } = useI18n();

  return (
    <View style={styles.root} testID="welcome-screen">
      <Image source={{ uri: IMAGES.hero }} style={StyleSheetAbs} contentFit="cover" />
      <LinearGradient colors={["transparent", colors.scrim, colors.brandDeep]} locations={[0.05, 0.5, 1]} style={StyleSheetAbs} />
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm, flexDirection: row }]}>
        <View style={[styles.logo, { flexDirection: row }]}>
          <View style={styles.logoMark}><Icon name="stethoscope" size={20} color={colors.onBrand} /></View>
          <Text style={styles.logoText}>TBIB-courses</Text>
        </View>
        <Pressable testID="welcome-lang-toggle" onPress={() => setLang(lang === "ar" ? "fr" : "ar")} style={styles.lang}>
          <Text style={styles.langText}>{lang === "ar" ? "FR" : "عربي"}</Text>
        </Pressable>
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Animated.Text entering={FadeInDown.delay(100)} style={[styles.title, { textAlign: ta }]}>{t("tagline")}</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200)} style={[styles.sub, { textAlign: ta }]}>{t("heroSub")}</Animated.Text>
        <EcgLine height={36} style={{ marginVertical: spacing.xs }} />
        <Animated.View entering={FadeInDown.delay(250)} style={[styles.pills, { flexDirection: row }]}>
          {([["map-marker-radius", "statWilayas"], ["school-outline", "statYears"], ["doctor", "statTeachers"]] as const).map(([ic, k]) => (
            <View key={k} style={[styles.pill, { flexDirection: row }]} testID={`welcome-stat-${k}`}>
              <Icon name={ic} size={16} color={colors.brandSecondary} />
              <Text style={styles.pillText} numberOfLines={1}>{t(k)}</Text>
            </View>
          ))}
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(300)} style={{ gap: spacing.md, marginTop: spacing.lg }}>
          <Button testID="welcome-register-button" title={t("getStarted")} onPress={() => router.push("/auth?mode=register" as any)} />
          <Button testID="welcome-login-button" title={t("login")} variant="secondary" onPress={() => router.push("/auth?mode=login" as any)} />
        </Animated.View>
      </View>
    </View>
  );
}

const StyleSheetAbs = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.brand },
  top: { paddingHorizontal: spacing.lg, justifyContent: "space-between", alignItems: "center" },
  logo: { alignItems: "center", gap: spacing.sm },
  logoMark: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  logoText: { color: c.onBrand, fontSize: font.xl, fontWeight: "800", letterSpacing: -0.3 },
  lang: { minWidth: 56, height: 36, borderRadius: radius.pill, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  langText: { color: c.onBrand, fontWeight: "700" },
  bottom: { flex: 1, justifyContent: "flex-end", paddingHorizontal: spacing.lg, gap: spacing.sm },
  title: { color: c.onBrand, fontSize: 30, fontWeight: "800", lineHeight: 40 },
  sub: { color: c.brandTertiary, fontSize: font.lg, lineHeight: 24 },
  pills: { gap: spacing.sm, flexWrap: "wrap" },
  pill: { alignItems: "center", gap: 6, backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder, borderRadius: radius.pill, paddingHorizontal: spacing.md, height: 34 },
  pillText: { color: c.onBrand, fontSize: font.sm, fontWeight: "700" },
}));

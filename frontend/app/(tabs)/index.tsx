import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { makeStyles, useTheme, spacing, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { useAuth } from "@/src/auth";
import { api, Course } from "@/src/api";
import { usesNativeTabs } from "@/src/navigation";
import { Button, Chip, EmptyState, Icon, Loading, SelectSheet } from "@/src/components/ui";
import { CourseCard } from "@/src/components/CourseCard";
import { EcgLine, MedPattern } from "@/src/components/Medical";
import { LinearGradient } from "expo-linear-gradient";
import { MODULES, WILAYAS, YEARS, wilayaName } from "@/src/constants";

export default function Home() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const { t, lang, ta, row } = useI18n();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [wilaya, setWilaya] = useState<string | null>(null);
  const [module, setModule] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"wilaya" | "module" | null>(null);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (year) p.set("year", String(year));
    if (wilaya) p.set("wilaya", wilaya);
    if (module) p.set("module", module);
    try { setCourses(await api<Course[]>(`/courses?${p.toString()}`)); } catch { setError(true); }
  }, [q, year, wilaya, module]);

  useEffect(() => { const h = setTimeout(load, 300); return () => clearTimeout(h); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const wName = wilaya ? WILAYAS.find((w) => w.code === wilaya) : null;

  return (
    <View style={styles.root} testID="home-screen">
      <LinearGradient colors={[colors.brandDeep, colors.brand, colors.brandPrimary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <MedPattern />
        <View style={[styles.brandRow, { flexDirection: row }]}>
          <View style={[{ flexDirection: row, alignItems: "center", gap: spacing.sm }]}>
            <View style={styles.logoMark}><Icon name="stethoscope" size={18} color={colors.brand} /></View>
            <Text style={styles.brandText}>TBIB<Text style={{ color: colors.brandSecondary }}>-courses</Text></Text>
          </View>
          <View style={styles.pulse}><Icon name="heart-pulse" size={18} color={colors.accent} /></View>
        </View>
        <Text style={[styles.hello, { textAlign: ta }]} testID="home-greeting">{t("hello", { name: user?.name?.split(" ")[0] ?? "" })}</Text>
        <Text style={[styles.h1, { textAlign: ta }]}>{t("discover")}</Text>
        <EcgLine height={28} opacity={0.7} style={{ marginVertical: spacing.xs }} />
        <View style={[styles.search, { flexDirection: row }]}>
          <Icon name="magnify" size={20} color={colors.muted} />
          <TextInput testID="home-search-input" value={q} onChangeText={setQ} placeholder={t("search")} placeholderTextColor={colors.muted}
            style={[styles.searchInput, { textAlign: ta }]} returnKeyType="search" />
        </View>
      </LinearGradient>
      <View style={styles.chipRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip testID="filter-wilaya-chip" icon="chevron-down" selected={!!wilaya} onPress={() => setSheet("wilaya")}
            label={wName ? (lang === "ar" ? wName.ar : wName.fr) : t("wilaya")} />
          <Chip testID="filter-module-chip" icon="chevron-down" selected={!!module} onPress={() => setSheet("module")} label={module ?? t("module")} />
          <View style={styles.sep} />
          <Chip testID="filter-year-all" label={t("all")} selected={year === null} onPress={() => setYear(null)} />
          {YEARS.map((y) => <Chip key={y} testID={`filter-year-${y}`} label={t("year", { n: y })} selected={year === y} onPress={() => setYear(y)} />)}
        </ScrollView>
      </View>

      {courses === null && !error ? <Loading /> : error ? (
        <View style={styles.center}>
          <Text style={styles.errText} testID="home-error">{t("loadError")}</Text>
          <Button testID="home-retry-button" title={t("retry")} variant="secondary" onPress={load} />
        </View>
      ) : (
        <FlatList
          testID="home-course-list"
          data={courses}
          keyExtractor={(c) => c.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md, flexDirection: row }}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: bottomChrome + spacing.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
          ListHeaderComponent={courses && courses.length ? (
            <View style={[{ flexDirection: row, alignItems: "center", gap: spacing.sm }]}>
              <View style={styles.dot} />
              <Text style={styles.count} testID="home-course-count">{t("coursesFound", { n: courses.length })}</Text>
            </View>
          ) : null}
          ListEmptyComponent={<EmptyState testID="home-empty" text={t("noCourses")} />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 60)} style={{ flex: 1, maxWidth: "50%" }}>
              <CourseCard course={item} />
            </Animated.View>
          )}
        />
      )}

      <SelectSheet testID="wilaya-sheet" visible={sheet === "wilaya"} title={t("chooseWilaya")} selected={wilaya}
        options={WILAYAS.map((w) => ({ value: w.code, label: wilayaName(w.code, lang) }))}
        onSelect={setWilaya} onClose={() => setSheet(null)} />
      <SelectSheet testID="module-sheet" visible={sheet === "module"} title={t("chooseModule")} selected={module}
        options={MODULES.map((m) => ({ value: m, label: m }))} onSelect={setModule} onClose={() => setSheet(null)} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.xs, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, overflow: "hidden" },
  brandRow: { alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  logoMark: { width: 32, height: 32, borderRadius: radius.sm + 2, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  brandText: { fontSize: font.lg, fontWeight: "800", color: c.onBrand, letterSpacing: 0.3 },
  pulse: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  hello: { fontSize: font.base, color: c.brandSecondary, fontWeight: "600" },
  h1: { fontSize: font.xxl, fontWeight: "800", color: c.onBrand },
  search: { height: 50, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, alignItems: "center", paddingHorizontal: spacing.md, gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent },
  count: { fontSize: font.base, fontWeight: "700", color: c.onSurfaceTertiary },
  searchInput: { flex: 1, fontSize: font.base, color: c.onSurface, height: "100%" },
  chipRow: { height: 56, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: c.divider },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" },
  sep: { width: 1, height: 24, backgroundColor: c.border, flexShrink: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  errText: { color: c.error, fontSize: font.lg, textAlign: "center" },
}));

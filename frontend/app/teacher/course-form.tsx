import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme, spacing, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { useToast } from "@/src/toast";
import { api, Course, CourseDetail } from "@/src/api";
import { Button, Chip, Icon, Input, SelectSheet } from "@/src/components/ui";
import { MODULES, WILAYAS, YEARS, wilayaName } from "@/src/constants";
import { useAuth } from "@/src/auth";

export default function CourseForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { t, ta, row, lang, isRTL } = useI18n();
  const [f, setF] = useState({ title: "", description: "", module: "" as string, study_year: 1, wilaya: user?.wilaya ?? "16", price: "", cover_image: "" });
  const [sheet, setSheet] = useState<"module" | "wilaya" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<CourseDetail>(`/courses/${id}`).then(({ course: c }) =>
      setF({ title: c.title, description: c.description, module: c.module, study_year: c.study_year, wilaya: c.wilaya, price: String(c.price), cover_image: c.cover_image ?? "" }));
  }, [id]);

  const set = (k: keyof typeof f) => (v: any) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.title.trim() || !f.description.trim() || !f.module || f.price === "") { toast(t("required"), "error"); return; }
    setBusy(true);
    const body = { ...f, price: parseInt(f.price, 10) || 0, cover_image: f.cover_image.trim() || null };
    try {
      if (id) { await api(`/courses/${id}`, { method: "PUT", body }); toast(t("saved")); router.back(); }
      else { const c = await api<Course>("/courses", { method: "POST", body }); toast(t("saved")); router.replace(`/teacher/manage/${c.id}` as any); }
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  return (
    <View style={styles.root} testID="course-form-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, flexDirection: row }]}>
        <Pressable testID="course-form-back-button" onPress={() => router.back()} style={styles.back}><Icon name={isRTL ? "arrow-right" : "arrow-left"} /></Pressable>
        <Text style={styles.h1}>{id ? t("editCourse") : t("newCourse")}</Text>
      </View>
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Input testID="course-form-title-input" label={t("title")} value={f.title} onChangeText={set("title")} />
        <Input testID="course-form-description-input" label={t("description")} value={f.description} onChangeText={set("description")} multiline />
        <View style={{ gap: spacing.xs + 2 }}>
          <Text style={[styles.label, { textAlign: ta }]}>{t("module")}</Text>
          <Pressable testID="course-form-module-select" onPress={() => setSheet("module")} style={[styles.select, { flexDirection: row }]}>
            <Text style={[styles.selectText, !f.module && { color: colors.muted }]}>{f.module || t("chooseModule")}</Text>
            <Icon name="chevron-down" size={20} color={colors.muted} />
          </Pressable>
        </View>
        <View style={{ gap: spacing.xs + 2 }}>
          <Text style={[styles.label, { textAlign: ta }]}>{t("studyYear")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {YEARS.map((y) => <Chip key={y} testID={`course-form-year-${y}`} label={t("year", { n: y })} selected={f.study_year === y} onPress={() => set("study_year")(y)} />)}
          </ScrollView>
        </View>
        <View style={{ gap: spacing.xs + 2 }}>
          <Text style={[styles.label, { textAlign: ta }]}>{t("wilaya")}</Text>
          <Pressable testID="course-form-wilaya-select" onPress={() => setSheet("wilaya")} style={[styles.select, { flexDirection: row }]}>
            <Text style={styles.selectText}>{wilayaName(f.wilaya, lang)}</Text>
            <Icon name="chevron-down" size={20} color={colors.muted} />
          </Pressable>
        </View>
        <Input testID="course-form-price-input" label={t("price")} value={f.price} onChangeText={(v) => set("price")(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" />
        <Input testID="course-form-cover-input" label={t("coverImage")} value={f.cover_image} onChangeText={set("cover_image")} autoCapitalize="none" placeholder="https://..." />
        <Button testID="course-form-save-button" title={t("save")} onPress={save} loading={busy} style={{ marginTop: spacing.sm }} />
      </KeyboardAwareScrollView>
      <SelectSheet testID="course-form-module-sheet" visible={sheet === "module"} title={t("chooseModule")} selected={f.module}
        options={MODULES.map((m) => ({ value: m, label: m }))} onSelect={(v) => v && set("module")(v)} onClose={() => setSheet(null)} />
      <SelectSheet testID="course-form-wilaya-sheet" visible={sheet === "wilaya"} title={t("chooseWilaya")} selected={f.wilaya}
        options={WILAYAS.map((w) => ({ value: w.code, label: wilayaName(w.code, lang) }))} onSelect={(v) => v && set("wilaya")(v)} onClose={() => setSheet(null)} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, alignItems: "center", gap: spacing.md },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  h1: { fontSize: font.xl, fontWeight: "800", color: c.onSurface },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingTop: spacing.sm },
  label: { fontSize: font.sm + 1, fontWeight: "600", color: c.onSurfaceTertiary },
  select: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.md, alignItems: "center", justifyContent: "space-between" },
  selectText: { fontSize: font.lg, color: c.onSurface },
}));

import React, { useCallback, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme, spacing, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { useToast } from "@/src/toast";
import { api, CourseDetail } from "@/src/api";
import { Button, Icon, Input, Loading, formatPrice } from "@/src/components/ui";
import { IMAGES } from "@/src/constants";

export default function ManageCourse() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { t, ta, row, isRTL } = useI18n();
  const [data, setData] = useState<CourseDetail | null>(null);
  const [open, setOpen] = useState(false);
  const [lf, setLf] = useState({ title: "", content: "", video_url: "" });
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(async () => { try { setData(await api(`/courses/${id}`)); } catch (e: any) { toast(e.message, "error"); } }, [id, toast]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addLesson = async () => {
    if (!lf.title.trim()) { toast(t("required"), "error"); return; }
    setBusy(true);
    try {
      await api(`/courses/${id}/lessons`, { method: "POST", body: { title: lf.title.trim(), content: lf.content, video_url: lf.video_url.trim() || null } });
      toast(t("lessonAdded")); setOpen(false); setLf({ title: "", content: "", video_url: "" }); load();
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  const del = async (key: string, fn: () => Promise<void>) => {
    if (confirm !== key) { setConfirm(key); toast(t("confirmDelete"), "info"); setTimeout(() => setConfirm((c) => (c === key ? null : c)), 3000); return; }
    setConfirm(null);
    try { await fn(); toast(t("deleted")); } catch (e: any) { toast(e.message, "error"); }
  };

  if (!data) return <View style={styles.root}><Loading /></View>;
  const { course, lessons } = data;

  return (
    <View style={styles.root} testID="manage-course-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, flexDirection: row }]}>
        <Pressable testID="manage-back-button" onPress={() => router.back()} style={styles.back}><Icon name={isRTL ? "arrow-right" : "arrow-left"} /></Pressable>
        <Text style={[styles.h1, { flex: 1, textAlign: ta }]} numberOfLines={1}>{t("manageCourse")}</Text>
        <Pressable testID="manage-edit-button" onPress={() => router.push(`/teacher/course-form?id=${id}` as any)} style={styles.back}><Icon name="pencil-outline" color={colors.brand} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Pressable testID="manage-preview-course" onPress={() => router.push(`/course/${id}` as any)} style={[styles.card, { flexDirection: row }]}>
          <Image source={{ uri: course.cover_image || IMAGES.courseFallback }} style={styles.thumb} contentFit="cover" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.cTitle, { textAlign: ta }]} numberOfLines={2}>{course.title}</Text>
            <Text style={[styles.meta, { textAlign: ta }]}>{course.module} · {t("year", { n: course.study_year })}</Text>
            <Text style={[styles.price, { textAlign: ta }]}>{formatPrice(course.price, t("da"), t("free"))}</Text>
          </View>
        </Pressable>

        <View style={[{ flexDirection: row, justifyContent: "space-between", alignItems: "center" }]}>
          <Text style={styles.section}>{t("curriculum")} ({lessons.length})</Text>
          <Button testID="manage-add-lesson-button" title={t("addLesson")} icon="plus" small onPress={() => setOpen(true)} />
        </View>
        <View style={styles.list}>
          {lessons.length === 0 && <Text style={[styles.meta, { padding: spacing.lg, textAlign: "center" }]} testID="manage-no-lessons">{t("noLessons")}</Text>}
          {lessons.map((l, i) => (
            <View key={l.id} style={[styles.lesson, { flexDirection: row }, i < lessons.length - 1 && styles.border]} testID={`manage-lesson-${l.id}`}>
              <View style={styles.num}><Text style={styles.numText}>{i + 1}</Text></View>
              <Pressable style={{ flex: 1 }} onPress={() => router.push(`/lesson/${l.id}` as any)}>
                <Text style={[styles.lTitle, { textAlign: ta }]}>{l.title}</Text>
                <Text style={[styles.meta, { textAlign: ta }]}>{l.has_video ? `${t("video")} + ${t("text")}` : t("text")}</Text>
              </Pressable>
              <Pressable testID={`manage-delete-lesson-${l.id}`} hitSlop={8} style={styles.iconBtn}
                onPress={() => del(l.id, async () => { await api(`/lessons/${l.id}`, { method: "DELETE" }); await load(); })}>
                <Icon name={confirm === l.id ? "alert-circle" : "trash-can-outline"} size={20} color={colors.error} />
              </Pressable>
            </View>
          ))}
        </View>

        <Button testID="manage-delete-course-button" title={confirm === "course" ? t("confirmDelete") : t("delete")} icon="trash-can-outline" variant="danger"
          onPress={() => del("course", async () => { await api(`/courses/${id}`, { method: "DELETE" }); router.back(); })} />
      </ScrollView>

      <Modal visible={open} animationType="slide" presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined} onRequestClose={() => setOpen(false)}>
        <View style={[styles.root, { paddingTop: Platform.OS === "ios" ? spacing.lg : insets.top + spacing.sm }]} testID="add-lesson-modal">
          <View style={[styles.header, { flexDirection: row }]}>
            <Text style={[styles.h1, { flex: 1, textAlign: ta }]}>{t("addLesson")}</Text>
            <Pressable testID="add-lesson-close" onPress={() => setOpen(false)} style={styles.back}><Icon name="close" /></Pressable>
          </View>
          <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
            <Input testID="lesson-title-input" label={t("lessonTitle")} value={lf.title} onChangeText={(v) => setLf((p) => ({ ...p, title: v }))} />
            <Input testID="lesson-video-input" label={t("videoUrl")} value={lf.video_url} onChangeText={(v) => setLf((p) => ({ ...p, video_url: v }))} autoCapitalize="none" placeholder="https://youtube.com/..." />
            <Input testID="lesson-content-input" label={t("lessonContent")} value={lf.content} onChangeText={(v) => setLf((p) => ({ ...p, content: v }))} multiline style={{ minHeight: 200 }} />
            <Button testID="lesson-save-button" title={t("save")} onPress={addLesson} loading={busy} />
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, alignItems: "center", gap: spacing.md },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  h1: { fontSize: font.xl, fontWeight: "800", color: c.onSurface },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingTop: spacing.sm },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.md, alignItems: "center", borderWidth: 1, borderColor: c.border },
  thumb: { width: 72, height: 72, borderRadius: radius.sm + 2 },
  cTitle: { fontSize: font.lg, fontWeight: "700", color: c.onSurface },
  meta: { fontSize: font.sm, color: c.muted },
  price: { fontSize: font.base, fontWeight: "800", color: c.brand },
  section: { fontSize: font.lg, fontWeight: "800", color: c.onSurface },
  list: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  lesson: { alignItems: "center", gap: spacing.md, padding: spacing.md, minHeight: 64 },
  border: { borderBottomWidth: 1, borderBottomColor: c.divider },
  num: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  numText: { fontWeight: "800", color: c.onBrandTertiary },
  lTitle: { fontSize: font.base + 1, fontWeight: "700", color: c.onSurface },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
}));

import React, { useCallback, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme, spacing, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { useAuth } from "@/src/auth";
import { useToast } from "@/src/toast";
import { api, CourseDetail, Review } from "@/src/api";
import { Button, Icon, Input, Loading, Segmented, Stars, formatPrice } from "@/src/components/ui";
import { IMAGES, wilayaName } from "@/src/constants";
import { InstructorBadge } from "@/src/components/Medical";

export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { t, ta, row, lang, isRTL } = useI18n();
  const [data, setData] = useState<CourseDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tab, setTab] = useState<"curriculum" | "reviews">("curriculum");
  const [error, setError] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [d, r] = await Promise.all([api<CourseDetail>(`/courses/${id}`), api<Review[]>(`/courses/${id}/reviews`)]);
      setData(d); setReviews(r);
    } catch { setError(true); }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submitReview = async () => {
    setBusy(true);
    try { await api(`/courses/${id}/reviews`, { method: "POST", body: { rating, comment } }); toast(t("reviewSaved")); setReviewOpen(false); setComment(""); load(); }
    catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)" as any));

  if (error) return (
    <View style={[styles.root, { alignItems: "center", justifyContent: "center", gap: spacing.md }]}>
      <Text style={{ color: colors.error }} testID="course-error">{t("loadError")}</Text>
      <Button testID="course-retry-button" title={t("retry")} variant="secondary" onPress={load} />
    </View>
  );
  if (!data) return <View style={styles.root}><Loading /></View>;

  const { course, lessons, enrollment, is_owner, has_access, teacher } = data;
  const isStudent = user?.role === "student";
  const canReview = has_access && !is_owner;

  let cta: React.ReactNode = null;
  if (is_owner) cta = <Button testID="course-manage-button" title={t("manageCourse")} icon="cog-outline" variant="dark" onPress={() => router.push(`/teacher/manage/${course.id}` as any)} />;
  else if (isStudent) {
    if (enrollment?.status === "approved") cta = <Button testID="course-start-button" title={t("startLearning")} icon="play-circle-outline" disabled={!lessons.length} onPress={() => lessons[0] && router.push(`/lesson/${lessons[0].id}` as any)} />;
    else if (enrollment?.status === "pending") cta = <Button testID="course-pending-button" title={t("pendingApproval")} icon="clock-outline" variant="secondary" disabled />;
    else cta = <Button testID="course-enroll-button" title={`${t("requestEnroll")} · ${formatPrice(course.price, t("da"), t("free"))}`} onPress={() => router.push(`/checkout/${course.id}` as any)} />;
  }

  return (
    <View style={styles.root} testID="course-detail-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: (cta ? 96 : 0) + insets.bottom + spacing.lg }}>
        <View style={styles.hero}>
          <Image source={{ uri: course.cover_image || IMAGES.courseFallback }} style={styles.heroImg} contentFit="cover" transition={200} />
          <LinearGradient colors={["rgba(0,0,0,0.35)", "transparent", colors.scrim]} locations={[0, 0.35, 1]} style={styles.heroImg} />
          <View style={[styles.heroTop, { paddingTop: insets.top + spacing.sm, flexDirection: row }]}>
            <Pressable testID="course-back-button" onPress={back} style={styles.circle}><Icon name={isRTL ? "arrow-right" : "arrow-left"} color={colors.onBrand} /></Pressable>
          </View>
          <View style={styles.heroBottom}>
            <View style={[{ flexDirection: row, gap: spacing.sm }]}>
              <View style={styles.tag}><Text style={styles.tagText}>{course.module}</Text></View>
              <View style={styles.tag}><Text style={styles.tagText}>{t("year", { n: course.study_year })}</Text></View>
            </View>
            <Text style={[styles.title, { textAlign: ta }]} testID="course-title">{course.title}</Text>
            <View style={[{ flexDirection: row, alignItems: "center", gap: spacing.sm }]}>
              <Stars value={course.rating_avg} />
              <Text style={styles.heroMeta}>{course.rating_count ? course.rating_avg.toFixed(1) : "—"} ({course.rating_count})</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={[styles.statsRow, { flexDirection: row }]}>
            <Stat icon="cash" label={formatPrice(course.price, t("da"), t("free"))} testID="course-price" />
            <Stat icon="play-box-multiple-outline" label={`${course.lessons_count} ${t("lessons")}`} />
            <Stat icon="account-group-outline" label={`${course.students_count} ${t("studentsCount")}`} />
          </View>

          {teacher && (
            <View style={[styles.teacher, { flexDirection: row }]} testID="course-teacher">
              <View style={styles.tAvatar}><Icon name="doctor" size={24} color={colors.onBrand} /></View>
              <View style={{ flex: 1 }}>
                <View style={[{ flexDirection: row, alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }]}>
                  <Text style={styles.tName}>{teacher.name}</Text>
                  <InstructorBadge type={teacher.instructor_type} verified={teacher.verified} testID="course-teacher-badge" />
                </View>
                <Text style={[styles.tBio, { textAlign: ta }]} numberOfLines={2}>{teacher.bio || wilayaName(course.wilaya, lang)}</Text>
              </View>
            </View>
          )}

          <Text style={[styles.desc, { textAlign: ta }]}>{course.description}</Text>
          <View style={[{ flexDirection: row, alignItems: "center", gap: 6 }]}>
            <Icon name="map-marker-outline" size={16} color={colors.muted} />
            <Text style={styles.meta}>{wilayaName(course.wilaya, lang)}</Text>
          </View>

          <Segmented testID="course-tabs" value={tab} onChange={setTab}
            options={[{ value: "curriculum", label: t("curriculum") }, { value: "reviews", label: `${t("reviews")} (${reviews.length})` }]} />

          {tab === "curriculum" ? (
            <View style={styles.list}>
              {lessons.length === 0 && <Text style={styles.meta}>{t("noLessons")}</Text>}
              {lessons.map((l, i) => (
                <Pressable key={l.id} testID={`lesson-row-${l.id}`}
                  onPress={() => (has_access ? router.push(`/lesson/${l.id}` as any) : toast(t("locked"), "info"))}
                  style={[styles.lesson, { flexDirection: row }, i < lessons.length - 1 && styles.lessonBorder]}>
                  <View style={styles.num}><Text style={styles.numText}>{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.lTitle, { textAlign: ta }]}>{l.title}</Text>
                    <Text style={[styles.meta, { textAlign: ta }]}>{l.has_video ? `${t("video")} + ${t("text")}` : t("text")}</Text>
                  </View>
                  <Icon name={has_access ? (l.has_video ? "play-circle" : "file-document-outline") : "lock-outline"} size={22} color={has_access ? colors.brandPrimary : colors.muted} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              {canReview && <Button testID="course-write-review-button" title={t("writeReview")} icon="star-outline" variant="secondary" onPress={() => setReviewOpen(true)} />}
              {reviews.length === 0 && <Text style={[styles.meta, { textAlign: "center" }]} testID="reviews-empty">{t("noReviews")}</Text>}
              {reviews.map((r) => (
                <View key={r.id} style={styles.review} testID={`review-${r.id}`}>
                  <View style={[{ flexDirection: row, justifyContent: "space-between", alignItems: "center" }]}>
                    <Text style={styles.lTitle}>{r.student_name}</Text>
                    <Stars value={r.rating} />
                  </View>
                  {!!r.comment && <Text style={[styles.desc, { textAlign: ta }]}>{r.comment}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {cta && (
        <BlurView intensity={60} tint="light" style={[styles.ctaBar, { paddingBottom: insets.bottom + spacing.md }]}>
          {cta}
        </BlurView>
      )}

      <Modal visible={reviewOpen} transparent animationType="slide" onRequestClose={() => setReviewOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={styles.overlay} onPress={() => setReviewOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]} testID="review-sheet">
            <Text style={[styles.sheetTitle, { textAlign: ta }]}>{t("writeReview")}</Text>
            <View style={{ alignItems: "center" }}><Stars testID="review-stars" value={rating} size={34} onChange={setRating} /></View>
            <Input testID="review-comment-input" placeholder={t("comment")} value={comment} onChangeText={setComment} multiline />
            <Button testID="review-submit-button" title={t("submit")} onPress={submitReview} loading={busy} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Stat({ icon, label, testID }: { icon: any; label: string; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.stat} testID={testID}>
      <Icon name={icon} size={18} color={colors.brandPrimary} />
      <Text style={styles.statText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  hero: { height: 320, backgroundColor: c.brand },
  heroImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  heroTop: { paddingHorizontal: spacing.lg },
  circle: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center" },
  heroBottom: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg, gap: spacing.sm },
  tag: { backgroundColor: c.brandTertiary, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  tagText: { fontSize: font.sm, fontWeight: "700", color: c.onBrandTertiary },
  title: { fontSize: 26, fontWeight: "800", color: c.onBrand, lineHeight: 32 },
  heroMeta: { color: c.onBrand, fontSize: font.sm, fontWeight: "600" },
  body: { padding: spacing.lg, gap: spacing.lg },
  statsRow: { gap: spacing.sm },
  stat: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.sm, alignItems: "center", gap: 4 },
  statText: { fontSize: font.sm, fontWeight: "700", color: c.onSurface },
  teacher: { alignItems: "center", gap: spacing.md, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: c.border },
  tAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" },
  tName: { fontSize: font.lg, fontWeight: "800", color: c.onBrandTertiary },
  tBio: { fontSize: font.sm, color: c.onBrandTertiary },
  desc: { fontSize: font.base + 1, lineHeight: 23, color: c.onSurfaceTertiary },
  meta: { fontSize: font.sm, color: c.muted },
  list: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  lesson: { alignItems: "center", gap: spacing.md, padding: spacing.md, minHeight: 64 },
  lessonBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
  num: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  numText: { fontWeight: "800", color: c.onSurfaceTertiary },
  lTitle: { fontSize: font.base + 1, fontWeight: "700", color: c.onSurface },
  review: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.md, gap: spacing.xs },
  ctaBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.border, overflow: "hidden" },
  overlay: { flex: 1, backgroundColor: c.overlay },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.lg },
  sheetTitle: { fontSize: font.xl, fontWeight: "800", color: c.onSurface },
}));

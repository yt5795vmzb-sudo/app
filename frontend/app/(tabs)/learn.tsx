import React, { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme, spacing, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { useAuth } from "@/src/auth";
import { useToast } from "@/src/toast";
import { api, Course, Enrollment } from "@/src/api";
import { usesNativeTabs } from "@/src/navigation";
import { Badge, Button, EmptyState, Icon, Loading, Segmented, formatPrice } from "@/src/components/ui";
import { IMAGES, wilayaName } from "@/src/constants";
import { ProtectedImage } from "@/src/components/ImageUpload";

export default function Learn() {
  const { user } = useAuth();
  return user?.role === "teacher" ? <TeacherDashboard /> : <StudentCourses />;
}

function StudentCourses() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const router = useRouter();
  const { t, ta, row } = useI18n();
  const { colors } = useTheme();
  const [items, setItems] = useState<Enrollment[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => { try { setItems(await api("/me/enrollments")); } catch { setItems([]); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.root} testID="student-courses-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={[styles.h1, { textAlign: ta }]}>{t("learn")}</Text>
      </View>
      {items === null ? <Loading /> : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: bottomChrome + spacing.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState testID="learn-empty" text={t("noEnrollments")}
            action={<Button testID="learn-browse-button" title={t("browse")} small onPress={() => router.navigate("/(tabs)" as any)} />} />}
          renderItem={({ item }) => (
            <Pressable testID={`enrollment-row-${item.id}`} onPress={() => router.push(`/course/${item.course_id}` as any)} style={[styles.row, { flexDirection: row }]}>
              <Image source={{ uri: item.course?.cover_image || IMAGES.courseFallback }} style={styles.thumb} contentFit="cover" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.rowTitle, { textAlign: ta }]} numberOfLines={2}>{item.course_title}</Text>
                <Text style={[styles.rowSub, { textAlign: ta }]} numberOfLines={1}>{item.course?.teacher_name}</Text>
                <View style={{ alignItems: ta === "right" ? "flex-end" : "flex-start" }}><Badge status={item.status} /></View>
              </View>
              <Icon name={ta === "right" ? "chevron-left" : "chevron-right"} color={colors.muted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function TeacherDashboard() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { t, ta, row, lang } = useI18n();
  const [tab, setTab] = useState<"courses" | "requests">("requests");
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [requests, setRequests] = useState<Enrollment[] | null>(null);
  const [stats, setStats] = useState<{ courses: number; students: number; pending: number; revenue: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, r, s] = await Promise.all([api("/teacher/courses"), api("/teacher/requests"), api("/teacher/stats")]);
      setCourses(c); setRequests(r); setStats(s);
    } catch (e: any) { toast(e.message, "error"); }
  }, [toast]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (id: string, action: "approve" | "reject") => {
    setBusy(id + action);
    try { await api(`/enrollments/${id}/${action}`, { method: "POST" }); toast(t(action === "approve" ? "approved" : "rejected")); await load(); }
    catch (e: any) { toast(e.message, "error"); } finally { setBusy(null); }
  };

  const statItems = stats ? [
    { k: "stat-courses", v: stats.courses, l: t("coursesCount"), i: "book-multiple" as const },
    { k: "stat-students", v: stats.students, l: t("studentsCount"), i: "account-group" as const },
    { k: "stat-pending", v: stats.pending, l: t("pending"), i: "clock-outline" as const },
    { k: "stat-revenue", v: `${stats.revenue.toLocaleString("fr-DZ")}`, l: `${t("revenue")} (${t("da")})`, i: "cash" as const },
  ] : [];

  const header = (
    <View style={{ gap: spacing.lg }}>
      <View style={[styles.stats, { flexDirection: row }]}>
        {statItems.map((s) => (
          <View key={s.k} style={styles.stat} testID={s.k}>
            <Icon name={s.i} size={18} color={colors.brandPrimary} />
            <Text style={styles.statV} numberOfLines={1}>{s.v}</Text>
            <Text style={styles.statL} numberOfLines={1}>{s.l}</Text>
          </View>
        ))}
      </View>
      <Segmented testID="dashboard-tabs" value={tab} onChange={setTab}
        options={[{ value: "requests", label: `${t("requests")}${stats?.pending ? ` (${stats.pending})` : ""}` }, { value: "courses", label: t("myCourses") }]} />
    </View>
  );

  return (
    <View style={styles.root} testID="teacher-dashboard-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, flexDirection: row, alignItems: "center", justifyContent: "space-between" }]}>
        <Text style={styles.h1}>{t("dashboard")}</Text>
        <Button testID="dashboard-new-course-button" title={t("newCourse")} icon="plus" small onPress={() => router.push("/teacher/course-form" as any)} />
      </View>
      {courses === null ? <Loading /> : tab === "requests" ? (
        <FlatList
          key="requests"
          data={requests ?? []}
          keyExtractor={(i) => i.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: bottomChrome + spacing.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState testID="requests-empty" text={t("noRequests")} />}
          renderItem={({ item }) => (
            <View style={styles.req} testID={`request-row-${item.id}`}>
              <View style={[{ flexDirection: row, justifyContent: "space-between", alignItems: "center" }]}>
                <Text style={styles.rowTitle}>{item.student_name}</Text>
                <Badge status={item.status} />
              </View>
              <Text style={[styles.rowSub, { textAlign: ta }]} numberOfLines={1}>{item.course_title}</Text>
              <Text style={[styles.meta, { textAlign: ta }]}>
                {wilayaName(item.student_wilaya, lang)} · {item.payment_method === "ccp" ? t("ccp") : t("baridimob")} · {formatPrice(item.price, t("da"), t("free"))}
              </Text>
              <View style={[styles.refBox, { flexDirection: row }]}>
                {!!item.receipt_path && <ProtectedImage path={item.receipt_path} testID={`request-receipt-${item.id}`} size={56} />}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.refLabel, { textAlign: ta }]}>{item.receipt_path ? t("viewReceipt") : t("ref")}</Text>
                  <Text style={[styles.refVal, { textAlign: ta }]} selectable testID={`request-ref-${item.id}`}>{item.payment_ref || "—"}</Text>
                </View>
              </View>
              {!!item.note && <Text style={[styles.meta, { textAlign: ta }]}>“{item.note}”</Text>}
              {item.status === "pending" && (
                <View style={[{ flexDirection: row, gap: spacing.sm, marginTop: spacing.xs }]}>
                  <Button testID={`request-approve-${item.id}`} title={t("approve")} icon="check" small style={{ flex: 1 }}
                    loading={busy === item.id + "approve"} onPress={() => act(item.id, "approve")} />
                  <Button testID={`request-reject-${item.id}`} title={t("reject")} variant="secondary" small style={{ flex: 1 }}
                    loading={busy === item.id + "reject"} onPress={() => act(item.id, "reject")} />
                </View>
              )}
            </View>
          )}
        />
      ) : (
        <FlatList
          key="courses"
          data={courses}
          keyExtractor={(i) => i.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: bottomChrome + spacing.lg }}
          ListEmptyComponent={<EmptyState testID="teacher-courses-empty" text={t("noTeacherCourses")} />}
          renderItem={({ item }) => (
            <Pressable testID={`teacher-course-row-${item.id}`} onPress={() => router.push(`/teacher/manage/${item.id}` as any)} style={[styles.row, { flexDirection: row }]}>
              <Image source={{ uri: item.cover_image || IMAGES.courseFallback }} style={styles.thumb} contentFit="cover" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.rowTitle, { textAlign: ta }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.meta, { textAlign: ta }]}>{item.lessons_count} {t("lessons")} · {item.students_count} {t("studentsCount")}</Text>
                <Text style={[styles.price, { textAlign: ta }]}>{formatPrice(item.price, t("da"), t("free"))}</Text>
              </View>
              <Icon name="pencil-outline" color={colors.muted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  h1: { fontSize: font.xxl, fontWeight: "800", color: c.onSurface },
  row: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.md, alignItems: "center", borderWidth: 1, borderColor: c.border },
  thumb: { width: 72, height: 72, borderRadius: radius.sm + 2, backgroundColor: c.surfaceTertiary },
  rowTitle: { fontSize: font.lg, fontWeight: "700", color: c.onSurface },
  rowSub: { fontSize: font.base, color: c.onSurfaceTertiary },
  meta: { fontSize: font.sm, color: c.muted },
  price: { fontSize: font.base, fontWeight: "800", color: c.brand },
  stats: { gap: spacing.sm },
  stat: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.sm, gap: 2, borderWidth: 1, borderColor: c.border, alignItems: "center" },
  statV: { fontSize: font.lg, fontWeight: "800", color: c.onSurface },
  statL: { fontSize: 10, color: c.muted, fontWeight: "600" },
  req: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs + 2, borderWidth: 1, borderColor: c.border },
  refBox: { backgroundColor: c.brandTertiary, borderRadius: radius.sm, padding: spacing.sm, gap: spacing.sm, alignItems: "center" },
  refLabel: { fontSize: font.sm, color: c.onBrandTertiary, fontWeight: "600" },
  refVal: { fontSize: font.base, color: c.onBrandTertiary, fontWeight: "800", flexShrink: 1 },
}));

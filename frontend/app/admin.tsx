import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Modal, Platform, Pressable, RefreshControl, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme, spacing, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { useAuth } from "@/src/auth";
import { useToast } from "@/src/toast";
import { api, User } from "@/src/api";
import { Button, EmptyState, Icon, Input, Loading, Segmented } from "@/src/components/ui";
import { EcgLine, InstructorBadge, MedPattern } from "@/src/components/Medical";
import { ProtectedImage } from "@/src/components/ImageUpload";
import { wilayaName } from "@/src/constants";

type Status = "pending" | "approved" | "rejected";

export default function Admin() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { t, ta, row, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Status>("pending");
  const [items, setItems] = useState<User[] | null>(null);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<User | null>(null);
  const [reason, setReason] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [l, s] = await Promise.all([api<User[]>(`/admin/verifications?status=${tab}`), api("/admin/stats")]);
      setItems(l); setStats(s);
    } catch (e: any) { toast(e.message, "error"); }
  }, [tab, toast]);
  useEffect(() => { setItems(null); load(); }, [load]);

  if (!user || user.role !== "admin") return <Redirect href={"/" as any} />;

  const approve = async (u: User) => {
    setBusy(u.id);
    try { await api(`/admin/verifications/${u.id}/approve`, { method: "POST" }); toast(t("approved")); load(); }
    catch (e: any) { toast(e.message, "error"); } finally { setBusy(null); }
  };
  const reject = async () => {
    if (!rejecting) return;
    setBusy(rejecting.id);
    try {
      await api(`/admin/verifications/${rejecting.id}/reject`, { method: "POST", body: { reason: reason.trim() || null } });
      toast(t("rejected")); setRejecting(null); setReason(""); load();
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(null); }
  };

  const statItems = stats ? [
    { k: "pending", v: stats.pending, l: t("pending"), i: "clock-outline" as const },
    { k: "verified", v: stats.verified, l: t("verified"), i: "check-decagram" as const },
    { k: "instructors", v: stats.instructors, l: t("instructors"), i: "doctor" as const },
    { k: "students", v: stats.students, l: t("studentsCount"), i: "account-group" as const },
  ] : [];

  return (
    <View style={styles.root} testID="admin-screen">
      <LinearGradient colors={[colors.brandDeep, colors.brand]} style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <MedPattern />
        <View style={[{ flexDirection: row, justifyContent: "space-between", alignItems: "center" }]}>
          <View style={[{ flexDirection: row, alignItems: "center", gap: spacing.sm }]}>
            <View style={styles.logo}><Icon name="shield-crown-outline" size={20} color={colors.brand} /></View>
            <Text style={styles.brand}>TBIB Admin</Text>
          </View>
          <View style={[{ flexDirection: row, gap: spacing.sm }]}>
            <Pressable testID="admin-lang-toggle" onPress={() => setLang(lang === "ar" ? "fr" : "ar")} style={styles.hBtn}>
              <Text style={styles.hBtnText}>{lang === "ar" ? "FR" : "ع"}</Text>
            </Pressable>
            <Pressable testID="admin-logout-button" onPress={async () => { await logout(); router.replace("/welcome" as any); }} style={styles.hBtn}>
              <Icon name="logout" size={20} color={colors.onBrand} />
            </Pressable>
          </View>
        </View>
        <Text style={[styles.h1, { textAlign: ta }]}>{t("adminTitle")}</Text>
        <EcgLine height={24} opacity={0.6} />
        <View style={[styles.stats, { flexDirection: row }]}>
          {statItems.map((s) => (
            <View key={s.k} style={styles.stat} testID={`admin-stat-${s.k}`}>
              <Icon name={s.i} size={16} color={colors.brandSecondary} />
              <Text style={styles.statV}>{s.v}</Text>
              <Text style={styles.statL} numberOfLines={1}>{s.l}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Segmented testID="admin-tabs" value={tab} onChange={setTab}
          options={[{ value: "pending", label: t("pending") }, { value: "approved", label: t("approved") }, { value: "rejected", label: t("rejected") }]} />
      </View>

      {items === null ? <Loading /> : (
        <FlatList
          data={items}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState testID="admin-empty" text={t("noVerifications")} />}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`admin-verification-${item.id}`}>
              <View style={[{ flexDirection: row, gap: spacing.md }]}>
                {!!item.verification_doc && <ProtectedImage path={item.verification_doc} testID={`admin-doc-${item.id}`} size={84} />}
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.name, { textAlign: ta }]}>{item.name}</Text>
                  <Text style={[styles.meta, { textAlign: ta }]}>{item.email}</Text>
                  <View style={{ alignItems: ta === "right" ? "flex-end" : "flex-start" }}>
                    <InstructorBadge type={item.instructor_type} verified={item.verified} small />
                  </View>
                  <Text style={[styles.meta, { textAlign: ta }]}>
                    {wilayaName(item.wilaya, lang)}{item.study_year ? ` · ${t("year", { n: item.study_year })}` : ""} · {item.courses_count ?? 0} {t("coursesCount")}
                  </Text>
                </View>
              </View>
              {!!item.bio && <Text style={[styles.note, { textAlign: ta }]}>{item.bio}</Text>}
              {!!item.verification_note && <Text style={[styles.note, { textAlign: ta }]}>“{item.verification_note}”</Text>}
              {!!item.verification_reason && <Text style={[styles.reason, { textAlign: ta }]}>{item.verification_reason}</Text>}
              <View style={[{ flexDirection: row, gap: spacing.sm }]}>
                {tab !== "approved" && (
                  <Button testID={`admin-approve-${item.id}`} title={t("approve")} icon="check-decagram" small style={{ flex: 1 }}
                    loading={busy === item.id && !rejecting} onPress={() => approve(item)} />
                )}
                {tab !== "rejected" && (
                  <Button testID={`admin-reject-${item.id}`} title={t("reject")} variant="danger" small style={{ flex: 1 }}
                    onPress={() => setRejecting(item)} />
                )}
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={!!rejecting} transparent animationType="slide" onRequestClose={() => setRejecting(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={styles.overlay} onPress={() => setRejecting(null)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]} testID="admin-reject-sheet">
            <Text style={[styles.name, { textAlign: ta }]}>{t("reject")} · {rejecting?.name}</Text>
            <Input testID="admin-reject-reason-input" placeholder={t("reason")} value={reason} onChangeText={setReason} multiline />
            <Button testID="admin-reject-confirm" title={t("reject")} variant="danger" onPress={reject} loading={!!busy} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, overflow: "hidden" },
  logo: { width: 34, height: 34, borderRadius: radius.sm + 2, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  brand: { color: c.onBrand, fontSize: font.lg, fontWeight: "800" },
  hBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.glass, alignItems: "center", justifyContent: "center" },
  hBtnText: { color: c.onBrand, fontWeight: "800" },
  h1: { color: c.onBrand, fontSize: font.xxl, fontWeight: "800" },
  stats: { gap: spacing.sm },
  stat: { flex: 1, backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder, borderRadius: radius.md, padding: spacing.sm, alignItems: "center", gap: 2 },
  statV: { color: c.onBrand, fontSize: font.lg, fontWeight: "800" },
  statL: { color: c.brandTertiary, fontSize: 10, fontWeight: "600" },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.md, gap: spacing.sm },
  name: { fontSize: font.lg, fontWeight: "800", color: c.onSurface },
  meta: { fontSize: font.sm, color: c.muted },
  note: { fontSize: font.base, color: c.onSurfaceTertiary, lineHeight: 20 },
  reason: { fontSize: font.sm, color: c.error },
  overlay: { flex: 1, backgroundColor: c.overlay },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.lg },
}));

import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme, spacing, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { useAuth } from "@/src/auth";
import { useToast } from "@/src/toast";
import { api, User } from "@/src/api";
import { usesNativeTabs } from "@/src/navigation";
import { Button, Chip, Icon, Input, Segmented, SelectSheet } from "@/src/components/ui";
import { WILAYAS, YEARS, wilayaName } from "@/src/constants";

export default function Profile() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const router = useRouter();
  const toast = useToast();
  const { t, lang, setLang, ta, row } = useI18n();
  const { user, setUser, logout } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "", wilaya: user?.wilaya ?? null as string | null, study_year: user?.study_year ?? null as number | null,
    instructor_type: (user?.instructor_type ?? "doctor") as "doctor" | "top_student",
    bio: user?.bio ?? "", ccp_account: user?.ccp_account ?? "", baridimob_rip: user?.baridimob_rip ?? "", phone: user?.phone ?? "",
  });
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const isTeacher = user.role === "teacher";
  const set = (k: keyof typeof form) => (v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    try { setUser(await api<User>("/auth/me", { method: "PUT", body: form })); toast(t("saved")); }
    catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <View style={styles.root} testID="profile-screen">
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: bottomChrome + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.top, { flexDirection: row }]}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.name, { textAlign: ta }]} testID="profile-name">{user.name}</Text>
            <Text style={[styles.email, { textAlign: ta }]}>{user.email}</Text>
            <View style={[styles.roleTag, { alignSelf: ta === "right" ? "flex-end" : "flex-start", flexDirection: row }]}>
              <Icon name={isTeacher ? "school" : "stethoscope"} size={14} color={colors.onBrandTertiary} />
              <Text style={styles.roleText} testID="profile-role">
                {isTeacher ? `${t("teacher")} · ${user.instructor_type === "top_student" ? t("topStudent") : t("doctor")}` : t("student")}
              </Text>
            </View>
          </View>
        </View>

        {isTeacher && (
          <Pressable testID="profile-verification-card" onPress={() => router.push("/verification" as any)} style={[styles.verif, { flexDirection: row }, user.verified && styles.verifOn]}>
            <View style={[styles.verifIcon, user.verified && { backgroundColor: colors.brand }]}>
              <Icon name={user.verified ? "check-decagram" : user.verification_status === "pending" ? "clock-outline" : "shield-account-outline"} size={24}
                color={user.verified ? colors.brandSecondary : user.verification_status === "rejected" ? colors.error : colors.brand} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.section, { textAlign: ta }]}>{t("verification")}</Text>
              <Text style={[styles.email, { textAlign: ta }]} testID="profile-verification-status">
                {user.verified ? t("verifApproved") : user.verification_status === "pending" ? t("verifPending") : user.verification_status === "rejected" ? t("verifRejected") : t("verifNone")}
              </Text>
            </View>
            <Icon name={ta === "right" ? "chevron-left" : "chevron-right"} color={colors.muted} />
          </Pressable>
        )}

        <View style={styles.card}>
          <Text style={[styles.section, { textAlign: ta }]}>{t("language")}</Text>
          <Segmented testID="profile-language" value={lang} onChange={setLang}
            options={[{ value: "ar", label: "العربية" }, { value: "fr", label: "Français" }]} />
        </View>

        <View style={styles.card}>
          <Input testID="profile-name-input" label={t("name")} value={form.name} onChangeText={set("name")} />
          <View style={{ gap: spacing.xs + 2 }}>
            <Text style={[styles.label, { textAlign: ta }]}>{t("wilaya")}</Text>
            <Pressable testID="profile-wilaya-select" onPress={() => setPicker(true)} style={[styles.select, { flexDirection: row }]}>
              <Text style={[styles.selectText, !form.wilaya && { color: colors.muted }]}>{form.wilaya ? wilayaName(form.wilaya, lang) : t("chooseWilaya")}</Text>
              <Icon name="chevron-down" size={20} color={colors.muted} />
            </Pressable>
          </View>
          {!isTeacher && (
            <View style={{ gap: spacing.xs + 2 }}>
              <Text style={[styles.label, { textAlign: ta }]}>{t("studyYear")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {YEARS.map((y) => <Chip key={y} testID={`profile-year-${y}`} label={t("year", { n: y })} selected={form.study_year === y} onPress={() => set("study_year")(y)} />)}
              </ScrollView>
            </View>
          )}
          {isTeacher && (
            <>
              <View style={{ gap: spacing.xs + 2 }}>
                <Text style={[styles.label, { textAlign: ta }]}>{t("instructorType")}</Text>
                <Segmented testID="profile-instructor-type" value={form.instructor_type} onChange={set("instructor_type")}
                  options={[{ value: "doctor", label: t("doctor") }, { value: "top_student", label: t("topStudent") }]} />
              </View>
              <Input testID="profile-bio-input" label={t("bio")} value={form.bio} onChangeText={set("bio")} multiline />
              <Text style={[styles.section, { textAlign: ta, marginTop: spacing.sm }]}>{t("paymentInfo")}</Text>
              <Input testID="profile-ccp-input" label={t("ccpAccount")} value={form.ccp_account} onChangeText={set("ccp_account")} />
              <Input testID="profile-rip-input" label={t("rip")} value={form.baridimob_rip} onChangeText={set("baridimob_rip")} keyboardType="number-pad" />
              <Input testID="profile-phone-input" label={t("phone")} value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" />
            </>
          )}
          <Button testID="profile-save-button" title={t("save")} onPress={save} loading={busy} />
        </View>

        <Button testID="profile-logout-button" title={t("logout")} icon="logout" variant="danger"
          onPress={async () => { await logout(); router.replace("/welcome" as any); }} />
      </KeyboardAwareScrollView>
      <SelectSheet testID="profile-wilaya-sheet" visible={picker} title={t("chooseWilaya")} selected={form.wilaya}
        options={WILAYAS.map((w) => ({ value: w.code, label: wilayaName(w.code, lang) }))} onSelect={set("wilaya")} onClose={() => setPicker(false)} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  top: { alignItems: "center", gap: spacing.md },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" },
  avatarText: { color: c.onBrand, fontSize: font.xl, fontWeight: "800" },
  name: { fontSize: font.xl, fontWeight: "800", color: c.onSurface },
  email: { fontSize: font.base, color: c.muted },
  roleTag: { backgroundColor: c.brandTertiary, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3, gap: 4, alignItems: "center", marginTop: 2 },
  roleText: { fontSize: font.sm, fontWeight: "700", color: c.onBrandTertiary },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: c.border },
  verif: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.md, alignItems: "center", borderWidth: 1.5, borderColor: c.brandPrimary },
  verifOn: { backgroundColor: c.brandTertiary, borderColor: c.brandTertiary },
  verifIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  section: { fontSize: font.lg, fontWeight: "700", color: c.onSurface },
  label: { fontSize: font.sm + 1, fontWeight: "600", color: c.onSurfaceTertiary },
  select: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.md, alignItems: "center", justifyContent: "space-between" },
  selectText: { fontSize: font.lg, color: c.onSurface },
}));

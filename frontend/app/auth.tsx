import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme, spacing, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { useAuth } from "@/src/auth";
import { useToast } from "@/src/toast";
import { Button, Chip, Icon, Input, Segmented, SelectSheet } from "@/src/components/ui";
import { WILAYAS, YEARS, wilayaName } from "@/src/constants";

export default function AuthScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<"login" | "register">(params.mode === "register" ? "register" : "login");
  const { t, lang, ta, row, isRTL } = useI18n();
  const { login, register } = useAuth();
  const toast = useToast();
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [itype, setItype] = useState<"doctor" | "top_student">("doctor");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wilaya, setWilaya] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!email || !password || (mode === "register" && !name)) { setErr(t("required")); return; }
    setBusy(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register({
        email: email.trim(), password, name, role, wilaya,
        study_year: role === "student" || itype === "top_student" ? year : null,
        instructor_type: role === "teacher" ? itype : null,
      });
      router.replace("/" as any);
    } catch (e: any) {
      setErr(e.message); toast(e.message, "error");
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, flexDirection: row }]}>
        <Pressable testID="auth-back-button" onPress={() => (router.canGoBack() ? router.back() : router.replace("/welcome" as any))} style={styles.back}>
          <Icon name={isRTL ? "arrow-right" : "arrow-left"} />
        </Pressable>
      </View>
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.brandRow, { flexDirection: row }]}>
          <View style={styles.logoMark}><Icon name="stethoscope" size={22} color={colors.onBrand} /></View>
          <Text style={styles.brandText}>TBIB-courses</Text>
        </View>
        <Text style={[styles.h1, { textAlign: ta }]} testID="auth-title">{mode === "login" ? t("login") : t("register")}</Text>

        {mode === "register" && (
          <>
            <Text style={[styles.label, { textAlign: ta }]}>{t("iAm")}</Text>
            <View style={[{ flexDirection: row, gap: spacing.md }]}>
              {([["student", "book-search-outline", "roleStudentDesc"], ["teacher", "stethoscope", "roleTeacherDesc"]] as const).map(([r, ic, desc]) => {
                const on = role === r;
                return (
                  <Pressable key={r} testID={`auth-role-${r}`} onPress={() => setRole(r)} style={[styles.roleCard, on && styles.roleOn]}>
                    <View style={[styles.roleIcon, on && { backgroundColor: colors.brand }]}>
                      <Icon name={ic} size={24} color={on ? colors.onBrand : colors.brand} />
                    </View>
                    <Text style={[styles.roleTitle, { textAlign: ta }]}>{t(r)}</Text>
                    <Text style={[styles.roleDesc, { textAlign: ta }]}>{t(desc)}</Text>
                    {on && <View style={styles.roleCheck}><Icon name="check" size={14} color={colors.onBrand} /></View>}
                  </Pressable>
                );
              })}
            </View>
            {role === "teacher" && (
              <View style={{ gap: spacing.xs + 2 }}>
                <Text style={[styles.label, { textAlign: ta }]}>{t("instructorType")}</Text>
                <Segmented testID="auth-instructor-type" value={itype} onChange={setItype}
                  options={[{ value: "doctor", label: t("doctor") }, { value: "top_student", label: t("topStudent") }]} />
              </View>
            )}
            <Input testID="auth-name-input" label={t("name")} value={name} onChangeText={setName} />
            <View style={{ gap: spacing.xs + 2 }}>
              <Text style={[styles.label, { textAlign: ta }]}>{t("wilaya")}</Text>
              <Pressable testID="auth-wilaya-select" onPress={() => setPicker(true)} style={[styles.select, { flexDirection: row }]}>
                <Text style={[styles.selectText, !wilaya && { color: colors.muted }]}>{wilaya ? wilayaName(wilaya, lang) : t("chooseWilaya")}</Text>
                <Icon name="chevron-down" size={20} color={colors.muted} />
              </Pressable>
            </View>
            {(role === "student" || itype === "top_student") && (
              <View style={{ gap: spacing.xs + 2 }}>
                <Text style={[styles.label, { textAlign: ta }]}>{t("studyYear")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                  {YEARS.map((y) => <Chip key={y} testID={`auth-year-${y}`} label={t("year", { n: y })} selected={year === y} onPress={() => setYear(y)} />)}
                </ScrollView>
              </View>
            )}
          </>
        )}
        <Input testID="auth-email-input" label={t("email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={{ textAlign: "left" }} />
        <Input testID="auth-password-input" label={t("password")} value={password} onChangeText={setPassword} secureTextEntry style={{ textAlign: "left" }} />
        {!!err && <Text testID="auth-error" style={[styles.err, { textAlign: ta }]}>{err}</Text>}
        <Button testID="auth-submit-button" title={mode === "login" ? t("login") : t("register")} onPress={submit} loading={busy} style={{ marginTop: spacing.sm }} />
        <Pressable testID="auth-switch-mode" onPress={() => { setErr(""); setMode(mode === "login" ? "register" : "login"); }} style={styles.switch}>
          <Text style={styles.switchText}>{mode === "login" ? t("noAccount") : t("haveAccount")}</Text>
        </Pressable>
      </KeyboardAwareScrollView>
      <SelectSheet testID="auth-wilaya-sheet" visible={picker} title={t("chooseWilaya")} selected={wilaya}
        options={WILAYAS.map((w) => ({ value: w.code, label: wilayaName(w.code, lang) }))}
        onSelect={setWilaya} onClose={() => setPicker(false)} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg },
  back: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingTop: spacing.md },
  brandRow: { alignItems: "center", gap: spacing.sm },
  logoMark: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" },
  brandText: { fontSize: font.xl, fontWeight: "800", color: c.brand },
  h1: { fontSize: 28, fontWeight: "800", color: c.onSurface },
  label: { fontSize: font.sm + 1, fontWeight: "600", color: c.onSurfaceTertiary },
  select: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.md, alignItems: "center", justifyContent: "space-between" },
  selectText: { fontSize: font.lg, color: c.onSurface },
  roleCard: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.border, padding: spacing.md, gap: spacing.xs + 2 },
  roleOn: { borderColor: c.brandPrimary, backgroundColor: c.brandTertiary },
  roleIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  roleTitle: { fontSize: font.lg, fontWeight: "800", color: c.onSurface },
  roleDesc: { fontSize: font.sm, color: c.muted, lineHeight: 17 },
  roleCheck: { position: "absolute", top: spacing.sm, right: spacing.sm, width: 22, height: 22, borderRadius: 11, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  err: { color: c.error, fontSize: font.base, fontWeight: "600" },
  switch: { alignItems: "center", paddingVertical: spacing.sm },
  switchText: { color: c.brandPrimary, fontWeight: "700", fontSize: font.base },
}));

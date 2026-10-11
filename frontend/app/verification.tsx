import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme, spacing, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { useAuth } from "@/src/auth";
import { useToast } from "@/src/toast";
import { api, User } from "@/src/api";
import { Button, Icon, Input } from "@/src/components/ui";
import { ImageUploadField } from "@/src/components/ImageUpload";
import { InstructorBadge } from "@/src/components/Medical";

export default function Verification() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { t, ta, row, isRTL } = useI18n();
  const { user, setUser } = useAuth();
  const [doc, setDoc] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const status = user.verified ? "approved" : user.verification_status ?? "none";
  const canSubmit = status === "none" || status === "rejected";

  const submit = async () => {
    if (!doc) { toast(t("docRequired"), "error"); return; }
    setBusy(true);
    try {
      setUser(await api<User>("/verification/request", { method: "POST", body: { doc_path: doc, note: note.trim() || null } }));
      toast(t("sentForReview"));
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  const banner = {
    none: { icon: "shield-account-outline" as const, text: t("verifNone"), bg: colors.surfaceTertiary, fg: colors.onSurfaceTertiary },
    pending: { icon: "clock-outline" as const, text: t("verifPending"), bg: colors.warningSoft, fg: colors.warning },
    approved: { icon: "check-decagram" as const, text: t("verifApproved"), bg: colors.brandTertiary, fg: colors.brand },
    rejected: { icon: "close-octagon-outline" as const, text: t("verifRejected"), bg: colors.errorSoft, fg: colors.error },
  }[status];

  return (
    <View style={styles.root} testID="verification-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, flexDirection: row }]}>
        <Pressable testID="verification-back-button" onPress={() => router.back()} style={styles.back}><Icon name={isRTL ? "arrow-right" : "arrow-left"} /></Pressable>
        <Text style={styles.h1}>{t("verification")}</Text>
      </View>
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={[styles.banner, { backgroundColor: banner.bg, flexDirection: row }]} testID="verification-status-banner">
          <Icon name={banner.icon} size={26} color={banner.fg} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.bannerText, { color: banner.fg, textAlign: ta }]}>{banner.text}</Text>
            {status === "rejected" && !!user.verification_reason && (
              <Text style={[styles.reason, { textAlign: ta }]} testID="verification-reject-reason">{user.verification_reason}</Text>
            )}
          </View>
        </View>
        <View style={{ alignItems: ta === "right" ? "flex-end" : "flex-start" }}>
          <InstructorBadge type={user.instructor_type} verified={user.verified} />
        </View>
        <Text style={[styles.desc, { textAlign: ta }]}>{t("verifyDesc")}</Text>
        {canSubmit && (
          <>
            <ImageUploadField kind="verification" label={t("proofDoc")} value={doc} onChange={setDoc} testID="verification-doc-upload" />
            <Input testID="verification-note-input" label={t("note")} value={note} onChangeText={setNote} multiline />
            <Button testID="verification-submit-button" title={status === "rejected" ? t("resubmit") : t("requestVerification")} icon="shield-check-outline" onPress={submit} loading={busy} />
          </>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, alignItems: "center", gap: spacing.md },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  h1: { fontSize: font.xl, fontWeight: "800", color: c.onSurface },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingTop: spacing.sm },
  banner: { borderRadius: radius.md, padding: spacing.lg, gap: spacing.md, alignItems: "center" },
  bannerText: { fontSize: font.lg, fontWeight: "800" },
  reason: { fontSize: font.base, color: c.onSurfaceTertiary },
  desc: { fontSize: font.base, color: c.muted, lineHeight: 21 },
}));

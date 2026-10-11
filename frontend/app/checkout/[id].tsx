import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme, spacing, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { useToast } from "@/src/toast";
import { api, CourseDetail } from "@/src/api";
import { Button, Icon, Input, Loading, Segmented, formatPrice } from "@/src/components/ui";
import { IMAGES } from "@/src/constants";

export default function Checkout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { t, ta, row, isRTL } = useI18n();
  const [data, setData] = useState<CourseDetail | null>(null);
  const [method, setMethod] = useState<"baridimob" | "ccp">("baridimob");
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<CourseDetail>(`/courses/${id}`).then(setData).catch((e) => toast(e.message, "error")); }, [id, toast]);

  const submit = async () => {
    if (ref.trim().length < 3) { toast(t("required"), "error"); return; }
    setBusy(true);
    try {
      await api(`/courses/${id}/enroll`, { method: "POST", body: { payment_method: method, payment_ref: ref.trim(), note: note.trim() || null } });
      toast(t("requestSent"));
      router.back();
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  if (!data) return <View style={styles.root}><Loading /></View>;
  const { course, teacher } = data;
  const hasPay = teacher && (teacher.ccp_account || teacher.baridimob_rip);

  return (
    <View style={styles.root} testID="checkout-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, flexDirection: row }]}>
        <Pressable testID="checkout-back-button" onPress={() => router.back()} style={styles.back}><Icon name={isRTL ? "arrow-right" : "arrow-left"} /></Pressable>
        <Text style={styles.h1}>{t("paymentTitle")}</Text>
      </View>
      <KeyboardAwareScrollView bottomOffset={96} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: 110 + insets.bottom }]}>
        <Text style={[styles.step, { textAlign: ta }]}>{t("stepCourse")}</Text>
        <View style={[styles.card, { flexDirection: row, alignItems: "center", gap: spacing.md }]}>
          <Image source={{ uri: course.cover_image || IMAGES.courseFallback }} style={styles.thumb} contentFit="cover" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.cTitle, { textAlign: ta }]} numberOfLines={2}>{course.title}</Text>
            <Text style={[styles.meta, { textAlign: ta }]}>{course.teacher_name}</Text>
            <Text style={[styles.price, { textAlign: ta }]} testID="checkout-price">{formatPrice(course.price, t("da"), t("free"))}</Text>
          </View>
        </View>

        <Text style={[styles.step, { textAlign: ta }]}>{t("stepPay")}</Text>
        <Text style={[styles.hint, { textAlign: ta }]}>{t("stepPayHint")}</Text>
        <View style={styles.payCard} testID="checkout-teacher-payment">
          {!hasPay && <Text style={[styles.payLabel, { textAlign: ta }]}>{t("teacherNoPayment")}</Text>}
          {!!teacher?.baridimob_rip && <PayRow icon="cellphone" label={t("rip")} value={teacher.baridimob_rip} testID="checkout-rip" />}
          {!!teacher?.ccp_account && <PayRow icon="bank-outline" label={t("ccpAccount")} value={teacher.ccp_account} testID="checkout-ccp" />}
          {!!teacher?.phone && <PayRow icon="phone-outline" label={t("phone")} value={teacher.phone} testID="checkout-phone" />}
          {!!teacher && <PayRow icon="account-outline" label={t("name")} value={teacher.name} />}
        </View>

        <Text style={[styles.step, { textAlign: ta }]}>{t("stepRef")}</Text>
        <Text style={[styles.label, { textAlign: ta }]}>{t("method")}</Text>
        <Segmented testID="checkout-method" value={method} onChange={setMethod}
          options={[{ value: "baridimob", label: t("baridimob") }, { value: "ccp", label: t("ccp") }]} />
        <Input testID="checkout-ref-input" label={t("paymentRef")} placeholder={t("paymentRefHint")} value={ref} onChangeText={setRef} />
        <Input testID="checkout-note-input" label={t("note")} value={note} onChangeText={setNote} multiline />
        <View style={[{ flexDirection: row, gap: spacing.sm, alignItems: "center" }]}>
          <Icon name="shield-check-outline" size={18} color={colors.brandPrimary} />
          <Text style={[styles.meta, { flex: 1, textAlign: ta }]}>{t("pendingApproval")}</Text>
        </View>
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ opened: insets.bottom }}>
        <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button testID="checkout-submit-button" title={t("submitRequest")} icon="send-check-outline" onPress={submit} loading={busy} />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

function PayRow({ icon, label, value, testID }: { icon: any; label: string; value: string; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { row, ta } = useI18n();
  return (
    <View style={[styles.payRow, { flexDirection: row }]} testID={testID}>
      <Icon name={icon} size={20} color={colors.onBrandTertiary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.payLabel, { textAlign: ta }]}>{label}</Text>
        <Text style={[styles.payValue, { textAlign: ta }]} selectable>{value}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, alignItems: "center", gap: spacing.md },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  h1: { fontSize: font.xl, fontWeight: "800", color: c.onSurface },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingTop: spacing.sm },
  step: { fontSize: font.lg, fontWeight: "800", color: c.brand, marginTop: spacing.sm },
  hint: { fontSize: font.base, color: c.muted, lineHeight: 20 },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: c.border },
  thumb: { width: 64, height: 64, borderRadius: radius.sm + 2 },
  cTitle: { fontSize: font.base + 1, fontWeight: "700", color: c.onSurface },
  meta: { fontSize: font.sm, color: c.muted },
  price: { fontSize: font.lg, fontWeight: "800", color: c.brand },
  payCard: { backgroundColor: c.brandTertiary, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  payRow: { alignItems: "center", gap: spacing.md },
  payLabel: { fontSize: font.sm, color: c.onBrandTertiary, fontWeight: "600" },
  payValue: { fontSize: font.lg, color: c.onBrandTertiary, fontWeight: "800", letterSpacing: 0.5 },
  label: { fontSize: font.sm + 1, fontWeight: "600", color: c.onSurfaceTertiary },
  bar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: c.surfaceSecondary, borderTopWidth: 1, borderTopColor: c.border },
}));

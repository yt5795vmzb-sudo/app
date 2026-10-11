import React, { useState } from "react";
import { ActivityIndicator, Linking, Modal, Platform, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme, spacing, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { useToast } from "@/src/toast";
import { fileSource, uploadImage } from "@/src/api";
import { Button, Icon } from "@/src/components/ui";

type Props = {
  kind: "receipt" | "verification";
  label: string;
  value: string | null;
  onChange: (path: string | null) => void;
  testID: string;
};

/** Pick an image from the library (with permission flow) and upload it to object storage. */
export function ImageUploadField({ kind, label, value, onChange, testID }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const { t, row, ta } = useI18n();
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [perm, setPerm] = useState<"explain" | "blocked" | null>(null);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setLocalUri(a.uri);
    setBusy(true);
    try {
      const type = a.mimeType && a.mimeType.startsWith("image/") ? a.mimeType : "image/jpeg";
      const ext = type.split("/")[1] || "jpg";
      onChange(await uploadImage(a.uri, a.fileName || `${kind}.${ext}`, type, kind));
    } catch (e: any) {
      setLocalUri(null); onChange(null); toast(e.message || t("uploadFailed"), "error");
    } finally { setBusy(false); }
  };

  const start = async () => {
    if (Platform.OS === "web") return pick();
    const p = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (p.granted) return pick();
    setPerm(p.canAskAgain ? "explain" : "blocked");
  };

  const request = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (p.granted) { setPerm(null); pick(); return; }
    setPerm(p.canAskAgain ? null : "blocked");
  };

  const preview = localUri ? { uri: localUri } : value ? fileSource(value) : null;

  return (
    <View style={{ gap: spacing.xs + 2 }}>
      <Text style={[styles.label, { textAlign: ta }]}>{label}</Text>
      <Pressable testID={testID} onPress={start} disabled={busy} style={[styles.box, preview && styles.boxFilled]}>
        {preview ? (
          <>
            <Image source={preview} style={styles.preview} contentFit="cover" />
            <View style={[styles.overlayRow, { flexDirection: row }]}>
              {busy ? <ActivityIndicator color={colors.onBrand} /> : <Icon name="check-circle" size={18} color={colors.brandSecondary} />}
              <Text style={styles.overlayText}>{busy ? t("uploading") : t("changePhoto")}</Text>
            </View>
          </>
        ) : (
          <View style={styles.empty}>
            <View style={styles.iconWrap}><Icon name={kind === "receipt" ? "receipt-text-outline" : "card-account-details-outline"} size={28} color={colors.brand} /></View>
            <Text style={styles.emptyText}>{kind === "receipt" ? t("attachReceipt") : t("attachProof")}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={!!perm} transparent animationType="fade" onRequestClose={() => setPerm(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modal} testID={`${testID}-permission`}>
            <View style={styles.iconWrap}><Icon name="image-multiple-outline" size={28} color={colors.brand} /></View>
            <Text style={styles.modalTitle}>{t("permTitle")}</Text>
            <Text style={styles.modalBody}>{perm === "blocked" ? t("permBlocked") : t("permBody")}</Text>
            {perm === "blocked" ? (
              <Button testID={`${testID}-open-settings`} title={t("openSettings")} icon="cog-outline" onPress={() => { setPerm(null); Linking.openSettings(); }} style={{ alignSelf: "stretch" }} />
            ) : (
              <Button testID={`${testID}-allow`} title={t("allow")} onPress={request} style={{ alignSelf: "stretch" }} />
            )}
            <Button testID={`${testID}-cancel`} title={t("cancel")} variant="ghost" onPress={() => setPerm(null)} style={{ alignSelf: "stretch" }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Thumbnail of a protected image that opens a full-screen viewer. */
export function ProtectedImage({ path, testID, size = 64 }: { path: string; testID: string; size?: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable testID={testID} onPress={() => setOpen(true)} style={[styles.thumb, { width: size, height: size }]}>
        <Image source={fileSource(path)} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        <View style={styles.zoom}><Icon name="magnify-plus-outline" size={14} color={colors.onBrand} /></View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.viewer} testID={`${testID}-viewer`}>
          <Image source={fileSource(path)} style={{ flex: 1 }} contentFit="contain" />
          <Pressable testID={`${testID}-viewer-close`} onPress={() => setOpen(false)} style={[styles.close, { top: insets.top + spacing.sm }]}>
            <Icon name="close" color={colors.onBrand} />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  label: { fontSize: font.sm + 1, fontWeight: "600", color: c.onSurfaceTertiary },
  box: { height: 150, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.brandPrimary, backgroundColor: c.brandTertiary, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  boxFilled: { borderStyle: "solid", borderColor: c.border },
  preview: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  overlayRow: { position: "absolute", bottom: spacing.sm, alignItems: "center", gap: spacing.xs, backgroundColor: c.overlay, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  overlayText: { color: c.onBrand, fontWeight: "700", fontSize: font.sm },
  empty: { alignItems: "center", gap: spacing.sm },
  iconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  emptyText: { color: c.brand, fontWeight: "700", fontSize: font.base },
  modalBg: { flex: 1, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  modal: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md, alignItems: "center", width: "100%", maxWidth: 380 },
  modalTitle: { fontSize: font.xl, fontWeight: "800", color: c.onSurface },
  modalBody: { fontSize: font.base, color: c.muted, textAlign: "center", lineHeight: 21 },
  thumb: { borderRadius: radius.sm + 2, overflow: "hidden", backgroundColor: c.surfaceTertiary },
  zoom: { position: "absolute", bottom: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center" },
  viewer: { flex: 1, backgroundColor: c.surfaceInverse },
  close: { position: "absolute", right: spacing.lg, width: 44, height: 44, borderRadius: 22, backgroundColor: c.glass, alignItems: "center", justifyContent: "center" },
}));

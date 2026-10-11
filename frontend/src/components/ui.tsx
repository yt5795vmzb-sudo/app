import React, { useMemo, useState } from "react";
import {
  ActivityIndicator, FlatList, Modal, Pressable, Text, TextInput, TextInputProps, View, ViewStyle, StyleProp,
} from "react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { makeStyles, useTheme, spacing, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";

export type IconName = React.ComponentProps<typeof MaterialDesignIcons>["name"];

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <MaterialDesignIcons name={name} size={size} color={color ?? colors.onSurface} />;
}

type BtnProps = {
  title: string; onPress?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger" | "dark";
  loading?: boolean; disabled?: boolean; testID?: string; icon?: IconName; style?: StyleProp<ViewStyle>; small?: boolean;
};

export function Button({ title, onPress, variant = "primary", loading, disabled, testID, icon, style, small }: BtnProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { row } = useI18n();
  const bg = { primary: colors.brandPrimary, dark: colors.brand, secondary: colors.surfaceTertiary, ghost: "transparent", danger: colors.errorSoft }[variant];
  const fg = { primary: colors.onBrandPrimary, dark: colors.onBrand, secondary: colors.onSurface, ghost: colors.brand, danger: colors.error }[variant];
  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress?.(); }}
      style={({ pressed }) => [
        styles.btn, small && styles.btnSmall, { backgroundColor: bg, flexDirection: row, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon && <Icon name={icon} size={small ? 18 : 20} color={fg} />}
          <Text style={[styles.btnText, small && { fontSize: font.base }, { color: fg }]} numberOfLines={1}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input({ label, testID, style, multiline, ...rest }: TextInputProps & { label?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { ta } = useI18n();
  const [focus, setFocus] = useState(false);
  return (
    <View style={styles.field}>
      {label && <Text style={[styles.label, { textAlign: ta }]}>{label}</Text>}
      <TextInput
        testID={testID}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[styles.input, multiline && styles.multiline, focus && { borderColor: colors.brandPrimary }, { textAlign: ta }, style]}
        {...rest}
      />
    </View>
  );
}

export function Chip({ label, selected, onPress, testID, icon }: { label: string; selected?: boolean; onPress?: () => void; testID?: string; icon?: IconName }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { row } = useI18n();
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.chip, { flexDirection: row }, selected && styles.chipOn]}>
      <Text style={[styles.chipText, selected && { color: colors.onBrand }]} numberOfLines={1}>{label}</Text>
      {icon && <Icon name={icon} size={16} color={selected ? colors.onBrand : colors.onSurfaceTertiary} />}
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange, testID }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; testID?: string }) {
  const styles = useStyles();
  const { row } = useI18n();
  return (
    <View testID={testID} style={[styles.seg, { flexDirection: row }]}>
      {options.map((o) => (
        <Pressable key={o.value} testID={`${testID}-${o.value}`} onPress={() => onChange(o.value)} style={[styles.segItem, value === o.value && styles.segOn]}>
          <Text style={[styles.segText, value === o.value && styles.segTextOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Stars({ value, size = 14, onChange, testID }: { value: number; size?: number; onChange?: (v: number) => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 2 }} testID={testID}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} disabled={!onChange} onPress={() => onChange?.(i)} testID={testID ? `${testID}-${i}` : undefined} hitSlop={4}>
          <Icon name={value >= i ? "star" : value >= i - 0.5 ? "star-half-full" : "star-outline"} size={size} color={colors.star} />
        </Pressable>
      ))}
    </View>
  );
}

export function Badge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useI18n();
  const map = {
    pending: { bg: colors.warningSoft, fg: colors.warning },
    approved: { bg: colors.brandTertiary, fg: colors.brand },
    rejected: { bg: colors.errorSoft, fg: colors.error },
  }[status];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]} testID={`status-badge-${status}`}>
      <Text style={[styles.badgeText, { color: map.fg }]}>{t(status)}</Text>
    </View>
  );
}

export function EmptyState({ text, action, testID }: { text: string; action?: React.ReactNode; testID?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.empty} testID={testID}>
      <Image source={{ uri: "https://images.unsplash.com/photo-1588702547954-4800ead296ef?w=600&q=60" }} style={styles.emptyImg} contentFit="cover" />
      <Text style={styles.emptyText}>{text}</Text>
      {action}
    </View>
  );
}

export function SelectSheet({ visible, title, options, onSelect, onClose, testID, selected }: {
  visible: boolean; title: string; options: { value: string; label: string }[]; selected?: string | null;
  onSelect: (v: string | null) => void; onClose: () => void; testID?: string;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, ta, row } = useI18n();
  const [q, setQ] = useState("");
  const list = useMemo(() => options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())), [options, q]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} testID={`${testID}-backdrop`} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]} testID={testID}>
        <View style={styles.grabber} />
        <Text style={[styles.sheetTitle, { textAlign: ta }]}>{title}</Text>
        {options.length > 10 && (
          <TextInput value={q} onChangeText={setQ} placeholder="..." placeholderTextColor={colors.muted}
            style={[styles.input, { marginBottom: spacing.sm, textAlign: ta }]} testID={`${testID}-search`} />
        )}
        <FlatList
          data={[{ value: "__all", label: t("all") }, ...list]}
          keyExtractor={(i) => i.value}
          style={{ maxHeight: 420 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const on = item.value === (selected ?? "__all");
            return (
              <Pressable testID={`${testID}-option-${item.value}`} style={[styles.option, { flexDirection: row }]}
                onPress={() => { onSelect(item.value === "__all" ? null : item.value); setQ(""); onClose(); }}>
                <Text style={[styles.optionText, on && { color: colors.brand, fontWeight: "700" }]}>{item.label}</Text>
                {on && <Icon name="check" size={20} color={colors.brand} />}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

export function Loading() {
  const { colors } = useTheme();
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl }}><ActivityIndicator color={colors.brandPrimary} size="large" /></View>;
}

export const formatPrice = (p: number, da: string, free: string) => (p === 0 ? free : `${p.toLocaleString("fr-DZ")} ${da}`);

const useStyles = makeStyles((c) => ({
  btn: { minHeight: 50, borderRadius: radius.md, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  btnSmall: { minHeight: 40, paddingHorizontal: spacing.md },
  btnText: { fontSize: font.lg, fontWeight: "700" },
  field: { gap: spacing.xs + 2 },
  label: { fontSize: font.sm + 1, fontWeight: "600", color: c.onSurfaceTertiary },
  input: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.md, fontSize: font.lg, color: c.onSurface },
  multiline: { minHeight: 110, paddingTop: spacing.md, textAlignVertical: "top" },
  chip: { height: 36, flexShrink: 0, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", gap: spacing.xs },
  chipOn: { backgroundColor: c.brand, borderColor: c.brand },
  chipText: { fontSize: font.base, fontWeight: "600", color: c.onSurfaceTertiary },
  seg: { backgroundColor: c.surfaceTertiary, borderRadius: radius.md, padding: 3 },
  segItem: { flex: 1, height: 38, borderRadius: radius.md - 2, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: c.surfaceSecondary, shadowColor: c.surfaceInverse, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: font.base, fontWeight: "600", color: c.muted },
  segTextOn: { color: c.brand },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start" },
  badgeText: { fontSize: font.sm, fontWeight: "700" },
  empty: { alignItems: "center", padding: spacing.xl, gap: spacing.md },
  emptyImg: { width: 160, height: 120, borderRadius: radius.lg, opacity: 0.9 },
  emptyText: { fontSize: font.lg, color: c.muted, textAlign: "center" },
  overlay: { flex: 1, backgroundColor: c.overlay },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: c.borderStrong, alignSelf: "center", marginBottom: spacing.md },
  sheetTitle: { fontSize: font.xl, fontWeight: "700", color: c.onSurface, marginBottom: spacing.md },
  option: { minHeight: 48, alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: c.divider },
  optionText: { fontSize: font.lg, color: c.onSurface },
}));

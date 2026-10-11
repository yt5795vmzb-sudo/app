import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Course } from "@/src/api";
import { makeStyles, useTheme, spacing, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { Icon, formatPrice } from "@/src/components/ui";
import { IMAGES } from "@/src/constants";
import { InstructorBadge } from "@/src/components/Medical";
import { LinearGradient } from "expo-linear-gradient";

export function CourseCard({ course }: { course: Course }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t, ta, row } = useI18n();
  const router = useRouter();
  return (
    <Pressable
      testID={`course-card-${course.id}`}
      onPress={() => router.push(`/course/${course.id}` as any)}
      style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View>
        <Image source={{ uri: course.cover_image || IMAGES.courseFallback }} style={styles.img} contentFit="cover" transition={200} />
        <LinearGradient colors={["transparent", colors.scrim]} style={styles.imgScrim} />
        <View style={styles.cross}><Icon name="plus-thick" size={12} color={colors.onAccent} /></View>
      </View>
      <View style={styles.yearTag}><Text style={styles.yearText}>{t("year", { n: course.study_year })}</Text></View>
      <View style={styles.body}>
        <Text style={[styles.module, { textAlign: ta }]} numberOfLines={1}>{course.module}</Text>
        <Text style={[styles.title, { textAlign: ta }]} numberOfLines={2}>{course.title}</Text>
        <Text style={[styles.teacher, { textAlign: ta }]} numberOfLines={1}>{course.teacher_name}</Text>
        <View style={{ alignItems: ta === "right" ? "flex-end" : "flex-start" }}>
          <InstructorBadge type={course.teacher_type} small testID={`course-card-badge-${course.id}`} />
        </View>
        <View style={[styles.footer, { flexDirection: row }]}>
          <Text style={styles.price}>{formatPrice(course.price, t("da"), t("free"))}</Text>
          <View style={[styles.rating, { flexDirection: row }]}>
            <Icon name="star" size={13} color={colors.star} />
            <Text style={styles.ratingText}>{course.rating_count ? course.rating_avg.toFixed(1) : "—"}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  card: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: c.border, shadowColor: c.brandDeep, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  imgScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 40 },
  cross: { position: "absolute", top: spacing.sm, right: spacing.sm, width: 22, height: 22, borderRadius: 6, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" },
  img: { width: "100%", aspectRatio: 1.35, backgroundColor: c.surfaceTertiary },
  yearTag: { position: "absolute", top: spacing.sm, left: spacing.sm, backgroundColor: c.brandTertiary, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  yearText: { fontSize: 11, fontWeight: "700", color: c.onBrandTertiary },
  body: { padding: spacing.md, gap: 3 },
  module: { fontSize: 11, fontWeight: "700", color: c.brandPrimary, textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: font.base, fontWeight: "700", color: c.onSurface, minHeight: 36 },
  teacher: { fontSize: font.sm, color: c.muted },
  footer: { justifyContent: "space-between", alignItems: "center", marginTop: spacing.xs },
  price: { fontSize: font.base, fontWeight: "800", color: c.brand },
  rating: { alignItems: "center", gap: 2 },
  ratingText: { fontSize: font.sm, fontWeight: "600", color: c.onSurfaceTertiary },
}));

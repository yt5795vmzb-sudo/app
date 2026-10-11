import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme, spacing, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { api, Lesson } from "@/src/api";
import { Button, Icon, Loading } from "@/src/components/ui";

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, ta, row, isRTL } = useI18n();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { api<Lesson>(`/lessons/${id}`).then(setLesson).catch((e) => setError(e.message)); }, [id]);

  const isYoutube = lesson?.video_url?.includes("youtu");

  return (
    <View style={styles.root} testID="lesson-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, flexDirection: row }]}>
        <Pressable testID="lesson-back-button" onPress={() => router.back()} style={styles.back}><Icon name={isRTL ? "arrow-right" : "arrow-left"} /></Pressable>
        <Text style={[styles.course, { textAlign: ta }]} numberOfLines={1}>{lesson?.course_title}</Text>
      </View>
      {error ? <Text style={styles.err} testID="lesson-error">{error}</Text> : !lesson ? <Loading /> : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
          <Text style={[styles.title, { textAlign: ta }]} testID="lesson-title">{lesson.title}</Text>
          {!!lesson.video_url && (
            <Pressable testID="lesson-video-card" onPress={() => WebBrowser.openBrowserAsync(lesson.video_url!)} style={styles.video}>
              <LinearGradient colors={[colors.brand, colors.brandPrimary]} style={styles.videoBg} />
              <View style={styles.play}><Icon name="play" size={36} color={colors.brand} /></View>
              <View style={[styles.videoLabel, { flexDirection: row }]}>
                <Icon name={isYoutube ? "youtube" : "google-drive"} size={18} color={colors.onBrand} />
                <Text style={styles.videoText}>{t("openVideo")}</Text>
              </View>
            </Pressable>
          )}
          <Text style={[styles.body, { textAlign: "left", writingDirection: "auto" }]} selectable testID="lesson-content">{lesson.content}</Text>
          {!!lesson.video_url && <Button testID="lesson-open-video-button" title={t("openVideo")} icon="open-in-new" variant="secondary" onPress={() => WebBrowser.openBrowserAsync(lesson.video_url!)} />}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceSecondary },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, alignItems: "center", gap: spacing.md, borderBottomWidth: 1, borderBottomColor: c.divider },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  course: { flex: 1, fontSize: font.base, color: c.muted, fontWeight: "600" },
  content: { padding: spacing.lg, gap: spacing.xl },
  title: { fontSize: font.xxl, fontWeight: "800", color: c.onSurface, lineHeight: 32 },
  video: { height: 200, borderRadius: radius.lg, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  videoBg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  play: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  videoLabel: { position: "absolute", bottom: spacing.md, gap: spacing.xs, alignItems: "center" },
  videoText: { color: c.onBrand, fontWeight: "700" },
  body: { fontSize: font.lg + 1, lineHeight: 30, color: c.onSurfaceSecondary },
  err: { color: c.error, textAlign: "center", padding: spacing.xl, fontSize: font.lg },
}));

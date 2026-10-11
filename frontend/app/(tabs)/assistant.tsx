import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Platform, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { makeStyles, useTheme, spacing, radius, font } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { useToast } from "@/src/toast";
import { api, ChatMsg, streamChat } from "@/src/api";
import { usesNativeTabs } from "@/src/navigation";
import { Icon } from "@/src/components/ui";

export default function Assistant() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const { t, d, lang, ta, row } = useI18n();
  const toast = useToast();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => { api<ChatMsg[]>("/ai/history").then(setMsgs).catch(() => {}); }, []);

  const send = useCallback(async (msg: string) => {
    const m = msg.trim();
    if (!m || sending) return;
    setText("");
    setSending(true);
    setMsgs((p) => [...p, { role: "user", content: m }, { role: "assistant", content: "" }]);
    try {
      await streamChat(m, lang, (delta) => {
        setMsgs((p) => {
          const copy = [...p];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + delta };
          return copy;
        });
      });
    } catch (e: any) {
      toast(e.message, "error");
      setMsgs((p) => p.filter((x, i) => !(i === p.length - 1 && !x.content)));
    } finally { setSending(false); }
  }, [lang, sending, toast]);

  const clear = async () => { await api("/ai/history", { method: "DELETE" }).catch(() => {}); setMsgs([]); };

  return (
    <View style={styles.root} testID="assistant-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, flexDirection: row }]}>
        <View style={[{ flexDirection: row, alignItems: "center", gap: spacing.sm, flex: 1 }]}>
          <View style={styles.aiMark}><Icon name="robot-happy-outline" size={20} color={colors.onBrand} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.h1, { textAlign: ta }]} numberOfLines={1}>{t("aiTitle")}</Text>
            <Text style={[styles.disc, { textAlign: ta }]} numberOfLines={1}>{t("aiDisclaimer")}</Text>
          </View>
        </View>
        {msgs.length > 0 && (
          <Pressable testID="assistant-clear-button" onPress={clear} style={styles.clear} hitSlop={6}>
            <Icon name="chat-plus-outline" size={22} color={colors.brand} />
          </Pressable>
        )}
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="translate-with-padding" keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
        <FlatList
          ref={listRef}
          testID="assistant-message-list"
          data={msgs}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.welcome} testID="assistant-welcome">
              <View style={styles.bigMark}><Icon name="brain" size={36} color={colors.brand} /></View>
              <Text style={styles.welcomeText}>{t("aiWelcome")}</Text>
              <View style={{ gap: spacing.sm, alignSelf: "stretch" }}>
                {d.aiSuggest.map((s, i) => (
                  <Pressable key={s} testID={`assistant-suggestion-${i}`} onPress={() => send(s)} style={[styles.suggest, { flexDirection: row }]}>
                    <Icon name="lightbulb-on-outline" size={18} color={colors.brandPrimary} />
                    <Text style={[styles.suggestText, { textAlign: ta }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeIn} testID={`chat-bubble-${index}`}
              style={[styles.bubble, item.role === "user" ? styles.userB : styles.aiB, { alignSelf: (item.role === "user") === (ta === "right") ? "flex-start" : "flex-end" }]}>
              <Text style={styles.bubbleText} selectable>{item.content || "…"}</Text>
            </Animated.View>
          )}
        />
        <View style={[styles.inputBar, { flexDirection: row, paddingBottom: bottomChrome + spacing.sm }]}>
          <TextInput testID="assistant-input" value={text} onChangeText={setText} placeholder={t("askAnything")} placeholderTextColor={colors.muted}
            style={[styles.input, { textAlign: ta }]} multiline />
          <Pressable testID="assistant-send-button" onPress={() => send(text)} disabled={sending || !text.trim()}
            style={[styles.send, (sending || !text.trim()) && { opacity: 0.5 }]}>
            <Icon name={sending ? "dots-horizontal" : "send"} size={20} color={colors.onBrandPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, alignItems: "center", gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider },
  aiMark: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" },
  h1: { fontSize: font.lg, fontWeight: "800", color: c.onSurface },
  disc: { fontSize: 11, color: c.muted },
  clear: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: c.brandTertiary },
  welcome: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, paddingVertical: spacing.xl },
  bigMark: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  welcomeText: { fontSize: font.lg, color: c.onSurfaceTertiary, textAlign: "center", lineHeight: 24 },
  suggest: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.md, gap: spacing.sm, alignItems: "center" },
  suggestText: { flex: 1, fontSize: font.base, color: c.onSurface, fontWeight: "500" },
  bubble: { maxWidth: "86%", borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  userB: { backgroundColor: c.brandTertiary },
  aiB: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  bubbleText: { fontSize: font.base + 1, lineHeight: 22, color: c.onSurface },
  inputBar: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm, alignItems: "flex-end", borderTopWidth: 1, borderTopColor: c.divider, backgroundColor: c.surface },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: radius.lg, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: 10, fontSize: font.base + 1, color: c.onSurface },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
}));

import React from "react";
import { Platform } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { usesNativeTabs } from "@/src/navigation";
import { useTheme } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { useAuth } from "@/src/auth";
import { Icon, IconName } from "@/src/components/ui";

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user, loading } = useAuth();
  if (!loading && !user) return <Redirect href={"/welcome" as any} />;
  const learnLabel = user?.role === "teacher" ? t("dashboard") : t("learn");

  if (usesNativeTabs) {
    return (
      <NativeTabs tintColor={colors.brand}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="house.fill" />
          <NativeTabs.Trigger.Label>{t("home")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="learn">
          <NativeTabs.Trigger.Icon sf="book.fill" />
          <NativeTabs.Trigger.Label>{learnLabel}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="assistant">
          <NativeTabs.Trigger.Icon sf="sparkles" />
          <NativeTabs.Trigger.Label>{t("assistant")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Icon sf="person.crop.circle" />
          <NativeTabs.Trigger.Label>{t("profile")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  const icon = (on: IconName, off: IconName) => {
    const TabIcon = ({ focused, color }: { focused: boolean; color: any }) => <Icon name={focused ? on : off} size={24} color={color} />;
    return TabIcon;
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surfaceSecondary, borderTopColor: colors.border, ...(Platform.OS === "web" ? { height: 64 } : {}) },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("home"), tabBarButtonTestID: "tab-home", tabBarIcon: icon("home-variant", "home-variant-outline") }} />
      <Tabs.Screen name="learn" options={{ title: learnLabel, tabBarButtonTestID: "tab-learn", tabBarIcon: icon("book-open-page-variant", "book-open-page-variant-outline") }} />
      <Tabs.Screen name="assistant" options={{ title: t("assistant"), tabBarButtonTestID: "tab-assistant", tabBarIcon: icon("robot-happy", "robot-happy-outline") }} />
      <Tabs.Screen name="profile" options={{ title: t("profile"), tabBarButtonTestID: "tab-profile", tabBarIcon: icon("account-circle", "account-circle-outline") }} />
    </Tabs>
  );
}

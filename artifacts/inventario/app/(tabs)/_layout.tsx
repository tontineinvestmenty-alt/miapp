import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import { ThemePickerButton } from "@/components/ThemePicker";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "archivebox", selected: "archivebox.fill" }} />
        <Label>Almacenes</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="articulos">
        <Icon sf={{ default: "cube", selected: "cube.fill" }} />
        <Label>Artículos</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pedidos">
        <Icon sf={{ default: "shippingbox", selected: "shippingbox.fill" }} />
        <Label>Pedidos</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="resumen">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Resumen</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18 },
        headerShadowVisible: false,
        headerRight: () => <ThemePickerButton />,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Almacenes",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="archivebox" tintColor={color} size={24} /> : <Feather name="archive" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="articulos"
        options={{
          title: "Artículos",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="cube" tintColor={color} size={24} /> : <Feather name="box" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="shippingbox" tintColor={color} size={24} /> : <Feather name="truck" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="resumen"
        options={{
          title: "Resumen",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="chart.bar" tintColor={color} size={24} /> : <Feather name="bar-chart-2" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}

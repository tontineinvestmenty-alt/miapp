import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, View } from "react-native";

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
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 10,
          marginBottom: 2,
        },
        tabBarIconStyle: { marginTop: 4 },
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: {
          color: colors.foreground,
          fontFamily: "Inter_700Bold",
          fontSize: 20,
        },
        headerShadowVisible: false,
        headerRight: () => <ThemePickerButton />,
        tabBarStyle: {
          position: "absolute",
          bottom: isWeb ? 16 : 20,
          marginHorizontal: 16,
          borderRadius: 28,
          height: 64,
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 20,
          backgroundColor: colors.card,
          paddingBottom: 0,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint="light"
              style={{ flex: 1, borderRadius: 28, overflow: "hidden" }}
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 28 }} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Almacenes",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name="archivebox" tintColor={color} size={22} />
            ) : (
              <Feather name="archive" size={focused ? 23 : 21} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="articulos"
        options={{
          title: "Artículos",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name="cube" tintColor={color} size={22} />
            ) : (
              <Feather name="box" size={focused ? 23 : 21} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name="shippingbox" tintColor={color} size={22} />
            ) : (
              <Feather name="truck" size={focused ? 23 : 21} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="resumen"
        options={{
          title: "Resumen",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name="chart.bar" tintColor={color} size={22} />
            ) : (
              <Feather name="bar-chart-2" size={focused ? 23 : 21} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}

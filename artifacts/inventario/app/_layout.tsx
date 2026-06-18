import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LockScreen } from "@/components/LockScreen";
import { ConfirmProvider } from "@/contexts/ConfirmContext";
import { SecurityProvider, useSecurity } from "@/contexts/SecurityContext";
import { SoundProvider } from "@/contexts/SoundContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useColors } from "@/hooks/useColors";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Atrás",
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.foreground, fontFamily: "Inter_700Bold" },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="actividad" options={{ title: "Actividad" }} />
      <Stack.Screen name="seguridad" options={{ title: "Seguridad" }} />
    </Stack>
  );
}

function AuthGate() {
  const { ready, locked } = useSecurity();
  if (!ready) return null;
  if (locked) return <LockScreen />;
  return <RootLayoutNav />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <SoundProvider>
            <SecurityProvider>
              <ConfirmProvider>
                <QueryClientProvider client={queryClient}>
                  <GestureHandlerRootView>
                    <KeyboardProvider>
                      <AuthGate />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </QueryClientProvider>
              </ConfirmProvider>
            </SecurityProvider>
          </SoundProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider } from "@/src/auth";
import { StaarAudioProvider } from "@/lib/staarwardd/audio-provider";
import { PreferenceMemoryProvider } from "@/lib/staarwardd/preference-memory";
import { HomeSafetyProvider } from "@/lib/staarwardd/home-safety-provider";
import { GuardianActivityProvider } from "@/lib/staarwardd/guardian-activity";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#080B14" }}>
      <SafeAreaProvider>
        <AuthProvider>
          <PreferenceMemoryProvider>
            <GuardianActivityProvider>
              <HomeSafetyProvider>
                <StaarAudioProvider>
                  <StatusBar style="light" />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      animation: "fade",
                      contentStyle: { backgroundColor: "#080B14" },
                    }}
                  />
                </StaarAudioProvider>
              </HomeSafetyProvider>
            </GuardianActivityProvider>
          </PreferenceMemoryProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

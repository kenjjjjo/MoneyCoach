import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { Platform, View, Pressable, Text } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import "../global.css";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ExpenseProvider } from "@/lib/expense-context";
import { ThemeProvider as AppThemeProvider } from "@/lib/theme-provider";
import { trpc, createTRPCClient } from "@/lib/trpc";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Inner layout that can safely use useColorScheme (inside AppThemeProvider)
function InnerLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-expense"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="edit-expense"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="add-recurring-expense"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTRPCClient());
  const [isMobileView, setIsMobileView] = useState(true); // Web用のビュートグル状態
  const [showToggleBtn, setShowToggleBtn] = useState(true); // 切替ボタン表示状態

  const appContent = (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <ExpenseProvider>
            <InnerLayout />
          </ExpenseProvider>
        </AppThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );

  // Web環境の場合はコンテナと切り替えボタンを追加
  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, backgroundColor: "#E5E7EB", alignItems: "center" }}>
        {/* アプリ本体のコンテナ */}
        <View 
          style={{ 
            flex: 1, 
            width: "100%", 
            maxWidth: isMobileView ? 393 : "100%", 
            backgroundColor: "#FFFFFF",
            boxShadow: isMobileView ? "0 25px 50px -12px rgba(0, 0, 0, 0.25)" : "none",
            overflow: "hidden"
          }}
        >
          {appContent}
        </View>

        {/* 画面切り替え用のフローティングボタン（右下に固定、×ボタンで非表示に可能） */}
        {showToggleBtn && (
          <View
            style={{
              position: "absolute",
              bottom: 24,
              right: 24,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              zIndex: 9999,
            }}
          >
            {/* メイン切り替えボタン */}
            <Pressable
              onPress={() => setIsMobileView(!isMobileView)}
              style={({ pressed }) => [
                {
                  backgroundColor: "#22C55E",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 30,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                },
                pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }
              ]}
            >
              <MaterialIcons 
                name={isMobileView ? "desktop-windows" : "smartphone"} 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 13 }}>
                {isMobileView ? "PCビュー" : "スマホビュー"}
              </Text>
            </Pressable>

            {/* 非表示にするための「×」ボタン */}
            <Pressable
              onPress={() => setShowToggleBtn(false)}
              style={({ pressed }) => [
                {
                  backgroundColor: "#EF4444",
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                },
                pressed && { opacity: 0.8, transform: [{ scale: 0.9 }] }
              ]}
            >
              <MaterialIcons name="close" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  // iOS/Android ネイティブ環境の場合はそのまま表示
  return appContent;
}

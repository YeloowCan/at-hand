import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SecurityGate } from "../components/security/SecurityGate";
import { ToastHost } from "../components/ui/ToastHost";
import { initDbOnce } from "../db";
import "../global.css";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initDbOnce()
      .catch(() => setInitError("数据库初始化失败"))
      .finally(() => {
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-400">加载中…</Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-gray-900 text-base">{initError}</Text>
        <Text className="text-gray-400 text-sm mt-2 text-center">
          请重启应用或检查本机权限与存储空间
        </Text>
      </View>
    );
  }

  return (
    <SecurityGate>
      <View className="flex-1">
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "新建" }}
          />
          <Stack.Screen name="info/[id]" options={{ title: "详情" }} />
        </Stack>
        <ToastHost />
      </View>
    </SecurityGate>
  );
}

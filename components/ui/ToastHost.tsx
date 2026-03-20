import { useEffect } from "react";
import { Text, View } from "react-native";
import { useToastStore } from "../../store/useToastStore";

export function ToastHost() {
  const visible = useToastStore((s) => s.visible);
  const message = useToastStore((s) => s.message);
  const durationMs = useToastStore((s) => s.durationMs);
  const hide = useToastStore((s) => s.hide);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => hide(), durationMs);
    return () => clearTimeout(t);
  }, [visible, durationMs, hide]);

  if (!visible || !message) return null;

  return (
    <View className="absolute left-0 right-0 bottom-8 items-center">
      <View className="bg-gray-900 rounded-2xl px-4 py-3">
        <Text className="text-white">{message}</Text>
      </View>
    </View>
  );
}


import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useAppStore } from "../../store/useAppStore";
import { useInfoStore } from "../../store/useInfoStore";

export default function ExploreScreen() {
  const setCategory = useAppStore((s) => s.setCategory);
  const items = useInfoStore((s) => s.items);
  const load = useInfoStore((s) => s.load);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      map.set(it.category, (map.get(it.category) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [items]);

  return (
    <View className="bg-white flex-1">
      <View className="px-6 pt-10 pb-4">
        <Text className="text-3xl font-light tracking-tight">分类</Text>
        <Text className="text-sm text-gray-400 mt-1">
          按分类快速浏览你的信息
        </Text>
      </View>

      <View className="px-6">
        <FlatList
          data={categories}
          keyExtractor={(it) => it.name}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setCategory(item.name);
                router.push("/");
              }}
              className="rounded-2xl border border-gray-100 px-4 py-4"
            >
              <Text className="text-base text-gray-900">{item.name}</Text>
              <Text className="text-sm text-gray-400 mt-1">
                {item.count} 条
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={() => (
            <View className="py-10">
              <Text className="text-center text-gray-400">暂无分类</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </View>
    </View>
  );
}

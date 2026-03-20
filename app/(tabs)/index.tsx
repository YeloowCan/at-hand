import { Link, router } from "expo-router";
import { useEffect, useMemo } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useAppStore } from "../../store/useAppStore";
import { useInfoStore } from "../../store/useInfoStore";
import { copyToClipboard } from "../../utils/clipboard";

export default function HomeScreen() {
  const query = useAppStore((s) => s.query);
  const category = useAppStore((s) => s.category);
  const setQuery = useAppStore((s) => s.setQuery);
  const setCategory = useAppStore((s) => s.setCategory);

  const items = useInfoStore((s) => s.items);
  const loading = useInfoStore((s) => s.loading);
  const load = useInfoStore((s) => s.load);
  const touchUsed = useInfoStore((s) => s.touchUsed);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (category && it.category !== category) return false;
      if (!q) return true;
      const hay =
        `${it.title} ${it.content} ${it.category} ${it.tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, category]);

  return (
    <View className="bg-white flex-1">
      <View className="px-6 pt-10 pb-4">
        <View className="mb-6">
          <Text className="text-3xl font-light tracking-tight">随取</Text>
          <Text className="text-sm text-gray-400 mt-1">
            让重要信息，随时可得
          </Text>
        </View>

        <View className="rounded-2xl bg-gray-100 px-4 py-3">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="搜索标题或内容"
            placeholderTextColor="#9CA3AF"
            className="text-base text-gray-900"
          />
        </View>
      </View>

      <View className="px-6 pb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm text-gray-400">最近使用</Text>
          {category ? (
            <Pressable onPress={() => setCategory(null)}>
              <Text className="text-sm text-gray-500">清除筛选</Text>
            </Pressable>
          ) : null}
        </View>
        <FlatList
          data={data}
          keyExtractor={(it) => it.id}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({ pathname: "/info/[id]", params: { id: item.id } })
              }
              className="rounded-2xl border border-gray-100 px-4 py-4"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-base text-gray-900">{item.title}</Text>
                  <Text
                    className="text-sm text-gray-500 mt-1"
                    numberOfLines={2}
                  >
                    {item.content.trim() || "（无内容）"}
                  </Text>
                </View>
                <Pressable
                  onPress={async () => {
                    await copyToClipboard(item.content);
                    await touchUsed(item.id);
                  }}
                  className="bg-gray-900 rounded-xl px-3 py-2"
                >
                  <Text className="text-white">复制</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => setCategory(item.category)}
                className="mt-4"
              >
                <Text className="text-xs text-gray-400">{item.category}</Text>
              </Pressable>
            </Pressable>
          )}
          ListEmptyComponent={() => (
            <View className="py-10">
              <Text className="text-center text-gray-400">
                {loading ? "加载中…" : "没有匹配结果"}
              </Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>

      <Link href="/modal" asChild>
        <Pressable className="absolute right-5 bottom-6 bg-gray-900 rounded-full px-5 py-4">
          <Text className="text-white text-base">新增</Text>
        </Pressable>
      </Link>
    </View>
  );
}

import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppStore } from "../../store/useAppStore";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useInfoStore } from "../../store/useInfoStore";

export default function ExploreScreen() {
  const selectedCategory = useAppStore((s) => s.category);
  const setCategory = useAppStore((s) => s.setCategory);

  const items = useInfoStore((s) => s.items);
  const load = useInfoStore((s) => s.load);
  const replaceCategory = useInfoStore((s) => s.replaceCategory);

  const categories = useCategoryStore((s) => s.categories);
  const bootstrapCategories = useCategoryStore((s) => s.bootstrap);
  const addCategory = useCategoryStore((s) => s.addCategory);
  const removeCategory = useCategoryStore((s) => s.removeCategory);
  const syncCategoriesFromItems = useCategoryStore(
    (s) => s.syncCategoriesFromItems,
  );

  const [newCategory, setNewCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([load(), bootstrapCategories()]).catch((error) => {
      console.log("加载信息失败", error);
    });
  }, [load, bootstrapCategories]);

  useEffect(() => {
    const names = Array.from(
      new Set(items.map((it) => it.category).filter(Boolean)),
    );
    syncCategoriesFromItems(names).catch(() => undefined);
  }, [items, syncCategoriesFromItems]);

  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      map.set(it.category, (map.get(it.category) ?? 0) + 1);
    }
    return categories
      .map((name) => ({ name, count: map.get(name) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [items, categories]);

  return (
    <View className="bg-white flex-1">
      <View className="px-6 pt-10 pb-4">
        <Text className="text-3xl font-light tracking-tight">分类</Text>
        <Text className="text-sm text-gray-400 mt-1">
          按分类快速浏览你的信息
        </Text>
      </View>

      <View className="px-6">
        <View className="rounded-2xl bg-gray-100 px-4 py-3 mb-4">
          <Text className="text-sm text-gray-400 mb-2">新增分类</Text>
          <View className="flex-row items-center">
            <View className="flex-1 rounded-2xl bg-white px-4 py-3">
              <TextInput
                value={newCategory}
                onChangeText={(t) => {
                  setNewCategory(t);
                  setError(null);
                }}
                placeholder="例如：账号"
                placeholderTextColor="#9CA3AF"
                className="text-base text-gray-900"
              />
            </View>
            <Pressable
              disabled={!newCategory.trim() || busy}
              onPress={async () => {
                Keyboard.dismiss();
                try {
                  setBusy(true);
                  await addCategory(newCategory);
                  setNewCategory("");
                } catch (error) {
                  console.log(error);

                  setError("添加失败");
                } finally {
                  setBusy(false);
                }
              }}
              className={[
                "ml-3 rounded-2xl px-4 py-3",
                !newCategory.trim() || busy ? "bg-gray-300" : "bg-gray-900",
              ].join(" ")}
            >
              <Text className="text-white">添加</Text>
            </Pressable>
          </View>
        </View>

        {error ? (
          <Text className="text-sm text-red-500 mb-4">{error}</Text>
        ) : null}

        <FlatList
          data={data}
          keyExtractor={(it) => it.name}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => (
            <View className="rounded-2xl border border-gray-100 flex-row items-stretch overflow-hidden">
              <Pressable
                onPress={() => {
                  setCategory(item.name);
                  router.push("/");
                }}
                className="flex-1 px-4 py-4"
              >
                <Text className="text-base text-gray-900">{item.name}</Text>
                <Text className="text-sm text-gray-400 mt-1">
                  {item.count} 条
                </Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={async () => {
                  Keyboard.dismiss();
                  setError(null);
                  const replacement = categories.find((c) => c !== item.name);
                  if (!replacement) {
                    setError("至少保留一个分类");
                    return;
                  }
                  try {
                    setBusy(true);
                    await replaceCategory(item.name, replacement);
                    await removeCategory(item.name);
                    if (selectedCategory === item.name) setCategory(null);
                  } catch {
                    setError("删除失败");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="px-4 py-4 justify-center"
              >
                <Text className="text-sm text-red-500">删除</Text>
              </Pressable>
            </View>
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

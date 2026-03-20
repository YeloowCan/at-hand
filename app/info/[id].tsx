import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { getInfoById } from "../../services/infoService";
import { useInfoStore } from "../../store/useInfoStore";
import type { InfoItem } from "../../types/info";
import { copyToClipboard } from "../../utils/clipboard";

export default function InfoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const remove = useInfoStore((s) => s.remove);
  const touchUsed = useInfoStore((s) => s.touchUsed);

  const [item, setItem] = useState<InfoItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sid = String(id ?? "");
    setLoading(true);
    getInfoById(sid)
      .then((it) => setItem(it))
      .finally(() => setLoading(false));
    touchUsed(sid).catch(() => undefined);
  }, [id, touchUsed]);

  return (
    <View className="bg-white flex-1 px-6 pt-10">
      {loading ? (
        <Text className="text-gray-400">加载中…</Text>
      ) : !item ? (
        <Text className="text-gray-400">未找到该条目</Text>
      ) : (
        <>
          <Text className="text-3xl font-light tracking-tight">
            {item.title}
          </Text>
          <Text className="text-sm text-gray-400 mt-2">{item.category}</Text>

          <View className="mt-8 rounded-2xl bg-gray-100 px-4 py-4">
            <Text className="text-base text-gray-900">{item.content}</Text>
          </View>

          {item.attachments.length ? (
            <View className="mt-4 flex-row flex-wrap">
              {item.attachments.map((att) => (
                <View key={att.uri} className="mr-3 mb-3">
                  {att.type === "image" ? (
                    <Image
                      source={{ uri: att.uri }}
                      style={{ width: 110, height: 110, borderRadius: 16 }}
                      contentFit="cover"
                    />
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          <View className="mt-6">
            <Pressable
              onPress={async () => {
                await copyToClipboard(item.content);
                await touchUsed(item.id);
              }}
              className="bg-gray-900 rounded-2xl px-5 py-4"
            >
              <Text className="text-white text-center text-base">一键复制</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                router.push({ pathname: "/modal", params: { id: item.id } })
              }
              className="mt-3 rounded-2xl bg-gray-100 px-5 py-4"
            >
              <Text className="text-gray-900 text-center text-base">编辑</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                await remove(item.id);
                router.back();
              }}
              className="mt-3 rounded-2xl bg-gray-100 px-5 py-4"
            >
              <Text className="text-gray-900 text-center text-base">删除</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

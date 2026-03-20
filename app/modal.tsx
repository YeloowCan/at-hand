import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Keyboard, Pressable, Text, TextInput, View } from "react-native";
import {
  deleteAttachment,
  pickAndSaveImage,
} from "../services/attachmentService";
import { getInfoById } from "../services/infoService";
import { useCategoryStore } from "../store/useCategoryStore";
import { useInfoStore } from "../store/useInfoStore";
import type { InfoAttachment, InfoDraft } from "../types/info";

export default function ModalScreen() {
  const params = useLocalSearchParams<{ category?: string; id?: string }>();
  const load = useInfoStore((s) => s.load);
  const create = useInfoStore((s) => s.create);
  const update = useInfoStore((s) => s.update);
  const remove = useInfoStore((s) => s.remove);

  const categories = useCategoryStore((s) => s.categories);
  const bootstrapCategories = useCategoryStore((s) => s.bootstrap);
  const addCategory = useCategoryStore((s) => s.addCategory);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [attachments, setAttachments] = useState<InfoAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editingId = typeof params.id === "string" ? params.id : null;

  useEffect(() => {
    bootstrapCategories().catch(() => undefined);
  }, [bootstrapCategories]);

  useEffect(() => {
    const presetCategory =
      typeof params.category === "string" ? params.category : "";
    if (presetCategory) {
      setCategory(presetCategory);
      addCategory(presetCategory).catch(() => undefined);
    }
  }, [params.category, addCategory]);

  useEffect(() => {
    if (!editingId) return;
    setLoading(true);
    getInfoById(editingId)
      .then((it) => {
        if (!it) return;
        setTitle(it.title);
        setContent(it.content);
        setCategory(it.category);
        addCategory(it.category).catch(() => undefined);
        setAttachments(it.attachments);
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [editingId, addCategory]);

  useEffect(() => {
    if (editingId) return;
    if (category.trim()) return;
    if (!categories.length) return;
    setCategory(categories[0]);
  }, [categories, category, editingId]);

  const draft = useMemo<InfoDraft>(() => {
    return {
      title,
      content,
      category,
      attachments,
    };
  }, [title, content, category, attachments]);

  const canSave = Boolean(draft.title.trim());

  return (
    <Pressable
      className="bg-white flex-1"
      onPress={() => {
        Keyboard.dismiss();
        setCategoryOpen(false);
      }}
      accessible={false}
    >
      <View className="px-6 pt-6">
        <Text className="text-2xl font-light tracking-tight">
          {editingId ? "编辑信息" : "新建信息"}
        </Text>
      </View>

      <View className="px-6 mt-8">
        <Text className="text-sm text-gray-400 mb-2">标题</Text>
        <View className="rounded-2xl bg-gray-100 px-4 py-3">
          <TextInput
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setError(null);
            }}
            placeholder="例如：身份证号"
            placeholderTextColor="#9CA3AF"
            className="text-base text-gray-900"
          />
        </View>

        <Text className="text-sm text-gray-400 mb-2 mt-5">内容</Text>
        <View className="rounded-2xl bg-gray-100 px-4 py-3">
          <TextInput
            value={content}
            onChangeText={(t) => {
              setContent(t);
              setError(null);
            }}
            placeholder="例如：4403…"
            placeholderTextColor="#9CA3AF"
            className="text-base text-gray-900"
            multiline
          />
        </View>

        <Text className="text-sm text-gray-400 mb-2 mt-5">分类</Text>
        <View className="rounded-2xl bg-gray-100 px-4 py-3">
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setCategoryOpen((v) => !v);
            }}
          >
            <Text className="text-base text-gray-900">
              {category.trim() || "请选择分类"}
            </Text>
          </Pressable>
        </View>
        {categoryOpen ? (
          <View className="mt-3 rounded-2xl border border-gray-100 overflow-hidden">
            {categories.map((name) => (
              <Pressable
                key={name}
                onPress={() => {
                  setCategory(name);
                  setCategoryOpen(false);
                  setError(null);
                }}
                className="px-4 py-3 bg-white"
              >
                <Text className="text-base text-gray-900">{name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View className="mt-5">
          <Pressable
            onPress={async () => {
              try {
                Keyboard.dismiss();
                setLoading(true);
                const att = await pickAndSaveImage();
                if (att) setAttachments((prev) => [...prev, att]);
              } catch {
                setError("添加图片失败");
              } finally {
                setLoading(false);
              }
            }}
            className="rounded-2xl bg-gray-100 px-4 py-3"
          >
            <Text className="text-gray-900 text-center">添加图片</Text>
          </Pressable>

          {attachments.length ? (
            <View className="mt-4 flex-row flex-wrap">
              {attachments.map((att) => (
                <View key={att.uri} className="mr-3 mb-3">
                  {att.type === "image" ? (
                    <Image
                      source={{ uri: att.uri }}
                      style={{ width: 88, height: 88, borderRadius: 16 }}
                      contentFit="cover"
                    />
                  ) : null}
                  <Pressable
                    onPress={async () => {
                      setAttachments((prev) =>
                        prev.filter((a) => a.uri !== att.uri),
                      );
                      await deleteAttachment(att);
                    }}
                    className="mt-2"
                  >
                    <Text className="text-xs text-gray-400 text-center">
                      移除
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {error ? (
          <Text className="text-sm text-red-500 mt-4">{error}</Text>
        ) : null}
      </View>

      <View className="px-6 mt-auto pb-8">
        {editingId ? (
          <Pressable
            onPress={async () => {
              try {
                Keyboard.dismiss();
                setLoading(true);
                await remove(editingId);
                await load();
                router.back();
              } catch {
                setError("删除失败");
              } finally {
                setLoading(false);
              }
            }}
            className="rounded-2xl px-5 py-4 mb-3 bg-gray-100"
          >
            <Text className="text-gray-900 text-center text-base">删除</Text>
          </Pressable>
        ) : null}

        <Pressable
          disabled={!canSave || loading}
          onPress={async () => {
            try {
              Keyboard.dismiss();
              setLoading(true);
              if (editingId) {
                await update(editingId, draft);
              } else {
                await create(draft);
              }
              await load();
              router.back();
            } catch (error) {
              if (error instanceof Error && error.message === "Locked") {
                setError("应用已锁定，请先解锁后再保存");
              } else {
                setError("保存失败");
              }
            } finally {
              setLoading(false);
            }
          }}
          className={[
            "rounded-2xl px-5 py-4",
            !canSave || loading ? "bg-gray-300" : "bg-gray-900",
          ].join(" ")}
        >
          <Text className="text-white text-center text-base">
            {loading ? "保存中…" : "保存"}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

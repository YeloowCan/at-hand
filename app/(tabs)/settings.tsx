import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSecurityStore } from "../../store/useSecurityStore";

export default function SettingsScreen() {
  const status = useSecurityStore((s) => s.status);
  const lock = useSecurityStore((s) => s.lock);
  const biometricAvailable = useSecurityStore((s) => s.biometricAvailable);
  const biometricEnabled = useSecurityStore((s) => s.biometricEnabled);
  const enableBiometric = useSecurityStore((s) => s.enableBiometric);
  const disableBiometric = useSecurityStore((s) => s.disableBiometric);

  const [showEnableBio, setShowEnableBio] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canEnable = useMemo(() => pin.length >= 4, [pin]);

  return (
    <View className="bg-white flex-1">
      <View className="px-6 pt-10 pb-4">
        <Text className="text-3xl font-light tracking-tight">设置</Text>
        <Text className="text-sm text-gray-400 mt-1">安全与偏好</Text>
      </View>

      <View className="px-6">
        <View className="rounded-2xl border border-gray-100 px-4 py-4">
          <Text className="text-base text-gray-900">解锁</Text>
          <Text className="text-sm text-gray-400 mt-1">
            设置 PIN 或启用生物识别
          </Text>
        </View>

        {biometricAvailable ? (
          <View className="rounded-2xl border border-gray-100 px-4 py-4 mt-3">
            <Text className="text-base text-gray-900">生物识别解锁</Text>
            <Text className="text-sm text-gray-400 mt-1">
              {biometricEnabled ? "已启用" : "未启用"}
            </Text>
            {biometricEnabled ? (
              <Pressable
                onPress={async () => {
                  await disableBiometric();
                  setShowEnableBio(false);
                  setPin("");
                  setError(null);
                }}
                className="mt-4 rounded-2xl bg-gray-100 px-4 py-3"
              >
                <Text className="text-gray-900 text-center">关闭</Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  onPress={() => {
                    setShowEnableBio((v) => !v);
                    setError(null);
                  }}
                  className="mt-4 rounded-2xl bg-gray-100 px-4 py-3"
                >
                  <Text className="text-gray-900 text-center">启用</Text>
                </Pressable>
                {showEnableBio ? (
                  <View className="mt-4">
                    <Text className="text-sm text-gray-400 mb-2">输入 PIN</Text>
                    <View className="rounded-2xl bg-gray-100 px-4 py-3">
                      <TextInput
                        value={pin}
                        onChangeText={(t) => {
                          setPin(t.replace(/\D/g, ""));
                          setError(null);
                        }}
                        keyboardType="number-pad"
                        secureTextEntry
                        className="text-base text-gray-900"
                        placeholder="用于绑定生物识别"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    {error ? (
                      <Text className="text-sm text-red-500 mt-3">{error}</Text>
                    ) : null}
                    <Pressable
                      onPress={async () => {
                        try {
                          await enableBiometric(pin);
                          setShowEnableBio(false);
                          setPin("");
                        } catch {
                          setError("PIN 不正确或生物识别不可用");
                        }
                      }}
                      disabled={!canEnable}
                      className={[
                        "mt-4 rounded-2xl px-4 py-3",
                        canEnable ? "bg-gray-900" : "bg-gray-300",
                      ].join(" ")}
                    >
                      <Text className="text-white text-center">确认启用</Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        {status === "unlocked" ? (
          <Pressable
            onPress={lock}
            className="rounded-2xl border border-gray-100 px-4 py-4 mt-3"
          >
            <Text className="text-base text-gray-900">立即锁定</Text>
            <Text className="text-sm text-gray-400 mt-1">返回到解锁界面</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

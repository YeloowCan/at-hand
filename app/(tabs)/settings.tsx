import { useMemo, useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import { useSecurityStore } from "../../store/useSecurityStore";

export default function SettingsScreen() {
  const status = useSecurityStore((s) => s.status);
  const pinLoginEnabled = useSecurityStore((s) => s.pinLoginEnabled);
  const setPinLoginEnabled = useSecurityStore((s) => s.setPinLoginEnabled);
  const lock = useSecurityStore((s) => s.lock);
  const biometricAvailable = useSecurityStore((s) => s.biometricAvailable);
  const biometricEnabled = useSecurityStore((s) => s.biometricEnabled);
  const enableBiometric = useSecurityStore((s) => s.enableBiometric);
  const disableBiometric = useSecurityStore((s) => s.disableBiometric);
  const clearAllData = useSecurityStore((s) => s.clearAllData);

  const [showEnableBio, setShowEnableBio] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [updatingPinLogin, setUpdatingPinLogin] = useState(false);
  const canEnable = useMemo(() => pin.length >= 4, [pin]);

  return (
    <View className="flex-1 bg-white">
      <View className="px-6 pb-4 pt-10">
        <Text className="text-3xl font-light tracking-tight">设置</Text>
        <Text className="mt-1 text-sm text-gray-400">安全与偏好</Text>
      </View>

      <View className="px-6">
        <View className="rounded-2xl border border-gray-100 px-4 py-4">
          <View className="flex-row items-center justify-between">
            <View className="mr-4 flex-1">
              <Text className="text-base text-gray-900">PIN 登录</Text>
              <Text className="mt-1 text-sm text-gray-400">
                默认关闭，关闭后进入应用不需要 PIN
              </Text>
            </View>
            <Switch
              value={pinLoginEnabled}
              disabled={updatingPinLogin}
              onValueChange={async (value) => {
                try {
                  setUpdatingPinLogin(true);
                  setError(null);
                  setShowEnableBio(false);
                  setPin("");
                  await setPinLoginEnabled(value);
                } catch {
                  setError("PIN 登录设置失败，请重试");
                } finally {
                  setUpdatingPinLogin(false);
                }
              }}
            />
          </View>
        </View>

        {pinLoginEnabled ? (
          <View className="mt-3 rounded-2xl border border-gray-100 px-4 py-4">
            <Text className="text-base text-gray-900">解锁</Text>
            <Text className="mt-1 text-sm text-gray-400">
              设置 PIN 或启用生物识别
            </Text>
          </View>
        ) : null}

        {pinLoginEnabled && biometricAvailable ? (
          <View className="mt-3 rounded-2xl border border-gray-100 px-4 py-4">
            <Text className="text-base text-gray-900">生物识别解锁</Text>
            <Text className="mt-1 text-sm text-gray-400">
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
                <Text className="text-center text-gray-900">关闭</Text>
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
                  <Text className="text-center text-gray-900">启用</Text>
                </Pressable>
                {showEnableBio ? (
                  <View className="mt-4">
                    <Text className="mb-2 text-sm text-gray-400">输入 PIN</Text>
                    <View className="rounded-2xl bg-gray-100 px-4 py-3">
                      <TextInput
                        value={pin}
                        onChangeText={(text) => {
                          setPin(text.replace(/\D/g, ""));
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
                      <Text className="mt-3 text-sm text-red-500">{error}</Text>
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
                      <Text className="text-center text-white">确认启用</Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        {pinLoginEnabled && status === "unlocked" ? (
          <Pressable
            onPress={lock}
            className="mt-3 rounded-2xl border border-gray-100 px-4 py-4"
          >
            <Text className="text-base text-gray-900">立即锁定</Text>
            <Text className="mt-1 text-sm text-gray-400">返回到解锁界面</Text>
          </Pressable>
        ) : null}

        <View className="mt-3 rounded-2xl border border-red-100 px-4 py-4">
          <Text className="text-base text-red-600">清空本地数据</Text>
          <Text className="mt-1 text-sm text-gray-400">
            删除本机 PIN、加密信息和已保存内容
          </Text>
          <Pressable
            onPress={async () => {
              try {
                setClearing(true);
                setError(null);
                await clearAllData();
              } catch {
                setError("清空失败，请重试");
              } finally {
                setClearing(false);
              }
            }}
            className={[
              "mt-4 rounded-2xl px-4 py-3",
              clearing ? "bg-red-200" : "bg-red-500",
            ].join(" ")}
          >
            <Text className="text-center text-white">
              {clearing ? "清空中..." : "确认清空"}
            </Text>
          </Pressable>
        </View>

        {error ? <Text className="mt-4 text-sm text-red-500">{error}</Text> : null}
      </View>
    </View>
  );
}

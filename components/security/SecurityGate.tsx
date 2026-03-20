import { useEffect, useMemo, useState } from "react";
import {
  AppState,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSecurityStore } from "../../store/useSecurityStore";

type Props = { children: React.ReactNode };

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function PrimaryButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      className={[
        "rounded-2xl px-5 py-4",
        props.disabled ? "bg-gray-300" : "bg-gray-900",
      ].join(" ")}
    >
      <Text className="text-base text-center text-white">{props.label}</Text>
    </Pressable>
  );
}

function SecondaryButton(props: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} className="rounded-2xl px-5 py-4">
      <Text className="text-base text-center text-gray-700">{props.label}</Text>
    </Pressable>
  );
}

function SetupPinScreen() {
  const setupPin = useSecurityStore((s) => s.setupPin);
  const biometricAvailable = useSecurityStore((s) => s.biometricAvailable);

  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [enableBio, setEnableBio] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => {
    if (!pin || pin.length < 4) return false;
    if (pin !== confirm) return false;
    return true;
  }, [pin, confirm]);

  return (
    <View className="flex-1 bg-white px-6 pt-12">
      <Text className="text-3xl font-light tracking-tight">设置 PIN</Text>
      <Text className="mt-2 text-sm text-gray-400">
        PIN 用于本地加密与解锁，忘记后无法恢复数据
      </Text>

      <View className="mt-10">
        <Text className="mb-2 text-sm text-gray-400">PIN（至少 4 位）</Text>
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
            placeholder="输入 PIN"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <Text className="mb-2 mt-5 text-sm text-gray-400">确认 PIN</Text>
        <View className="rounded-2xl bg-gray-100 px-4 py-3">
          <TextInput
            value={confirm}
            onChangeText={(t) => {
              setConfirm(t.replace(/\D/g, ""));
              setError(null);
            }}
            keyboardType="number-pad"
            secureTextEntry
            className="text-base text-gray-900"
            placeholder="再次输入 PIN"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {biometricAvailable ? (
          <Pressable
            onPress={() => setEnableBio((v) => !v)}
            className="mt-6 rounded-2xl border border-gray-100 px-4 py-4"
          >
            <Text className="text-base text-gray-900">启用生物识别</Text>
            <Text className="mt-1 text-sm text-gray-400">
              {enableBio ? "已启用" : "未启用"}
            </Text>
          </Pressable>
        ) : null}

        {error ? <Text className="mt-4 text-sm text-red-500">{error}</Text> : null}
      </View>

      <View className="mt-auto pb-8">
        <PrimaryButton
          label={saving ? "保存中…" : "完成"}
          disabled={!canSubmit || saving}
          onPress={async () => {
            Keyboard.dismiss();
            try {
              setSaving(true);
              await nextFrame();
              await setupPin(pin, enableBio);
            } catch {
              setError("保存失败，请重试");
            } finally {
              setSaving(false);
            }
          }}
        />
      </View>
    </View>
  );
}

function UnlockScreen() {
  const unlockWithPin = useSecurityStore((s) => s.unlockWithPin);
  const unlockWithBiometric = useSecurityStore((s) => s.unlockWithBiometric);
  const biometricEnabled = useSecurityStore((s) => s.biometricEnabled);

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  return (
    <View className="flex-1 bg-white px-6 pt-12">
      <Text className="text-3xl font-light tracking-tight">解锁随取</Text>
      <Text className="mt-2 text-sm text-gray-400">输入 PIN 进入应用</Text>

      <View className="mt-10">
        <Text className="mb-2 text-sm text-gray-400">PIN</Text>
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
            placeholder="输入 PIN"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {error ? <Text className="mt-4 text-sm text-red-500">{error}</Text> : null}
      </View>

      <View className="mt-auto pb-8">
        <PrimaryButton
          label={unlocking ? "解锁中…" : "解锁"}
          disabled={!pin || unlocking}
          onPress={async () => {
            Keyboard.dismiss();
            try {
              setUnlocking(true);
              await nextFrame();
              await unlockWithPin(pin);
            } catch {
              setError("PIN 不正确");
            } finally {
              setUnlocking(false);
            }
          }}
        />
        {biometricEnabled ? (
          <SecondaryButton
            label="使用生物识别解锁"
            onPress={async () => {
              Keyboard.dismiss();
              try {
                setUnlocking(true);
                await nextFrame();
                await unlockWithBiometric();
              } catch {
                setError("生物识别解锁失败");
              } finally {
                setUnlocking(false);
              }
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

export function SecurityGate({ children }: Props) {
  const status = useSecurityStore((s) => s.status);
  const bootstrap = useSecurityStore((s) => s.bootstrap);
  const lock = useSecurityStore((s) => s.lock);

  useEffect(() => {
    if (status === "booting") {
      bootstrap().catch((error) => {
        console.log(error);
      });
    }
  }, [status, bootstrap]);

  useEffect(() => {
    if (status !== "unlocked") return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") lock();
    });
    return () => sub.remove();
  }, [status, lock]);

  if (status === "booting") {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-400">加载中…</Text>
      </View>
    );
  }

  if (status === "setup_required") {
    return <SetupPinScreen />;
  }

  if (status === "locked") {
    return <UnlockScreen />;
  }

  return <>{children}</>;
}

import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { deriveKeyHex, randomHex, sha256Hex } from "../utils/crypto";

type SecurityStatus = "booting" | "setup_required" | "locked" | "unlocked";

const KEY_SALT = "at-hand-salt";
const KEY_VERIFIER = "at-hand-verifier";
const KEY_BIO_ENABLED = "at-hand-bio-enabled";
const KEY_BIO_PIN = "at-hand-bio-pin";

type State = {
  status: SecurityStatus;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  keyHex: string | null;
  bootstrap: () => Promise<void>;
  setupPin: (pin: string, enableBiometric: boolean) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<void>;
  unlockWithBiometric: () => Promise<void>;
  lock: () => void;
  enableBiometric: (pin: string) => Promise<void>;
  disableBiometric: () => Promise<void>;
};

async function detectBiometricAvailable() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

async function getMeta() {
  const [salt, verifier, bioEnabled] = await Promise.all([
    SecureStore.getItemAsync(KEY_SALT),
    SecureStore.getItemAsync(KEY_VERIFIER),
    SecureStore.getItemAsync(KEY_BIO_ENABLED),
  ]);
  return {
    salt,
    verifier,
    bioEnabled: bioEnabled === "1",
  };
}

export const useSecurityStore = create<State>((set, get) => ({
  status: "booting",
  biometricAvailable: false,
  biometricEnabled: false,
  keyHex: null,

  bootstrap: async () => {
    const [biometricAvailable, meta] = await Promise.all([
      detectBiometricAvailable(),
      getMeta(),
    ]);

    console.log("bootstrap", biometricAvailable, meta);

    if (!meta.salt || !meta.verifier) {
      set({
        status: "setup_required",
        biometricAvailable,
        biometricEnabled: false,
        keyHex: null,
      });
      return;
    }

    set({
      status: "locked",
      biometricAvailable,
      biometricEnabled: meta.bioEnabled && biometricAvailable,
      keyHex: null,
    });
  },

  setupPin: async (pin, enableBiometric) => {
    const biometricAvailable = get().biometricAvailable;
    const saltHex = await randomHex(16);
    const keyHex = deriveKeyHex(pin, saltHex);
    const verifier = sha256Hex(keyHex);

    await SecureStore.setItemAsync(KEY_SALT, saltHex);
    await SecureStore.setItemAsync(KEY_VERIFIER, verifier);

    const willEnableBio = Boolean(enableBiometric && biometricAvailable);
    await SecureStore.setItemAsync(KEY_BIO_ENABLED, willEnableBio ? "1" : "0");

    if (willEnableBio) {
      await SecureStore.setItemAsync(KEY_BIO_PIN, pin, {
        requireAuthentication: true,
        authenticationPrompt: "使用生物识别解锁随取",
      });
    }

    set({
      status: "unlocked",
      biometricEnabled: willEnableBio,
      keyHex,
    });
  },

  unlockWithPin: async (pin) => {
    const meta = await getMeta();
    if (!meta.salt || !meta.verifier) {
      set({ status: "setup_required", keyHex: null, biometricEnabled: false });
      return;
    }
    const keyHex = deriveKeyHex(pin, meta.salt);
    const verifier = sha256Hex(keyHex);
    if (verifier !== meta.verifier) {
      throw new Error("PIN incorrect");
    }
    set({ status: "unlocked", keyHex });
  },

  unlockWithBiometric: async () => {
    const { biometricEnabled, biometricAvailable } = get();
    if (!biometricEnabled || !biometricAvailable) {
      throw new Error("Biometric unavailable");
    }
    const pin = await SecureStore.getItemAsync(KEY_BIO_PIN, {
      requireAuthentication: true,
      authenticationPrompt: "使用生物识别解锁随取",
    });
    if (!pin) {
      throw new Error("Biometric PIN missing");
    }
    await get().unlockWithPin(pin);
  },

  lock: () => {
    set({ status: "locked", keyHex: null });
  },

  enableBiometric: async (pin) => {
    const biometricAvailable = get().biometricAvailable;
    if (!biometricAvailable) {
      throw new Error("Biometric unavailable");
    }
    const meta = await getMeta();
    if (!meta.salt || !meta.verifier) {
      throw new Error("PIN not set");
    }
    const keyHex = deriveKeyHex(pin, meta.salt);
    if (sha256Hex(keyHex) !== meta.verifier) {
      throw new Error("PIN incorrect");
    }
    await SecureStore.setItemAsync(KEY_BIO_ENABLED, "1");
    await SecureStore.setItemAsync(KEY_BIO_PIN, pin, {
      requireAuthentication: true,
      authenticationPrompt: "使用生物识别解锁随取",
    });
    set({ biometricEnabled: true });
  },

  disableBiometric: async () => {
    await Promise.all([
      SecureStore.setItemAsync(KEY_BIO_ENABLED, "0"),
      SecureStore.deleteItemAsync(KEY_BIO_PIN),
    ]);
    set({ biometricEnabled: false });
  },
}));

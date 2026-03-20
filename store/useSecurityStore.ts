import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { deriveKeyHex, randomHex, sha256Hex } from "../utils/crypto";

type SecurityStatus = "booting" | "setup_required" | "locked" | "unlocked";

export const SECURITY_SECURE_STORE_KEYS = {
  SALT: "at-hand-salt",
  VERIFIER: "at-hand-verifier",
  BIO_ENABLED: "at-hand-bio-enabled",
  BIO_PIN: "at-hand-bio-pin",
} as const;

type State = {
  status: SecurityStatus;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  saltHex: string | null;
  verifier: string | null;
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
    SecureStore.getItemAsync(SECURITY_SECURE_STORE_KEYS.SALT),
    SecureStore.getItemAsync(SECURITY_SECURE_STORE_KEYS.VERIFIER),
    SecureStore.getItemAsync(SECURITY_SECURE_STORE_KEYS.BIO_ENABLED),
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
  saltHex: null,
  verifier: null,
  keyHex: null,

  bootstrap: async () => {
    const [biometricAvailable, meta] = await Promise.all([
      detectBiometricAvailable(),
      getMeta(),
    ]);

    if (!meta.salt || !meta.verifier) {
      set({
        status: "setup_required",
        biometricAvailable,
        biometricEnabled: false,
        saltHex: null,
        verifier: null,
        keyHex: null,
      });
      return;
    }

    set({
      status: "locked",
      biometricAvailable,
      biometricEnabled: meta.bioEnabled && biometricAvailable,
      saltHex: meta.salt,
      verifier: meta.verifier,
      keyHex: null,
    });
  },

  setupPin: async (pin, enableBiometric) => {
    const biometricAvailable = get().biometricAvailable;
    const saltHex = await randomHex(16);
    const keyHex = deriveKeyHex(pin, saltHex);
    const verifier = sha256Hex(keyHex);

    const willEnableBio = Boolean(enableBiometric && biometricAvailable);
    await Promise.all([
      SecureStore.setItemAsync(SECURITY_SECURE_STORE_KEYS.SALT, saltHex),
      SecureStore.setItemAsync(SECURITY_SECURE_STORE_KEYS.VERIFIER, verifier),
      SecureStore.setItemAsync(
        SECURITY_SECURE_STORE_KEYS.BIO_ENABLED,
        willEnableBio ? "1" : "0",
      ),
    ]);

    if (willEnableBio) {
      await SecureStore.setItemAsync(SECURITY_SECURE_STORE_KEYS.BIO_PIN, pin, {
        requireAuthentication: true,
        authenticationPrompt: "使用生物识别解锁随取",
      });
    }

    set({
      status: "unlocked",
      biometricEnabled: willEnableBio,
      saltHex,
      verifier,
      keyHex,
    });
  },

  unlockWithPin: async (pin) => {
    let saltHex = get().saltHex;
    let verifierHex = get().verifier;

    if (!saltHex || !verifierHex) {
      const meta = await getMeta();
      saltHex = meta.salt;
      verifierHex = meta.verifier;
      set({
        biometricEnabled: meta.bioEnabled && get().biometricAvailable,
        saltHex: meta.salt ?? null,
        verifier: meta.verifier ?? null,
      });
    }

    if (!saltHex || !verifierHex) {
      set({ status: "setup_required", keyHex: null, biometricEnabled: false });
      return;
    }
    const keyHex = deriveKeyHex(pin, saltHex);
    const verifier = sha256Hex(keyHex);
    if (verifier !== verifierHex) {
      throw new Error("PIN incorrect");
    }
    set({ status: "unlocked", keyHex });
  },

  unlockWithBiometric: async () => {
    const { biometricEnabled, biometricAvailable } = get();
    if (!biometricEnabled || !biometricAvailable) {
      throw new Error("Biometric unavailable");
    }
    const pin = await SecureStore.getItemAsync(
      SECURITY_SECURE_STORE_KEYS.BIO_PIN,
      {
        requireAuthentication: true,
        authenticationPrompt: "使用生物识别解锁随取",
      },
    );
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
    const saltHex = get().saltHex;
    const verifierHex = get().verifier;
    if (!saltHex || !verifierHex) {
      throw new Error("PIN not set");
    }
    const keyHex = deriveKeyHex(pin, saltHex);
    if (sha256Hex(keyHex) !== verifierHex) {
      throw new Error("PIN incorrect");
    }
    await SecureStore.setItemAsync(SECURITY_SECURE_STORE_KEYS.BIO_ENABLED, "1");
    await SecureStore.setItemAsync(SECURITY_SECURE_STORE_KEYS.BIO_PIN, pin, {
      requireAuthentication: true,
      authenticationPrompt: "使用生物识别解锁随取",
    });
    set({ biometricEnabled: true });
  },

  disableBiometric: async () => {
    await Promise.all([
      SecureStore.setItemAsync(SECURITY_SECURE_STORE_KEYS.BIO_ENABLED, "0"),
      SecureStore.deleteItemAsync(SECURITY_SECURE_STORE_KEYS.BIO_PIN),
    ]);
    set({ biometricEnabled: false });
  },
}));

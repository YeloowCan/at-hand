import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { getDb, initDbOnce } from "../db";
import {
  CURRENT_KDF_PARAMS,
  type KdfParams,
  deriveKeyHex,
  randomHex,
  sha256Hex,
} from "../utils/crypto";

type SecurityStatus = "booting" | "setup_required" | "locked" | "unlocked";

export const SECURITY_SECURE_STORE_KEYS = {
  SALT: "at-hand-salt",
  VERIFIER: "at-hand-verifier",
  KDF_PARAMS: "at-hand-kdf-params",
  BIO_ENABLED: "at-hand-bio-enabled",
  BIO_PIN: "at-hand-bio-pin",
} as const;

type State = {
  status: SecurityStatus;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  saltHex: string | null;
  verifier: string | null;
  kdfParams: KdfParams;
  keyHex: string | null;
  bootstrap: () => Promise<void>;
  setupPin: (pin: string, enableBiometric: boolean) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<void>;
  unlockWithBiometric: () => Promise<void>;
  lock: () => void;
  enableBiometric: (pin: string) => Promise<void>;
  disableBiometric: () => Promise<void>;
  clearAllData: () => Promise<void>;
};

async function detectBiometricAvailable() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

async function getMeta() {
  const [salt, verifier, kdfParamsRaw, bioEnabled] = await Promise.all([
    SecureStore.getItemAsync(SECURITY_SECURE_STORE_KEYS.SALT),
    SecureStore.getItemAsync(SECURITY_SECURE_STORE_KEYS.VERIFIER),
    SecureStore.getItemAsync(SECURITY_SECURE_STORE_KEYS.KDF_PARAMS),
    SecureStore.getItemAsync(SECURITY_SECURE_STORE_KEYS.BIO_ENABLED),
  ]);

  let kdfParams = CURRENT_KDF_PARAMS;
  if (kdfParamsRaw) {
    try {
      const parsed = JSON.parse(kdfParamsRaw) as Partial<KdfParams>;
      if (
        parsed.algorithm === "pbkdf2-sha256" &&
        typeof parsed.iterations === "number" &&
        parsed.iterations > 0 &&
        parsed.keySizeBits === 256
      ) {
        kdfParams = {
          algorithm: parsed.algorithm,
          iterations: parsed.iterations,
          keySizeBits: parsed.keySizeBits,
        };
      }
    } catch {
      kdfParams = CURRENT_KDF_PARAMS;
    }
  }

  return {
    salt,
    verifier,
    kdfParams,
    bioEnabled: bioEnabled === "1",
  };
}

async function persistSecurityMeta({
  saltHex,
  verifier,
  kdfParams,
  biometricEnabled,
}: {
  saltHex: string;
  verifier: string;
  kdfParams: KdfParams;
  biometricEnabled: boolean;
}) {
  await Promise.all([
    SecureStore.setItemAsync(SECURITY_SECURE_STORE_KEYS.SALT, saltHex),
    SecureStore.setItemAsync(SECURITY_SECURE_STORE_KEYS.VERIFIER, verifier),
    SecureStore.setItemAsync(
      SECURITY_SECURE_STORE_KEYS.KDF_PARAMS,
      JSON.stringify(kdfParams),
    ),
    SecureStore.setItemAsync(
      SECURITY_SECURE_STORE_KEYS.BIO_ENABLED,
      biometricEnabled ? "1" : "0",
    ),
  ]);
}

export const useSecurityStore = create<State>((set, get) => ({
  status: "booting",
  biometricAvailable: false,
  biometricEnabled: false,
  saltHex: null,
  verifier: null,
  kdfParams: CURRENT_KDF_PARAMS,
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
        kdfParams: CURRENT_KDF_PARAMS,
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
      kdfParams: meta.kdfParams,
      keyHex: null,
    });
  },

  setupPin: async (pin, enableBiometric) => {
    const biometricAvailable = get().biometricAvailable;
    const kdfParams = CURRENT_KDF_PARAMS;
    const saltHex = await randomHex(16);
    const keyHex = deriveKeyHex(pin, saltHex, kdfParams);
    const verifier = sha256Hex(keyHex);
    const willEnableBio = Boolean(enableBiometric && biometricAvailable);

    await persistSecurityMeta({
      saltHex,
      verifier,
      kdfParams,
      biometricEnabled: willEnableBio,
    });

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
      kdfParams,
      keyHex,
    });
  },

  unlockWithPin: async (pin) => {
    let saltHex = get().saltHex;
    let verifierHex = get().verifier;
    let kdfParams = get().kdfParams;
    let biometricEnabled = get().biometricEnabled;

    if (!saltHex || !verifierHex) {
      const meta = await getMeta();
      saltHex = meta.salt;
      verifierHex = meta.verifier;
      kdfParams = meta.kdfParams;
      biometricEnabled = meta.bioEnabled && get().biometricAvailable;
      set({
        biometricEnabled,
        saltHex: meta.salt ?? null,
        verifier: meta.verifier ?? null,
        kdfParams,
      });
    }

    if (!saltHex || !verifierHex) {
      set({
        status: "setup_required",
        biometricEnabled: false,
        saltHex: null,
        verifier: null,
        kdfParams: CURRENT_KDF_PARAMS,
        keyHex: null,
      });
      return;
    }

    const keyHex = deriveKeyHex(pin, saltHex, kdfParams);
    if (sha256Hex(keyHex) !== verifierHex) {
      throw new Error("PIN incorrect");
    }

    set({
      status: "unlocked",
      biometricEnabled,
      saltHex,
      verifier: verifierHex,
      kdfParams,
      keyHex,
    });
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
    const kdfParams = get().kdfParams;
    if (!saltHex || !verifierHex) {
      throw new Error("PIN not set");
    }

    const keyHex = deriveKeyHex(pin, saltHex, kdfParams);
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

  clearAllData: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(SECURITY_SECURE_STORE_KEYS.SALT),
      SecureStore.deleteItemAsync(SECURITY_SECURE_STORE_KEYS.VERIFIER),
      SecureStore.deleteItemAsync(SECURITY_SECURE_STORE_KEYS.KDF_PARAMS),
      SecureStore.deleteItemAsync(SECURITY_SECURE_STORE_KEYS.BIO_ENABLED),
      SecureStore.deleteItemAsync(SECURITY_SECURE_STORE_KEYS.BIO_PIN),
    ]);

    await initDbOnce();
    const db = await getDb();
    await db?.execAsync(`DELETE FROM info;`);

    set({
      status: "setup_required",
      biometricEnabled: false,
      saltHex: null,
      verifier: null,
      kdfParams: CURRENT_KDF_PARAMS,
      keyHex: null,
    });
  },
}));

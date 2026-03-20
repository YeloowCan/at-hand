import * as ExpoCrypto from "expo-crypto";
import CryptoJS from "crypto-js";

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function randomHex(byteLength: number) {
  const bytes = await ExpoCrypto.getRandomBytesAsync(byteLength);
  return bytesToHex(bytes);
}

export function deriveKeyHex(pin: string, saltHex: string) {
  const salt = CryptoJS.enc.Hex.parse(saltHex);
  const key = CryptoJS.PBKDF2(pin, salt, {
    keySize: 256 / 32,
    iterations: 120_000,
    hasher: CryptoJS.algo.SHA256,
  });
  return key.toString(CryptoJS.enc.Hex);
}

export function sha256Hex(input: string) {
  return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
}

type CipherV1 = {
  v: 1;
  salt: string;
  iv: string;
  ct: string;
  mac: string;
};

export async function encryptJsonV1(
  plaintext: unknown,
  keyHex: string,
  saltHex: string,
): Promise<string> {
  const ivHex = await randomHex(16);
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const pt = JSON.stringify(plaintext);
  const encrypted = CryptoJS.AES.encrypt(pt, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const ctBase64 = encrypted.toString();
  const mac = CryptoJS.HmacSHA256(`${ivHex}:${ctBase64}`, key).toString(
    CryptoJS.enc.Hex,
  );

  const payload: CipherV1 = { v: 1, salt: saltHex, iv: ivHex, ct: ctBase64, mac };
  return JSON.stringify(payload);
}

export function decryptJsonV1<T>(
  ciphertextJson: string,
  keyHex: string,
): T {
  const parsed = JSON.parse(ciphertextJson) as CipherV1;
  if (!parsed || parsed.v !== 1) {
    throw new Error("Unsupported ciphertext");
  }
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const expectedMac = CryptoJS.HmacSHA256(`${parsed.iv}:${parsed.ct}`, key).toString(
    CryptoJS.enc.Hex,
  );
  if (expectedMac !== parsed.mac) {
    throw new Error("Ciphertext tampered");
  }

  const iv = CryptoJS.enc.Hex.parse(parsed.iv);
  const decrypted = CryptoJS.AES.decrypt(parsed.ct, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const pt = decrypted.toString(CryptoJS.enc.Utf8);
  return JSON.parse(pt) as T;
}


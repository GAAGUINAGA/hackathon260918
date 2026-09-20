import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  decryptToken,
  encryptToken,
  InvalidEncryptionKeyError,
  parseEncryptionKey,
  TokenDecryptionError,
} from "../../src/crypto/token-cipher.js";

function testKey(): Buffer {
  return randomBytes(32);
}

describe("parseEncryptionKey", () => {
  it("acepta una clave base64 de 32 bytes", () => {
    const key = parseEncryptionKey(testKey().toString("base64"));
    expect(key).toHaveLength(32);
  });

  it("rechaza una clave de longitud incorrecta", () => {
    expect(() => parseEncryptionKey(Buffer.from("demasiado-corta").toString("base64"))).toThrow(
      InvalidEncryptionKeyError,
    );
  });
});

describe("encryptToken / decryptToken (RT-08, AES-256-GCM)", () => {
  it("descifra exactamente el texto cifrado (roundtrip)", () => {
    const key = testKey();
    const encrypted = encryptToken("refresh-token-secreto", key);
    expect(decryptToken(encrypted, key)).toBe("refresh-token-secreto");
  });

  it("nunca reutiliza el IV entre dos cifrados, incluso del mismo texto", () => {
    const key = testKey();
    const first = encryptToken("mismo-texto", key);
    const second = encryptToken("mismo-texto", key);
    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it("rechaza el descifrado con una clave incorrecta", () => {
    const encrypted = encryptToken("secreto", testKey());
    expect(() => decryptToken(encrypted, testKey())).toThrow(TokenDecryptionError);
  });

  it("rechaza un ciphertext manipulado (autenticidad de GCM)", () => {
    const key = testKey();
    const encrypted = encryptToken("secreto", key);
    const tampered = { ...encrypted, ciphertext: Buffer.from("manipulado").toString("base64") };
    expect(() => decryptToken(tampered, key)).toThrow(TokenDecryptionError);
  });

  it("rechaza un authTag manipulado", () => {
    const key = testKey();
    const encrypted = encryptToken("secreto", key);
    const tampered = { ...encrypted, authTag: Buffer.from(randomBytes(16)).toString("base64") };
    expect(() => decryptToken(tampered, key)).toThrow(TokenDecryptionError);
  });

  it("rechaza un authTag truncado en vez de aceptarlo como válido (semgrep gcm-no-tag-length)", () => {
    const key = testKey();
    const encrypted = encryptToken("secreto", key);
    const fullTag = Buffer.from(encrypted.authTag, "base64");
    const truncated = { ...encrypted, authTag: fullTag.subarray(0, 4).toString("base64") };
    expect(() => decryptToken(truncated, key)).toThrow(TokenDecryptionError);
  });
});

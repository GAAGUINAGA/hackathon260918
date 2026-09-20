import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifrado de credenciales de proveedor (RT-08): AES-256-GCM, IV aleatorio de
 * 96 bits por operación (nunca reutilizado entre filas — GCM exige esto:
 * reutilizar un IV con la misma clave rompe la confidencialidad y la
 * autenticidad). La clave vive fuera de la base de datos
 * (`TOKEN_ENCRYPTION_KEY`, inyectada por entorno), nunca en el repositorio.
 */

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;

export interface EncryptedToken {
  readonly ciphertext: string;
  readonly iv: string;
  readonly authTag: string;
}

export class InvalidEncryptionKeyError extends Error {
  constructor() {
    super(`TOKEN_ENCRYPTION_KEY debe decodificar a exactamente ${KEY_LENGTH_BYTES} bytes (AES-256).`);
    this.name = "InvalidEncryptionKeyError";
  }
}

export class TokenDecryptionError extends Error {
  constructor() {
    super("No se pudo descifrar el token: clave incorrecta o ciphertext manipulado.");
    this.name = "TokenDecryptionError";
  }
}

/** `keyBase64` es la clave AES-256 codificada en base64 (32 bytes decodificados). */
export function parseEncryptionKey(keyBase64: string): Buffer {
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new InvalidEncryptionKeyError();
  }
  return key;
}

export function encryptToken(plaintext: string, key: Buffer): EncryptedToken {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptToken(encrypted: EncryptedToken, key: Buffer): string {
  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(encrypted.iv, "base64"));
    decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    // GCM ya autentica: una clave incorrecta o un ciphertext manipulado
    // hacen que setAuthTag/final() lancen. Se homogeniza el error para no
    // filtrar detalles de la biblioteca de cripto (RT-07).
    throw new TokenDecryptionError();
  }
}

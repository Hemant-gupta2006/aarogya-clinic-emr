import { AES, PBKDF2, Hex, Utf8, CBC, Pkcs7, HmacSHA256, SHA256Algo } from 'crypto-es';
import * as Crypto from 'expo-crypto';

const PBKDF2_ITERATIONS = 100000;
const KEY_SIZE_WORDS = 256 / 32; // 8 words = 256 bits

export interface DerivedKeyResult {
  keyHex: string;
  saltHex: string;
  iterations: number;
}

/**
 * Derives a 256-bit key from the doctor's password using PBKDF2-HMAC-SHA256.
 * If saltHex is not provided, generates a new 32-byte random salt.
 */
export async function deriveKeyFromPassword(
  password: string,
  saltHex?: string,
  iterations: number = PBKDF2_ITERATIONS
): Promise<DerivedKeyResult> {
  let salt: string;
  if (saltHex) {
    salt = saltHex;
  } else {
    const saltBytes = await Crypto.getRandomBytesAsync(32);
    salt = Array.from(saltBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  const saltWordArray = Hex.parse(salt);
  const derivedKey = PBKDF2(password, saltWordArray, {
    keySize: KEY_SIZE_WORDS,
    iterations,
    hasher: SHA256Algo,
  });

  return {
    keyHex: derivedKey.toString(Hex),
    saltHex: salt,
    iterations,
  };
}

export interface EncryptedResult {
  ciphertext: string;
  ivHex: string;
  tagHex: string;
  saltHex: string;
  iterations: number;
}

/**
 * Encrypts arbitrary plaintext data (e.g. JSON string containing DB dump + photos)
 * using derived AES-256 key + HMAC authentication tag.
 */
export async function encryptBackupPayload(
  plaintext: string,
  password: string
): Promise<EncryptedResult> {
  const { keyHex, saltHex, iterations } = await deriveKeyFromPassword(password);

  // Generate 16-byte random IV
  const ivBytes = await Crypto.getRandomBytesAsync(16);
  const ivHex = Array.from(ivBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const key = Hex.parse(keyHex);
  const iv = Hex.parse(ivHex);

  // Encrypt with AES-256
  const encrypted = AES.encrypt(plaintext, key, {
    iv,
    mode: CBC,
    padding: Pkcs7,
  });

  const ciphertext = encrypted.toString();

  // Compute HMAC-SHA256 Auth Tag over (salt + iv + ciphertext)
  const authTagData = `${saltHex}:${ivHex}:${ciphertext}`;
  const authTag = HmacSHA256(authTagData, key).toString(Hex);

  return {
    ciphertext,
    ivHex,
    tagHex: authTag,
    saltHex,
    iterations,
  };
}

/**
 * Decrypts and authenticates the backup payload using the doctor's password.
 * Throws an error if the password is wrong or the payload has been tampered with.
 */
export async function decryptBackupPayload(
  ciphertext: string,
  password: string,
  saltHex: string,
  ivHex: string,
  tagHex: string,
  iterations: number = PBKDF2_ITERATIONS
): Promise<string> {
  const { keyHex } = await deriveKeyFromPassword(password, saltHex, iterations);
  const key = Hex.parse(keyHex);
  const iv = Hex.parse(ivHex);

  // Verify HMAC-SHA256 Auth Tag first
  const authTagData = `${saltHex}:${ivHex}:${ciphertext}`;
  const computedTag = HmacSHA256(authTagData, key).toString(Hex);

  if (computedTag !== tagHex) {
    throw new Error('AUTHENTICATION_FAILED: Incorrect password or corrupted backup archive.');
  }

  // Decrypt
  const decrypted = AES.decrypt(ciphertext, key, {
    iv,
    mode: CBC,
    padding: Pkcs7,
  });

  const plaintext = decrypted.toString(Utf8);
  if (!plaintext) {
    throw new Error('DECRYPTION_FAILED: Unable to parse decrypted backup payload.');
  }

  return plaintext;
}

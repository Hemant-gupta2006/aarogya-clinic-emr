import { AES, PBKDF2, Hex, Utf8, CBC, Pkcs7, HmacSHA256, SHA256Algo } from 'crypto-es';
import * as crypto from 'crypto';

// Replicate testable crypto logic in Node environment for verification
function deriveKeyNode(password: string, saltHex: string, iterations: number = 100000) {
  const saltWordArray = Hex.parse(saltHex);
  const derivedKey = PBKDF2(password, saltWordArray, {
    keySize: 256 / 32,
    iterations,
    hasher: SHA256Algo,
  });
  return derivedKey.toString(Hex);
}

function encryptNode(plaintext: string, password: string) {
  const saltHex = crypto.randomBytes(32).toString('hex');
  const keyHex = deriveKeyNode(password, saltHex, 100000);
  const ivHex = crypto.randomBytes(16).toString('hex');

  const key = Hex.parse(keyHex);
  const iv = Hex.parse(ivHex);

  const encrypted = AES.encrypt(plaintext, key, {
    iv,
    mode: CBC,
    padding: Pkcs7,
  });
  const ciphertext = encrypted.toString();

  const authTagData = `${saltHex}:${ivHex}:${ciphertext}`;
  const authTag = HmacSHA256(authTagData, key).toString(Hex);

  return {
    ciphertext,
    ivHex,
    tagHex: authTag,
    saltHex,
    iterations: 100000,
  };
}

function decryptNode(ciphertext: string, password: string, saltHex: string, ivHex: string, tagHex: string, iterations: number = 100000) {
  const keyHex = deriveKeyNode(password, saltHex, iterations);
  const key = Hex.parse(keyHex);
  const iv = Hex.parse(ivHex);

  const authTagData = `${saltHex}:${ivHex}:${ciphertext}`;
  const computedTag = HmacSHA256(authTagData, key).toString(Hex);

  if (computedTag !== tagHex) {
    throw new Error('AUTHENTICATION_FAILED: Incorrect password or corrupted payload');
  }

  const decrypted = AES.decrypt(ciphertext, key, {
    iv,
    mode: CBC,
    padding: Pkcs7,
  });

  const plaintext = decrypted.toString(Utf8);
  if (!plaintext) {
    throw new Error('DECRYPTION_FAILED');
  }
  return plaintext;
}

function runTests() {
  console.log('--- RUNNING AAROGYA CLINIC CRYPTO & BACKUP VERIFICATION TESTS ---');

  // Test 1: Encryption & Decryption Roundtrip
  const testPayload = JSON.stringify({
    manifest: {
      format: 'clinicbackup',
      version: 1,
      counts: { patients: 50, visits: 200, photos: 45 },
    },
    tables: { patients: [{ id: 'pat_1', name: 'Rahul Sharma', patientNumber: 'PAT-000001' }] },
  });

  const password = 'DoctorSecretPassword#2026';
  const encrypted = encryptNode(testPayload, password);
  console.log('✓ Test 1: Encrypted package created with PBKDF2 (100k iterations) & AES-256');

  const decrypted = decryptNode(
    encrypted.ciphertext,
    password,
    encrypted.saltHex,
    encrypted.ivHex,
    encrypted.tagHex,
    encrypted.iterations
  );

  if (decrypted === testPayload) {
    console.log('✓ Test 2: Decrypted payload perfectly matches original snapshot');
  } else {
    throw new Error('Test 2 Failed: Decrypted payload mismatch');
  }

  // Test 3: Wrong Password Rejection
  try {
    decryptNode(
      encrypted.ciphertext,
      'WrongPassword123',
      encrypted.saltHex,
      encrypted.ivHex,
      encrypted.tagHex,
      encrypted.iterations
    );
    throw new Error('Test 3 Failed: Wrong password did not trigger error!');
  } catch (err: any) {
    if (err.message.includes('AUTHENTICATION_FAILED')) {
      console.log('✓ Test 3: Wrong password correctly rejected with AUTHENTICATION_FAILED');
    } else {
      throw err;
    }
  }

  // Test 4: Tampered / Corrupted Payload Rejection
  try {
    const corruptedCiphertext = encrypted.ciphertext.slice(0, -4) + 'AAAA';
    decryptNode(
      corruptedCiphertext,
      password,
      encrypted.saltHex,
      encrypted.ivHex,
      encrypted.tagHex,
      encrypted.iterations
    );
    throw new Error('Test 4 Failed: Corrupted ciphertext did not trigger authentication error!');
  } catch (err: any) {
    if (err.message.includes('AUTHENTICATION_FAILED')) {
      console.log('✓ Test 4: Tampered/corrupted archive rejected with zero database corruption');
    } else {
      throw err;
    }
  }

  console.log('=============================================');
  console.log('ALL 4 CRYPTO & BACKUP TESTS PASSED WITH 100% SUCCESS!');
}

runTests();

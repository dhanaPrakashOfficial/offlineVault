import CryptoJS from 'crypto-js';
import RNFS from 'react-native-fs';

export type EncryptionResult = {
  ciphertext: string;
  iv: string;
  tag: string;
};

// Generate random 256-bit key (32 bytes)
export const generateAESKeys = (): string => {
  return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Base64);
};

// Generate random 128-bit IV (16 bytes)
export const generateIV = (): string => {
  return CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Base64);
};

// Encrypt file with AES-256-GCM
export const encryptFile = async (
  filePath: string,
  key: string
): Promise<EncryptionResult> => {
  try {
    const fileData = await RNFS.readFile(filePath, 'base64');
    const keyBytes = CryptoJS.enc.Base64.parse(key);
    const iv = generateIV();
    const ivBytes = CryptoJS.enc.Base64.parse(iv);

    const encrypted = CryptoJS.AES.encrypt(fileData, keyBytes, {
      iv: ivBytes,
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.NoPadding
    });

    return {
      ciphertext: encrypted.toString(),
      iv: iv,
      tag: encrypted.tag?.toString() || ''
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw error;
  }
};

// Decrypt file with AES-256-GCM
export const decryptFile = (
  ciphertext: string,
  key: string,
  iv: string,
  tag: string
): string => {
  const keyBytes = CryptoJS.enc.Base64.parse(key);
  const ivBytes = CryptoJS.enc.Base64.parse(iv);
  const tagBytes = CryptoJS.enc.Base64.parse(tag);

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Base64.parse(ciphertext),
    iv: ivBytes,
    tag: tagBytes
  });

  const decrypted = CryptoJS.AES.decrypt(
    cipherParams,
    keyBytes,
    { mode: CryptoJS.mode.GCM }
  );

  return decrypted.toString(CryptoJS.enc.Base64);
};
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { gcm } from '@noble/ciphers/aes';
import { randomBytes as nobleRandomBytes } from '@noble/ciphers/crypto';

// Polyfill for React Native if needed
if (typeof global.crypto === 'undefined') {
  // @ts-ignore
  global.crypto = {
    getRandomValues: (arr: Uint8Array) => {
      // Fallback using Math.random (not cryptographically secure - use only for development)
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  };
}

// Random bytes generator for React Native
const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
};

// Base64 utilities
const bytesToBase64 = (bytes: Uint8Array): string => {
  const binary = Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join('');
  return btoa(binary);
};

const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

// Text encoding/decoding
const stringToBytes = (str: string): Uint8Array => {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
};

const bytesToString = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join('');
};

// AES-256-GCM encryption using @noble/ciphers
const gcmEncrypt = (
  plaintext: string,
  keyBytes: Uint8Array,
  nonceBytes: Uint8Array
): { combined: Uint8Array; ciphertext: Uint8Array; tag: Uint8Array } => {
  console.log('\n========== ENCRYPTION STARTED ==========');
  console.log('📝 Plaintext:', plaintext);
  console.log('📏 Plaintext Length:', plaintext.length, 'characters');
  
  const data = stringToBytes(plaintext);
  console.log('🔢 Plaintext Bytes:', Array.from(data));
  console.log('📦 Plaintext Bytes Length:', data.length, 'bytes');
  
  console.log('\n🔑 Key (Hex):', bytesToHex(keyBytes));
  console.log('📏 Key Length:', keyBytes.length, 'bytes');
  
  console.log('\n🎲 Nonce/IV (Hex):', bytesToHex(nonceBytes));
  console.log('📏 Nonce Length:', nonceBytes.length, 'bytes');

  // Create GCM cipher instance
  console.log('\n⚙️  Creating GCM cipher instance...');
  const cipher = gcm(keyBytes, nonceBytes);
  console.log('✅ GCM cipher created successfully');

  // Encrypt (returns ciphertext + 16-byte authentication tag appended)
  console.log('\n🔐 Encrypting data...');
  const encrypted = cipher.encrypt(data);
  console.log('✅ Encryption completed');
  console.log('📦 Encrypted Data (with tag) Length:', encrypted.length, 'bytes');
  console.log('🔢 Encrypted Bytes:', Array.from(encrypted));

  // Extract tag (last 16 bytes)
  const tagLength = 16;
  const ciphertext = encrypted.slice(0, encrypted.length - tagLength);
  const tag = encrypted.slice(encrypted.length - tagLength);

  console.log('\n📊 ENCRYPTION BREAKDOWN:');
  console.log('├─ Ciphertext Length:', ciphertext.length, 'bytes');
  console.log('├─ Ciphertext (Hex):', bytesToHex(ciphertext));
  console.log('├─ Ciphertext (Base64):', bytesToBase64(ciphertext));
  console.log('│');
  console.log('├─ Tag Length:', tag.length, 'bytes');
  console.log('├─ Tag (Hex):', bytesToHex(tag));
  console.log('├─ Tag (Base64):', bytesToBase64(tag));
  console.log('│');
  console.log('└─ Combined (Ciphertext + Tag) Length:', encrypted.length, 'bytes');
  console.log('   Combined (Base64):', bytesToBase64(encrypted));
  
  console.log('\n========== ENCRYPTION COMPLETED ==========\n');

  return {
    combined: encrypted,
    ciphertext: ciphertext,
    tag: tag,
  };
};

const gcmDecrypt = (
  ciphertextWithTag: Uint8Array,
  keyBytes: Uint8Array,
  nonceBytes: Uint8Array
): Uint8Array => {
  console.log('\n========== DECRYPTION STARTED ==========');
  console.log('📦 Input (Ciphertext + Tag) Length:', ciphertextWithTag.length, 'bytes');
  console.log('🔢 Input Bytes:', Array.from(ciphertextWithTag));
  console.log('🔤 Input (Base64):', bytesToBase64(ciphertextWithTag));
  console.log('🔤 Input (Hex):', bytesToHex(ciphertextWithTag));
  
  const tagLength = 16;
  const ciphertext = ciphertextWithTag.slice(0, ciphertextWithTag.length - tagLength);
  const tag = ciphertextWithTag.slice(ciphertextWithTag.length - tagLength);
  
  console.log('\n📊 DECRYPTION INPUT BREAKDOWN:');
  console.log('├─ Ciphertext Length:', ciphertext.length, 'bytes');
  console.log('├─ Ciphertext (Hex):', bytesToHex(ciphertext));
  console.log('│');
  console.log('├─ Tag Length:', tag.length, 'bytes');
  console.log('├─ Tag (Hex):', bytesToHex(tag));
  console.log('└─ Tag (Base64):', bytesToBase64(tag));
  
  console.log('\n🔑 Key (Hex):', bytesToHex(keyBytes));
  console.log('📏 Key Length:', keyBytes.length, 'bytes');
  
  console.log('\n🎲 Nonce/IV (Hex):', bytesToHex(nonceBytes));
  console.log('📏 Nonce Length:', nonceBytes.length, 'bytes');

  // Create GCM cipher instance
  console.log('\n⚙️  Creating GCM cipher instance...');
  const cipher = gcm(keyBytes, nonceBytes);
  console.log('✅ GCM cipher created successfully');

  // Decrypt (automatically verifies authentication tag)
  console.log('\n🔓 Decrypting data...');
  console.log('🔍 Verifying authentication tag...');
  const decrypted = cipher.decrypt(ciphertextWithTag);
  console.log('✅ Tag verification successful!');
  console.log('✅ Decryption completed');
  
  console.log('\n📊 DECRYPTION RESULT:');
  console.log('├─ Decrypted Bytes Length:', decrypted.length, 'bytes');
  console.log('├─ Decrypted Bytes:', Array.from(decrypted));
  console.log('├─ Decrypted (Hex):', bytesToHex(decrypted));
  console.log('└─ Decrypted Text:', bytesToString(decrypted));
  
  console.log('\n========== DECRYPTION COMPLETED ==========\n');

  return decrypted;
};

const AesGcmScreen = () => {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [inputText, setInputText] = useState('');
  const [key, setKey] = useState('');
  const [nonce, setNonce] = useState('');
  const [output, setOutput] = useState('');
  const [tagDisplay, setTagDisplay] = useState('');

  const validateKey = (keyInput: string): { valid: boolean; type?: string } => {
    try {
      const decoded = base64ToBytes(keyInput);
      if (decoded.length === 32) {
        return { valid: true, type: 'base64' };
      }
    } catch (e) {
      // Not valid base64
    }
    return { valid: false };
  };

  const validateNonce = (nonceInput: string): { valid: boolean; type?: string } => {
    try {
      const decoded = base64ToBytes(nonceInput);
      if (decoded.length === 12) {
        return { valid: true, type: 'base64' };
      }
    } catch (e) {
      // Not valid base64
    }
    return { valid: false };
  };

  const generateRandomKey = () => {
    console.log('\n🎲 Generating random 256-bit key...');
    const keyBytes = randomBytes(32);
    console.log('✅ Random key generated');
    console.log('🔑 Key (Hex):', bytesToHex(keyBytes));
    const base64Key = bytesToBase64(keyBytes);
    console.log('🔑 Key (Base64):', base64Key);
    console.log('📏 Key Length:', keyBytes.length, 'bytes\n');
    setKey(base64Key);
  };

  const generateRandomNonce = () => {
    console.log('\n🎲 Generating random 96-bit nonce...');
    const nonceBytes = randomBytes(12);
    console.log('✅ Random nonce generated');
    console.log('🎲 Nonce (Hex):', bytesToHex(nonceBytes));
    const base64Nonce = bytesToBase64(nonceBytes);
    console.log('🎲 Nonce (Base64):', base64Nonce);
    console.log('📏 Nonce Length:', nonceBytes.length, 'bytes\n');
    setNonce(base64Nonce);
  };

  const handleProcess = () => {
    console.log('\n' + '='.repeat(50));
    console.log(`🚀 STARTING ${mode.toUpperCase()} OPERATION`);
    console.log('='.repeat(50));
    
    setOutput('');
    setTagDisplay('');

    if (!inputText.trim()) {
      console.log('❌ ERROR: No input text provided');
      Alert.alert('Error', `Please enter text to ${mode}`);
      return;
    }

    console.log('\n📋 INPUT VALIDATION:');
    console.log('├─ Mode:', mode.toUpperCase());
    console.log('├─ Input Text:', inputText);
    console.log('├─ Key (Base64):', key);
    console.log('└─ Nonce (Base64):', nonce);

    const keyValidation = validateKey(key);
    if (!keyValidation.valid) {
      console.log('❌ ERROR: Invalid key format or length');
      Alert.alert(
        'Error',
        'Key must be a valid Base64 string representing 32 bytes (256 bits)'
      );
      return;
    }
    console.log('✅ Key validation passed');

    const nonceValidation = validateNonce(nonce);
    if (!nonceValidation.valid) {
      console.log('❌ ERROR: Invalid nonce format or length');
      Alert.alert(
        'Error',
        'Nonce/IV must be a valid Base64 string representing 12 bytes (96 bits)'
      );
      return;
    }
    console.log('✅ Nonce validation passed');

    try {
      let processedKey = base64ToBytes(key);
      let processedNonce = base64ToBytes(nonce);

      console.log('\n🔄 PROCESSING INPUTS:');
      console.log('├─ Decoded Key Length:', processedKey.length, 'bytes');
      console.log('└─ Decoded Nonce Length:', processedNonce.length, 'bytes');

      // Ensure exactly 32-byte key
      if (processedKey.length !== 32) {
        console.log('⚠️  Adjusting key to 32 bytes...');
        const fullKey = new Uint8Array(32);
        fullKey.set(processedKey.slice(0, 32));
        processedKey = fullKey;
        console.log('✅ Key adjusted');
      }

      // Ensure exactly 12-byte nonce
      if (processedNonce.length !== 12) {
        console.log('⚠️  Adjusting nonce to 12 bytes...');
        const fullNonce = new Uint8Array(12);
        fullNonce.set(processedNonce.slice(0, 12));
        processedNonce = fullNonce;
        console.log('✅ Nonce adjusted');
      }

      if (mode === 'encrypt') {
        const result = gcmEncrypt(inputText, processedKey, processedNonce);

        const base64Output = bytesToBase64(result.combined);
        setOutput(base64Output);

        const tagBase64 = bytesToBase64(result.tag);
        const tagHex = bytesToHex(result.tag);
        setTagDisplay(
          `Base64: ${tagBase64}\nHex: ${tagHex}\n\n✓ Tag is automatically appended to ciphertext`
        );

        console.log('\n✅ ENCRYPTION OPERATION COMPLETED SUCCESSFULLY');
        console.log('📤 Final Output (Base64):', base64Output);
      } else {
        const ciphertextWithTag = base64ToBytes(inputText);

        if (ciphertextWithTag.length < 16) {
          console.log('❌ ERROR: Ciphertext too short (missing tag)');
          throw new Error('Invalid ciphertext: too short (missing authentication tag)');
        }

        const plaintext = gcmDecrypt(ciphertextWithTag, processedKey, processedNonce);
        const outputText = bytesToString(plaintext);
        setOutput(outputText);

        const tag = ciphertextWithTag.slice(ciphertextWithTag.length - 16);
        const tagBase64 = bytesToBase64(tag);
        const tagHex = bytesToHex(tag);
        setTagDisplay(
          `Extracted Tag:\nBase64: ${tagBase64}\nHex: ${tagHex}\n\n✓ Tag verified successfully`
        );

        console.log('\n✅ DECRYPTION OPERATION COMPLETED SUCCESSFULLY');
        console.log('📤 Final Output (Text):', outputText);
      }

      console.log('\n' + '='.repeat(50));
      console.log('🎉 OPERATION FINISHED');
      console.log('='.repeat(50) + '\n');

    } catch (err: any) {
      console.log('\n❌ ERROR OCCURRED:');
      console.log('Error Message:', err.message);
      console.log('Error Stack:', err.stack);
      console.log('\n' + '='.repeat(50) + '\n');
      Alert.alert('Error', err.message || 'Operation failed');
    }
  };

  const clearAll = () => {
    console.log('\n🧹 Clearing all fields...\n');
    setInputText('');
    setKey('');
    setNonce('');
    setOutput('');
    setTagDisplay('');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🔐 AES-256-GCM Encryption V2</Text>

        {/* Mode Toggle */}
        <View style={styles.modeContainer}>
          <Text style={styles.modeLabel}>Mode:</Text>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'encrypt' && styles.modeButtonActive]}
              onPress={() => {
                console.log('\n🔄 Switched to ENCRYPT mode\n');
                setMode('encrypt');
              }}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'encrypt' && styles.modeButtonTextActive,
                ]}
              >
                Encrypt
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'decrypt' && styles.modeButtonActive]}
              onPress={() => {
                console.log('\n🔄 Switched to DECRYPT mode\n');
                setMode('decrypt');
              }}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'decrypt' && styles.modeButtonTextActive,
                ]}
              >
                Decrypt
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Input Text */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {mode === 'encrypt' ? 'Plain Text:' : 'Encrypted Text (Base64 with Tag):'}
          </Text>
          <TextInput
            style={styles.textArea}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              mode === 'encrypt'
                ? 'Enter text to encrypt...'
                : 'Paste encrypted text (includes 16-byte tag)...'
            }
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Key Input */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>256-bit Key (Base64, 32 bytes):</Text>
            <TouchableOpacity style={styles.generateButton} onPress={generateRandomKey}>
              <Text style={styles.generateButtonText}>Generate Random</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={key}
            onChangeText={setKey}
            placeholder="e.g., AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA="
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.hint}>
            Base64 string -{' '}
            {key ? `${Math.ceil((key.length * 3) / 4)} bytes` : '0 bytes'}{' '}
            {key && base64ToBytes(key).length === 32 ? '✓' : ''}
          </Text>
        </View>

        {/* Nonce Input */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Nonce/IV (Base64, 12 bytes):</Text>
            <TouchableOpacity style={styles.generateButton} onPress={generateRandomNonce}>
              <Text style={styles.generateButtonText}>Generate Random</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={nonce}
            onChangeText={setNonce}
            placeholder="e.g., AQIDBAUGBwgJCgsM"
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.hint}>
            Base64 string -{' '}
            {nonce ? `${Math.ceil((nonce.length * 3) / 4)} bytes` : '0 bytes'}{' '}
            {nonce && base64ToBytes(nonce).length === 12 ? '✓' : ''}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleProcess}>
            <Text style={styles.primaryButtonText}>
              {mode === 'encrypt' ? '🔒 Encrypt' : '🔓 Decrypt'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={clearAll}>
            <Text style={styles.secondaryButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        {/* Output */}
        {output ? (
          <View style={styles.outputContainer}>
            <Text style={styles.outputLabel}>
              {mode === 'encrypt' ? 'Encrypted Output (Base64):' : 'Decrypted Output:'}
            </Text>
            <View style={styles.outputBox}>
              <Text style={styles.outputText}>{output}</Text>
            </View>
          </View>
        ) : null}

        {/* Tag Display */}
        {tagDisplay ? (
          <View style={styles.tagContainer}>
            <Text style={styles.tagLabel}>🏷️ Authentication Tag (16 bytes):</Text>
            <View style={styles.tagBox}>
              <Text style={styles.tagText}>{tagDisplay}</Text>
            </View>
          </View>
        ) : null}

        {/* Info Section */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>📋 AES-256-GCM with Authentication Tag</Text>
          <Text style={styles.infoText}>
            • <Text style={styles.infoBold}>Key:</Text> 256 bits (32 bytes) - Base64 encoded
          </Text>
          <Text style={styles.infoText}>
            • <Text style={styles.infoBold}>Nonce/IV:</Text> 96 bits (12 bytes) - Base64
            encoded
          </Text>
          <Text style={styles.infoText}>
            • <Text style={styles.infoBold}>Authentication Tag:</Text> 16 bytes automatically
            appended to ciphertext
          </Text>
          <Text style={styles.infoText}>
            • <Text style={styles.infoBold}>Output Format:</Text> Base64(ciphertext + tag) -
            tag is last 16 bytes
          </Text>
          <Text style={styles.infoText}>
            • <Text style={styles.infoBold}>Security:</Text> Tag ensures data integrity and
            authenticity
          </Text>
          <Text style={styles.infoText}>
            • <Text style={styles.infoBold}>Important:</Text> Never reuse the same key + nonce
            combination!
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eff6ff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  modeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 16,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: '#2563eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4b5563',
  },
  modeButtonTextActive: {
    color: '#ffffff',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  generateButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  generateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  textArea: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    fontFamily: 'monospace',
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  outputContainer: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  outputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  outputBox: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  outputText: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#1f2937',
  },
  tagContainer: {
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
    borderColor: '#86efac',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  tagLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 8,
  },
  tagBox: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#047857',
  },
  infoContainer: {
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#93c5fd',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e3a8a',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    marginBottom: 4,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '600',
  },
});

export default AesGcmScreen;

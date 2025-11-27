import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { gcm } from '@noble/ciphers/aes.js';

// 🔐 --- Custom 256-bit key and 12-byte nonce for testing ---
// DO NOT hardcode keys or nonces in production
const staticKey = new Uint8Array([
  49, 50, 51, 52, 53, 54, 55, 56, 57, 49, 48, 49, 49, 49, 50, 49, 49, 49, 49,
  49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49,
]);
const staticNonce = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

// Text encoder/decoder polyfill for React Native
const textEncoder = {
  encode: text => {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      bytes[i] = text.charCodeAt(i);
    }
    return bytes;
  },
};

const textDecoder = {
  decode: bytes => {
    let text = '';
    for (let i = 0; i < bytes.length; i++) {
      text += String.fromCharCode(bytes[i]);
    }
    return text;
  },
};

// Base64 conversion functions for React Native
const bytesToBase64 = bytes => {
  const binary = bytes.reduce(
    (acc, byte) => acc + String.fromCharCode(byte),
    '',
  );
  return btoa(binary);
};

const base64ToBytes = base64 => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

// Hex conversion utilities
const bytesToHex = bytes => {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const hexToBytes = hex => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
};

// For external tools that separate ciphertext and tag
const encryptWithSeparateTag = (data, key, nonce) => {
  const aes = gcm(key, nonce);
  const ciphertextWithTag = aes.encrypt(data);
  
  // GCM tag is typically 16 bytes at the end
  const tagLength = 16;
  const ciphertext = ciphertextWithTag.slice(0, ciphertextWithTag.length - tagLength);
  const tag = ciphertextWithTag.slice(ciphertextWithTag.length - tagLength);
  
  return {
    ciphertext,
    tag,
    fullCiphertext: ciphertextWithTag
  };
};

const decryptWithSeparateTag = (ciphertext, tag, key, nonce) => {
  const aes = gcm(key, nonce);
  // Combine ciphertext and tag for decryption
  const ciphertextWithTag = new Uint8Array(ciphertext.length + tag.length);
  ciphertextWithTag.set(ciphertext);
  ciphertextWithTag.set(tag, ciphertext.length);
  
  return aes.decrypt(ciphertextWithTag);
};

export default function SimpleEncryptionScreen() {
  const [inputText, setInputText] = useState('');
  const [encryptedText, setEncryptedText] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  const [externalEncryptedText, setExternalEncryptedText] = useState('');
  const [tagBase64, setTagBase64] = useState('');

  // Get key and nonce in hex format for external testing
  const keyHex = bytesToHex(staticKey);
  const nonceHex = bytesToHex(staticNonce);
  const keyText = textDecoder.decode(staticKey).replace(/\0/g, '');

  const encryptText = () => {
    try {
      if (!inputText.trim()) {
        Alert.alert('Error', 'Please enter some text to encrypt');
        return;
      }

      const data = textEncoder.encode(inputText);
      
      // Method 1: Using the library's built-in handling (recommended)
      const aes = gcm(staticKey, staticNonce);
      const ciphertextWithTag = aes.encrypt(data);

      // Convert to base64 for display
      const base64String = bytesToBase64(ciphertextWithTag);
      setEncryptedText(base64String);

      // Also show tag separately for educational purposes
      const tagLength = 16;
      const tag = ciphertextWithTag.slice(ciphertextWithTag.length - tagLength);
      setTagBase64(bytesToBase64(tag));

      // Decrypt immediately for demonstration
      const decryptedBytes = aes.decrypt(ciphertextWithTag);
      setDecryptedText(textDecoder.decode(decryptedBytes));

    } catch (err) {
      console.error('Encryption error:', err);
      setEncryptedText('Encryption failed.');
      setDecryptedText('Decryption failed.');
      setTagBase64('');
    }
  };

  const decryptText = () => {
    try {
      if (!encryptedText) return;

      const ciphertextWithTag = base64ToBytes(encryptedText);
      const aes = gcm(staticKey, staticNonce);
      const decryptedBytes = aes.decrypt(ciphertextWithTag);
      setDecryptedText(textDecoder.decode(decryptedBytes));
    } catch (err) {
      console.error('Decryption error:', err);
      setDecryptedText('Decryption failed.');
    }
  };

  const decryptExternalText = () => {
    try {
      if (!externalEncryptedText.trim()) {
        Alert.alert('Error', 'Please enter encrypted text to decrypt');
        return;
      }

      const ciphertextWithTag = base64ToBytes(externalEncryptedText);
      const aes = gcm(staticKey, staticNonce);
      const decryptedBytes = aes.decrypt(ciphertextWithTag);
      setDecryptedText(textDecoder.decode(decryptedBytes));
    } catch (err) {
      console.error('External decryption error:', err);
      setDecryptedText('External decryption failed. Make sure the text was encrypted with the same key/nonce and includes the authentication tag.');
    }
  };

  const copyKeyInfo = () => {
    const keyInfo = `Key (text): ${keyText}\nKey (hex): ${keyHex}\nNonce (hex): ${nonceHex}`;
    Alert.alert('Key Information', keyInfo, [
      {text: 'OK', style: 'default'},
    ]);
  };

  const clearAll = () => {
    setInputText('');
    setEncryptedText('');
    setDecryptedText('');
    setExternalEncryptedText('');
    setTagBase64('');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>AES-256-GCM Encryption Demo</Text>

      {/* Key Information Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>🔐 Key Information (for testing)</Text>
        <Text style={styles.infoText}>Key (text): {keyText}</Text>
        <Text style={styles.infoText}>Key (hex): {keyHex}</Text>
        <Text style={styles.infoText}>Nonce (hex): {nonceHex}</Text>
        <Button title="Copy Key Info" onPress={copyKeyInfo} />
      </View>

      {/* Encryption Section */}
      <Text style={styles.sectionTitle}>Encryption</Text>
      <Text style={styles.label}>Enter text to encrypt:</Text>
      <TextInput
        style={styles.input}
        placeholder="Type something..."
        value={inputText}
        onChangeText={setInputText}
        multiline
      />

      <View style={styles.buttonRow}>
        <View style={styles.button}>
          <Button title="Encrypt" onPress={encryptText} />
        </View>
        <View style={styles.button}>
          <Button title="Clear All" onPress={clearAll} color="#ff4444" />
        </View>
      </View>

      <Text style={styles.label}>Encrypted (Base64 - includes 16-byte tag):</Text>
      <Text selectable style={styles.output}>
        {encryptedText}
      </Text>

      <Text style={styles.label}>Authentication Tag (Base64):</Text>
      <Text selectable style={styles.output}>
        {tagBase64}
      </Text>

      <View style={{marginVertical: 10}}>
        <Button
          title="Decrypt Above Text"
          onPress={decryptText}
          disabled={!encryptedText}
        />
      </View>

      {/* External Decryption Section */}
      <Text style={styles.sectionTitle}>External Decryption Test</Text>
      <Text style={styles.label}>
        Paste encrypted text (must include 16-byte authentication tag):
      </Text>
      <TextInput
        style={[styles.input, {height: 80}]}
        placeholder="Paste base64 encrypted text here (ciphertext + tag)..."
        value={externalEncryptedText}
        onChangeText={setExternalEncryptedText}
        multiline
      />

      <View style={{marginVertical: 10}}>
        <Button
          title="Decrypt External Text"
          onPress={decryptExternalText}
          disabled={!externalEncryptedText}
        />
      </View>

      {/* Results Section */}
      <Text style={styles.sectionTitle}>Results</Text>
      <Text style={styles.label}>Decrypted Text:</Text>
      <Text selectable style={styles.output}>
        {decryptedText}
      </Text>

      {/* Testing Instructions */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>🧪 About AES-GCM Tag</Text>
        <Text style={styles.instruction}>
          • AES-GCM produces a 16-byte authentication tag{'\n'}
          • @noble/ciphers appends tag to ciphertext{'\n'}
          • Some tools separate tag from ciphertext{'\n'}
          • For external tools: use combined ciphertext+tag{'\n'}
          • Tag ensures message authenticity & integrity
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f7f7f7',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    color: '#444',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 5,
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    color: '#555',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    minHeight: 40,
  },
  output: {
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  infoSection: {
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#b8daff',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#004085',
  },
  infoText: {
    fontSize: 12,
    color: '#004085',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  instruction: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
});
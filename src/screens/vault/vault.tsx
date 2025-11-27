import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  FlatList, Modal, SafeAreaView
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Pdf from 'react-native-pdf';

// AES-GCM (tamper-protected)
import 'react-native-get-random-values';
import { aes256gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/ciphers/utils';

// ====== CONFIG (MVP) ======
// ⚠️ For MVP only. Move this key to Keychain/Keystore ASAP.
const STATIC_KEY_HEX =
  '3132333435363738393031323334353637383930313233343536373839303132'; // "123...312" hex (32 bytes)

const FILES_DIR = `${RNFS.DocumentDirectoryPath}/secure_files`;
const ENC_EXT = '.encgcm';

// Envelope format stored as UTF-8 JSON on disk
type EnvelopeV1 = {
  v: 1;
  iv: string;   // base64 IV for file data
  ct: string;   // base64 ciphertext for file data (GCM)
  ivn: string;  // base64 IV for filename
  fn: string;   // base64 ciphertext for filename (GCM)
};

// ====== Tiny utilities (no external deps) ======
const hexToBytes = (hex: string) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

const te = new TextEncoder();
const td = new TextDecoder();

const b64abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const b64lookup = new Uint8Array(256);
for (let i = 0; i < b64lookup.length; i++) b64lookup[i] = 255;
for (let i = 0; i < b64abc.length; i++) b64lookup[b64abc.charCodeAt(i)] = i;
b64lookup['-'.charCodeAt(0)] = 62; // URL-safe
b64lookup['_'.charCodeAt(0)] = 63;

function bytesToB64(a: Uint8Array): string {
  let s = '', i;
  for (i = 0; i + 3 <= a.length; i += 3) {
    const x = (a[i] << 16) | (a[i + 1] << 8) | a[i + 2];
    s += b64abc[(x >>> 18) & 63] + b64abc[(x >>> 12) & 63] + b64abc[(x >>> 6) & 63] + b64abc[x & 63];
  }
  if (i + 1 === a.length) {
    const x = a[i] << 16;
    s += b64abc[(x >>> 18) & 63] + b64abc[(x >>> 12) & 63] + '==';
  } else if (i + 2 === a.length) {
    const x = (a[i] << 16) | (a[i + 1] << 8);
    s += b64abc[(x >>> 18) & 63] + b64abc[(x >>> 12) & 63] + b64abc[(x >>> 6) & 63] + '=';
  }
  return s;
}

function b64ToBytes(s: string): Uint8Array {
  let pads = 0;
  const len = s.length;
  if (len) {
    if (s[len - 1] === '=') pads++;
    if (s[len - 2] === '=') pads++;
  }
  const bytes = new Uint8Array(((len * 3) >> 2) - pads);
  let j = 0, x = 0, i = 0;
  for (let q = 0; q < len; q++) {
    const c = s.charCodeAt(q);
    if (c === 61 /* '=' */) break;
    const v = b64lookup[c];
    if (v === 255) continue; // ignore whitespace/invalid
    x = (x << 6) | v;
    if (++i === 4) {
      bytes[j++] = (x >>> 16) & 255;
      bytes[j++] = (x >>> 8) & 255;
      bytes[j++] = x & 255;
      x = 0;
      i = 0;
    }
  }
  if (i === 3) {
    bytes[j++] = (x >>> 10) & 255;
    bytes[j++] = (x >>> 2) & 255;
  } else if (i === 2) {
    bytes[j++] = (x >>> 4) & 255;
  }
  return bytes;
}

// ====== Component ======
const VaultScreen = () => {
  const [files, setFiles] = useState<Array<{ path: string; name: string; size: number }>>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [tempPath, setTempPath] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
    return () => {
      if (tempPath) RNFS.unlink(tempPath).catch(() => {});
    };
  }, []);

  async function ensureDir() {
    if (!(await RNFS.exists(FILES_DIR))) await RNFS.mkdir(FILES_DIR);
  }

  async function loadFiles() {
    try {
      await ensureDir();
      const items = await RNFS.readDir(FILES_DIR);
      const list: Array<{ path: string; name: string; size: number }> = [];
      const key = hexToBytes(STATIC_KEY_HEX);
      const aes = aes256gcm(key);

      for (const f of items) {
        if (!f.isFile() || !f.name.endsWith(ENC_EXT)) continue;
        try {
          const json = await RNFS.readFile(f.path, 'utf8');
          const env: EnvelopeV1 = JSON.parse(json);
          if (!env || env.v !== 1) continue;

          // decrypt filename (tamper-protected)
          const nameBytes = aes.decrypt(b64ToBytes(env.ivn), b64ToBytes(env.fn));
          const name = td.decode(nameBytes);
          list.push({ path: f.path, name, size: f.size });
        } catch {
          // skip corrupted
        }
      }
      // (Optional) sort by name or time; we only have size here
      list.sort((a, b) => a.name.localeCompare(b.name));
      setFiles(list);
    } catch {
      Alert.alert('Error', 'Failed to load files.');
    }
  }

  async function handlePickAndEncrypt() {
    try {
      const res = await DocumentPicker.pickSingle({ type: [DocumentPicker.types.pdf] });
      await encryptAndSave(res.uri, res.name || 'file.pdf');
    } catch (e) {
      if (!DocumentPicker.isCancel(e)) Alert.alert('Picker Error', 'Could not pick file.');
    }
  }

  async function encryptAndSave(fileUri: string, originalName: string) {
    try {
      await ensureDir();

      // Read file as base64 → convert to bytes
      const fileB64 = await RNFS.readFile(fileUri, 'base64');
      const fileBytes = b64ToBytes(fileB64);

      const key = hexToBytes(STATIC_KEY_HEX);
      const aes = aes256gcm(key);

      // Separate IVs for content and filename (never reuse IVs)
      const ivFile = randomBytes(12);
      const ivName = randomBytes(12);

      // Encrypt file content (GCM = tamper-protected)
      const ct = aes.encrypt(ivFile, fileBytes);

      // Encrypt filename
      const nameBytes = te.encode(originalName);
      const fn = aes.encrypt(ivName, nameBytes);

      const env: EnvelopeV1 = {
        v: 1,
        iv: bytesToB64(ivFile),
        ct: bytesToB64(ct),
        ivn: bytesToB64(ivName),
        fn: bytesToB64(fn),
      };

      const savePath = `${FILES_DIR}/${Date.now()}${ENC_EXT}`;
      await RNFS.writeFile(savePath, JSON.stringify(env), 'utf8');

      await loadFiles();
      Alert.alert('✅ Encrypted', originalName);
    } catch (e) {
      Alert.alert('Encryption Failed', 'Could not encrypt this file.');
    }
  }

  async function openEncryptedFile(path: string) {
    try {
      const key = hexToBytes(STATIC_KEY_HEX);
      const aes = aes256gcm(key);

      const json = await RNFS.readFile(path, 'utf8');
      const env: EnvelopeV1 = JSON.parse(json);

      // Decrypt with authentication (throws on tamper)
      const plainBytes = aes.decrypt(b64ToBytes(env.iv), b64ToBytes(env.ct));

      // Save to a temp PDF for viewing
      const temp = `${RNFS.CachesDirectoryPath}/temp_${Date.now()}.pdf`;
      await RNFS.writeFile(temp, bytesToB64(plainBytes), 'base64');

      setTempPath(temp);
      setViewerVisible(true);
    } catch (e: any) {
      Alert.alert('Decrypt Failed', 'Wrong key or file was tampered.');
    }
  }

  async function closeViewer() {
    setViewerVisible(false);
    if (tempPath) {
      await RNFS.unlink(tempPath).catch(() => {});
      setTempPath(null);
    }
  }

  const renderItem = ({ item }: { item: { path: string; name: string; size: number } }) => (
    <TouchableOpacity style={styles.fileItem} onPress={() => openEncryptedFile(item.path)}>
      <Text style={styles.fileName}>{item.name}</Text>
      <Text style={styles.fileSize}>{(item.size / 1024).toFixed(1)} KB</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 AES-256-GCM Vault (Tamper-Protected)</Text>

      <FlatList
        data={files}
        keyExtractor={(i) => i.path}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No encrypted PDFs yet</Text>}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <TouchableOpacity style={styles.btn} onPress={handlePickAndEncrypt}>
        <Text style={styles.btnText}>+ Encrypt & Add PDF</Text>
      </TouchableOpacity>

      <Modal visible={viewerVisible} animationType="slide" onRequestClose={closeViewer}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <TouchableOpacity style={styles.closeBtn} onPress={closeViewer}>
            <Text style={styles.closeText}>✕ CLOSE</Text>
          </TouchableOpacity>
          {tempPath && (
            <Pdf
              source={{ uri: `file://${tempPath}` }}
              style={{ flex: 1 }}
              onError={(e) => Alert.alert('PDF Error', e.message)}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default VaultScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#111' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  btn: {
    backgroundColor: '#e50914',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  fileItem: {
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 6,
    marginVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileName: { color: '#fff', flex: 1, marginRight: 12 },
  fileSize: { color: '#999', fontSize: 12 },
  empty: { textAlign: 'center', color: '#666', marginTop: 40 },
  closeBtn: {
    padding: 10,
    backgroundColor: '#e50914',
    alignSelf: 'flex-end',
    margin: 10,
    borderRadius: 6,
  },
  closeText: { color: '#fff', fontWeight: '700' },
});

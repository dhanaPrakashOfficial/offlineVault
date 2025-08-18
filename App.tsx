// import React from 'react';
// import { SafeAreaView, Button, Text, Alert, StyleSheet, PermissionsAndroid } from 'react-native';
// import DocumentPicker from 'react-native-document-picker';
// import RNFS from 'react-native-fs';
// import AesCrypto from 'react-native-aes-crypto';

// const App = () => {
//   const requestStoragePermission = async () => {
//     try {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
//         {
//           title: "Storage Permission",
//           message: "App needs permission to save files to your Downloads folder",
//           buttonPositive: "OK"
//         }
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     } catch (err) {
//       console.warn(err);
//       return false;
//     }
//   };

//   const saveToDownloads = async (encryptedData: string, originalName: string) => {
//     try {
//       // Create filename with timestamp
//       const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//       const fileName = `encrypted_${originalName}_${timestamp}.enc`;
//       const downloadsPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
      
//       await RNFS.writeFile(downloadsPath, encryptedData, 'utf8');
//       return downloadsPath;
//     } catch (error) {
//       console.error('Save failed:', error);
//       throw error;
//     }
//   };

//   const encryptAndSave = async () => {
//     try {
//       const hasPermission = await requestStoragePermission();
//       if (!hasPermission) {
//         Alert.alert('Permission required', 'You need to grant storage permission to save files');
//         return;
//       }

//       const res = await DocumentPicker.pick({
//         type: [DocumentPicker.types.allFiles],
//       });

//       if (res[0]?.uri) {
//         // Read file
//         const fileData = await RNFS.readFile(res[0].uri, 'base64');
//         const originalName = res[0].name || 'file';
        
//         // Generate crypto materials
//         const key = await AesCrypto.randomKey(32);
//         const iv = await AesCrypto.randomKey(16);
        
//         // Encrypt
//         const encryptedData = await AesCrypto.encrypt(
//           fileData,
//           key,
//           iv,
//           'aes-256-cbc'
//         );

//         // Save to Downloads
//         const savedPath = await saveToDownloads(
//           JSON.stringify({ iv, encryptedData }),
//           originalName
//         );

//         Alert.alert(
//           'Success',
//           `File encrypted and saved to Downloads\n\nPath: ${savedPath}`,
//           [{ text: 'OK' }]
//         );
//       }
//     } catch (error) {
//       if (!DocumentPicker.isCancel(error)) {
//         Alert.alert('Error', error.message);
//       }
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <Text style={styles.title}>File Encryptor</Text>
//       <Button
//         title="Select File to Encrypt"
//         onPress={encryptAndSave}
//       />
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     marginBottom: 20,
//   },
// });

// export default App;


import React from 'react';
import { SafeAreaView, Button, Text, Alert, StyleSheet, PermissionsAndroid } from 'react-native';

import HomeScreen from './src/screens/homeScreen/Home';

const App = () => {
 

  return (
    <SafeAreaView style={styles.container}>
     <HomeScreen />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
   
  },

});

export default App;
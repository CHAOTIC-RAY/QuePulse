import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// CRITICAL: Expresses the specific database ID provisioned
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

/**
 * Validates connection to Firestore.
 */
async function testConnection() {
  try {
    // Attempting to read a non-existent document to test connectivity
    await getDocFromServer(doc(db, 'system_test', 'connection'));
    console.log('Firebase connection validated successfully.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Firebase is offline. Check configuration.");
    }
    // Specific error handling for permissions will be handled in the service layer
  }
}

testConnection();

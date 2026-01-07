
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, Firestore } from "firebase/firestore";
import { CloudConfig } from "../types";

let db: Firestore | null = null;

export const initFirebase = (config: CloudConfig) => {
  // STRICT VALIDATION: Prevent initialization with empty or invalid keys
  if (!config.apiKey || !config.projectId || !config.appId) {
    console.warn("Firebase Config: Missing required fields (API Key, Project ID, or App ID). Skipping initialization.");
    return false;
  }
  
  if (config.projectId.includes(' ')) {
      console.warn("Firebase Config: Project ID contains spaces. Skipping initialization.");
      return false;
  }

  try {
    const apps = getApps();
    let app: FirebaseApp;
    
    // If an app is already initialized, we use it. 
    // Note: Changing config requires a page reload because deleteApp is async and hard to handle synchronously here.
    if (apps.length > 0) {
      app = getApp();
    } else {
      app = initializeApp(config);
    }

    db = getFirestore(app);
    return true;
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    return false;
  }
};

export const saveToCloud = async (collection: string, data: any) => {
  if (!db) return;
  try {
    // We store the entire array as a single document 'data' inside a collection named after the type
    await setDoc(doc(db, "school_data", collection), { items: data }, { merge: true });
  } catch (e) {
    // Suppress console spam if offline or permission denied, but log critical errors
    console.error(`Error saving ${collection} to cloud:`, e);
  }
};

export const subscribeToCloud = (collection: string, callback: (data: any[]) => void) => {
  if (!db) return () => {};
  
  try {
      const unsubscribe = onSnapshot(doc(db, "school_data", collection), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          if (data && data.items) {
            callback(data.items);
          }
        }
      }, (error) => {
         console.warn(`Cloud subscription warning for ${collection} (check console for details):`, error.message);
      });
    
      return unsubscribe;
  } catch (err) {
      console.error("Failed to subscribe:", err);
      return () => {};
  }
};

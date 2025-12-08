
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuração do Firebase fornecida pelo usuário
const firebaseConfig = {
  apiKey: "AIzaSyATqXpREI1SRWVzEkrJGw3tpn4SQjJXMJY",
  authDomain: "o-que-tem-perto-app.firebaseapp.com",
  projectId: "o-que-tem-perto-app",
  storageBucket: "o-que-tem-perto-app.firebasestorage.app",
  messagingSenderId: "906633305700",
  appId: "1:906633305700:web:019f092d8e217453aa8971"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services for usage in the app
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
//import { Config } from './Config';

const firebaseConfig = {
  apiKey: "AIzaSyC4QQZmWsRkDEL4ELlzE10nI8gdrAuBIVU",
  authDomain: "thesis-cnet.firebaseapp.com",
  projectId: "thesis-cnet",
  storageBucket: "thesis-cnet.firebasestorage.app",
  messagingSenderId: "457257106471",
  appId: "1:457257106471:web:7868cc1b9edc442a5fa202",
  measurementId: "G-YBZN2XCZC6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export { app, auth, db, storage, functions };
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
//import { Config } from '../../config/Config';

const firebaseConfig = {
    apiKey: "AIzaSyBB34BHEhrE568UCYrXIKsg0sA1OnO_ucE",
    authDomain: "dental-app-api.firebaseapp.com",
    projectId: "dental-app-api",
    storageBucket: "dental-app-api.firebasestorage.app",
    messagingSenderId: "493471262894",
    appId: "1:493471262894:web:64605e3fe72cbf72cc653f",
    measurementId: "G-8WJVL61FG7"
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
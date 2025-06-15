import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { Config } from './Config';

const firebaseConfig = {
    apiKey: Config.firebase.apiKey,
    authDomain: Config.firebase.authDomain,
    projectId: Config.firebase.projectId,
    storageBucket: Config.firebase.storageBucket,
    messagingSenderId: Config.firebase.messagingSenderId,
    appId: Config.firebase.appId,
    measurementId: Config.firebase.measurementId,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Missing required Firebase configuration.');
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export { app, auth, db, storage, functions };
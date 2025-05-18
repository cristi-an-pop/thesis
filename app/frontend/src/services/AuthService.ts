import { createUserWithEmailAndPassword, GoogleAuthProvider, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, updatePassword } from "firebase/auth";
import { auth, db } from "../config/Firebase";
import { setDoc, doc, getDoc } from "firebase/firestore";

const doCreateUserWithEmailAndPassword = async (email: string, password: string, role: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
    const user = auth.currentUser;
    await setDoc(doc(db, "users", user!.uid), {
        email: user?.email,
        role: role
    })
}

const doSignInWithEmailAndPassword = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
}

const doSignInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
        await setDoc(docRef, {
            email: user.email,
            role: "user"
        });
    }
    return result;
}

const doSignOut = async () => {
    return auth.signOut();
}

const doPasswordReset = async (email: string) => {
    return sendPasswordResetEmail(auth, email);
}

const doPasswordChange = async (password: string) => {
    if (!!auth.currentUser) {
        return updatePassword(auth.currentUser, password);
    } else {
        throw new Error("No user is currently signed in.");
    }
}

const doSendEmailVerification = async () => {
    if (!!auth.currentUser) {
        return sendEmailVerification(auth.currentUser, {
            url: `${window.location.origin}/`
        });
    } else {
        throw new Error("No user is currently signed in.");
    }
}

export default {
    doCreateUserWithEmailAndPassword,
    doSignInWithEmailAndPassword,
    doSignInWithGoogle,
    doSignOut,
    doPasswordReset,
    doPasswordChange,
    doSendEmailVerification
}
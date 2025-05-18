import { createContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "../config/Firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { UserProfile } from "../types/UserProfile";
import { getDoc, doc } from "firebase/firestore";

interface AuthContextType {
    currentUser: UserProfile | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true });

const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        onAuthStateChanged(auth, initializeUser);
    }, []);

    const initializeUser = async (user: User | null) => {
        if (!!user) {
            const userProfile = await fetchUserProfile(user.uid);
            if (!!userProfile) {
                setCurrentUser(userProfile);
            }
        } else {
            setCurrentUser(null);
        }
        setLoading(false);
    };

    const fetchUserProfile = async (uid: string, retries = 5, delay = 500): Promise<UserProfile | null> => {
        for (let i = 0; i < retries; i++) {
            const userProfileDoc = await getDoc(doc(db, "users", uid));
            if (userProfileDoc.exists()) {
                return userProfileDoc.data() as UserProfile;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        return null;
    };

    const value = {
        currentUser,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export { AuthContext, AuthProvider };
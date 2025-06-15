import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp} from "firebase/firestore";
import { db } from "../config/Firebase";
import { Case } from "../types/Case";
import { throwError } from "../lib/ErrorHandler";

const convertCase = (doc: any): Case => {
    const data = doc.data();
    return {
        id: doc.id,
        patientId: data.patientId,
        title: data.title || "",
        description: data.description || "",
        diagnosis: data.diagnosis || "",
        notes: data.notes || [],
        createdAt: data.createdAt ? data.createdAt.toDate() : undefined,
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined
    };
};

export const getPatientCases = async (patientId: string): Promise<Case[]> => {
    try {
        if (!patientId) {
            throwError(new Error("Invalid patient ID"), "Patient ID is required");
        }

        const q = query(
            collection(db, "cases"), 
            where("patientId", "==", patientId),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(convertCase);
    } catch (error) {
        if (error instanceof Error && error.message.includes("FAILED_PRECONDITION") && error.message.includes("index")) {
            throwError(error, "Database index missing. Please contact support.");
        }
        throwError(error, "Failed to load patient cases");
        return [];
    }
};

export const getCaseById = async (id: string): Promise<Case | null> => {
    try {
        if (!id) {
            throwError(new Error("Invalid case ID"), "Case ID is required");
        }

        const docRef = doc(db, "cases", id);
        const docSnap = await getDoc(docRef);
        
        return docSnap.exists() ? convertCase(docSnap) : null;
    } catch (error) {
        throwError(error, "Failed to load case");
        return null;
    }
};

export const addCase = async (caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
        if (!caseData.patientId || !caseData.title) {
            throwError(new Error("Missing required fields"), "Patient ID and title are required");
        }

        const docRef = await addDoc(collection(db, "cases"), {
            ...caseData,
            diagnosis: caseData.diagnosis || "",
            notes: caseData.notes || [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        throwError(error, "Failed to create case");
        return "";
    }
};

export const updateCase = async (id: string, updates: Partial<Omit<Case, 'id' | 'createdAt'>>): Promise<void> => {
    try {
        if (!id) {
            throwError(new Error("Invalid case ID"), "Case ID is required");
        }

        const docRef = doc(db, "cases", id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            throwError(new Error("Case not found"), "Case not found");
        }

        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        throwError(error, "Failed to update case");
    }
};

export const deleteCase = async (id: string): Promise<void> => {
    try {
        if (!id) {
            throwError(new Error("Invalid case ID"), "Case ID is required");
        }

        const docRef = doc(db, "cases", id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            throwError(new Error("Case not found"), "Case not found");
        }

        await deleteDoc(docRef);
    } catch (error) {
        throwError(error, "Failed to delete case");
    }
};

export const getAllCases = async (): Promise<Case[]> => {
    try {
        const q = query(
            collection(db, "cases"), 
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(convertCase);
    } catch (error) {
        throwError(error, "Failed to load cases");
        return [];
    }
};

export const searchCases = async (searchTerm: string): Promise<Case[]> => {
    try {
        if (!searchTerm || searchTerm.trim().length < 2) {
            throwError(new Error("Invalid search term"), "Search term must be at least 2 characters");
        }

        const normalizedTerm = searchTerm.trim().toLowerCase();
        
        const q = query(
            collection(db, "cases"),
            where("title", ">=", normalizedTerm),
            where("title", "<=", normalizedTerm + "\uf8ff"),
            orderBy("title"),
        );
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(convertCase);
    } catch (error) {
        throwError(error, "Failed to search cases");
        return [];
    }
};

import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    serverTimestamp
} from "firebase/firestore";
import { db } from "../config/Firebase";
import { Case } from "../types/Case";

// Convert Firestore data to our Case model
const convertCase = (doc: any): Case => {
    const data = doc.data();
    return {
        id: doc.id,
        patientId: data.patientId,
        title: data.title || "",
        description: data.description || "",
        diagnosis: data.diagnosis || "",
        treatmentPlan: data.treatmentPlan || "",
        createdAt: data.createdAt ? data.createdAt.toDate() : undefined,
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined
    };
};

// Get all cases for a patient
export const getPatientCases = async (patientId: string): Promise<Case[]> => {
    try {
        if (!patientId) {
            console.warn("No patient ID provided. Returning empty case list.");
            return [];
        }

        const q = query(
            collection(db, "cases"), 
            where("patientId", "==", patientId),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(convertCase);
    } catch (error) {
        console.error(`Error fetching cases for patient ${patientId}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("FAILED_PRECONDITION") && errorMessage.includes("index")) {
            console.error("You need to create a composite index for this query. Check Firebase console for details.");
        }
        return [];
    }
};

// Get case by ID
export const getCaseById = async (id: string): Promise<Case | null> => {
    try {
        const docRef = doc(db, "cases", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return convertCase(docSnap);
        }
        return null;
    } catch (error) {
        console.error(`Error fetching case with ID ${id}:`, error);
        throw new Error("Failed to fetch case");
    }
};

// Add new case
export const addCase = async (caseData: Omit<Case, 'id'>): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, "cases"), {
            ...caseData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding case:", error);
        throw new Error("Failed to add case");
    }
};

// Update case
export const updateCase = async (id: string, updates: Partial<Case>): Promise<void> => {
    try {
        const docRef = doc(db, "cases", id);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error(`Error updating case with ID ${id}:`, error);
        throw new Error("Failed to update case");
    }
};

// Delete case
export const deleteCase = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, "cases", id));
    } catch (error) {
        console.error(`Error deleting case with ID ${id}:`, error);
        throw new Error("Failed to delete case");
    }
};
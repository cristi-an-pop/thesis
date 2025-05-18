import { Patient } from "../types/Patient";
import { db } from "../config/Firebase";
import { getDocs, collection, addDoc, deleteDoc, updateDoc, doc, getDoc, query, where, serverTimestamp } from "firebase/firestore";

const convertPatient = (doc: any): Patient => {
    const data = doc.data();
    return {
        id: doc.id,
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        email: data.email || "",
        phoneNumber: data.phoneNumber || "",
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth.toDate() : undefined,
        address: data.address || "",
        notes: data.notes || "",
        createdAt: data.createdAt ? data.createdAt.toDate() : undefined,
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined
    };
};

export const getPatients = async (): Promise<Patient[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, "patients"));
        
        return querySnapshot.docs.map(convertPatient);
    } catch (error) {
        console.error("Error fetching patients: ", error);
        throw new Error("Failed to fetch patients");
    }
}

export const getPatientById = async (id: string): Promise<Patient | null> => {
    try {
        const docRef = doc(db, "patients", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return convertPatient(docSnap);
        }
        return null;
    } catch (error) {
        console.error("Error fetching patient: ", error);
        throw new Error("Failed to fetch patient");
    }
}

export const addPatient = async (patient: Omit<Patient, 'id'>): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, "patients"), {
            ...patient,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding patient:", error);
        throw new Error("Failed to add patient");
    }
};

export const updatePatient = async (id: string, updates: Partial<Patient>): Promise<void> => {
    try {
        const docRef = doc(db, "patients", id);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error(`Error updating patient with ID ${id}:`, error);
        throw new Error("Failed to update patient");
    }
};

export const deletePatient = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, "patients", id));
    } catch (error) {
        console.error(`Error deleting patient with ID ${id}:`, error);
        throw new Error("Failed to delete patient");
    }
};

export const searchPatients = async (searchTerm: string): Promise<Patient[]> => {
    try {
        const q = query(
            collection(db, "patients"),
            where("lastName", ">=", searchTerm),
            where("lastName", "<=", searchTerm + "\uf8ff")
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(convertPatient);
    } catch (error) {
        console.error("Error searching patients:", error);
        throw new Error("Failed to search patients");
    }
};

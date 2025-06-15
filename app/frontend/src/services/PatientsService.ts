import { Patient } from "../types/Patient";
import { db } from "../config/Firebase";
import { getDocs, collection, addDoc, deleteDoc, updateDoc, doc, getDoc, query, where, serverTimestamp, orderBy } from "firebase/firestore";
import { throwError } from "../lib/ErrorHandler";

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
        const querySnapshot = await getDocs(
            query(collection(db, "patients"), orderBy("lastName"))
        );
        return querySnapshot.docs.map(convertPatient);
    } catch (error) {
        throwError(error, "Failed to load patients");
        return [];
    }
};

export const getPatientById = async (id: string): Promise<Patient | null> => {
    try {
        if (!id) {
            throwError(new Error("Invalid ID"), "Patient ID is required");
        }
        
        const docRef = doc(db, "patients", id);
        const docSnap = await getDoc(docRef);

        return docSnap.exists() ? convertPatient(docSnap) : null;
    } catch (error) {
        throwError(error, "Failed to load patient");
        return null;
    }
};

export const addPatient = async (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
        if (!patient.firstName || !patient.lastName) {
            throwError(new Error("Missing required fields"), "First name and last name are required");
        }

        const docRef = await addDoc(collection(db, "patients"), {
            ...patient,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        throwError(error, "Failed to add patient");
        return "";
    }
};

export const updatePatient = async (id: string, updates: Partial<Omit<Patient, 'id' | 'createdAt'>>): Promise<void> => {
    try {
        if (!id) {
            throwError(new Error("Invalid ID"), "Patient ID is required");
        }

        const docRef = doc(db, "patients", id);
        
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            throwError(new Error("Patient not found"), "Patient not found");
        }

        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        throwError(error, "Failed to update patient");
    }
};

export const deletePatient = async (id: string): Promise<void> => {
    try {
        if (!id) {
            throwError(new Error("Invalid ID"), "Patient ID is required");
        }

        const docRef = doc(db, "patients", id);
        
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            throwError(new Error("Patient not found"), "Patient not found");
        }

        await deleteDoc(docRef);
    } catch (error) {
        throwError(error, "Failed to delete patient");
    }
};

export const searchPatients = async (searchTerm: string): Promise<Patient[]> => {
    try {
        if (!searchTerm || searchTerm.trim().length < 2) {
            throwError(new Error("Invalid search term"), "Search term must be at least 2 characters");
        }

        const normalizedTerm = searchTerm.trim().toLowerCase();
        
        const q = query(
            collection(db, "patients"),
            where("lastName", ">=", normalizedTerm),
            where("lastName", "<=", normalizedTerm + "\uf8ff"),
            orderBy("lastName"),
        );
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(convertPatient);
    } catch (error) {
        throwError(error, "Failed to search patients");
        return [];
    }
};

import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../config/Firebase";
import { XRayImage } from "../types/XRayImage";
import { resizeImage } from "../lib/utils";
import { throwError, handleError } from "../lib/ErrorHandler";

const convertXRayImage = (doc: any): XRayImage => {
    const data = doc.data();
    return {
        id: doc.id,
        caseId: data.caseId,
        patientId: data.patientId,
        imageUrl: data.imageUrl || "",
        description: data.description || "",
        takenAt: data.takenAt ? data.takenAt.toDate() : new Date(),
        uploadedAt: data.uploadedAt ? data.uploadedAt.toDate() : new Date(),
        metadata: data.metadata || {}
    };
};

export const getCaseXRayImages = async (caseId: string): Promise<XRayImage[]> => {
    try {
        const q = query(
            collection(db, "images"), 
            where("caseId", "==", caseId),
            orderBy("takenAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(convertXRayImage);
    } catch (error) {
        throwError(error, `Failed to fetch x-rays for case ${caseId}`);
        return [];
    }
};

export const getPatientXRayImages = async (patientId: string): Promise<XRayImage[]> => {
    try {
        const q = query(
            collection(db, "images"), 
            where("patientId", "==", patientId),
            orderBy("takenAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(convertXRayImage);
    } catch (error) {
        throwError(error, `Failed to fetch x-rays for patient ${patientId}`);
        return [];
    }
};

export const getXRayImageById = async (id: string): Promise<XRayImage | null> => {
    try {
        const docRef = doc(db, "images", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return convertXRayImage(docSnap);
        }
        return null;
    } catch (error) {
        throwError(error, `Failed to fetch x-ray with ID ${id}`);
        return null;
    }
};


export const addXRayImage = async ( file: File, xrayData: Omit<XRayImage, 'id' | 'imageUrl' | 'thumbnailUrl' | 'uploadedAt'>): Promise<string> => {
    try {
        const resized = await resizeImage(file, 1024);

        const timestamp = Date.now();
        const filename = `${xrayData.patientId}_${xrayData.caseId}_${timestamp}.${file.name.split('.').pop()}`;
        const storageRef = ref(storage, `xrays/${filename}`);
        
        await uploadBytes(storageRef, resized.resizedFile);
        
        const imageUrl = await getDownloadURL(storageRef);
        
        const docRef = await addDoc(collection(db, "images"), {
            ...xrayData,
            imageUrl,
            uploadedAt: serverTimestamp(),
            metadata: {
                width: resized.width,
                height: resized.height,
                format: resized.format,
                sizeInBytes: resized.sizeInBytes,
                originalWidth: 123,
                originalHeight: 123,
                originalFormat: file.type,
                originalSizeInBytes: file.size
            }
        });
        
        return docRef.id;
    } catch (error) {
        throwError(error, 'Failed to add x-ray image');
        return "";
    }
};

export const updateXRayImage = async (id: string, updates: Partial<Omit<XRayImage, 'id' | 'imageUrl' | 'uploadedAt'>>): Promise<void> => {
    try {
        if (!id) {
            throwError(new Error('No ID provided'), 'X-ray ID is required');
        }

        const docRef = doc(db, "images", id);
        await updateDoc(docRef, updates);
    } catch (error) {
        throwError(error, `Failed to update x-ray with ID ${id}`);
    }
};

export const deleteXRayImage = async (id: string): Promise<void> => {
    try {
        if (!id) {
            throwError(new Error('No ID provided'), 'X-ray ID is required');
        }

        const xray = await getXRayImageById(id);
        if (!xray) {
            throwError(new Error('X-ray not found'), 'X-ray image not found');
        }
        try {
            const storageRef = ref(storage, xray?.imageUrl);
            await deleteObject(storageRef);
        } catch (storageError) {
            handleError(storageError, `Failed to delete storage file for x-ray ${id}`);
        }

        await deleteDoc(doc(db, "images", id));
    } catch (error) {
        throwError(error, `Failed to delete x-ray with ID ${id}`);
    }
};
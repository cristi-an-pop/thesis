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
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../config/Firebase";
import { XRayImage } from "../types/XRayImage";

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
        console.error(`Error fetching x-rays for case ${caseId}:`, error);
        throw new Error("Failed to fetch x-ray images");
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
        console.error(`Error fetching x-rays for patient ${patientId}:`, error);
        throw new Error("Failed to fetch x-ray images");
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
        console.error(`Error fetching x-ray with ID ${id}:`, error);
        throw new Error("Failed to fetch x-ray image");
    }
};


export const addXRayImage = async (
    file: File, 
    xrayData: Omit<XRayImage, 'id' | 'imageUrl' | 'thumbnailUrl' | 'uploadedAt'>
): Promise<string> => {
    try {
        const timestamp = Date.now();
        const filename = `${xrayData.patientId}_${xrayData.caseId}_${timestamp}.${file.name.split('.').pop()}`;
        const storageRef = ref(storage, `xrays/${filename}`);
        
        await uploadBytes(storageRef, file);
        
        const imageUrl = await getDownloadURL(storageRef);
        
        const docRef = await addDoc(collection(db, "images"), {
            ...xrayData,
            imageUrl,
            uploadedAt: serverTimestamp(),
            metadata: {
                format: file.type,
                sizeInBytes: file.size
            }
        });
        
        return docRef.id;
    } catch (error) {
        console.error("Error adding x-ray image:", error);
        throw new Error("Failed to add x-ray image");
    }
};

export const updateXRayImage = async (id: string, updates: Partial<Omit<XRayImage, 'imageUrl' | 'thumbnailUrl' | 'uploadedAt'>>): Promise<void> => {
    try {
        const docRef = doc(db, "images", id);
        await updateDoc(docRef, updates);
    } catch (error) {
        console.error(`Error updating x-ray with ID ${id}:`, error);
        throw new Error("Failed to update x-ray image");
    }
};

export const deleteXRayImage = async (id: string): Promise<void> => {
    try {
        const xray = await getXRayImageById(id);
        if (!xray) throw new Error("X-ray image not found");
        
        const storageRef = ref(storage, xray.imageUrl);
        await deleteObject(storageRef);
        
        await deleteDoc(doc(db, "images", id));
    } catch (error) {
        console.error(`Error deleting x-ray with ID ${id}:`, error);
        throw new Error("Failed to delete x-ray image");
    }
};
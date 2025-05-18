export interface XRayImage {
    id?: string;                // Firestore document ID
    caseId: string;             // Reference to case
    patientId: string;          // Duplicate reference for easy querying
    imageUrl: string;           // Storage URL to the image
    description?: string;       // Additional notes about the image
    takenAt: Date;              // When the x-ray was taken
    uploadedAt: Date;           // When it was uploaded to the system
    metadata?: {                // Optional technical metadata
        width?: number;
        height?: number;
        format?: string;
        sizeInBytes?: number;
    };
}
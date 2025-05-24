export interface XRayImage {
    id?: string;
    caseId: string;
    patientId: string;
    imageUrl: string;
    description?: string;
    takenAt: Date;
    uploadedAt: Date;
    metadata?: {
        width?: number;
        height?: number;
        format?: string;
        sizeInBytes?: number;
    };
}
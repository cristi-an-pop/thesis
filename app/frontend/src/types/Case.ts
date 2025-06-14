export interface Note {
    id: string;
    text: string;
    createdAt: Date;
    updatedAt?: Date;
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Diagnosis {
    name: string;
    confidence: number;
    boundingBox?: BoundingBox;
    gradcamData?: string; // Base64 encoded image data for Grad-CAM visualization
}

export interface Case {
    id?: string;
    patientId: string;
    title: string;
    description?: string;
    diagnosis?: Diagnosis[];
    notes?: Note[];
    createdAt?: Date;
    updatedAt?: Date;
}
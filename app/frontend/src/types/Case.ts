export interface Note {
    id: string;
    text: string;
    diagnosis?: string;
    createdAt: Date;
    updatedAt?: Date;
}

export interface BoundingBox {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    noteId: string;
}

export interface Case {
    id?: string;
    patientId: string;
    title: string;
    description?: string;
    diagnosis?: string;
    treatmentPlan?: string;
    createdAt?: Date;
    updatedAt?: Date;
    notes?: Note[];
    boundingBoxes?: BoundingBox[];
}
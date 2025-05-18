export interface Case {
    id?: string;
    patientId: string;          // Reference to patient
    title: string;
    description?: string;
    diagnosis?: string;
    treatmentPlan?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface Patient {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth?: Date;
    address?: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
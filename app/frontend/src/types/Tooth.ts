export interface ToothPosition {
  quadrant: 1 | 2 | 3 | 4; // 1: upper right, 2: upper left, 3: lower left, 4: lower right
  number: number; // 1-8 in each quadrant
}

export interface ToothCondition {
  condition: 'healthy' | 'missing' | 'low' | 'medium' | 'high';
  notes?: string;
  confidence?: number; // 0-100%
  date?: Date;
}

export interface Tooth {
  id: string;
  position: ToothPosition;
  europeanNumber?: number; // European notation (11-48)
  conditions: ToothCondition[];
  currentCondition?: ToothCondition;
  patientId: string;
  caseId?: string;
}
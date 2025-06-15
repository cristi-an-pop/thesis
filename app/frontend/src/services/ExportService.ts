import { getPatients } from './PatientsService';
import { getPatientCases } from './CasesService';
import { getPatientXRayImages } from './XRayService';
import { Patient } from '../types/Patient';
import { throwError, handleError } from '../lib/ErrorHandler';

interface BBoxData {
  id: string;
  image_url: string;
  diagnosis_name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ClassificationData {
  id: string;
  image_url: string;
  labels: string;
}

class ExportService {
  async exportTrainingData(): Promise<void> {
    try {
      const patients = await getPatients();
      const bboxData: BBoxData[] = [];
      const classificationData: ClassificationData[] = [];
      
      for (const patient of patients) {
        if (!patient.id) continue;
        
        try {
          const [cases, xrayImages] = await Promise.all([
            getPatientCases(patient.id),
            getPatientXRayImages(patient.id)
          ]);
          
          for (const caseData of cases) {
            if (!caseData.id) continue;
            
            const xrayImage = xrayImages.find(img => img.caseId === caseData.id);
            if (!xrayImage) continue;
            
            const imageId = xrayImage.id || `${caseData.id}_xray`;
            
            if (caseData.diagnosis && caseData.diagnosis.length > 0) {
              // Multi-label classification
              const labels = caseData.diagnosis.map(d => d.name).join(';');
              
              classificationData.push({
                id: imageId,
                image_url: xrayImage.imageUrl,
                labels,
              });
              
              // Bounding box detection
              caseData.diagnosis.forEach(diagnosis => {
                if (diagnosis.boundingBox) {
                  bboxData.push({
                    id: imageId,
                    image_url: xrayImage.imageUrl,
                    diagnosis_name: diagnosis.name,
                    x: diagnosis.boundingBox.x,
                    y: diagnosis.boundingBox.y,
                    width: diagnosis.boundingBox.width,
                    height: diagnosis.boundingBox.height,
                  });
                }
              });
            } else {
              // Cases without diagnosis
              classificationData.push({
                id: imageId,
                image_url: xrayImage.imageUrl,
                labels: 'normal',
              });
            }
          }
        } catch (error) {
          handleError(error, `Failed to process patient ${patient.id}`);
        }
      }
      
      // Export data
      this.downloadCSV(bboxData, 'bbox_training_data.csv');
      this.downloadCSV(classificationData, 'classification_training_data.csv');

      // Export summary
      const summary = {
        export_date: new Date().toISOString(),
        total_patients: patients.length,
        total_cases: classificationData.length,
        total_bbox_annotations: bboxData.length,
        unique_diagnoses: [...new Set(bboxData.map(d => d.diagnosis_name))],
        unique_labels: [...new Set(classificationData.flatMap(d => d.labels.split(';')))]
      };
      
      this.downloadJSON(summary, 'export_summary.json');
      
    } catch (error) {
      throwError(error, 'Failed to export training data');
    }
  }

  async exportPatientsCSV(patients: Patient[]): Promise<void> {
    try {
      const exportData = patients.map(patient => ({
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email || '',
        phoneNumber: patient.phoneNumber || '',
        dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString().split('T')[0] : '',
        address: patient.address || '',
        createdAt: patient.createdAt ? patient.createdAt.toISOString() : ''
      }));

      this.downloadCSV(exportData, 'patients_export.csv');
    } catch (error) {
      throwError(error, 'Failed to export patient list');
    }
  }

  private downloadCSV(data: any[], filename: string): void {
    if (data.length === 0) {
      throwError(new Error('No data to export'), `No data available for ${filename}`);
      return;
    }
    
    try {
      const headers = Object.keys(data[0]);
      
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      this.downloadFile(blob, filename);
    } catch (error) {
      throwError(error, `Failed to generate ${filename}`);
    }
  }

  private downloadJSON(data: any, filename: string): void {
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      this.downloadFile(blob, filename);
    } catch (error) {
      throwError(error, `Failed to generate ${filename}`);
    }
  }

  private downloadFile(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export default new ExportService();
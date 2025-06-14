import { getPatients } from './PatientsService';
import { getPatientCases } from './CasesService';
import { getPatientXRayImages } from './XRayService';

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
      console.log('Starting training data export...');
      
      // Get all patients
      const patients = await getPatients();
      console.log(`Found ${patients.length} patients`);
      
      const bboxData: BBoxData[] = [];
      const classificationData: ClassificationData[] = [];
      
      // Process each patient
      for (const patient of patients) {
        if (!patient.id) continue;
        
        try {
          // Get patient's cases and X-ray images
          const [cases, xrayImages] = await Promise.all([
            getPatientCases(patient.id),
            getPatientXRayImages(patient.id)
          ]);
          
          console.log(`Patient ${patient.firstName} ${patient.lastName}: ${cases.length} cases, ${xrayImages.length} X-ray images`);
          
          // Process each case
          for (const caseData of cases) {
            if (!caseData.id) continue;
            
            // Find corresponding X-ray image
            const xrayImage = xrayImages.find(img => img.caseId === caseData.id);
            if (!xrayImage) continue;
            
            const imageId = xrayImage.id || `${caseData.id}_xray`;
            
            // Process diagnoses for both exports
            if (caseData.diagnosis && caseData.diagnosis.length > 0) {
              // For multi-label classification
              const labels = caseData.diagnosis.map(d => d.name).join(';');
              
              classificationData.push({
                id: imageId,
                image_url: xrayImage.imageUrl,
                labels,
              });
              
              // For bounding box detection
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
              // Cases without diagnosis - useful for negative samples
              classificationData.push({
                id: imageId,
                image_url: xrayImage.imageUrl,
                labels: 'normal',
              });
            }
          }
        } catch (error) {
          console.error(`Error processing patient ${patient.id}:`, error);
        }
      }
      
      console.log(`Generated ${bboxData.length} bounding box records and ${classificationData.length} classification records`);
      
      // Download CSV files
      this.downloadCSV(bboxData, 'bbox_training_data.csv');
      this.downloadCSV(classificationData, 'classification_training_data.csv');
      
      // Create summary file
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
      console.error('Error exporting training data:', error);
      throw new Error('Failed to export training data');
    }
  }

  private downloadCSV(data: any[], filename: string): void {
    if (data.length === 0) {
      console.warn(`No data to export for ${filename}`);
      return;
    }
    
    // Get headers from the first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
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

  private downloadJSON(data: any, filename: string): void {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
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
}

export default new ExportService();
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Case } from '@/types/Case';
import { Patient } from '@/types/Patient';
import { XRayImage } from '@/types/XRayImage';
import { format } from 'date-fns';

interface ReportData {
  case: Case;
  patient: Patient;
  xrayImage?: XRayImage;
  xrayImageUrl?: string;
}

class ReportService {
  async generateCaseReport(data: ReportData): Promise<void> {
    const { case: caseData, patient, xrayImage, xrayImageUrl } = data;
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      const checkNewPage = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      const addText = (text: string, fontSize: number, isBold = false, maxWidth?: number) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        
        if (maxWidth) {
          const lines = pdf.splitTextToSize(text, maxWidth);
          const lineHeight = fontSize * 0.35;
          checkNewPage(lines.length * lineHeight);
          
          lines.forEach((line: string) => {
            pdf.text(line, margin, yPosition);
            yPosition += lineHeight;
          });
        } else {
          checkNewPage(fontSize * 0.35);
          pdf.text(text, margin, yPosition);
          yPosition += fontSize * 0.35;
        }
        yPosition += 3;
      };

      pdf.setFillColor(63, 136, 242);
      pdf.rect(0, 0, pageWidth, 30, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Medical Case Report', margin, 20);
      
      yPosition = 40;
      pdf.setTextColor(0, 0, 0);

      addText('Patient Information', 16, true);
      yPosition += 2;
      
      addText(`Name: ${patient.firstName} ${patient.lastName}`, 12);
      if (patient.phoneNumber) addText(`Phone: ${patient.phoneNumber}`, 12);
      if (patient.email) addText(`Email: ${patient.email}`, 12);
      
      yPosition += 10;

      // Case Information
      addText('Case Information', 16, true);
      yPosition += 2;
      
      addText(`Title: ${caseData.title}`, 12);
      addText(`Created: ${this.formatFirestoreDate(caseData.createdAt)}`, 12);
      if (caseData.description) {
        addText('Description:', 12, true);
        addText(caseData.description, 11, false, pageWidth - 2 * margin);
      }
      
      yPosition += 10;

      // X-Ray Image
      if (xrayImageUrl) {
        addText('X-Ray Image', 16, true);
        yPosition += 2;
        
        try {
          const imageData = await this.loadImageAsBase64(xrayImageUrl);
          const imgWidth = 120;
          const imgHeight = 90;
          
          checkNewPage(imgHeight + 10);
          
          pdf.addImage(imageData, 'JPEG', margin, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
          
          if (xrayImage) {
            addText(`X-Ray Date: ${this.formatFirestoreDate(xrayImage.takenAt)}`, 10);
          }
        } catch (error) {
          console.error('Failed to load X-ray image:', error);
          addText('X-Ray image could not be loaded', 10);
        }
        
        yPosition += 10;
      }

      // Diagnosis
      if (caseData.diagnosis && caseData.diagnosis.length > 0) {
        addText('Diagnosis', 16, true);
        yPosition += 2;
        
        caseData.diagnosis.forEach((diagnosis, index) => {
          checkNewPage(25);
          
          addText(`${index + 1}. ${diagnosis.name}`, 12, true);
          addText(`   Confidence: ${diagnosis.confidence}%`, 11);
          
          yPosition += 3;
        });
        
        yPosition += 10;
      }

      // Notes
      if (caseData.notes && caseData.notes.length > 0) {
        addText('Clinical Notes', 16, true);
        yPosition += 2;
        
        caseData.notes.forEach((note, index) => {
          const noteHeight = 20 + (note.text.length / 100) * 5;
          checkNewPage(noteHeight);
          
          addText(`Note ${index + 1}`, 12, true);
          addText(`Date: ${this.formatFirestoreDate(note.createdAt)}`, 10);
          addText(note.text, 11, false, pageWidth - 2 * margin);
          
          yPosition += 5;
        });
      }

      // Footer
      pdf.text(
          `Generated on ${format(new Date(), 'MMM d, yyyy HH:mm')}`,
          margin,
          pageHeight - 10
      );

      // Save the PDF
      const fileName = `${patient.lastName}_${patient.firstName}_${caseData.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF report:', error);
      throw new Error('Failed to generate PDF report');
    }
  }

  private async loadImageAsBase64(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataURL);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }

  private formatFirestoreDate(date: any): string {
    try {
      if (date && typeof date.toDate === 'function') {
        return format(date.toDate(), 'MMM d, yyyy HH:mm');
      }
      if (date instanceof Date) {
        return format(date, 'MMM d, yyyy HH:mm');
      }
      if (typeof date === 'string') {
        return format(new Date(date), 'MMM d, yyyy HH:mm');
      }
      return 'Invalid date';
    } catch (error) {
      return 'Invalid date';
    }
  }

  async generateReportWithAnnotations(
    data: ReportData, 
    canvasElement?: HTMLCanvasElement
  ): Promise<void> {
    if (canvasElement) {
      try {
        const canvas = await html2canvas(canvasElement, {
          backgroundColor: '#000000',
          allowTaint: true,
        });
        
        const annotatedImageData = canvas.toDataURL('image/png');
        
        await this.generateCaseReport({
          ...data,
          xrayImageUrl: annotatedImageData
        });
        
      } catch (error) {
        console.error('Failed to capture annotations, using original image:', error);
        await this.generateCaseReport(data);
      }
    } else {
      await this.generateCaseReport(data);
    }
  }
}

export default new ReportService();
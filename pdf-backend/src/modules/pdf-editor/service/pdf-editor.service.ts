import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

interface Annotation {
  id: string;
  type: 'text' | 'highlight' | 'rectangle' | 'circle' | 'arrow' | 'comment';
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  opacity?: number;
  author?: string;
  timestamp: Date;
}

interface DocumentInfo {
  id: string;
  name: string;
  pages: number;
  size: number;
  annotations: number;
  createdAt: Date;
  lastModified: Date;
}

@Injectable()
export class PdfEditorService {
  private documents = new Map<string, { pdfDoc: PDFDocument; annotations: Annotation[]; originalBuffer: Buffer; info: DocumentInfo }>();

  async uploadPdf(file: Express.Multer.File): Promise<string> {
    const documentId = uuidv4();

    try {
      const pdfDoc = await PDFDocument.load(file.buffer);
      const pages = pdfDoc.getPageCount();

      const info: DocumentInfo = {
        id: documentId,
        name: file.originalname,
        pages,
        size: file.size,
        annotations: 0,
        createdAt: new Date(),
        lastModified: new Date()
      };

      this.documents.set(documentId, {
        pdfDoc,
        annotations: [],
        originalBuffer: file.buffer,
        info
      });

      console.log(`PDF uploaded: ${file.originalname}, ${pages} pages`);
      return documentId;
    } catch (error) {
      console.error('Error loading PDF:', error);
      throw new Error(`Failed to load PDF: ${error.message}`);
    }
  }

  async getDocumentInfo(documentId: string): Promise<DocumentInfo> {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    doc.info.annotations = doc.annotations.length;
    doc.info.lastModified = new Date();

    return doc.info;
  }

  async addAnnotation(documentId: string, annotationData: Omit<Annotation, 'id' | 'timestamp'>): Promise<Annotation> {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    const annotation: Annotation = {
      id: uuidv4(),
      ...annotationData,
      timestamp: new Date()
    };

    doc.annotations.push(annotation);
    doc.info.lastModified = new Date();

    console.log(`Annotation added: ${annotation.type} on page ${annotation.page}`);
    return annotation;
  }

  async getAnnotations(documentId: string): Promise<Annotation[]> {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    return doc.annotations;
  }

  async updateAnnotation(documentId: string, annotationId: string, updates: Partial<Annotation>): Promise<Annotation> {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    const annotationIndex = doc.annotations.findIndex(a => a.id === annotationId);
    if (annotationIndex === -1) {
      throw new Error('Annotation not found');
    }

    doc.annotations[annotationIndex] = { ...doc.annotations[annotationIndex], ...updates };
    doc.info.lastModified = new Date();

    return doc.annotations[annotationIndex];
  }

  async deleteAnnotation(documentId: string, annotationId: string): Promise<void> {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    const annotationIndex = doc.annotations.findIndex(a => a.id === annotationId);
    if (annotationIndex === -1) {
      throw new Error('Annotation not found');
    }

    doc.annotations.splice(annotationIndex, 1);
    doc.info.lastModified = new Date();
  }

  async redactContent(documentId: string, redaction: { page: number; x: number; y: number; width: number; height: number }): Promise<void> {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    const pages = doc.pdfDoc.getPages();
    const page = pages[redaction.page - 1];
    if (!page) {
      throw new Error('Page not found');
    }

    const pageHeight = page.getHeight();
    const adjustedY = pageHeight - redaction.y - redaction.height;

    // Draw a black rectangle over the redacted area
    page.drawRectangle({
      x: redaction.x,
      y: adjustedY,
      width: redaction.width,
      height: redaction.height,
      color: rgb(0, 0, 0),
    });

    doc.info.lastModified = new Date();
    console.log(`Content redacted on page ${redaction.page}`);
  }

  async addWatermark(documentId: string, watermark: {
    type: 'text' | 'image';
    text?: string;
    imageUrl?: string;
    x: number;
    y: number;
    opacity?: number;
    fontSize?: number;
  }): Promise<void> {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    const pages = doc.pdfDoc.getPages();

    if (watermark.type === 'text' && watermark.text) {
      const font = await doc.pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = watermark.fontSize || 12;
      const opacity = watermark.opacity || 0.5;

      pages.forEach(page => {
        const pageHeight = page.getHeight();
        const adjustedY = pageHeight - watermark.y;

        page.drawText(watermark.text!, {
          x: watermark.x,
          y: adjustedY,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          opacity
        });
      });
    }

    // Note: Image watermark would require additional implementation
    // For now, only text watermarks are supported

    doc.info.lastModified = new Date();
    console.log(`Watermark added: ${watermark.type}`);
  }

  async saveDocument(documentId: string): Promise<{ success: boolean }> {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    // Apply annotations to PDF
    await this.applyAnnotationsToPdf(doc);

    doc.info.lastModified = new Date();

    return { success: true };
  }

  async exportDocument(documentId: string): Promise<Buffer> {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    // Apply annotations to PDF before exporting
    await this.applyAnnotationsToPdf(doc);

    const pdfBytes = await doc.pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private async applyAnnotationsToPdf(doc: { pdfDoc: PDFDocument; annotations: Annotation[] }): Promise<void> {
    const pages = doc.pdfDoc.getPages();

    for (const annotation of doc.annotations) {
      const page = pages[annotation.page - 1];
      if (!page) continue;

      const pageHeight = page.getHeight();
      const color = annotation.color ? this.hexToRgb(annotation.color) : rgb(1, 1, 0);
      const opacity = annotation.opacity || 1;

      // Adjust Y coordinate (PDF-lib uses bottom-left origin)
      const adjustedY = pageHeight - annotation.y;

      switch (annotation.type) {
        case 'text':
          if (annotation.text) {
            const font = await doc.pdfDoc.embedFont(StandardFonts.Helvetica);
            page.drawText(annotation.text, {
              x: annotation.x,
              y: adjustedY,
              size: 12,
              font,
              color,
              opacity
            });
          }
          break;

        case 'highlight':
          if (annotation.width && annotation.height) {
            page.drawRectangle({
              x: annotation.x,
              y: adjustedY - annotation.height,
              width: annotation.width,
              height: annotation.height,
              color,
              opacity: opacity * 0.3
            });
          }
          break;

        case 'rectangle':
          if (annotation.width && annotation.height) {
            page.drawRectangle({
              x: annotation.x,
              y: adjustedY - annotation.height,
              width: annotation.width,
              height: annotation.height,
              color,
              opacity,
              borderWidth: 2
            });
          }
          break;

        case 'circle':
          if (annotation.width) {
            const radius = annotation.width / 2;
            page.drawCircle({
              x: annotation.x + radius,
              y: adjustedY - radius,
              size: radius,
              color,
              opacity,
              borderWidth: 2
            });
          }
          break;

        case 'arrow':
          // Simple arrow representation
          const arrowLength = annotation.width || 50;
          page.drawLine({
            start: { x: annotation.x, y: adjustedY },
            end: { x: annotation.x + arrowLength, y: adjustedY },
            color,
            opacity,
            thickness: 2
          });
          // Draw arrowhead
          page.drawLine({
            start: { x: annotation.x + arrowLength, y: adjustedY },
            end: { x: annotation.x + arrowLength - 10, y: adjustedY + 5 },
            color,
            opacity,
            thickness: 2
          });
          page.drawLine({
            start: { x: annotation.x + arrowLength, y: adjustedY },
            end: { x: annotation.x + arrowLength - 10, y: adjustedY - 5 },
            color,
            opacity,
            thickness: 2
          });
          break;

        case 'comment':
          if (annotation.text) {
            const font = await doc.pdfDoc.embedFont(StandardFonts.Helvetica);
            page.drawText(`💬 ${annotation.text}`, {
              x: annotation.x,
              y: adjustedY,
              size: 10,
              font,
              color: rgb(0, 0, 1),
              opacity
            });
          }
          break;
      }
    }
  }

  private hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? rgb(
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ) : rgb(1, 1, 0);
  }
}
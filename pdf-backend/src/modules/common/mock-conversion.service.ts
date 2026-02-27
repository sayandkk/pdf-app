import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb } from 'pdf-lib';

@Injectable()
export class MockConversionService {
  async createMockPdf(originalFileName: string): Promise<Buffer> {
    // Create a simple PDF document as a demo
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    
    page.drawText('Demo PDF Conversion Result', {
      x: 50,
      y: 350,
      size: 20,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`Original file: ${originalFileName}`, {
      x: 50,
      y: 300,
      size: 14,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    page.drawText('This is a demo conversion.', {
      x: 50,
      y: 250,
      size: 12,
      color: rgb(0.7, 0.7, 0.7),
    });
    
    page.drawText('Please install LibreOffice for real conversions.', {
      x: 50,
      y: 220,
      size: 12,
      color: rgb(1, 0, 0),
    });
    
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  async createMockDocx(originalFileName: string): Promise<Buffer> {
    // Create a simple text content as mock docx
    const content = `Demo Word Conversion Result

Original file: ${originalFileName}

This is a demo conversion.
Please install LibreOffice for real conversions.

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;
    
    return Buffer.from(content, 'utf-8');
  }
}

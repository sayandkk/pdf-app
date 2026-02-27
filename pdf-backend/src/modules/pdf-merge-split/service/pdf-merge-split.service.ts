import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PDFDocument } from 'pdf-lib';

const execAsync = promisify(exec);

@Injectable()
export class PdfMergeSplitService {
  async merge(files: Express.Multer.File[]): Promise<Buffer> {
    // Try using PDFtk first, fallback to QPDF, then pdf-lib
    try {
      return await this.mergeWithPdftk(files);
    } catch (error) {
      console.warn('PDFtk not available, trying QPDF:', error.message);
      try {
        return await this.mergeWithQpdf(files);
      } catch (qpdfError) {
        console.warn('QPDF not available, using pdf-lib:', qpdfError.message);
        return await this.mergeWithPdfLib(files);
      }
    }
  }

  async split(file: Express.Multer.File, ranges: string): Promise<{ buffer: Buffer; pages: string; description: string }[]> {
    // First, analyze the PDF to get page count
    const originalPdf = await PDFDocument.load(file.buffer);
    const totalPages = originalPdf.getPageCount();
    
    console.log(`Splitting PDF: ${file.originalname}, Total pages: ${totalPages}, Ranges: ${ranges}`);
    
    // Try using PDFtk first, fallback to QPDF, then pdf-lib
    try {
      return await this.splitWithPdftk(file, ranges, totalPages);
    } catch (error) {
      console.warn('PDFtk not available, trying QPDF:', error.message);
      try {
        return await this.splitWithQpdf(file, ranges, totalPages);
      } catch (qpdfError) {
        console.warn('QPDF not available, using pdf-lib:', qpdfError.message);
        return await this.splitWithPdfLib(file, ranges, totalPages);
      }
    }
  }

  private async mergeWithPdftk(files: Express.Multer.File[]): Promise<Buffer> {
    const tempDir = os.tmpdir();
    const inputPaths: string[] = [];
    const outputPath = path.join(tempDir, `merged_${Date.now()}.pdf`);

    try {
      // Write all input files to temporary locations
      for (let i = 0; i < files.length; i++) {
        const inputPath = path.join(tempDir, `input_${Date.now()}_${i}.pdf`);
        await fs.promises.writeFile(inputPath, files[i].buffer);
        inputPaths.push(inputPath);
      }

      // Use PDFtk to merge files
      const command = `pdftk ${inputPaths.join(' ')} cat output "${outputPath}"`;
      await execAsync(command);

      // Read the merged PDF
      const mergedBuffer = await fs.promises.readFile(outputPath);

      // Clean up temporary files
      for (const inputPath of inputPaths) {
        await fs.promises.unlink(inputPath).catch(() => {});
      }
      await fs.promises.unlink(outputPath).catch(() => {});

      return mergedBuffer;
    } catch (error) {
      // Clean up temporary files in case of error
      for (const inputPath of inputPaths) {
        await fs.promises.unlink(inputPath).catch(() => {});
      }
      await fs.promises.unlink(outputPath).catch(() => {});
      throw error;
    }
  }

  private async mergeWithQpdf(files: Express.Multer.File[]): Promise<Buffer> {
    const tempDir = os.tmpdir();
    const inputPaths: string[] = [];
    const outputPath = path.join(tempDir, `merged_${Date.now()}.pdf`);

    try {
      // Write all input files to temporary locations
      for (let i = 0; i < files.length; i++) {
        const inputPath = path.join(tempDir, `input_${Date.now()}_${i}.pdf`);
        await fs.promises.writeFile(inputPath, files[i].buffer);
        inputPaths.push(inputPath);
      }

      // Use QPDF to merge files
      let command = `qpdf --empty --pages`;
      for (const inputPath of inputPaths) {
        command += ` "${inputPath}"`;
      }
      command += ` -- "${outputPath}"`;
      
      await execAsync(command);

      // Read the merged PDF
      const mergedBuffer = await fs.promises.readFile(outputPath);

      // Clean up temporary files
      for (const inputPath of inputPaths) {
        await fs.promises.unlink(inputPath).catch(() => {});
      }
      await fs.promises.unlink(outputPath).catch(() => {});

      return mergedBuffer;
    } catch (error) {
      // Clean up temporary files in case of error
      for (const inputPath of inputPaths) {
        await fs.promises.unlink(inputPath).catch(() => {});
      }
      await fs.promises.unlink(outputPath).catch(() => {});
      throw error;
    }
  }

  private async mergeWithPdfLib(files: Express.Multer.File[]): Promise<Buffer> {
    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
      const pdf = await PDFDocument.load(file.buffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    }
    const mergedPdfBytes = await mergedPdf.save();
    return Buffer.from(mergedPdfBytes);
  }

  private async splitWithPdftk(file: Express.Multer.File, ranges: string, totalPages: number): Promise<{ buffer: Buffer; pages: string; description: string }[]> {
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.pdf`);
    const outputPaths: string[] = [];

    try {
      // Write input file to temporary location
      await fs.promises.writeFile(inputPath, file.buffer);

      const pageRanges = ranges.split(',').map(range => range.trim());
      const results: { buffer: Buffer; pages: string; description: string }[] = [];

      for (let i = 0; i < pageRanges.length; i++) {
        const outputPath = path.join(tempDir, `split_${Date.now()}_${i}.pdf`);
        outputPaths.push(outputPath);

        const pageRange = pageRanges[i];
        
        // Use PDFtk to split file
        const command = `pdftk "${inputPath}" cat ${pageRange} output "${outputPath}"`;
        await execAsync(command);

        // Read the split PDF
        const splitBuffer = await fs.promises.readFile(outputPath);
        
        // Parse the range to create description
        const description = this.createRangeDescription(pageRange, totalPages);
        
        results.push({
          buffer: splitBuffer,
          pages: pageRange,
          description: description
        });
      }

      // Clean up temporary files
      await fs.promises.unlink(inputPath).catch(() => {});
      for (const outputPath of outputPaths) {
        await fs.promises.unlink(outputPath).catch(() => {});
      }

      return results;
    } catch (error) {
      // Clean up temporary files in case of error
      await fs.promises.unlink(inputPath).catch(() => {});
      for (const outputPath of outputPaths) {
        await fs.promises.unlink(outputPath).catch(() => {});
      }
      throw error;
    }
  }

  private createRangeDescription(pageRange: string, totalPages: number): string {
    const parts = pageRange.split('-');
    if (parts.length === 1) {
      const page = parseInt(parts[0]);
      return `Page ${page} of ${totalPages}`;
    } else if (parts.length === 2) {
      const start = parseInt(parts[0]);
      const end = parseInt(parts[1]);
      const pageCount = end - start + 1;
      return `Pages ${start}-${end} (${pageCount} pages) of ${totalPages}`;
    } else {
      return `Pages ${pageRange} of ${totalPages}`;
    }
  }

  private async splitWithQpdf(file: Express.Multer.File, ranges: string, totalPages: number): Promise<{ buffer: Buffer; pages: string; description: string }[]> {
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.pdf`);
    const outputPaths: string[] = [];

    try {
      // Write input file to temporary location
      await fs.promises.writeFile(inputPath, file.buffer);

      const pageRanges = ranges.split(',').map(range => range.trim());
      const results: { buffer: Buffer; pages: string; description: string }[] = [];

      for (let i = 0; i < pageRanges.length; i++) {
        const outputPath = path.join(tempDir, `split_${Date.now()}_${i}.pdf`);
        outputPaths.push(outputPath);

        const pageRange = pageRanges[i];

        // Use QPDF to split file
        const command = `qpdf "${inputPath}" --pages . ${pageRange} -- "${outputPath}"`;
        await execAsync(command);

        // Read the split PDF
        const splitBuffer = await fs.promises.readFile(outputPath);
        
        // Parse the range to create description
        const description = this.createRangeDescription(pageRange, totalPages);
        
        results.push({
          buffer: splitBuffer,
          pages: pageRange,
          description: description
        });
      }

      // Clean up temporary files
      await fs.promises.unlink(inputPath).catch(() => {});
      for (const outputPath of outputPaths) {
        await fs.promises.unlink(outputPath).catch(() => {});
      }

      return results;
    } catch (error) {
      // Clean up temporary files in case of error
      await fs.promises.unlink(inputPath).catch(() => {});
      for (const outputPath of outputPaths) {
        await fs.promises.unlink(outputPath).catch(() => {});
      }
      throw error;
    }
  }

  private async splitWithPdfLib(file: Express.Multer.File, ranges: string, totalPages: number): Promise<{ buffer: Buffer; pages: string; description: string }[]> {
    const pdf = await PDFDocument.load(file.buffer);
    const pageRanges = ranges.split(',').map(range => {
      const parts = range.trim().split('-');
      return parts.map(n => parseInt(n, 10));
    });

    const results: { buffer: Buffer; pages: string; description: string }[] = [];
    for (let i = 0; i < pageRanges.length; i++) {
      const range = pageRanges[i];
      const pageRange = ranges.split(',')[i].trim(); // Get original range string
      
      const newPdf = await PDFDocument.create();
      const start = range[0] - 1;
      const end = range.length === 1 ? start : range[1] - 1;
      for (let j = start; j <= end; j++) {
        if (j < pdf.getPageCount()) {
          const [copiedPage] = await newPdf.copyPages(pdf, [j]);
          newPdf.addPage(copiedPage);
        }
      }
      const pdfBytes = await newPdf.save();
      
      // Create description
      const description = this.createRangeDescription(pageRange, totalPages);
      
      results.push({
        buffer: Buffer.from(pdfBytes),
        pages: pageRange,
        description: description
      });
    }
    return results;
  }
}

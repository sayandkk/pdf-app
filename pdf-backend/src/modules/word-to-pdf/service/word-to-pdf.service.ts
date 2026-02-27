import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as mammoth from 'mammoth';
import jsPDF from 'jspdf';

@Injectable()
export class WordToPdfService {
  
  async convertToPdf(file: Express.Multer.File): Promise<Buffer> {
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}_${file.originalname}`);
    const outputDir = path.join(tempDir, `output_${Date.now()}`);

    try {
      await fs.promises.mkdir(outputDir, { recursive: true });
      await fs.promises.writeFile(inputPath, file.buffer);

      // Try LibreOffice conversion first
      const libreResult = await this.tryLibreOfficeSilent(inputPath, outputDir);
      
      if (libreResult.success && libreResult.buffer) {
        await this.cleanup(inputPath, outputDir);
        return libreResult.buffer;
      }

      console.log('LibreOffice conversion failed, trying fallback text extraction...');
      
      // Fallback: Extract text and create simple PDF
      const fallbackResult = await this.tryTextExtractionFallback(file);
      if (fallbackResult.success && fallbackResult.buffer) {
        await this.cleanup(inputPath, outputDir);
        return fallbackResult.buffer;
      }

      throw new Error('All conversion methods failed. Please ensure LibreOffice is installed or try a different Word document.');

    } catch (error) {
      await this.cleanup(inputPath, outputDir);
      throw new Error(`Word to PDF conversion failed: ${error.message}`);
    }
  }

  // COMPLETELY SILENT LibreOffice execution - NO POPUPS, NO TERMINALS!
  private async tryLibreOfficeSilent(inputPath: string, outputDir: string): Promise<{ success: boolean; buffer?: Buffer }> {
    return new Promise((resolve) => {
      const paths = [
        'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
        'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe'
      ];

      for (const soffice of paths) {
        if (fs.existsSync(soffice)) {
          console.log(`Using LibreOffice: ${soffice}`);
          
          const child = spawn(soffice, [
            '--headless',
            '--invisible',
            '--nodefault',
            '--nologo',
            '--norestore',
            '--nolockcheck',
            '--convert-to', 'pdf',
            '--outdir', outputDir,
            inputPath
          ], {
            stdio: 'ignore',    // COMPLETELY IGNORE ALL I/O - NO POPUPS!
            windowsHide: true,  // Hide process window
            shell: false        // Direct execution, no shell
          });

          const timeout = setTimeout(() => {
            child.kill('SIGKILL');
            resolve({ success: false });
          }, 45000); // 45 seconds timeout

          child.on('close', async (code) => {
            clearTimeout(timeout);
            console.log(`LibreOffice process exited with code: ${code}`);
            
            // Wait for file system to catch up
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const baseName = path.basename(inputPath, path.extname(inputPath));
            const outputFile = path.join(outputDir, `${baseName}.pdf`);
            
            console.log(`Looking for output file: ${outputFile}`);
            
            try {
              if (fs.existsSync(outputFile)) {
                const buffer = await fs.promises.readFile(outputFile);
                console.log(`Found PDF file: ${buffer.length} bytes`);
                
                if (buffer.length > 1000 && this.isValidPdf(buffer)) {
                  console.log('✅ Word to PDF conversion successful');
                  resolve({ success: true, buffer });
                  return;
                }
              }
              
              // List files for debugging
              const files = await fs.promises.readdir(outputDir);
              console.log(`Files in output directory: ${files.join(', ')}`);
              
            } catch (e) {
              console.log(`Error reading output: ${e.message}`);
            }
            
            resolve({ success: false });
          });

          child.on('error', (error) => {
            console.log(`LibreOffice spawn error: ${error.message}`);
            resolve({ success: false });
          });

          return; // Exit after trying first working path
        }
      }
      
      console.log('❌ LibreOffice not found in any common location');
      resolve({ success: false });
    });
  }

  // Check if buffer is a valid PDF
  private isValidPdf(buffer: Buffer): boolean {
    try {
      if (buffer.length < 5) return false;
      const pdfSignature = buffer.slice(0, 5).toString('ascii');
      return pdfSignature === '%PDF-';
    } catch (e) {
      return false;
    }
  }

  private async cleanup(inputPath: string, outputDir: string): Promise<void> {
    try {
      if (fs.existsSync(inputPath)) {
        await fs.promises.unlink(inputPath);
        console.log(`🧹 Cleaned up input file: ${inputPath}`);
      }
      if (fs.existsSync(outputDir)) {
        await fs.promises.rm(outputDir, { recursive: true });
        console.log(`🧹 Cleaned up output directory: ${outputDir}`);
      }
    } catch (e) {
      console.log(`⚠️ Cleanup warning: ${e.message}`);
    }
  }

  // Fallback method: Extract text and create simple PDF
  private async tryTextExtractionFallback(file: Express.Multer.File): Promise<{ success: boolean; buffer?: Buffer }> {
    try {
      console.log('🔄 Attempting text extraction fallback...');

      // Extract text from Word document using mammoth
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      const text = result.value;

      if (!text || text.trim().length === 0) {
        console.log('❌ No text content found in document');
        return { success: false };
      }

      console.log(`📄 Extracted ${text.length} characters of text`);

      // Create PDF using jsPDF
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      const lineHeight = 7;

      // Split text into lines that fit the page width
      const lines = doc.splitTextToSize(text, maxWidth);
      let y = margin;

      for (const line of lines) {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }

      // Convert to buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      console.log(`✅ Fallback PDF created: ${pdfBuffer.length} bytes`);
      return { success: true, buffer: pdfBuffer };

    } catch (error) {
      console.log(`❌ Text extraction fallback failed: ${error.message}`);
      return { success: false };
    }
  }
}

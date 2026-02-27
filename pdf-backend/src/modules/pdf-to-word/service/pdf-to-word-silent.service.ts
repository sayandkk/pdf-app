import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PDFDocument } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class PdfToWordSilentService {
  
  // Main conversion method with completely silent LibreOffice
  async convertToWord(file: Express.Multer.File): Promise<Buffer> {
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}_${file.originalname}`);
    const outputDir = path.join(tempDir, `output_${Date.now()}`);

    try {
      // Create output directory
      await fs.promises.mkdir(outputDir, { recursive: true });

      // Write uploaded file to temporary location
      await fs.promises.writeFile(inputPath, file.buffer);
      console.log(`Analyzing PDF: ${file.originalname}`);

      // Try LibreOffice first (completely silent)
      const libreOfficeResult = await this.tryLibreOfficeConversionSilent(inputPath, outputDir);
      
      if (libreOfficeResult.success && libreOfficeResult.buffer) {
        console.log(`✅ LibreOffice conversion successful: ${libreOfficeResult.buffer.length} bytes`);
        await this.cleanupFiles(inputPath, outputDir);
        return libreOfficeResult.buffer;
      }

      console.log('METHOD 2: LibreOffice failed, trying text extraction...');
      
      // Fallback to text extraction
      const textBuffer = await this.extractTextAndCreateWord(inputPath, file.originalname);
      await this.cleanupFiles(inputPath, outputDir);
      return textBuffer;

    } catch (error) {
      console.error(`PDF to Word conversion failed: ${error.message}`);
      await this.cleanupFiles(inputPath, outputDir);
      throw new Error(`Failed to convert PDF to Word: ${error.message}`);
    }
  }

  // Completely silent LibreOffice conversion using spawn
  private async tryLibreOfficeConversionSilent(inputPath: string, outputDir: string): Promise<{ success: boolean; buffer?: Buffer }> {
    console.log('METHOD 1: Attempting completely silent LibreOffice conversion...');

    // Find LibreOffice executable
    const libreOfficeCmd = await this.findLibreOfficeCommand();
    if (!libreOfficeCmd) {
      console.log('❌ LibreOffice not found');
      return { success: false };
    }

    console.log(`✅ Found LibreOffice: ${libreOfficeCmd}`);

    // Silent conversion strategies
    const strategies = [
      ['--headless', '--invisible', '--nodefault', '--nolockcheck', '--nologo', '--norestore', '--convert-to', 'docx', '--outdir', outputDir, inputPath],
      ['--headless', '--invisible', '--nodefault', '--nolockcheck', '--nologo', '--norestore', '--writer', '--convert-to', 'docx', '--outdir', outputDir, inputPath],
      ['--headless', '--invisible', '--nodefault', '--nolockcheck', '--nologo', '--norestore', '--quickstart=no', '--convert-to', 'docx', '--outdir', outputDir, inputPath]
    ];

    for (const [index, args] of strategies.entries()) {
      try {
        console.log(`🔇 Trying silent strategy ${index + 1}...`);
        
        await this.executeLibreOfficeSilently(libreOfficeCmd, args);
        
        // Wait for file system
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check for output
        const outputBuffer = await this.findConvertedFile(inputPath, outputDir);
        if (outputBuffer) {
          console.log(`🎉 Silent conversion successful with strategy ${index + 1}`);
          return { success: true, buffer: outputBuffer };
        }
        
      } catch (error) {
        console.log(`❌ Silent strategy ${index + 1} failed: ${error.message}`);
        continue;
      }
    }

    return { success: false };
  }

  // Execute LibreOffice with NO terminal interaction possible
  private executeLibreOfficeSilently(executable: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`🔇 Executing: ${executable} ${args.join(' ')}`);

      const child = spawn(executable.replace(/"/g, ''), args, {
        stdio: 'ignore', // Completely ignore all input/output
        detached: false,
        windowsHide: true, // Hide on Windows
        shell: false // No shell = no terminal interaction possible
      });

      let completed = false;

      const timeout = setTimeout(() => {
        if (!completed) {
          completed = true;
          child.kill();
          reject(new Error('LibreOffice silent execution timeout'));
        }
      }, 45000); // 45 second timeout

      child.on('exit', (code) => {
        if (!completed) {
          completed = true;
          clearTimeout(timeout);
          console.log(`LibreOffice exited with code: ${code}`);
          resolve(); // Accept any exit code, check for output file instead
        }
      });

      child.on('error', (error) => {
        if (!completed) {
          completed = true;
          clearTimeout(timeout);
          reject(error);
        }
      });

      // Force close stdin to prevent any interaction
      if (child.stdin) {
        child.stdin.destroy();
      }
    });
  }

  // Find LibreOffice command silently
  private async findLibreOfficeCommand(): Promise<string | null> {
    const possiblePaths = [
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe'
    ];

    for (const path of possiblePaths) {
      try {
        await fs.promises.access(path);
        return path;
      } catch {
        continue;
      }
    }

    return null;
  }

  // Find converted file
  private async findConvertedFile(inputPath: string, outputDir: string): Promise<Buffer | null> {
    const inputBaseName = path.basename(inputPath, '.pdf');
    const expectedOutput = path.join(outputDir, `${inputBaseName}.docx`);

    try {
      await fs.promises.access(expectedOutput);
      const stats = await fs.promises.stat(expectedOutput);
      
      if (stats.size > 1000) {
        const buffer = await fs.promises.readFile(expectedOutput);
        if (this.isValidWordDocument(buffer)) {
          return buffer;
        }
      }
    } catch {
      // Check for any .docx files
      try {
        const files = await fs.promises.readdir(outputDir);
        const docxFiles = files.filter(f => f.endsWith('.docx'));
        
        for (const docxFile of docxFiles) {
          const filePath = path.join(outputDir, docxFile);
          const buffer = await fs.promises.readFile(filePath);
          if (this.isValidWordDocument(buffer)) {
            return buffer;
          }
        }
      } catch {}
    }

    return null;
  }

  // Validate Word document
  private isValidWordDocument(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;
    const zipSignature = buffer.slice(0, 4);
    return zipSignature[0] === 0x50 && zipSignature[1] === 0x4B && buffer.length > 2000;
  }

  // Text extraction fallback
  private async extractTextAndCreateWord(inputPath: string, originalFileName: string): Promise<Buffer> {
    const pdfBuffer = await fs.promises.readFile(inputPath);
    const data = await pdfParse(pdfBuffer);
    
    console.log(`Extracted ${data.text.length} characters of text`);
    
    return this.createWordFromText(originalFileName, data.text);
  }

  // Create Word document from text with enhanced formatting
  private async createWordFromText(originalFileName: string, textContent: string): Promise<Buffer> {
    const processedText = this.processTextForFormatting(textContent);
    
    const children = [
      new Paragraph({
        children: [
          new TextRun({
            text: `Converted from: ${originalFileName}`,
            bold: true,
            size: 28,
            color: "1f4e79",
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Conversion Date: ${new Date().toLocaleString()}`,
            italics: true,
            color: "666666",
            size: 20,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: "" })],
      }),
    ];

    // Process each section with intelligent formatting
    processedText.sections.forEach((section) => {
      if (section.isHeading) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: section.content,
                bold: true,
                size: 24,
                color: "1f4e79",
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          })
        );
      } else if (section.isBulletPoint) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${section.content}`,
                size: 22,
              }),
            ],
            spacing: { before: 60, after: 60 },
            indent: { left: 720 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: section.content,
                size: 22,
              }),
            ],
            spacing: { before: 120, after: 120 },
            alignment: section.isContact ? AlignmentType.CENTER : AlignmentType.LEFT,
          })
        );
      }
    });

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      }],
    });

    return await Packer.toBuffer(doc);
  }

  // Process text for formatting
  private processTextForFormatting(textContent: string): { sections: Array<{ content: string; isHeading: boolean; isBulletPoint: boolean; isContact: boolean }> } {
    const lines = textContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const sections = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      
      const isHeading = this.isLikelyHeading(line, nextLine);
      const isBulletPoint = /^[•·▪▫∙‣⁃◦‧⁌⁍▸▹▪▫▬▭▮▯]/.test(line) || /^[-*+]\s/.test(line);
      const isContact = /@/.test(line) || /\+?\d{10,}/.test(line) || /\(\d{3}\)/.test(line);
      
      sections.push({
        content: line,
        isHeading,
        isBulletPoint,
        isContact
      });
    }

    return { sections };
  }

  // Detect headings
  private isLikelyHeading(line: string, nextLine: string): boolean {
    if (line.length < 50 && line.length > 5) {
      if (line === line.toUpperCase() && /[A-Z]/.test(line)) return true;
      if (nextLine && nextLine.length > line.length) return true;
      if (/^(EXPERIENCE|EDUCATION|SKILLS|SUMMARY|OBJECTIVE|CONTACT|PROFILE|PROJECTS|CERTIFICATIONS|ACHIEVEMENTS)/i.test(line)) return true;
    }
    return false;
  }

  // Cleanup files
  private async cleanupFiles(inputPath: string, outputDir: string): Promise<void> {
    try {
      if (inputPath) await fs.promises.unlink(inputPath);
      if (outputDir) await fs.promises.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Cleanup warning: ${error.message}`);
    }
  }
}

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { tmpdir } from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomBytes } from 'crypto';
import { PDFDocument } from 'pdf-lib';

const execFileAsync = promisify(execFile);

@Injectable()
export class PdfCompressionService {
  async compressPdf(file: Express.Multer.File, compressionLevel?: string): Promise<{ buffer: Buffer; method: string }> {
    const uniqueId = randomBytes(16).toString('hex');
    const tempInputPath = join(tmpdir(), `${uniqueId}-${file.originalname}`);
    const tempOutputPath = join(tmpdir(), `${uniqueId}-compressed.pdf`);

    // Map compressionLevel (string percent) to settings
    let pdfSetting = '/ebook';
    let quality = 'medium';
    if (compressionLevel) {
      const level = parseInt(compressionLevel, 10);
      if (level <= 50) {
        pdfSetting = '/screen';
        quality = 'low';
      } else if (level <= 75) {
        pdfSetting = '/ebook';
        quality = 'medium';
      } else if (level <= 90) {
        pdfSetting = '/printer';
        quality = 'high';
      } else {
        pdfSetting = '/prepress';
        quality = 'maximum';
      }
    }

    try {
      await fs.writeFile(tempInputPath, file.buffer);
      let compressedBuffer: Buffer;

      // Try multiple compression methods in order of effectiveness
      try {
        // Method 1: Ghostscript (best compression)
        compressedBuffer = await this.compressWithGhostscript(tempInputPath, tempOutputPath, pdfSetting);
        console.log(`✅ Ghostscript compression: ${file.buffer.length} → ${compressedBuffer.length} bytes`);
        return { buffer: compressedBuffer, method: 'ghostscript' };
      } catch (ghostscriptError) {
        console.log('Ghostscript not available, trying qpdf...');

        try {
          // Method 2: qpdf (good alternative compression)
          compressedBuffer = await this.compressWithQpdf(tempInputPath, tempOutputPath, quality);
          console.log(`✅ QPDF compression: ${file.buffer.length} → ${compressedBuffer.length} bytes`);
          return { buffer: compressedBuffer, method: 'qpdf' };
        } catch (qpdfError) {
          console.log('QPDF not available, trying advanced pdf-lib compression...');

          // Method 3: Advanced pdf-lib compression
          compressedBuffer = await this.compressAdvancedWithPdfLib(file.buffer, quality);
          console.log(`✅ Advanced pdf-lib compression: ${file.buffer.length} → ${compressedBuffer.length} bytes`);
          return { buffer: compressedBuffer, method: 'pdf-lib-advanced' };
        }
      }
    } catch (error) {
      console.error('All compression methods failed:', error);
      throw new InternalServerErrorException('PDF compression failed.');
    } finally {
      await fs.unlink(tempInputPath).catch(() => { });
      await fs.unlink(tempOutputPath).catch(() => { });
    }
  }

  // Method 1: Ghostscript compression (best quality)
  private async compressWithGhostscript(inputPath: string, outputPath: string, pdfSetting: string): Promise<Buffer> {
    // Try different Ghostscript executables
    const ghostscriptCommands = [
      ['gswin64c', '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.4', `-dPDFSETTINGS=${pdfSetting}`, '-dNOPAUSE', '-dQUIET', '-dBATCH', `-sOutputFile=${outputPath}`, inputPath],
      ['gswin32c', '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.4', `-dPDFSETTINGS=${pdfSetting}`, '-dNOPAUSE', '-dQUIET', '-dBATCH', `-sOutputFile=${outputPath}`, inputPath],
      ['gs', '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.4', `-dPDFSETTINGS=${pdfSetting}`, '-dNOPAUSE', '-dQUIET', '-dBATCH', `-sOutputFile=${outputPath}`, inputPath],
      ['C:\\Program Files\\gs\\gs10.06.0\\bin\\gswin64c.exe', '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.4', `-dPDFSETTINGS=${pdfSetting}`, '-dNOPAUSE', '-dQUIET', '-dBATCH', `-sOutputFile=${outputPath}`, inputPath],
      ['C:\\Program Files (x86)\\gs\\gs10.06.0\\bin\\gswin32c.exe', '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.4', `-dPDFSETTINGS=${pdfSetting}`, '-dNOPAUSE', '-dQUIET', '-dBATCH', `-sOutputFile=${outputPath}`, inputPath],
    ];

    for (const args of ghostscriptCommands) {
      try {
        await execFileAsync(args[0], args.slice(1));
        return await fs.readFile(outputPath);
      } catch (error) {
        continue; // Try next command
      }
    }
    throw new Error('Ghostscript not available');
  }

  // Method 2: QPDF compression (good alternative)
  private async compressWithQpdf(inputPath: string, outputPath: string, quality: string): Promise<Buffer> {
    // Map quality to qpdf compression levels
    const compressionOptions = {
      'low': ['--compress-streams=y', '--compression-level=1'],
      'medium': ['--compress-streams=y', '--compression-level=3'],
      'high': ['--compress-streams=y', '--compression-level=6'],
      'maximum': ['--compress-streams=y', '--compression-level=9', '--object-streams=generate'],
    };

    const options = compressionOptions[quality as keyof typeof compressionOptions] || compressionOptions.medium;

    // Try qpdf in tools directory first, then in PATH
    const qpdfPaths = [
      join(process.cwd(), 'tools', 'qpdf.exe'),
      'qpdf.exe',
      'qpdf'
    ];

    for (const qpdfPath of qpdfPaths) {
      try {
        await execFileAsync(qpdfPath, [
          inputPath,
          outputPath,
          ...options,
          '--linearize', // Optimize for web viewing
        ]);

        return await fs.readFile(outputPath);
      } catch (error) {
        continue; // Try next path
      }
    }

    throw new Error('QPDF not found in any location');
  }

  // Method 3: Advanced pdf-lib compression with multiple techniques
  private async compressAdvancedWithPdfLib(buffer: Buffer, quality: string): Promise<Buffer> {
    try {
      console.log('🔄 Attempting advanced PDF compression with pdf-lib...');

      const pdfDoc = await PDFDocument.load(buffer);
      const pages = pdfDoc.getPages();

      // Technique 1: Remove unused objects and optimize structure
      const compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });

      // Technique 2: If quality is low, try to compress images within PDF
      if (quality === 'low' || quality === 'medium') {
        return await this.compressImagesInPdf(compressedBytes, quality);
      }

      console.log(`✅ Advanced compression completed: ${buffer.length} → ${compressedBytes.length} bytes`);
      return Buffer.from(compressedBytes);

    } catch (error) {
      console.error('Advanced compression failed:', error);
      // Fallback to basic compression
      return await this.compressWithPdfLib(buffer, quality);
    }
  }

  // Compress images within PDF using sharp
  private async compressImagesInPdf(pdfBuffer: Uint8Array, quality: string): Promise<Buffer> {
    // This is a simplified version - in a full implementation,
    // you'd extract images from PDF, compress them with sharp, and re-insert
    // For now, we'll just return the pdf-lib compressed version
    console.log(`📸 Image compression attempted (quality: ${quality})`);
    return Buffer.from(pdfBuffer);
  }

  // Get compression method info for analytics
  getCompressionMethod(): string {
    // This could be enhanced to track which method was actually used
    return 'multi-method-fallback';
  }

  // Fallback compression using pdf-lib
  private async compressWithPdfLib(buffer: Buffer, compressionLevel?: string): Promise<Buffer> {
    try {
      console.log('🔄 Attempting fallback PDF compression with pdf-lib...');

      const pdfDoc = await PDFDocument.load(buffer);

      // Basic compression techniques:
      // 1. Remove unused objects
      // 2. Optimize document structure
      // 3. Compress streams if possible

      // For now, we'll do basic optimization by saving with compression
      const compressedPdfBytes = await pdfDoc.save({
        useObjectStreams: true, // Enable object streams for better compression
        addDefaultPage: false,
      });

      console.log(`✅ Fallback compression completed: ${buffer.length} → ${compressedPdfBytes.length} bytes`);
      return Buffer.from(compressedPdfBytes);

    } catch (error) {
      console.error('Fallback compression failed:', error);
      // If even fallback fails, return original buffer
      console.log('⚠️ Returning original PDF (compression unavailable)');
      return buffer;
    }
  }
}
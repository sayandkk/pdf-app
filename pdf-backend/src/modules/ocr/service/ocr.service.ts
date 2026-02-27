import { Injectable } from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as pdf2pic from 'pdf2pic';
import * as pdfParse from 'pdf-parse';

interface OcrResult {
  confidence: number;
  text: string;
  language: string;
  pages: number;
}

@Injectable()
export class OcrService {
  async performOcr(file: Express.Multer.File): Promise<OcrResult> {
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}_${file.originalname}`);

    try {
      await fs.promises.writeFile(inputPath, file.buffer);
      console.log(`📁 OCR: Processing file ${file.originalname}, type: ${file.mimetype}`);

      let text = '';
      let confidence = 0;
      let pages = 1;
      const language = 'English';

      if (file.mimetype === 'application/pdf') {
        console.log('📄 OCR: Detected PDF, extracting text...');

        // First try direct text extraction from PDF
        try {
          const pdfData = await pdfParse(file.buffer);
          pages = pdfData.numpages;
          console.log(`📄 OCR: PDF has ${pages} pages`);

          // If PDF has meaningful embedded text, use it
          const trimmedText = pdfData.text.trim();
          const hasMeaningfulText = trimmedText.length > 20 &&
            /[a-zA-Z]{2,}/.test(trimmedText) && // Contains actual words (relaxed)
            trimmedText.split(/\s+/).length > 2; // At least 3 words (relaxed)

          console.log(`📄 OCR: Extracted text length: ${trimmedText.length}, has meaningful text: ${hasMeaningfulText}`);
          if (hasMeaningfulText) {
            console.log('📄 OCR: Found meaningful embedded text in PDF, using direct extraction');
            console.log(`📄 OCR: Sample text: "${trimmedText.substring(0, 100)}..."`);
            text = pdfData.text;
            confidence = 95; // High confidence for embedded text
          } else {
            console.log('📄 OCR: Embedded text is insufficient or not meaningful, converting to image for OCR...');
            console.log(`📄 OCR: Sample extracted text: "${trimmedText.substring(0, 100)}..."`);

            // Try to convert PDF to images for OCR
            let imagePath: string;
            try {
              console.log('🖼️ OCR: Converting PDF to image with pdf2pic...');
              const convert = pdf2pic.fromPath(inputPath, {
                density: 300, // Higher density for better OCR
                saveFilename: `page_${Date.now()}`,
                savePath: tempDir,
                format: 'png',
                width: 2480, // A4 width at 300 DPI
                height: 3508 // A4 height at 300 DPI
              });

              const result = await convert(1) as any;
              imagePath = result.path;
              console.log(`🖼️ OCR: Image created at: ${imagePath}`);

              // Verify image was created and has content
              const stats = await fs.promises.stat(imagePath);
              if (stats.size < 1000) {
                throw new Error('Generated image is too small, likely empty');
              }

              // OCR the image
              console.log('🔍 OCR: Performing OCR on image...');
              const ocrResult = await this.recognizeText(imagePath);
              text = ocrResult.text;
              confidence = ocrResult.confidence;
              console.log(`🔍 OCR: Extracted ${text.length} characters with ${confidence}% confidence`);

              // Cleanup image
              if (fs.existsSync(imagePath)) {
                await fs.promises.unlink(imagePath);
                console.log('🧹 OCR: Cleaned up image file');
              }
            } catch (conversionError) {
              console.error('❌ OCR: PDF to image conversion failed:', conversionError);
              // If pdf2pic fails and we have some text from pdf-parse, use it as fallback
              if (trimmedText.length > 0) {
                console.log('� OCR: Using extracted text as fallback since image conversion failed');
                text = pdfData.text;
                confidence = 50; // Lower confidence since it's not ideal
              } else {
                throw new Error(`PDF processing failed: ${conversionError.message}. No text could be extracted.`);
              }
            }
          }
        } catch (pdfError) {
          console.error('❌ OCR: PDF processing error:', pdfError);
          throw new Error(`PDF processing failed: ${pdfError.message}`);
        }
      } else {
        console.log('🖼️ OCR: Processing image file...');
        // Handle image
        const ocrResult = await this.recognizeText(inputPath);
        text = ocrResult.text;
        confidence = ocrResult.confidence;
        console.log(`🔍 OCR: Extracted ${text.length} characters with ${confidence}% confidence`);
      }

      await fs.promises.unlink(inputPath);
      console.log('✅ OCR: Processing completed');

      // Validate results - allow reasonable text
      const finalText = text.trim();
      if (!finalText || finalText.length === 0) {
        console.warn('⚠️ OCR: No text extracted!');
        throw new Error('No text could be extracted from the file');
      }

      if (finalText.length < 3) {
        console.warn(`⚠️ OCR: Extracted text is too short (${finalText.length} chars): "${finalText}"`);
        throw new Error('Extracted text is too short to be meaningful');
      }

      console.log(`✅ OCR: Final result - ${finalText.length} characters, confidence: ${confidence}%`);

      return {
        confidence: Math.round(confidence * 100) / 100,
        text: finalText,
        language,
        pages
      };
    } catch (error) {
      console.error('❌ OCR: Processing failed:', error);
      if (fs.existsSync(inputPath)) {
        await fs.promises.unlink(inputPath);
      }
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  private async recognizeText(imagePath: string): Promise<{ text: string; confidence: number }> {
    const worker = await createWorker('eng');

    try {
      console.log(`🔍 OCR: Starting Tesseract OCR on: ${imagePath}`);
      const { data: { text, confidence } } = await worker.recognize(imagePath);
      console.log(`🔍 OCR: Tesseract completed - confidence: ${confidence}%, text length: ${text.length}`);
      return { text, confidence };
    } catch (ocrError) {
      console.error('❌ OCR: Tesseract error:', ocrError);
      throw new Error(`OCR recognition failed: ${ocrError.message}`);
    } finally {
      await worker.terminate();
    }
  }
}
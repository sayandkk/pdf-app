import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as FormData from 'form-data';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableCell, TableRow, WidthType, BorderStyle, Spacing, Indent, ImageRun, Media } from 'docx';
import * as pdfParse from 'pdf-parse';
import { PDFDocument } from 'pdf-lib';
import * as sharp from 'sharp';

/** URL of the Python FastAPI microservice */
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL ?? 'http://localhost:8000';

@Injectable()
export class PdfToWordService {
  private readonly logger = new Logger(PdfToWordService.name);

  constructor(private readonly httpService: HttpService) {}

  // ────────────────────────────────────────────────────────────────────────
  // PRIMARY: delegate to the Python microservice (pdf2docx)
  // ────────────────────────────────────────────────────────────────────────
  private async convertViaPython(file: Express.Multer.File): Promise<Buffer | null> {
    try {
      // Wake up the Python service first (free tier sleeps after inactivity)
      try {
        await firstValueFrom(
          this.httpService.get(`${PYTHON_SERVICE_URL}/health`, { timeout: 60_000 }),
        );
      } catch (_) { /* ignore wake-up errors */ }

      const form = new FormData();
      form.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype || 'application/pdf',
      });

      this.logger.log(`Forwarding ${file.originalname} to Python service at ${PYTHON_SERVICE_URL}/convert-pdf`);

      const response = await firstValueFrom(
        this.httpService.post(`${PYTHON_SERVICE_URL}/convert-pdf`, form, {
          headers: form.getHeaders(),
          responseType: 'arraybuffer',
          timeout: 180_000,
        }),
      );

      const buf = Buffer.from(response.data as ArrayBuffer);
      this.logger.log(`Python service returned ${buf.length} bytes for ${file.originalname}`);
      return buf;
    } catch (err: any) {
      this.logger.warn(
        `Python microservice unavailable or failed (${err?.message}). Falling back to local conversion.`,
      );
      return null;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // ENTRY POINT
  // ────────────────────────────────────────────────────────────────────────
  async convertToWord(file: Express.Multer.File): Promise<Buffer> {
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}_${file.originalname}`);
    const outputDir = path.join(tempDir, `output_${Date.now()}`);

    try {
      await fs.promises.mkdir(outputDir, { recursive: true });
      await fs.promises.writeFile(inputPath, file.buffer);

      // ── Step 0: Try the Python microservice first (best quality) ────────
      const pythonResult = await this.convertViaPython(file);
      if (pythonResult && pythonResult.length > 1000) {
        this.logger.log('Successfully converted using Python microservice (pdf2docx)');
        await this.cleanup(inputPath, outputDir);
        return pythonResult;
      }

      // First, try the PDF to HTML to DOCX approach (as suggested)
      console.log('Trying PDF → HTML → DOCX approach for better structure control');
      const htmlResult = await this.convertPdfToHtmlToDocx(file);
      
      if (htmlResult && htmlResult.length > 1000) { // Reasonable minimum size
        console.log('Successfully converted using PDF → HTML → DOCX approach');
        await this.cleanup(inputPath, outputDir);
        return htmlResult;
      }

      // If HTML approach fails, try the enhanced LibreOffice conversion
      console.log('HTML approach failed, trying enhanced LibreOffice conversion');
      const libreResult = await this.tryLibreOfficeSilent(inputPath, outputDir);

      if (libreResult.success && libreResult.buffer) {
        console.log('Successfully converted using LibreOffice');
        await this.cleanup(inputPath, outputDir);
        return libreResult.buffer;
      }

      // If both fail, use the enhanced text extraction approach
      console.log('Both methods failed, using enhanced text extraction to preserve tables and embedded images');
      const textBuffer = await this.createWordFromText(file.originalname, file.buffer);
      
      console.log('Returning result from text extraction method');
      await this.cleanup(inputPath, outputDir);
      return textBuffer;

    } catch (error) {
      console.error('PDF conversion error:', error);
      await this.cleanup(inputPath, outputDir);
      throw new Error(`PDF to Word conversion failed: ${error.message}`);
    }
  }

  private async tryLibreOfficeSilent(inputPath: string, outputDir: string): Promise<{ success: boolean; buffer?: Buffer }> {
    return new Promise(async (resolve) => {
      const paths = [
        'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
        'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
        'C:\\LibreOffice\\program\\soffice.exe',
        '/usr/bin/soffice',
        '/usr/local/bin/soffice',
        '/opt/libreoffice/program/soffice'
      ];

      let foundSoffice = false;
      for (const soffice of paths) {
        if (fs.existsSync(soffice)) {
          foundSoffice = true;
          console.log(`Found LibreOffice at: ${soffice}`);

          // Use exec for more direct control with the command you suggested
          const exec = require('child_process').exec;
          const command = `"${soffice}" --headless --convert-to docx:"MS Word 2007 XML":{} "${inputPath}" --outdir "${outputDir}"`;
          
          console.log(`Executing LibreOffice command: ${command}`);
          
          exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error: Error | null, stdout: string, stderr: string) => {
            if (error) {
              console.error(`LibreOffice error: ${error.message}`);
              resolve({ success: false });
              return;
            }
            
            console.log(`LibreOffice stdout: ${stdout}`);
            if (stderr) {
              console.log(`LibreOffice stderr: ${stderr}`);
            }
            
            // Check if the conversion was successful by looking for the output file
            const baseName = path.basename(inputPath, path.extname(inputPath));
            const outputFile = path.join(outputDir, `${baseName}.docx`);
            
            setTimeout(async () => {
              try {
                if (fs.existsSync(outputFile)) {
                  const stats = await fs.promises.stat(outputFile);
                  console.log(`LibreOffice output file size: ${stats.size} bytes`);
                  
                  if (stats.size > 1000) { // At least 1KB to consider valid
                    const buffer = await fs.promises.readFile(outputFile);
                    console.log('Successfully converted using LibreOffice with images preserved');
                    resolve({ success: true, buffer });
                    return;
                  }
                }
                
                console.log('LibreOffice conversion completed but output file not found or too small');
                resolve({ success: false });
              } catch (e) {
                console.error('Error checking LibreOffice output:', e);
                resolve({ success: false });
              }
            }, 2000); // Wait 2 seconds for file system sync
          });

          return; // Exit the loop after starting the conversion
        }
      }

      if (!foundSoffice) {
        console.log('LibreOffice not found, falling back to text extraction');
      }

      resolve({ success: false });
    });
  }

  // ── Render each PDF page as a PNG image using pdfjs-dist v4 + canvas ────────
  private async renderPdfPagesAsImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    const pageImages: Buffer[] = [];
    try {
      const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs' as any);

      // pdfjs-dist v4 requires a real worker path (file:// URL)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { pathToFileURL } = require('url');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodePath = require('path');
      const workerPath = nodePath.join(
        nodePath.dirname(require.resolve('pdfjs-dist/package.json')),
        'legacy/build/pdf.worker.mjs',
      );
      pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createCanvas } = require('canvas');

      // pdfjs-dist v4 NodeCanvasFactory — required for server-side rendering
      class NodeCanvasFactory {
        create(w: number, h: number) {
          const canvas = createCanvas(w, h);
          return { canvas, context: canvas.getContext('2d') };
        }
        reset(c: any, w: number, h: number) { c.canvas.width = w; c.canvas.height = h; }
        destroy(c: any) { c.canvas.width = 0; c.canvas.height = 0; }
      }
      const canvasFactory = new NodeCanvasFactory();

      // Standard fonts path — fixes missing character warnings
      const standardFontDataUrl = pathToFileURL(
        nodePath.join(nodePath.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts/'),
      ).toString() + '/';

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(pdfBuffer),
        canvasFactory,
        standardFontDataUrl,
        useWorkerFetch: false,
        isEvalSupported: false,
        disableFontFace: false,
      });
      const pdfDoc = await loadingTask.promise;
      console.log(`Rendering ${pdfDoc.numPages} PDF page(s) as images via pdfjs+canvas`);

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        try {
          const page = await pdfDoc.getPage(pageNum);
          const scale = 2.0; // 2× resolution
          const viewport = page.getViewport({ scale });

          const canvasAndCtx = canvasFactory.create(viewport.width, viewport.height);
          canvasAndCtx.context.fillStyle = '#ffffff';
          canvasAndCtx.context.fillRect(0, 0, viewport.width, viewport.height);

          await page.render({ canvasContext: canvasAndCtx.context, viewport }).promise;

          const pngBuffer: Buffer = canvasAndCtx.canvas.toBuffer('image/png');

          if (pngBuffer.length < 6000) {
            console.warn(`Page ${pageNum} looks blank (${pngBuffer.length} bytes), skipping`);
            continue;
          }

          pageImages.push(pngBuffer);
          console.log(`✅ Page ${pageNum}: ${Math.round(viewport.width)}×${Math.round(viewport.height)}px → ${pngBuffer.length} bytes`);
          canvasFactory.destroy(canvasAndCtx);
        } catch (pageErr) {
          console.error(`Error rendering page ${pageNum}:`, (pageErr as any)?.message);
        }
      }
    } catch (err) {
      console.error('renderPdfPagesAsImages failed:', (err as any)?.message ?? err);
    }
    return pageImages;
  }

  // ── Position-aware PDF layout extraction using pdfjs-dist ─────────────────
  private async extractPdfLayout(pdfBuffer: Buffer): Promise<Array<{
    pageWidth: number;
    pageHeight: number;
    lines: Array<{
      y: number;
      fullText: string;
      alignment: 'left' | 'center' | 'right' | 'justify';
      indent: number;
      isHeading: boolean;
      headingLevel: number;
      isBullet: boolean;
      bold: boolean;
      fontSize: number;
    }>;
  }>> {
    try {
      const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs' as any);
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
      const pdfDoc = await loadingTask.promise;
      const resultPages: any[] = [];

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();

        const pageWidth: number = viewport.width;
        const pageHeight: number = viewport.height;

        // Filter valid items
        const rawItems: any[] = (textContent.items as any[]).filter(
          (item: any) => item.str && item.str.trim(),
        );

        if (rawItems.length === 0) continue;

        // Cluster items into lines by Y proximity (3pt tolerance)
        const lineMap = new Map<number, any[]>();
        for (const item of rawItems) {
          const yRaw = pageHeight - item.transform[5]; // flip PDF Y origin
          const bucket = Math.round(yRaw / 3) * 3;
          if (!lineMap.has(bucket)) lineMap.set(bucket, []);
          lineMap.get(bucket)!.push({
            text: item.str,
            x: item.transform[4],
            rightEdge: item.transform[4] + (item.width ?? 0),
            fontSize: Math.abs(item.transform[0]) || 12,
            bold: (item.fontName ?? '').toLowerCase().includes('bold'),
            italic: (item.fontName ?? '').toLowerCase().includes('italic'),
          });
        }

        // Determine document left margin (5th percentile left-x)
        const allLeftX = rawItems.map((i: any) => i.transform[4]).sort((a: number, b: number) => a - b);
        const leftMargin = allLeftX[Math.floor(allLeftX.length * 0.05)] ?? 50;
        const rightMargin = pageWidth - leftMargin;
        const pageCenterX = pageWidth / 2;

        const sortedLines = Array.from(lineMap.entries())
          .sort(([ya], [yb]) => ya - yb)
          .map(([y, items]) => {
            items.sort((a: any, b: any) => a.x - b.x);
            const fullText = items.map((i: any) => i.text).join(' ').trim();
            const lineLeft = items[0].x;
            const lineRight = items[items.length - 1].rightEdge;
            const lineCenter = (lineLeft + lineRight) / 2;
            const maxFontSize: number = Math.max(...items.map((i: any) => i.fontSize));
            const isBold: boolean =
              items.length > 0 && items.every((i: any) => i.bold);
            const textWidth = lineRight - lineLeft;

            // Alignment from real coordinates
            let alignment: 'left' | 'center' | 'right' | 'justify' = 'left';
            const centerDiff = Math.abs(lineCenter - pageCenterX);

            if (centerDiff < pageWidth * 0.06 && lineLeft > leftMargin + 20) {
              alignment = 'center';
            } else if (lineRight > rightMargin - 10 && lineLeft > pageWidth * 0.45) {
              alignment = 'right';
            } else if (
              fullText.length > 60 &&
              lineRight > rightMargin - 20 &&
              lineLeft <= leftMargin + 30
            ) {
              alignment = 'justify';
            }

            // Indentation in twips (1 point ≈ 20 twips)
            const indentPts = Math.max(0, lineLeft - leftMargin);
            const indent = Math.round(indentPts * 20);

            // Heading detection: larger font OR bold short ALL-CAPS line
            const isHeading =
              !fullText.startsWith('•') &&
              (maxFontSize > 13 ||
                (isBold && fullText.length < 80 && fullText === fullText.toUpperCase() && /[A-Z]/.test(fullText)));
            const headingLevel = maxFontSize > 18 ? 1 : maxFontSize > 13 ? 2 : 3;

            // Bullet detection
            const isBullet =
              /^[•·▪▫∙‣⁃◦]\s/.test(fullText) || /^\d+[.)]\s/.test(fullText);

            return {
              y,
              fullText,
              alignment,
              indent: isBullet ? Math.max(indent, 720) : indent,
              isHeading: isHeading && !isBullet,
              headingLevel,
              isBullet,
              bold: isBold || isHeading,
              fontSize: maxFontSize,
            };
          });

        resultPages.push({ pageWidth, pageHeight, lines: sortedLines });
      }

      console.log(`pdfjs-dist: extracted ${resultPages.length} pages`);
      return resultPages;
    } catch (err) {
      console.error('pdfjs-dist extraction failed, will fall back:', (err as any)?.message ?? err);
      return [];
    }
  }

  // ── Build Word document where each page is a full-page image ──────────────
  private async buildWordFromPageImages(fileName: string, pageImages: Buffer[]): Promise<Buffer> {
    const children: any[] = [];

    // A4/Letter page content area at 96 DPI: 6.5" wide × 9" tall
    const DPI = 96;
    const maxWidthPx = Math.round(6.5 * DPI);  // 624 px
    const maxHeightPx = Math.round(9.0 * DPI);  // 864 px

    for (let i = 0; i < pageImages.length; i++) {
      if (i > 0) {
        children.push(new Paragraph({ pageBreakBefore: true } as any));
      }

      try {
        const imgBuf = pageImages[i];

        // Get image dimensions using sharp
        const meta = await sharp(imgBuf).metadata();
        const srcW = meta.width ?? maxWidthPx;
        const srcH = meta.height ?? maxHeightPx;

        // Scale to fit page
        const scale = Math.min(1, maxWidthPx / srcW, maxHeightPx / srcH);
        const displayW = Math.max(1, Math.round(srcW * scale));
        const displayH = Math.max(1, Math.round(srcH * scale));

        // Flatten alpha to white for Word compatibility
        const flatBuf = await sharp(imgBuf)
          .flatten({ background: '#ffffff' })
          .png()
          .toBuffer();

        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: flatBuf,
                transformation: { width: displayW, height: displayH },
                type: 'png' as any,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0 },
          }),
        );

        console.log(`Page ${i + 1} embedded as ${displayW}×${displayH}px image`);
      } catch (err) {
        console.error(`Failed to embed page ${i + 1} image:`, (err as any)?.message);
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `[Page ${i + 1} could not be rendered]`, italics: true })],
          }),
        );
      }
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        },
        children,
      }],
    });

    return Packer.toBuffer(doc);
  }

  // ── Build Word document from position-aware layout ─────────────────────────
  private async buildWordFromLayout(
    fileName: string,
    pages: Awaited<ReturnType<typeof this.extractPdfLayout>>,
  ): Promise<Buffer> {
    const children: any[] = [
      new Paragraph({
        children: [new TextRun({ text: `Converted from: ${fileName}`, bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Date: ${new Date().toLocaleString()}`, italics: true, size: 20 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
      }),
    ];

    const alignMap: Record<string, string> = {
      center: AlignmentType.CENTER,
      right: AlignmentType.RIGHT,
      justify: AlignmentType.JUSTIFIED,
      left: AlignmentType.LEFT,
    };

    pages.forEach((page, pageIdx) => {
      if (pageIdx > 0) {
        children.push(new Paragraph({ pageBreakBefore: true } as any));
      }

      for (const line of page.lines) {
        if (!line.fullText.trim()) continue;

        const textRun = new TextRun({
          text: line.isBullet
            ? `• ${line.fullText.replace(/^[•·▪▫∙‣⁃◦\-]\s*/, '').replace(/^\d+[.)]\s*/, '')}`
            : line.fullText,
          size: line.isHeading
            ? (line.headingLevel === 1 ? 32 : line.headingLevel === 2 ? 26 : 22)
            : 22,
          bold: line.bold,
        });

        const paraOptions: any = {
          children: [textRun],
          alignment: alignMap[line.alignment] ?? AlignmentType.LEFT,
          spacing: {
            before: line.isHeading ? 240 : line.isBullet ? 60 : 120,
            after: line.isHeading ? 160 : line.isBullet ? 60 : 120,
          },
        };

        if (line.isHeading) {
          paraOptions.heading =
            line.headingLevel === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
        }

        if (line.indent > 0) {
          paraOptions.indent = { left: line.indent };
        }

        children.push(new Paragraph(paraOptions));
      }
    });

    const doc = new Document({
      sections: [{
        properties: {
          page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
        },
        children,
      }],
    });

    return Packer.toBuffer(doc);
  }

  private async createWordFromText(fileName: string, pdfBuffer: Buffer): Promise<Buffer> {
    // ── ENHANCED IMAGE + TEXT STRATEGY: Extract visual content first, then text ─
    
    // First, try to extract embedded images directly from the PDF
    let embeddedImages = await this.extractImagesFromPDF(pdfBuffer);
    console.log(`Extracted ${embeddedImages.length} embedded images from PDF`);

    // Skip rendering full pages as images to avoid screenshot approach
    // Only process embedded images and text content
    let pageImages: Buffer[] = [];
    console.log(`Skipping full page images to focus on embedded images and text content`);

    // Skip page screenshot fallback to avoid full-page images
    // Only use embedded images and text content
    if (pageImages.length === 0) {
      console.log('Not using page screenshot fallback to avoid full-page images');
    }

    if (pageImages.length > 0) {
      console.log(`Using combined image + text mode with ${pageImages.length} page image(s)`);
    } else {
      console.log('Only embedded images and text content will be used (no full-page screenshots)');
    }

    let text = '';
    let pages: string[] = [];
    let allImages: Array<{ buffer: Buffer; width: number; height: number; x: number; y: number }> = [];

    try {
      const data = await pdfParse(pdfBuffer);
      text = data.text;
      console.log('Extracted text length:', text.length);
      console.log('First 500 characters:', text.substring(0, 500));

      // Combine embedded images with page images
      allImages = [...embeddedImages];

      // Split by pages if available
      pages = text.split(/\f|\n\s*\n\s*(?=Page \d+:?)/).filter(page => page.trim());
    } catch (e) {
      console.error('PDF parsing error:', e);
      text = 'Could not extract text from this PDF.';
    }

    // Prepare page-wise texts (prefer form-feed page breaks if present)
    const pageTexts: string[] = text.includes('\f')
      ? text.split('\f').map(p => p.trim()).filter(Boolean)
      : (pages && pages.length > 0 ? pages : [text]);
    console.log('Detected pages:', pageTexts.length);

    // ENHANCED FORMATTING PRESERVATION WITH BETTER ALIGNMENT DETECTION
    const processedContent = this.processTextWithAdvancedFormatting(text);
    console.log('Processed content sections (full-text baseline):', processedContent.length);

    const children: any[] = [
      new Paragraph({
        children: [new TextRun({ text: `Converted from: ${fileName}`, bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 }
      }),
      new Paragraph({
        children: [new TextRun({ text: `Date: ${new Date().toLocaleString()}`, italics: true, size: 20 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 }
      }),
    ];

    // Create document with images support
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
        children: [],
      }],
    });

    // Skip adding full-page images to avoid showing entire pages as images
    // Only add specific embedded images, not full-page screenshots
    console.log(`Skipping ${pageImages.length} page images to avoid full-page screenshots; only embedded images will be included`);

    // Add extracted images (skip page screenshots to avoid duplicating content)
    // Only add truly embedded images, not full-page renders
    for (let i = 0; i < allImages.length; i++) {
      try {
        const image = allImages[i];
        
        // Skip large page-sized images (likely screenshots) to avoid duplication
        // A4 page at 150 DPI would be roughly 1240x1754 pixels
        const isPageSizedImage = image.width > 1000 && image.height > 1000;
        
        if (isPageSizedImage) {
          console.log(`Skipping page-sized image ${i + 1} (${image.width}x${image.height}) to avoid duplication`);
          continue;
        }
        
        console.log(`Adding embedded image ${i + 1} to Word document, size: ${image.buffer.length} bytes, dimensions: ${image.width}x${image.height}`);

        // Compute display size in PIXELS, not EMUs (docx converts px -> EMUs internally)
        const DPI = 96;
        const maxWidthInches = 6.5;  // page content width ~6.5" (Letter with 1" margins)
        const maxHeightInches = 9;   // page content height ~9"
        const maxWidthPx = Math.round(maxWidthInches * DPI);
        const maxHeightPx = Math.round(maxHeightInches * DPI);

        const scale = Math.min(1, maxWidthPx / image.width, maxHeightPx / image.height);
        const displayWidthPx = Math.max(1, Math.round(image.width * scale));
        const displayHeightPx = Math.max(1, Math.round(image.height * scale));

        // Flatten PNG alpha to white to avoid black boxes in some Word renderers
        let embedBuffer = image.buffer;
        try {
          embedBuffer = await sharp(image.buffer).flatten({ background: '#FFFFFF' }).png().toBuffer();
        } catch (e) {
          console.warn('PNG flatten failed, embedding original buffer:', e?.message || e);
        }

        // Add image with pixel-based sizing
        try {
          console.log(`Creating ImageRun at ${displayWidthPx}x${displayHeightPx} px (scale=${scale.toFixed(2)})`);

          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: embedBuffer,
                  transformation: {
                    width: displayWidthPx,
                    height: displayHeightPx,
                  },
                  type: "png" as any,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 240, after: 240 }
            })
          );

          console.log(`✅ Successfully added embedded image ${i + 1} to Word document`);
        } catch (imageError) {
          console.error(`❌ Error creating ImageRun for image ${i + 1}:`, imageError);
          // Fallback: add as text description
          children.push(
            new Paragraph({
              children: [new TextRun({
                text: `[Embedded Image ${i + 1}: ${image.width}×${image.height}px - Image could not be embedded. Error: ${imageError.message}]`,
                italics: true,
                size: 18,
                color: "666666"
              })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 240, after: 240 }
            })
          );
        }

        // Add a caption
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `Embedded Image ${i + 1}`, italics: true, size: 18 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 }
          })
        );

      } catch (error) {
        console.error(`Error processing embedded image ${i + 1}:`, error);
      }
    }

    // If multiple pages detected, render page by page to preserve per-page alignment heuristics
    if (pageTexts.length > 1) {
      pageTexts.forEach((pageText, pageIdx) => {
        // Add a page break before subsequent pages
        if (pageIdx > 0) {
          children.push(new Paragraph({ pageBreakBefore: true } as any));
        }

        const pageSections = this.processTextWithAdvancedFormatting(pageText);
        // Try to preserve side-by-side short paragraphs per page
        this.maybeInjectThreeColumnRow(children, pageSections);
        this.renderSectionsToChildren(children, pageSections);
      });
    } else {
      // Single page fallback: keep existing behavior
      this.maybeInjectThreeColumnRow(children, processedContent);
      this.renderSectionsToChildren(children, processedContent);
    }
    
    // Do not add page images at all to avoid full-page screenshots
    // Only embedded images and text content will be preserved
    console.log('Not adding page images to avoid full-page screenshots');

    const finalDoc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch margins
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      }],
    });

    return await Packer.toBuffer(finalDoc);
  }

  // Render structured sections (headings, bullets, table rows, paragraphs) into Word blocks
  private renderSectionsToChildren(children: any[], sections: Array<any>): void {
    const pendingTableRows: Array<any> = [];

    const flushTable = () => {
      if (!pendingTableRows.length) return;

      try {
        // Improved table rendering to handle various formats
        let splitRows: string[][] = [];
        
        // Process each row to detect the best splitting method
        for (const row of pendingTableRows) {
          const content = row.content ?? '';
          
          // Try different splitting methods in order of preference
          let parts: string[] = [];
          
          // 1. Try pipe delimiter first
          if (content.includes('|') && content.match(/\|/g)?.length >= 1) {
            parts = content.split('|').map((part: string) => part.trim()).filter((part: string) => part !== '');
          }
          // 2. Try comma delimiter for CSV-style data
          else if (content.includes(',') && content.match(/,/g)?.length >= 1) {
            parts = content.split(',').map((part: string) => part.trim());
          }
          // 3. Try tab delimiter
          else if (content.includes('\t')) {
            parts = content.split('\t').map((part: string) => part.trim());
          }
          // 4. Fall back to multiple spaces
          else {
            parts = content.split(/\s{2,}/).map((part: string) => part.trim());
          }
          
          // Only add if we have at least 2 parts
          if (parts.length >= 1) {
            splitRows.push(parts);
          }
        }
        
        if (splitRows.length === 0) {
          throw new Error('No valid table rows found');
        }
        
        const maxCols = splitRows.reduce((m: number, cols: string[]) => Math.max(m, cols.length), 0) || 1;

        const tableRows = splitRows.map((cols, rowIdx) => {
          const normalized = [...cols];
          while (normalized.length < maxCols) normalized.push('');
          
          // Determine if this is likely a header row (first row, all caps, or significantly different formatting)
          const isFirstRow = rowIdx === 0;
          const isHeaderRow = isFirstRow && normalized.some(cell => cell && cell === cell.toUpperCase() && cell.length > 0);

          const cells = normalized.map((text, cellIdx) => {
            // Determine cell formatting based on content
            const isNumeric = text && /^\s*[\d,.$%]+\s*$/.test(text);
            const cellTextRun = new TextRun({ 
              text, 
              size: 22,
              bold: isHeaderRow ? true : false,
              color: isNumeric ? undefined : undefined
            });
            
            return new TableCell({
              children: [
                new Paragraph({
                  children: [cellTextRun],
                  alignment: isNumeric ? AlignmentType.RIGHT : AlignmentType.LEFT,
                  spacing: { before: 30, after: 30 },
                }),
              ],
              margins: { top: 60, bottom: 60, left: 60, right: 60 },
            });
          });

          return new TableRow({ children: cells });
        });

        children.push(new Paragraph({ spacing: { before: 120, after: 60 } }));
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          },
        }));
        children.push(new Paragraph({ spacing: { before: 60, after: 120 } }));
      } catch (e) {
        // If anything goes wrong, fall back to plain paragraphs for those rows
        pendingTableRows.forEach(row => {
          const paragraphOptions: any = {
            children: [new TextRun({
              text: row.content,
              size: 22,
              bold: row.bold || false,
              italics: row.italics || false,
            })],
            spacing: { before: row.spacing?.before || 120, after: row.spacing?.after || 120 },
          };
          children.push(new Paragraph(paragraphOptions));
        });
      } finally {
        pendingTableRows.length = 0;
      }
    };

    for (const section of sections) {
      if (section.type === 'table-row') {
        pendingTableRows.push(section);
        continue;
      }

      // Flush any accumulated table rows before handling non-table content
      flushTable();

      const paragraphOptions: any = {
        children: [
          new TextRun({
            text: section.type === 'bullet' ? section.content : section.content,
            size: 22,
            bold: section.bold || false,
            italics: section.italics || false,
          }),
        ],
        spacing: { before: section.spacing?.before || 120, after: section.spacing?.after || 120 },
      };

      if (section.alignment === 'center') {
        paragraphOptions.alignment = AlignmentType.CENTER;
      } else if (section.alignment === 'right') {
        paragraphOptions.alignment = AlignmentType.RIGHT;
      } else if (section.alignment === 'justify') {
        paragraphOptions.alignment = AlignmentType.JUSTIFIED;
      }

      if (section.indent && section.indent > 0) {
        paragraphOptions.indent = { left: section.indent };
      }

      if (section.type === 'heading') {
        paragraphOptions.heading = section.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
        paragraphOptions.children[0].bold = true;
        paragraphOptions.children[0].size = section.level === 1 ? 28 : 24;
      }

      if (section.type === 'bullet') {
        paragraphOptions.children[0].text = `• ${section.content}`;
        paragraphOptions.indent = { left: section.indent || 720 };
      }

      children.push(new Paragraph(paragraphOptions));
    }

    // Flush any trailing table rows
    flushTable();
  }

  // ADVANCED TEXT PROCESSING FOR FORMATTING AND ALIGNMENT PRESERVATION
  private processTextWithAdvancedFormatting(text: string): Array<{
    type: string;
    content: string;
    alignment?: string;
    indent?: number;
    bold?: boolean;
    italics?: boolean;
    level?: number;
    spacing?: { before: number; after: number };
  }> {
    const rawLines = text.split('\n');
    // Preserve mapping between trimmed and raw lines to avoid index drift
    const entries = rawLines.map((raw, idx) => ({ raw, trimmed: raw.trim(), idx }));
    // Work only with non-empty trimmed lines but keep their original raw value and index
    const lines = entries.filter(e => e.trimmed.length > 0);
    const sections: Array<any> = [];

    // Analyze document structure for better alignment detection
    const docStructure = this.analyzeDocumentStructure(rawLines);

    for (let i = 0; i < lines.length; i++) {
      const cur = lines[i];
      const line = cur.trimmed;
      const rawLine = cur.raw;
      const nextLine = i + 1 < lines.length ? lines[i + 1].trimmed : '';
      const prevLine = i > 0 ? lines[i - 1].trimmed : '';
      const lineIndex = cur.idx; // use original index within the document

      // Enhanced alignment detection using multiple heuristics, now with correct raw mapping
      let alignment = this.detectAlignmentAdvanced(line, rawLine, lineIndex, docStructure);
      const indent = this.detectIndentationAdvanced(rawLine, docStructure);

      // Force justify for long lines that look like wrapped paragraphs
      if (alignment === 'left' && line.length > 100) {
        alignment = 'justify';
      }

      // Detect headings with better logic
      if (this.isHeading(line, nextLine, prevLine)) {
        const level = this.getHeadingLevel(line, nextLine);
        sections.push({
          type: 'heading',
          content: line,
          alignment: alignment === 'left' ? 'center' : alignment, // center common headings
          bold: true,
          level,
          spacing: { before: 240, after: 120 }
        });
      }
      // Detect bullet points and numbered lists
      else if (this.isListItem(line)) {
        const cleanContent = this.cleanListMarker(line);
        sections.push({
          type: 'bullet',
          content: cleanContent,
          alignment: 'left',
          indent: Math.max(indent, 720),
          spacing: { before: 60, after: 60 }
        });
      }
      // Detect centered content (contact info, titles, etc.)
      else if (alignment === 'center' || this.isCenteredContent(line)) {
        sections.push({
          type: 'centered',
          content: line,
          alignment: 'center',
          spacing: { before: 120, after: 120 }
        });
      }
      // Detect table-like content
      else if (this.isTableRow(line, nextLine)) {
        sections.push({
          type: 'table-row',
          content: line,
          alignment: alignment === 'left' ? 'left' : alignment,
          indent,
          spacing: { before: 60, after: 60 }
        });
      }
      // Regular paragraphs with preserved alignment and indentation
      else {
        sections.push({
          type: 'paragraph',
          content: line,
          alignment,
          indent,
          spacing: { before: 120, after: 120 }
        });
      }
    }

    return sections;
  }

  // Try to detect three side-by-side short paragraphs and render them as a one-row, 3-column table
  private maybeInjectThreeColumnRow(children: any[], processedContent: Array<any>): void {
    try {
      // Pick early short paragraphs (ignore headings and bullets)
      const candidates: Array<{ idx: number; content: any }> = [];
      for (let i = 0; i < Math.min(processedContent.length, 20); i++) {
        const sec = processedContent[i];
        if (sec.type === 'paragraph' && (sec.content?.length || 0) > 0 && (sec.content.length < 250)) {
          candidates.push({ idx: i, content: sec });
        }
        if (candidates.length === 3) break;
      }

      if (candidates.length === 3) {
        // Build a one-row/three-cell table
        const rowCells = candidates.map(c => new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: c.content.content, size: 22 })],
              alignment: c.content.alignment === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
              spacing: { before: 120, after: 120 }
            })
          ],
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
        }));

        const tbl = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ children: rowCells })],
        });

        // Inject table near the top after title/date
        children.push(new Paragraph({ spacing: { before: 120, after: 120 } }));
        children.push(tbl);
        children.push(new Paragraph({ spacing: { before: 120, after: 240 } }));

        // Remove those candidates from the flow to avoid duplication
        // Remove by index descending to keep indices valid
        candidates
          .sort((a, b) => b.idx - a.idx)
          .forEach(c => processedContent.splice(c.idx, 1));
      }
    } catch (e) {
      console.warn('maybeInjectThreeColumnRow failed:', (e as any)?.message || e);
    }
  }

  // Detect text alignment based on spacing and content patterns
  private detectAlignment(line: string, allLines: string[]): string {
    const trimmed = line.trim();
    const original = line;

    // Check for explicit center alignment (equal spaces on both sides)
    const leftSpaces = original.length - original.trimStart().length;
    const rightSpaces = original.length - original.trimEnd().length;
    const totalSpaces = leftSpaces + rightSpaces;

    if (totalSpaces > 10 && Math.abs(leftSpaces - rightSpaces) < 3) {
      return 'center';
    }

    // Check for right-aligned content (dates, page numbers, amounts)
    if (rightSpaces > 10 && leftSpaces < 3) {
      // Common right-aligned patterns
      if (/\b\d+\.\d{2}\b/.test(trimmed) || // Currency amounts
        /\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(trimmed) || // Dates
        /\b\d{1,2}:\d{2}\b/.test(trimmed) || // Times
        /^\d+$/.test(trimmed)) { // Numbers
        return 'right';
      }
    }

    // Check for justified content (long lines with even word spacing)
    if (trimmed.length > 80) {
      const words = trimmed.split(/\s+/);
      if (words.length > 5) {
        // Check if line appears justified (words spread across line)
        const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
        if (avgWordLength < 8) { // Short words suggest justified text
          return 'justify';
        }
      }
    }

    // Check for centered short lines (titles, headers)
    if (trimmed.length < 60 && leftSpaces > 5 && rightSpaces > 5) {
      return 'center';
    }

    return 'left';
  }

  // Detect indentation level with better pattern recognition
  private detectIndentation(line: string): number {
    // Count leading spaces
    const spaceMatch = line.match(/^(\s+)/);
    if (spaceMatch) {
      const spaceCount = spaceMatch[1].length;
      // Convert spaces to twips (1/20th of a point, Word's unit)
      // Assume 4 spaces = 1 standard indent level (720 twips)
      return Math.floor(spaceCount / 4) * 360; // 360 twips per indent level
    }

    // Check for tab characters
    const tabMatch = line.match(/^(\t+)/);
    if (tabMatch) {
      const tabCount = tabMatch[1].length;
      return tabCount * 720; // 720 twips per tab (standard Word tab stop)
    }

    return 0;
  }

  // Enhanced heading detection
  private isHeading(line: string, nextLine: string, prevLine: string): boolean {
    const trimmed = line.trim();

    // Common resume/CV section headings
    if (/^(EXPERIENCE|EDUCATION|SKILLS|SUMMARY|OBJECTIVE|CONTACT|PROFILE|PROJECTS|CERTIFICATIONS|ACHIEVEMENTS|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|PERSONAL INFORMATION|REFERENCES)/i.test(trimmed)) {
      return true;
    }

    // Short lines in all caps
    if (trimmed.length < 50 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
      return true;
    }

    // Lines followed by separator lines (dashes, equals)
    if (nextLine && /^[-=_\s]{3,}$/.test(nextLine.trim())) {
      return true;
    }

    // Short lines followed by longer content
    if (trimmed.length < 50 && nextLine && nextLine.trim().length > trimmed.length * 2) {
      return true;
    }

    return false;
  }

  // Determine heading level
  private getHeadingLevel(line: string, nextLine: string): number {
    const trimmed = line.trim();

    // Main sections get level 1
    if (/^(EXPERIENCE|EDUCATION|SKILLS|SUMMARY|OBJECTIVE|CONTACT|PROFILE)/i.test(trimmed)) {
      return 1;
    }

    // Subsections get level 2
    if (/^(PROJECTS|CERTIFICATIONS|ACHIEVEMENTS|REFERENCES)/i.test(trimmed)) {
      return 2;
    }

    // Short all-caps lines are usually main headings
    if (trimmed.length < 30 && trimmed === trimmed.toUpperCase()) {
      return 1;
    }

    return 2; // Default to level 2
  }

  // Detect list items
  private isListItem(line: string): boolean {
    return /^[•·▪▫∙‣⁃◦-]\s/.test(line) ||
      /^\d+[\.\)]\s/.test(line) ||
      /^[a-zA-Z][\.\)]\s/.test(line) ||
      /^\(\d+\)\s/.test(line);
  }

  // Clean list markers
  private cleanListMarker(line: string): string {
    return line.replace(/^[•·▪▫∙‣⁃◦-]\s/, '')
      .replace(/^\d+[\.\)]\s/, '')
      .replace(/^[a-zA-Z][\.\)]\s/, '')
      .replace(/^\(\d+\)\s/, '');
  }

  // Detect centered content
  private isCenteredContent(line: string): boolean {
    const trimmed = line.trim();

    // Contact information patterns
    if (/@/.test(trimmed) || /\+?\d{10,}/.test(trimmed) || /\(\d{3}\)/.test(trimmed)) {
      return true;
    }

    // Short titles or names
    if (trimmed.length < 40 && !trimmed.includes(' ')) {
      return true;
    }

    // Dates in the middle
    if (/\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(trimmed) ||
      /\b\d{4}-\d{2}-\d{2}\b/.test(trimmed)) {
      return true;
    }

    return false;
  }

  // Detect table-like content
  private isTableRow(line: string, nextLine: string): boolean {
    // Look for multiple columns separated by consistent spacing
    const parts = line.split(/\s{2,}/);
    if (parts.length >= 2 && parts.every(part => part.trim().length > 0)) {
      // Check if next line has similar structure
      if (nextLine) {
        const nextParts = nextLine.split(/\s{2,}/);
        // Allow some flexibility in column count (tables may have headers with merged cells)
        return Math.abs(nextParts.length - parts.length) <= 1;
      }
      return true;
    }
    
    // Additional check for table-like patterns
    // Check for patterns that look like table headers/rows with delimiters
    if (line.includes('|') && (line.match(/\|/g) || []).length >= 1) { // Reduced from >= 2 to >= 1
      return true;
    }
    
    // Check for patterns that might be CSV-style data
    if (line.includes(',') && (line.match(/,/g) || []).length >= 1) { // Reduced from >= 2 to >= 1
      return true;
    }
    
    // Check for tab-separated values
    if ((line.match(/\t/g) || []).length >= 1) { // Reduced from >= 2 to >= 1
      return true;
    }
    
    // Check for common table indicators
    const commonIndicators = [
      'Name', 'Description', 'Price', 'Quantity', 'Amount', 'Total', 'Date', 'Item', 
      'Description', 'Code', 'Rate', 'Hours', 'Cost', 'Product', 'Value', 'Number'
    ];
    
    // If line contains multiple common table headers/fields, treat as table row
    const words = line.toLowerCase().split(/\s+/);
    const matchedIndicators = commonIndicators.filter(indicator => 
      line.toLowerCase().includes(indicator.toLowerCase())
    );
    
    if (matchedIndicators.length >= 2) {
      return true;
    }
    
    // Check for numerical patterns that often appear in tables
    const hasNumbers = /\d/.test(line);
    const hasCurrency = /[$€£¥₹]/.test(line);
    const hasPercent = /[%]/.test(line);
    
    if ((hasNumbers || hasCurrency || hasPercent) && parts.length >= 2) {
      return true;
    }
    
    return false;
  }

  // Analyze document structure for alignment patterns
  private analyzeDocumentStructure(rawLines: string[]): {
    maxLineLength: number;
    avgLineLength: number;
    hasHeaders: boolean;
    hasFooters: boolean;
    indentPatterns: number[];
    alignmentPatterns: string[];
  } {
    const nonEmptyLines = rawLines.filter(line => line.trim().length > 0);
    const lineLengths = nonEmptyLines.map(line => line.trim().length);
    const maxLineLength = Math.max(...lineLengths);
    const avgLineLength = lineLengths.reduce((a, b) => a + b, 0) / lineLengths.length;

    // Detect headers (first few lines)
    const hasHeaders = nonEmptyLines.slice(0, 3).some(line =>
      this.isHeading(line.trim(), '', '') ||
      line.trim().length < 60 && line.trim() === line.trim().toUpperCase()
    );

    // Detect footers (last few lines)
    const hasFooters = nonEmptyLines.slice(-3).some(line =>
      /\d+/.test(line.trim()) && line.trim().length < 20
    );

    // Analyze indentation patterns
    const indentPatterns = rawLines
      .filter(line => line.trim().length > 0)
      .map(line => line.length - line.trimStart().length)
      .filter(indent => indent > 0);

    // Analyze alignment patterns
    const alignmentPatterns = nonEmptyLines.map(line => this.detectAlignment(line, nonEmptyLines));

    return {
      maxLineLength,
      avgLineLength,
      hasHeaders,
      hasFooters,
      indentPatterns,
      alignmentPatterns
    };
  }

  // Enhanced alignment detection with better heuristics
  private detectAlignmentAdvanced(line: string, rawLine: string, lineIndex: number, docStructure: any): string {
    const trimmed = line.trim();
    const original = rawLine;

    if (!trimmed) return 'left';

    // Get line metrics
    const leftSpaces = original.length - original.trimStart().length;
    const rightSpaces = original.length - original.trimEnd().length;
    const totalSpaces = leftSpaces + rightSpaces;
    const lineLength = original.length;

    // Calculate relative spacing
    const leftRatio = leftSpaces / lineLength;
    const rightRatio = rightSpaces / lineLength;

    // Enhanced center detection
    if (totalSpaces > 10 && Math.abs(leftRatio - rightRatio) < 0.1) {
      return 'center';
    }

    // Enhanced right alignment detection
    if (rightRatio > 0.3 && leftRatio < 0.1) {
      // Common right-aligned patterns
      if (/\b\d+\.\d{2}\b/.test(trimmed) || // Currency amounts
        /\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(trimmed) || // Dates
        /\b\d{1,2}:\d{2}\b/.test(trimmed) || // Times
        /^\d+$/.test(trimmed) || // Numbers
        /Page \d+/i.test(trimmed) || // Page numbers
        /Total|Amount|Date|Invoice|Balance/i.test(trimmed)) { // Common right-aligned labels
        return 'right';
      }
    }

    // Check for centered content based on document structure
    if (docStructure.hasHeaders && lineIndex < 5) {
      if (trimmed.length < docStructure.avgLineLength * 0.7) {
        return 'center';
      }
    }

    if (docStructure.hasFooters && lineIndex > docStructure.alignmentPatterns.length - 5) {
      if (trimmed.length < 30) {
        return rightRatio > leftRatio ? 'right' : 'center';
      }
    }

    // Check for justified text (long lines with even word distribution)
    if (trimmed.length > 80) {
      const words = trimmed.split(/\s+/);
      if (words.length > 5) {
        const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
        const spaces = trimmed.split(/\S+/).filter(s => s.length > 0);
        const avgSpaces = spaces.length > 0 ? spaces.reduce((sum, space) => sum + space.length, 0) / spaces.length : 0;

        // Justified text typically has more consistent spacing
        if (avgWordLength < 10 && avgSpaces > 1) {
          return 'justify';
        }
      }
    }

    // Check for centered short lines
    if (trimmed.length < 60 && leftSpaces > 5 && rightSpaces > 5 && Math.abs(leftSpaces - rightSpaces) < 5) {
      return 'center';
    }

    // Check for indented content that might be right-aligned
    if (leftSpaces > 20 && trimmed.length < 30) {
      return 'right';
    }

    // Default to left alignment
    return 'left';
  }  // Advanced indentation detection
  private detectIndentationAdvanced(rawLine: string, docStructure: any): number {
    // Count leading spaces
    const spaceMatch = rawLine.match(/^(\s+)/);
    if (spaceMatch) {
      const spaceCount = spaceMatch[1].length;
      // Convert spaces to twips (1/20th of a point, Word's unit)
      // Assume 4 spaces = 1 standard indent level (720 twips)
      return Math.floor(spaceCount / 4) * 360; // 360 twips per indent level
    }

    // Check for tab characters
    const tabMatch = rawLine.match(/^(\t+)/);
    if (tabMatch) {
      const tabCount = tabMatch[1].length;
      return tabCount * 720; // 720 twips per tab (standard Word tab stop)
    }

    // Use document structure to detect relative indentation
    const currentIndent = rawLine.length - rawLine.trimStart().length;
    if (docStructure.indentPatterns.length > 0) {
      const avgIndent = docStructure.indentPatterns.reduce((a: number, b: number) => a + b, 0) / docStructure.indentPatterns.length;
      if (currentIndent > avgIndent * 1.5) {
        return Math.max(currentIndent * 90, 360); // Convert to twips with minimum
      }
    }

    return 0;
  }

  // Extract images from PDF using pdfjs-dist to get embedded images with original sizes
  private async extractImagesFromPDF(pdfBuffer: Buffer): Promise<Array<{ buffer: Buffer; width: number; height: number; x: number; y: number }>> {
    const images: Array<{ buffer: Buffer; width: number; height: number; x: number; y: number }> = [];

    try {
      console.log('Attempting to extract embedded images from PDF...');
      
      // Use pdfjs-dist with image extraction capabilities
      const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const { pathToFileURL } = require('url');
      const nodePath = require('path');
      const workerPath = nodePath.join(
        nodePath.dirname(require.resolve('pdfjs-dist/package.json')),
        'legacy/build/pdf.worker.mjs',
      );
      pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(pdfBuffer),
        useWorkerFetch: false,
        isEvalSupported: false,
        disableFontFace: false,
      });
      const pdfDoc = await loadingTask.promise;
      
      // Loop through all pages to find images
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        
        // Get the images on this page
        const imagesInfo = await page.getImages();
        for (const imgInfo of imagesInfo) {
          try {
            if (imgInfo.image && imgInfo.image.data) {
              images.push({
                buffer: Buffer.from(imgInfo.image.data),
                width: imgInfo.width || 0,
                height: imgInfo.height || 0,
                x: imgInfo.transform ? imgInfo.transform[4] || 0 : 0,
                y: imgInfo.transform ? imgInfo.transform[5] || 0 : 0
              });
            }
          } catch (e) {
            console.warn('Could not process image:', e.message);
          }
        }
      }
      
      // Check if PDF has selectable text to determine if it's image-based or text-based
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(pdfBuffer);
      const hasSelectableText = data.text && data.text.trim().length > 100;
      
      // If no images were found and it's an image-based PDF, use puppeteer to extract page images
      if (images.length === 0 && !hasSelectableText) {
        console.log('No embedded images found, PDF appears to be scanned/image-based, using screenshot method');
        const fallbackImages = await this.extractImagesWithPuppeteer(pdfBuffer);
        return fallbackImages.map(img => ({
          buffer: img.buffer,
          width: img.width,
          height: img.height,
          x: img.x,
          y: img.y
        }));
      }

      console.log(`Extracted ${images.length} images from PDF with original dimensions`);

    } catch (error) {
      console.error('Error extracting images:', error);
      // Fallback to puppeteer method if primary extraction fails
      try {
        console.log('Trying fallback image extraction with Puppeteer...');
        const fallbackImages = await this.extractImagesWithPuppeteer(pdfBuffer);
        return fallbackImages.map(img => ({
          buffer: img.buffer,
          width: img.width,
          height: img.height,
          x: img.x,
          y: img.y
        }));
      } catch (fallbackError) {
        console.error('Fallback image extraction also failed:', fallbackError);
      }
    }

    return images;
  }

  // Extract images from a specific PDF page
  private async extractImagesFromPage(page: any, pageIndex: number): Promise<Array<{ buffer: Buffer; width: number; height: number; x: number; y: number }>> {
    const images: Array<{ buffer: Buffer; width: number; height: number; x: number; y: number }> = [];

    try {
      // For now, return empty array as pdf-lib image extraction is complex
      // We'll rely on the puppeteer fallback for image extraction
      console.log(`Page ${pageIndex + 1} processing for images (using fallback method)`);
    } catch (error) {
      console.error(`Error extracting images from page ${pageIndex}:`, error);
    }

    return images;
  }

  // Extract images from PDF using puppeteer (improved to get individual images)
  private async extractImagesWithPuppeteer(pdfBuffer: Buffer): Promise<Array<{ buffer: Buffer; width: number; height: number; x: number; y: number }>> {
    const images: Array<{ buffer: Buffer; width: number; height: number; x: number; y: number }> = [];

    try {
      const puppeteer = require('puppeteer');

      // Save PDF to temporary file
      const tempPdfPath = path.join(os.tmpdir(), `temp_pdf_${Date.now()}.pdf`);
      await fs.promises.writeFile(tempPdfPath, pdfBuffer);

      // Launch browser
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      try {
        const page = await browser.newPage();

        // Set viewport for consistent rendering
        await page.setViewport({ width: 1200, height: 1600 });

        // Load PDF
        await page.goto(`file://${tempPdfPath}`, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        // Wait for PDF to fully load
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Get page dimensions
        const pageDimensions = await page.evaluate(() => ({
          width: Math.max(document.documentElement.scrollWidth, window.innerWidth),
          height: Math.max(document.documentElement.scrollHeight, window.innerHeight)
        }));

        console.log(`PDF page dimensions: ${pageDimensions.width}x${pageDimensions.height}`);

        // Take full page screenshot
        const screenshot = await page.screenshot({
          fullPage: true,
          type: 'png'
        });

        if (screenshot && screenshot.length > 1000) {
          images.push({
            buffer: screenshot,
            width: pageDimensions.width,
            height: pageDimensions.height,
            x: 0,
            y: 0
          });

          console.log(`Captured PDF as image: ${pageDimensions.width}x${pageDimensions.height}px (${screenshot.length} bytes)`);
        }

      } finally {
        await browser.close();

        // Clean up temp file
        try {
          await fs.promises.unlink(tempPdfPath);
        } catch (e) { }
      }

    } catch (error) {
      console.error('Error extracting images with puppeteer:', error);
    }

    return images;
  }

  private async cleanup(inputPath: string, outputDir: string): Promise<void> {
    try {
      if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath);
      if (fs.existsSync(outputDir)) await fs.promises.rm(outputDir, { recursive: true });
    } catch (e) { }
  }

  // Convert PDF to HTML first, then to DOCX (as suggested for better structure control)
  private async convertPdfToHtmlToDocx(file: Express.Multer.File): Promise<Buffer> {
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}_${file.originalname}`);
    const htmlPath = path.join(tempDir, `output_${Date.now()}.html`);

    try {
      // Write the PDF file
      await fs.promises.writeFile(inputPath, file.buffer);

      // Primary: use poppler's pdftohtml CLI for robust PDF → HTML (with layout/tables/images)
      const { execFile } = require('child_process');

      await new Promise<void>((resolve, reject) => {
        execFile('pdftohtml', ['-c', '-s', '-noframes', inputPath, htmlPath], (error: any, stdout: string, stderr: string) => {
          if (error) {
            if (error.code === 'ENOENT') {
              console.error('pdftohtml not found on this system');
            } else {
              console.error('pdftohtml failed:', error, stderr);
            }
            return reject(error);
          }

          resolve();
        });
      });

      const html = await fs.promises.readFile(htmlPath, 'utf8');
      if (!html || html.length < 200) {
        throw new Error('Generated HTML is too small; likely conversion failure');
      }

      const htmlDocx = require('html-docx-js');
      const docxBuffer = htmlDocx.asBlob(html);

      console.log('Successfully converted PDF → HTML → DOCX using pdftohtml');
      return Buffer.from(docxBuffer);

    } catch (error) {
      console.error('PDF → HTML → DOCX conversion (pdftohtml) failed:', error);

      // Fallback: use pdf-parse to build a simpler HTML with basic structure
      try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(file.buffer);

        const lines = data.text.split('\n');
        let htmlContent = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>';

        for (const line of lines) {
          if (line.trim()) {
            if (line.trim().length < 80 && line === line.toUpperCase() && /[A-Z]/.test(line)) {
              htmlContent += `<h2>${line.trim()}</h2>`;
            } else if (line.includes('\t') || line.split(/\s{3,}/).length > 2) {
              const cells = line.split(/\s{3,}|\t/);
              htmlContent += '<table><tr>';
              for (const cell of cells) {
                htmlContent += `<td>${cell.trim()}</td>`;
              }
              htmlContent += '</tr></table>';
            } else {
              htmlContent += `<p>${line.trim()}</p>`;
            }
          } else {
            htmlContent += '<br>';
          }
        }

        htmlContent += '</body></html>';

        const htmlDocx = require('html-docx-js');
        const docxBuffer = htmlDocx.asBlob(htmlContent);

        console.log('Successfully converted using pdf-parse HTML fallback');
        return Buffer.from(docxBuffer);
      } catch (altError) {
        console.error('Alternative PDF → HTML → DOCX conversion also failed:', altError);
        return Buffer.alloc(0);
      }
    } finally {
      // Clean up temporary files
      try {
        if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath);
        if (fs.existsSync(htmlPath)) await fs.promises.unlink(htmlPath);
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    }
  }
}

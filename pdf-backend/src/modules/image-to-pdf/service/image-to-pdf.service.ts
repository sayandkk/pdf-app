import { Injectable } from '@nestjs/common';
import { join, basename } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import * as sharp from 'sharp';
import { promisify } from 'util';
import { PDFDocument, rgb } from 'pdf-lib';
const execFileAsync = promisify(require('child_process').execFile);

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  }
  return bytes + ' B';
}

// mm to points (1 mm = 2.83465 points)
function mm(val: number) {
  return val * 2.83465;
}

// Supported page sizes in mm
const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 },
  a3: { width: 297, height: 420 },
};

const MARGIN_SIZES: Record<string, number> = {
  none: 0,
  small: 5,
  normal: 10,
  large: 20,
};

@Injectable()
export class ImageToPdfService {
  private history: any[] = [];
  private settingsPath = join(tmpdir(), 'image-to-pdf-settings.json');
  private defaultSettings = {
    jpegQuality: 85,
    pageSize: "a4",
    orientation: "auto",
    imagesPerPage: "1",
    margins: "normal",
    fitToPage: true,
    maintainAspect: true,
    centerImages: true,
    optimizeFileSize: false,
  };

  async getSettings() {
    try {
      const data = await fs.readFile(this.settingsPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return this.defaultSettings;
    }
  }

  async saveSettings(settings: any) {
    await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2));
  }

  async convertToPdf(images: Express.Multer.File[], settings: any): Promise<{ pdfBuffer: Buffer, historyEntry: any }> {
    const savedSettings = await this.getSettings();
    const mergedSettings = { ...savedSettings, ...settings };

    const uniqueId = randomBytes(16).toString('hex');
    const jpegQuality = mergedSettings?.jpegQuality ? parseInt(mergedSettings.jpegQuality) : 85;
    const pageSizeKey = mergedSettings?.pageSize || "a4";
    const orientation = mergedSettings?.orientation || "auto";
    const imagesPerPage = parseInt(mergedSettings?.imagesPerPage || "1");
    const marginKey = mergedSettings?.margins || "normal";
    const fitToPage = mergedSettings?.fitToPage !== false;
    const maintainAspect = mergedSettings?.maintainAspect !== false;
    const centerImages = mergedSettings?.centerImages !== false;

    // Get page size in mm and convert to points
    let { width: pageWidthMM, height: pageHeightMM } = PAGE_SIZES[pageSizeKey] || PAGE_SIZES["a4"];
    // Orientation
    if (orientation === "landscape" || (orientation === "auto" && pageWidthMM < pageHeightMM && images[0])) {
      [pageWidthMM, pageHeightMM] = [pageHeightMM, pageWidthMM];
    }
    const pageWidth = mm(pageWidthMM);
    const pageHeight = mm(pageHeightMM);

    // Margin in points
    const marginMM = MARGIN_SIZES[marginKey] ?? 10;
    const margin = mm(marginMM);

    // 1. Convert all images to JPEG buffers
    const imageBuffers = await Promise.all(
      images.map(img =>
        sharp(img.buffer)
          .jpeg({ quality: jpegQuality })
          .toBuffer()
      )
    );

    // 2. Create a PDF and add images as per settings
    const pdfDoc = await PDFDocument.create();

    // Grid layout calculation
    let gridRows = 1, gridCols = 1;
    if (imagesPerPage === 2) { gridRows = 2; gridCols = 1; }
    if (imagesPerPage === 4) { gridRows = 2; gridCols = 2; }
    if (imagesPerPage === 6) { gridRows = 2; gridCols = 3; }
    if (imagesPerPage === 1) { gridRows = 1; gridCols = 1; }

    for (let i = 0; i < imageBuffers.length; i += imagesPerPage) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      let imgIdx = 0;
      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const imgBuffer = imageBuffers[i + imgIdx];
          if (!imgBuffer) continue;
          const img = await pdfDoc.embedJpg(imgBuffer);

          // Calculate available cell size
          const cellWidth = (pageWidth - margin * 2) / gridCols;
          const cellHeight = (pageHeight - margin * 2) / gridRows;

          let drawWidth = cellWidth;
          let drawHeight = cellHeight;

          if (fitToPage && maintainAspect) {
            const ratio = Math.min(cellWidth / img.width, cellHeight / img.height);
            drawWidth = img.width * ratio;
            drawHeight = img.height * ratio;
          } else if (fitToPage && !maintainAspect) {
            drawWidth = cellWidth;
            drawHeight = cellHeight;
          } else {
            drawWidth = img.width;
            drawHeight = img.height;
          }

          let x = margin + col * cellWidth;
          let y = pageHeight - margin - (row + 1) * cellHeight;

          if (centerImages) {
            x += (cellWidth - drawWidth) / 2;
            y += (cellHeight - drawHeight) / 2;
          }

          page.drawImage(img, { x, y, width: drawWidth, height: drawHeight });
          imgIdx++;
        }
      }
    }

    const pdfBuffer = Buffer.from(await pdfDoc.save());

    // --- Add to history ---
    const totalSize = images.reduce((sum, img) => sum + img.size, 0);
    const historyEntry = {
      id: uniqueId,
      filename: images.map(img => img.originalname).join(', '),
      imageCount: images.length,
      totalSize: formatSize(totalSize),
      convertedSize: formatSize(pdfBuffer.length),
      status: 'completed',
      convertedAt: new Date().toISOString(),
    };
    this.history.unshift(historyEntry);

    return { pdfBuffer, historyEntry };
  }

  getHistory() {
    return this.history;
  }
}
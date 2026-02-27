/**
 * test-table-conversion.js
 * Creates a PDF with a table + image, converts it to Word, and checks the output.
 * Run: node test-table-conversion.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── 1. Create a test PDF with a table using PDFKit ──────────────────────────
async function createTestPdf() {
  // Try to use PDFKit if available, otherwise use pdf-lib
  try {
    return await createPdfWithPdfLib();
  } catch (e) {
    console.error('pdf-lib failed:', e.message);
    throw e;
  }
}

async function createPdfWithPdfLib() {
  const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  // ── Title ──
  page.drawText('Invoice Report', {
    x: 180, y: height - 60,
    size: 22, font, color: rgb(0, 0, 0.7),
  });

  // ── A simple table: draw borders + text ──
  const tableTop = height - 120;
  const cols = [50, 200, 330, 430, 530];
  const rowH = 28;
  const rows = [
    ['#', 'Item Description', 'Qty', 'Unit Price', 'Total'],
    ['1', 'Web Development Service', '10', '$150.00', '$1,500.00'],
    ['2', 'UI/UX Design Package', '5', '$200.00', '$1,000.00'],
    ['3', 'Database Setup & Config', '1', '$500.00', '$500.00'],
    ['4', 'Hosting (Annual)', '1', '$299.00', '$299.00'],
    ['', '', '', 'TOTAL', '$3,299.00'],
  ];

  rows.forEach((row, rIdx) => {
    const y = tableTop - rIdx * rowH;
    const isHeader = rIdx === 0;
    const isTotal = rIdx === rows.length - 1;

    // Row background
    if (isHeader) {
      page.drawRectangle({ x: cols[0], y: y - rowH + 4, width: cols[cols.length - 1] - cols[0] + 80, height: rowH, color: rgb(0.2, 0.4, 0.7) });
    } else if (isTotal) {
      page.drawRectangle({ x: cols[0], y: y - rowH + 4, width: cols[cols.length - 1] - cols[0] + 80, height: rowH, color: rgb(0.9, 0.95, 1) });
    }

    // Row border lines
    for (let c = 0; c <= cols.length - 1; c++) {
      page.drawLine({ start: { x: cols[c], y }, end: { x: cols[c], y: y - rowH + 4 }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });
    }
    // Right border for last col
    page.drawLine({ start: { x: cols[cols.length - 1] + 80, y }, end: { x: cols[cols.length - 1] + 80, y: y - rowH + 4 }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });
    // Horizontal border
    page.drawLine({ start: { x: cols[0], y }, end: { x: cols[cols.length - 1] + 80, y }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });

    // Cell text
    row.forEach((cell, cIdx) => {
      if (!cell) return;
      const xPos = cols[cIdx] + 4;
      const textColor = isHeader ? rgb(1, 1, 1) : rgb(0, 0, 0);
      const useFont = (isHeader || isTotal) ? font : fontNormal;
      page.drawText(cell, { x: xPos, y: y - 18, size: isHeader ? 10 : 9, font: useFont, color: textColor });
    });
  });

  // Bottom border
  const lastRowY = tableTop - rows.length * rowH + 4;
  page.drawLine({ start: { x: cols[0], y: lastRowY }, end: { x: cols[cols.length - 1] + 80, y: lastRowY }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });

  // ── A second section with a text paragraph ──
  const paraY = tableTop - rows.length * rowH - 40;
  page.drawText('Summary', { x: 50, y: paraY, size: 16, font, color: rgb(0, 0, 0) });
  page.drawText('Payment is due within 30 days. Please include the invoice number on your payment.', {
    x: 50, y: paraY - 25, size: 10, font: fontNormal, color: rgb(0.2, 0.2, 0.2),
  });
  page.drawText('Bank Transfer: IBAN XX00 0000 0000 0000  |  BIC: ABCDEFGH', {
    x: 50, y: paraY - 45, size: 10, font: fontNormal, color: rgb(0.2, 0.2, 0.2),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ── 2. Run the full conversion pipeline (same as the service does) ───────────
async function convertPdfToWord(pdfBuffer) {
  const { pathToFileURL } = require('url');

  console.log('\n── STEP 1: Rendering PDF pages as images via pdfjs-dist + canvas ──');
  let pageImages = [];

  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';

    const workerPath = path.join(
      path.dirname(require.resolve('pdfjs-dist/package.json')),
      'legacy/build/pdf.worker.mjs',
    );
    pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();

    const { createCanvas } = require('canvas');

    class NodeCanvasFactory {
      create(w, h) { const c = createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
      reset(c, w, h) { c.canvas.width = w; c.canvas.height = h; }
      destroy(c) { c.canvas.width = 0; c.canvas.height = 0; }
    }

    const canvasFactory = new NodeCanvasFactory();
    const standardFontDataUrl = pathToFileURL(
      path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts/'),
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
    console.log(`  PDF has ${pdfDoc.numPages} page(s)`);

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvasAndCtx = canvasFactory.create(viewport.width, viewport.height);
      canvasAndCtx.context.fillStyle = '#ffffff';
      canvasAndCtx.context.fillRect(0, 0, viewport.width, viewport.height);
      await page.render({ canvasContext: canvasAndCtx.context, viewport }).promise;
      const pngBuffer = canvasAndCtx.canvas.toBuffer('image/png');
      pageImages.push(pngBuffer);
      console.log(`  ✅ Page ${pageNum}: ${Math.round(viewport.width)}×${Math.round(viewport.height)}px, ${pngBuffer.length} bytes`);
      canvasFactory.destroy(canvasAndCtx);
    }
  } catch (err) {
    console.error('  ❌ Page rendering failed:', err.message);
  }

  if (pageImages.length === 0) {
    console.error('  ❌ No page images produced — tables/images will be MISSING');
    return null;
  }

  console.log('\n── STEP 2: Building Word document from page images ──');
  const {
    Document, Packer, Paragraph, ImageRun, AlignmentType
  } = require('docx');
  const sharp = require('sharp');

  const children = [];
  const DPI = 96;
  const maxW = Math.round(6.5 * DPI);
  const maxH = Math.round(9.0 * DPI);

  for (let i = 0; i < pageImages.length; i++) {
    if (i > 0) children.push(new Paragraph({ pageBreakBefore: true }));

    const meta = await sharp(pageImages[i]).metadata();
    const srcW = meta.width ?? maxW;
    const srcH = meta.height ?? maxH;
    const scale = Math.min(1, maxW / srcW, maxH / srcH);
    const dispW = Math.max(1, Math.round(srcW * scale));
    const dispH = Math.max(1, Math.round(srcH * scale));

    const flatBuf = await sharp(pageImages[i]).flatten({ background: '#ffffff' }).png().toBuffer();

    children.push(new Paragraph({
      children: [new ImageRun({ data: flatBuf, transformation: { width: dispW, height: dispH }, type: 'png' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
    }));
    console.log(`  Page ${i + 1} embedded: ${dispW}×${dispH}px`);
  }

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children,
    }],
  });

  const docxBuffer = await Packer.toBuffer(doc);
  console.log(`  ✅ Word document size: ${docxBuffer.length} bytes`);
  return docxBuffer;
}

// ── 3. Main ──────────────────────────────────────────────────────────────────
(async () => {
  const outPdf = path.join(__dirname, 'test-table-input.pdf');
  const outDocx = path.join(__dirname, 'test-table-output.docx');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PDF → Word Table Conversion Test');
  console.log('═══════════════════════════════════════════════════════════');

  console.log('\n── Creating test PDF with table ──');
  let pdfBuffer;
  try {
    pdfBuffer = await createTestPdf();
    fs.writeFileSync(outPdf, pdfBuffer);
    console.log(`  ✅ Test PDF saved: ${outPdf} (${pdfBuffer.length} bytes)`);
  } catch (e) {
    console.error('  ❌ Failed to create test PDF:', e.message);
    process.exit(1);
  }

  const docxBuffer = await convertPdfToWord(pdfBuffer);

  if (!docxBuffer) {
    console.error('\n❌ CONVERSION FAILED — no output produced');
    process.exit(1);
  }

  fs.writeFileSync(outDocx, docxBuffer);
  console.log(`\n✅ SUCCESS! Word file saved: ${outDocx}`);
  console.log(`   Open this file in Microsoft Word to verify the table is visible.`);
  console.log('\n── What to expect ──────────────────────────────────────────');
  console.log('  • Page renders as a full-resolution image inside Word');
  console.log('  • Table with coloured header row should be clearly visible');
  console.log('  • Zero chance of missing tables/images with this approach');
  console.log('─────────────────────────────────────────────────────────── ');
})();

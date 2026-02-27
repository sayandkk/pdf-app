import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

const pdfjsLib = await import('./node_modules/pdfjs-dist/legacy/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

// Create a simple test PDF buffer from any PDF in uploads dir
const files = fs.readdirSync('uploads').filter(f => f.endsWith('.pdf'));
if (files.length === 0) {
  console.log('No PDF files in uploads/ -- creating test');
  // Just test that rendering pipeline works without a real file
  console.log('pdfjs version:', pdfjsLib.version);
  console.log('canvas createCanvas:', typeof createCanvas);
  console.log('All imports OK');
} else {
  const testPdf = fs.readFileSync(path.join('uploads', files[0]));
  console.log('Testing with:', files[0], 'size:', testPdf.length);
  
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(testPdf) });
  const pdfDoc = await loadingTask.promise;
  console.log('PDF pages:', pdfDoc.numPages);
  
  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 1.0 });
  console.log('Page dimensions:', viewport.width, 'x', viewport.height);
  
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  
  await page.render({ canvasContext: ctx, viewport }).promise;
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync('test-page1.png', buf);
  console.log('SUCCESS: rendered page 1 to test-page1.png, size:', buf.length, 'bytes');
}

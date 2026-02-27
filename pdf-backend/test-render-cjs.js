// Test pdfjs-dist v4 + NodeCanvasFactory in CJS mode (same as NestJS runtime)
const fs = require('fs');
const path = require('path');

async function main() {
  const pdfjsLib = await import('./node_modules/pdfjs-dist/legacy/build/pdf.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  const { createCanvas } = require('canvas');

  class NodeCanvasFactory {
    create(width, height) {
      const canvas = createCanvas(width, height);
      return { canvas, context: canvas.getContext('2d') };
    }
    reset(c, w, h) { c.canvas.width = w; c.canvas.height = h; }
    destroy(c) { c.canvas.width = 0; c.canvas.height = 0; }
  }

  // Find a test PDF
  const pdfFiles = [];
  const scanDir = (dir) => {
    try {
      for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) scanDir(full);
        else if (f.endsWith('.pdf')) pdfFiles.push(full);
      }
    } catch(e) {}
  };
  scanDir('./uploads');

  if (pdfFiles.length === 0) {
    console.log('No PDFs found in uploads/ - testing with empty canvas only');
    const cf = new NodeCanvasFactory();
    const c = cf.create(200, 200);
    c.context.fillStyle = '#ff0000';
    c.context.fillRect(10,10,100,100);
    const buf = c.canvas.toBuffer('image/png');
    console.log('Test canvas write OK, size:', buf.length);
    return;
  }

  const testFile = pdfFiles[0];
  console.log('Testing with:', testFile);
  const pdfBuffer = fs.readFileSync(testFile);
  const canvasFactory = new NodeCanvasFactory();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    canvasFactory,
    useWorkerFetch: false,
    isEvalSupported: false,
  });
  const pdfDoc = await loadingTask.promise;
  console.log('PDF pages:', pdfDoc.numPages);

  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  console.log('Viewport:', viewport.width.toFixed(0), 'x', viewport.height.toFixed(0));

  const canvasAndCtx = canvasFactory.create(viewport.width, viewport.height);
  canvasAndCtx.context.fillStyle = '#ffffff';
  canvasAndCtx.context.fillRect(0, 0, viewport.width, viewport.height);

  await page.render({ canvasContext: canvasAndCtx.context, viewport }).promise;

  const pngBuf = canvasAndCtx.canvas.toBuffer('image/png');
  fs.writeFileSync('test-output-page1.png', pngBuf);
  console.log('SUCCESS: page1.png written, size:', pngBuf.length, 'bytes');
  if (pngBuf.length < 6000) console.warn('WARNING: very small — likely blank page');
}

main().catch(e => console.error('FAILED:', e.message));

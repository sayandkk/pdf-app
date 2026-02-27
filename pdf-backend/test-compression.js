const { PdfCompressionService } = require('./src/modules/pdf-compression/service/pdf-compression.service');
const fs = require('fs');
const path = require('path');

async function testCompression() {
  try {
    console.log('Testing PDF compression with Ghostscript...');

    // Read the test PDF
    const testPdfPath = path.join(__dirname, 'test-sample.pdf');
    if (!fs.existsSync(testPdfPath)) {
      console.error('Test PDF not found at:', testPdfPath);
      return;
    }

    const pdfBuffer = fs.readFileSync(testPdfPath);
    console.log(`Original PDF size: ${pdfBuffer.length} bytes`);

    // Create compression service instance
    const compressionService = new PdfCompressionService();

    // Test compression
    const result = await compressionService.compressPdf({
      buffer: pdfBuffer,
      originalname: 'test-sample.pdf'
    }, '50'); // 50% compression level

    console.log(`Compressed PDF size: ${result.buffer.length} bytes`);
    console.log(`Compression method used: ${result.method}`);
    console.log(`Compression ratio: ${((pdfBuffer.length - result.buffer.length) / pdfBuffer.length * 100).toFixed(2)}%`);

    // Save compressed file for inspection
    const outputPath = path.join(__dirname, 'compressed-test.pdf');
    fs.writeFileSync(outputPath, result.buffer);
    console.log(`Compressed file saved to: ${outputPath}`);

  } catch (error) {
    console.error('Compression test failed:', error.message);
    console.error('Full error:', error);
  }
}

testCompression();
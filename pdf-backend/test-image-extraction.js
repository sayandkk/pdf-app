const { PdfToWordService } = require('./src/modules/pdf-to-word/service/pdf-to-word.service');
const fs = require('fs');
const path = require('path');

async function testImageExtraction() {
  try {
    console.log('Testing PDF to Word image extraction and sizing...');

    // Read the test PDF
    const testPdfPath = path.join(__dirname, 'test-sample.pdf');
    if (!fs.existsSync(testPdfPath)) {
      console.error('Test PDF not found at:', testPdfPath);
      console.log('Please place a PDF file with images in the backend root directory as test-sample.pdf');
      return;
    }

    const pdfBuffer = fs.readFileSync(testPdfPath);
    console.log(`Test PDF size: ${pdfBuffer.length} bytes`);

    // Create PDF to Word service instance
    const pdfToWordService = new PdfToWordService();

    // Test image extraction directly
    const images = await pdfToWordService.extractImagesFromPDF(pdfBuffer);
    console.log(`\n📸 Image Extraction Results:`);
    console.log(`Found ${images.length} images`);

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      console.log(`Image ${i + 1}: ${img.width}x${img.height}px, ${img.buffer.length} bytes`);
    }

    // Test full conversion
    console.log('\n🔄 Testing full PDF to Word conversion...');
    const result = await pdfToWordService.convertToWord({
      buffer: pdfBuffer,
      originalname: 'test-sample.pdf'
    });

    console.log(`✅ Conversion successful! Output size: ${result.length} bytes`);

    // Save result for inspection
    const outputPath = path.join(__dirname, 'test-image-conversion.docx');
    fs.writeFileSync(outputPath, result);
    console.log(`📄 Word document saved to: ${outputPath}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testImageExtraction();
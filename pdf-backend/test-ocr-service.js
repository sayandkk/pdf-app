// Test OCR Service Directly
// Run with: node test-ocr-service.js

const { OcrService } = require('./dist/modules/ocr/service/ocr.service');
const fs = require('fs');
const path = require('path');

async function testOcrService() {
  console.log('🧪 Testing OCR Service...\n');

  try {
    // Create OCR service instance
    const ocrService = new OcrService();

    // Read test PDF
    const testPdfPath = './tools/uploads/ocr/test.pdf';
    if (!fs.existsSync(testPdfPath)) {
      console.log('❌ Test PDF not found');
      return;
    }

    const buffer = fs.readFileSync(testPdfPath);
    const file = {
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
      buffer: buffer
    };

    console.log('📄 Testing OCR service with PDF...');
    const result = await ocrService.performOcr(file);

    console.log('✅ OCR Result:');
    console.log(`   Confidence: ${result.confidence}%`);
    console.log(`   Pages: ${result.pages}`);
    console.log(`   Language: ${result.language}`);
    console.log(`   Text Length: ${result.text.length}`);
    console.log(`   Sample Text: "${result.text.substring(0, 100)}..."`);

  } catch (error) {
    console.error('❌ OCR Service test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testOcrService();
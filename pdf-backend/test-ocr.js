// OCR Test Script
// Run with: node test-ocr.js

const { createWorker } = require('tesseract.js');
const pdfParse = require('pdf-parse');
const pdf2pic = require('pdf2pic');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testOCR() {
  console.log('🧪 Testing OCR Components...\n');

  try {
    // Test 1: Tesseract
    console.log('1️⃣ Testing Tesseract...');
    const worker = await createWorker('eng');
    console.log('✅ Tesseract worker created');

    // Create a simple test image (if you have one)
    const testImagePath = './test-image.png';
    if (fs.existsSync(testImagePath)) {
      const result = await worker.recognize(testImagePath);
      console.log(`✅ OCR Result: "${result.data.text.substring(0, 50)}..."`);
      console.log(`✅ Confidence: ${result.data.confidence}%`);
    } else {
      console.log('⚠️ No test image found, skipping OCR test');
    }

    await worker.terminate();
    console.log('✅ Tesseract test completed\n');

    // Test 2: pdf-parse
    console.log('2️⃣ Testing pdf-parse...');
    const testPdfPath = './tools/uploads/ocr/test.pdf';
    if (fs.existsSync(testPdfPath)) {
      try {
        const buffer = fs.readFileSync(testPdfPath);
        const pdfData = await pdfParse(buffer);
        console.log(`✅ PDF parsed: ${pdfData.numpages} pages`);
        console.log(`✅ Extracted text length: ${pdfData.text.length}`);
        if (pdfData.text.length > 0) {
          console.log(`✅ Sample text: "${pdfData.text.substring(0, 100)}..."`);
        } else {
          console.log('⚠️ No embedded text found in PDF');
        }
      } catch (parseError) {
        console.log(`❌ pdf-parse failed: ${parseError.message}`);
        console.log('⚠️ This might indicate the PDF is image-based or corrupted');
      }
    } else {
      console.log('⚠️ No test PDF found, skipping pdf-parse test');
    }

    // Test 3: pdf2pic
    console.log('\n3️⃣ Testing pdf2pic...');
    if (fs.existsSync(testPdfPath)) {
      try {
        const tempDir = os.tmpdir();
        const convert = pdf2pic.fromPath(testPdfPath, {
          density: 300,
          saveFilename: `test_page_${Date.now()}`,
          savePath: tempDir,
          format: 'png',
          width: 2480,
          height: 3508
        });

        const result = await convert(1);
        const imagePath = result.path;
        console.log(`✅ PDF converted to image: ${imagePath}`);

        // Check if image exists and has content
        const stats = await fs.promises.stat(imagePath);
        console.log(`✅ Image size: ${stats.size} bytes`);

        if (stats.size < 1000) {
          console.log('⚠️ Image is very small, might be empty');
        }

        // Test OCR on the converted image
        console.log('🔍 Testing OCR on converted image...');
        const ocrWorker = await createWorker('eng');
        const ocrResult = await ocrWorker.recognize(imagePath);
        console.log(`✅ OCR on image: "${ocrResult.data.text.substring(0, 50)}..."`);
        console.log(`✅ OCR confidence: ${ocrResult.data.confidence}%`);
        await ocrWorker.terminate();

        // Cleanup
        if (fs.existsSync(imagePath)) {
          await fs.promises.unlink(imagePath);
          console.log('🧹 Cleaned up test image');
        }

      } catch (conversionError) {
        console.log(`❌ pdf2pic failed: ${conversionError.message}`);
        console.log('⚠️ This indicates missing system dependencies (ImageMagick/Ghostscript)');
      }
    }

    console.log('\n🎉 OCR component testing completed!');

  } catch (error) {
    console.error('❌ OCR Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Install ImageMagick: https://imagemagick.org/');
    console.log('2. Install Ghostscript: https://www.ghostscript.com/');
    console.log('3. Check Tesseract installation');
    console.log('4. Ensure test files exist');
  }
}

testOCR();
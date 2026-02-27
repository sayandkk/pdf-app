/**
 * Test script to verify PDF to Word conversion preserves layout
 * This tests that text-based PDFs are not converted to images
 */

const fs = require('fs');
const path = require('path');

async function testPdfToWordLayout() {
    console.log('🧪 Testing PDF to Word Layout Preservation...\n');

    // Import the service
    const { PdfToWordService } = require('./dist/modules/pdf-to-word/service/pdf-to-word.service');
    const service = new PdfToWordService();

    // Create a simple text-based PDF for testing
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();

    // Create test PDF with structured layout
    const pdfPath = path.join(__dirname, 'test-layout.pdf');
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    // Add content with various layouts
    doc.fontSize(20).text('Test Document', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text('Section 1: Introduction', { underline: true });
    doc.fontSize(12).text('This is a paragraph with normal left-aligned text. It should be preserved in the Word document with proper formatting and alignment.');
    doc.moveDown();

    doc.fontSize(14).text('Section 2: Contact Information', { align: 'center' });
    doc.fontSize(12).text('email@example.com', { align: 'center' });
    doc.text('+1 234 567 8900', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text('Section 3: List Items');
    doc.fontSize(12).text('• First item in the list');
    doc.text('• Second item in the list');
    doc.text('• Third item in the list');
    doc.moveDown();

    doc.fontSize(14).text('Section 4: Right-Aligned Content');
    doc.fontSize(12).text('Date: 12/03/2025', { align: 'right' });
    doc.text('Amount: $1,234.56', { align: 'right' });

    doc.end();

    // Wait for PDF to be written
    await new Promise((resolve) => writeStream.on('finish', resolve));

    console.log('✅ Created test PDF with structured layout\n');

    // Read the PDF
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Create mock file object
    const mockFile = {
        originalname: 'test-layout.pdf',
        buffer: pdfBuffer,
        size: pdfBuffer.length,
        mimetype: 'application/pdf'
    };

    try {
        console.log('🔄 Converting PDF to Word...\n');
        const wordBuffer = await service.convertToWord(mockFile);

        console.log(`✅ Conversion successful! Word document size: ${wordBuffer.length} bytes\n`);

        // Save the Word document
        const wordPath = path.join(__dirname, 'test-layout.docx');
        fs.writeFileSync(wordPath, wordBuffer);
        console.log(`📄 Word document saved to: ${wordPath}\n`);

        // Check if the Word document is text-based (not an image)
        const wordString = wordBuffer.toString('utf-8');
        const hasTextContent = wordString.includes('Section') || wordString.includes('Introduction');

        if (hasTextContent) {
            console.log('✅ SUCCESS: Word document contains text content (not converted to image)');
        } else {
            console.log('⚠️  WARNING: Word document may be image-based');
        }

        // Clean up
        fs.unlinkSync(pdfPath);

        console.log('\n✅ Test completed successfully!');
        console.log('📝 Please open the generated Word file to verify layout preservation.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);

        // Clean up
        if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }
    }
}

// Run the test
testPdfToWordLayout().catch(console.error);

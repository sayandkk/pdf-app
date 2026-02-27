const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

// Create a test PDF with images and different alignments
async function createTestPDF() {
  try {
    console.log('Creating test PDF with images and different alignments...');

    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const page = pdfDoc.addPage([612, 792]); // Standard letter size
    const { width, height } = page.getSize();

    let yPosition = height - 50;

    // Add centered title
    page.drawText('SAMPLE DOCUMENT', {
      x: width / 2 - 80,
      y: yPosition,
      size: 18,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;

    // Add centered subtitle
    page.drawText('Test PDF for Alignment and Images', {
      x: width / 2 - 100,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;

    // Add left-aligned content
    page.drawText('Left-aligned paragraph:', {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    page.drawText('This is a left-aligned paragraph with normal text content.', {
      x: 50,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    // Add indented content
    page.drawText('    This is indented text that should appear with proper spacing.', {
      x: 50,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    // Add right-aligned content
    page.drawText('Right-aligned: $100.00', {
      x: width - 150,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    // Add a simple colored rectangle as an "image"
    page.drawRectangle({
      x: 200,
      y: yPosition - 100,
      width: 200,
      height: 80,
      color: rgb(0.7, 0.8, 0.9),
    });

    page.drawText('Sample Image Area', {
      x: 250,
      y: yPosition - 60,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    yPosition -= 120;

    // Add bullet points
    page.drawText('• First bullet point', {
      x: 70,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    page.drawText('• Second bullet point', {
      x: 70,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    // Add centered footer
    page.drawText('Page 1', {
      x: width / 2 - 20,
      y: 50,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();
    
    const outputPath = path.join(__dirname, 'test-sample.pdf');
    fs.writeFileSync(outputPath, pdfBytes);
    
    console.log(`✅ Test PDF created: ${outputPath}`);
    console.log(`PDF size: ${pdfBytes.length} bytes`);

  } catch (error) {
    console.error('Error creating test PDF:', error);
  }
}

createTestPDF();
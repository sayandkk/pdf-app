const fs = require('fs');
const { jsPDF } = require('jspdf');

async function createSimpleTestPDF() {
  try {
    console.log('Creating simple test PDF with jsPDF...');

    const doc = new jsPDF();

    // Add title (centered)
    doc.setFontSize(16);
    doc.text('SAMPLE DOCUMENT', 105, 30, { align: 'center' });

    // Add subtitle (centered)
    doc.setFontSize(12);
    doc.text('Test PDF for Conversion', 105, 45, { align: 'center' });

    // Add left-aligned content
    doc.setFontSize(10);
    doc.text('Left-aligned paragraph:', 20, 65);
    doc.text('This is a left-aligned paragraph with normal text content.', 20, 75);

    // Add indented content
    doc.text('    This is indented text that should appear with proper spacing.', 20, 90);

    // Add right-aligned content
    doc.text('Right-aligned: $100.00', 190, 105, { align: 'right' });

    // Add some bullet points
    doc.text('• First bullet point', 30, 125);
    doc.text('• Second bullet point', 30, 135);

    // Add a simple rectangle as image
    doc.setFillColor(200, 220, 255);
    doc.rect(70, 150, 70, 30, 'F');
    doc.text('Sample Image', 105, 170, { align: 'center' });

    // Add footer (centered)
    doc.text('Page 1', 105, 280, { align: 'center' });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    const outputPath = 'test-sample.pdf';
    fs.writeFileSync(outputPath, pdfBuffer);
    
    console.log(`✅ Simple test PDF created: ${outputPath}`);
    console.log(`PDF size: ${pdfBuffer.length} bytes`);

  } catch (error) {
    console.error('Error creating simple test PDF:', error);
  }
}

createSimpleTestPDF();
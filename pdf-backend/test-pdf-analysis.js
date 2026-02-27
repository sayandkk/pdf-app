const fs = require('fs');
const path = require('path');

// Simple test script to check PDF content and alignment
async function testPdfContent() {
  try {
    console.log('Testing PDF content extraction and alignment...');

    // Check if test PDF exists
    const testPdfPath = path.join(__dirname, 'test-sample.pdf');
    if (!fs.existsSync(testPdfPath)) {
      console.log('Creating a simple test PDF with content...');
      
      // Create a simple test PDF with different alignments
      const testContent = `
                    CENTERED TITLE
                        
Left aligned text here
      Indented paragraph text
                                      Right aligned text
• Bullet point one
• Bullet point two
1. Numbered list item
2. Another numbered item

ANOTHER SECTION
Regular paragraph content that should be left aligned.
    Indented content with spacing.
`;

      // Write test content as text for now
      fs.writeFileSync(path.join(__dirname, 'test-content.txt'), testContent);
      console.log('Created test content file');
      return;
    }

    // Test PDF extraction
    const pdfBuffer = fs.readFileSync(testPdfPath);
    console.log(`PDF size: ${pdfBuffer.length} bytes`);

    // Test pdf-parse
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(pdfBuffer);
    
    console.log('\n=== PDF CONTENT ===');
    console.log(`Text length: ${data.text.length}`);
    console.log('Raw text:');
    console.log(data.text);
    console.log('\n=== END PDF CONTENT ===');

    // Analyze line by line
    const lines = data.text.split('\n');
    console.log('\n=== LINE ANALYSIS ===');
    lines.forEach((line, index) => {
      if (line.trim()) {
        const leftSpaces = line.length - line.trimStart().length;
        const rightSpaces = line.length - line.trimEnd().length;
        console.log(`Line ${index + 1}: "${line}" | Left: ${leftSpaces}, Right: ${rightSpaces}, Total: ${line.length}`);
      }
    });

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testPdfContent();
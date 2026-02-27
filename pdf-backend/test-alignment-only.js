const { PdfToWordService } = require('./src/modules/pdf-to-word/service/pdf-to-word.service');
const fs = require('fs');
const path = require('path');

// Create a mock file object for testing
function createMockFile(content, filename = 'test.txt') {
  return {
    buffer: Buffer.from(content),
    originalname: filename,
    mimetype: 'text/plain',
    size: content.length
  };
}

async function testAlignmentConversion() {
  try {
    console.log('Testing text alignment conversion...');

    // Create test content with different alignments
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
                                   Date: 11/04/2025
`;

    // Create PDF to Word service instance
    const pdfToWordService = new PdfToWordService();

    // Test the text processing method directly
    console.log('\n🔍 Testing text processing...');
    const processedSections = pdfToWordService.processTextWithAdvancedFormatting(testContent);
    
    console.log('\n📄 Processed sections:');
    processedSections.forEach((section, index) => {
      console.log(`${index + 1}. Type: ${section.type}, Alignment: ${section.alignment}, Content: "${section.content}"`);
    });

    console.log('\n✅ Text processing test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testAlignmentConversion();
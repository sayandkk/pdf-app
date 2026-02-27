const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function testPdfParsing() {
  try {
    // Use a test PDF file from node_modules
    const pdfPath = path.join(__dirname, 'node_modules', 'pdf-parse', 'test', 'data', '01-valid.pdf');
    console.log('Testing PDF:', pdfPath);

    if (!fs.existsSync(pdfPath)) {
      console.log('Test PDF not found');
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(buffer);

    console.log('=== PDF TEXT EXTRACTION ===');
    console.log('Total characters:', data.text.length);
    console.log('First 1000 characters:');
    console.log(data.text.substring(0, 1000));
    console.log('\n=== LINE ANALYSIS (First 30 lines) ===');

    const lines = data.text.split('\n').slice(0, 30); // First 30 lines
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      const leftSpaces = line.length - line.trimStart().length;
      const rightSpaces = line.length - line.trimEnd().length;
      const hasTabs = line.includes('\t');
      console.log(`${String(i + 1).padStart(2)}: [${leftSpaces}L,${rightSpaces}R${hasTabs ? ',TAB' : ''}] "${trimmed}"`);
    });

    console.log('\n=== ALIGNMENT ANALYSIS ===');
    const alignmentStats = { left: 0, center: 0, right: 0, justify: 0 };

    lines.forEach(line => {
      if (!line.trim()) return;

      const leftSpaces = line.length - line.trimStart().length;
      const rightSpaces = line.length - line.trimEnd().length;
      const trimmed = line.trim();

      if (leftSpaces > 5 && rightSpaces > 5 && trimmed.length < 60) {
        alignmentStats.center++;
      } else if (rightSpaces > 10 && leftSpaces < 3) {
        alignmentStats.right++;
      } else if (trimmed.length > 80) {
        alignmentStats.justify++;
      } else {
        alignmentStats.left++;
      }
    });

    console.log('Alignment distribution:', alignmentStats);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testPdfParsing();
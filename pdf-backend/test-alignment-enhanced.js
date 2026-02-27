// Test script to validate enhanced alignment detection with synthetic data
function testAlignmentDetection() {
  console.log('=== ENHANCED ALIGNMENT DETECTION TEST ===\n');

  // Create synthetic test data that simulates different alignment scenarios
  const testLines = [
    '                    CENTERED TITLE                    ', // Explicit center with spaces
    '  John Doe  ', // Short centered content
    '$123.45                                                                 ', // Right-aligned currency (more right spaces)
    'Page 1 of 10                                                           ', // Right-aligned page number (more right spaces)
    'This is a long paragraph that should be justified with many words spread across the line width.', // Justified text
    '    This line is indented with spaces', // Left-indented
    '\t\tThis line uses tabs for indentation', // Tab-indented
    'EXPERIENCE', // All caps heading
    '• First bullet point', // Bullet list
    '1. Numbered list item', // Numbered list
    'Normal left-aligned paragraph text', // Regular left-aligned
    'Short line', // Potentially centered
    '                          Right aligned text                          ', // Center-aligned with spaces
    'Contact: email@example.com | Phone: 123-456-7890', // Mixed content
    'Date: 12/31/2023                                                      ', // Date that might be right-aligned (more right spaces)
    '                                                                          123.45', // Clearly right-aligned number
    '                                                                Invoice Total:', // Right-aligned label
  ];

  const rawLines = testLines;
  const lines = rawLines.map(line => line.trim()).filter(line => line.length > 0);

  // Simulate document structure analysis
  const docStructure = analyzeDocumentStructure(rawLines);

  console.log('Document Structure Analysis:');
  console.log('- Max line length:', docStructure.maxLineLength);
  console.log('- Avg line length:', Math.round(docStructure.avgLineLength));
  console.log('- Has headers:', docStructure.hasHeaders);
  console.log('- Has footers:', docStructure.hasFooters);
  console.log('- Indent patterns found:', docStructure.indentPatterns.length);
  console.log('- Alignment patterns:', docStructure.alignmentPatterns.slice(0, 5).join(', ') + '...');

  console.log('\n=== LINE-BY-LINE ALIGNMENT ANALYSIS ===\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rawLine = rawLines[i];
    const alignment = detectAlignmentAdvanced(line, rawLine, i, docStructure);
    const indent = detectIndentationAdvanced(rawLine, docStructure);

    console.log(`Line ${i + 1}: [${alignment.toUpperCase().padEnd(8)}] "${line}"`);
    if (indent > 0) {
      console.log(`         Indent: ${indent} twips (${Math.round(indent/360*4)} spaces)`);
    }
    console.log('');
  }

  console.log('=== VALIDATION SUMMARY ===');
  const alignments = lines.map((line, i) => detectAlignmentAdvanced(line, rawLines[i], i, docStructure));
  const alignmentCounts = alignments.reduce((acc, align) => {
    acc[align] = (acc[align] || 0) + 1;
    return acc;
  }, {});

  console.log('Alignment distribution:', alignmentCounts);
  console.log('✓ Test completed successfully');
}

// Copy of the analysis methods from the service
function analyzeDocumentStructure(rawLines) {
  const nonEmptyLines = rawLines.filter(line => line.trim().length > 0);
  const lineLengths = nonEmptyLines.map(line => line.trim().length);
  const maxLineLength = Math.max(...lineLengths);
  const avgLineLength = lineLengths.reduce((a, b) => a + b, 0) / lineLengths.length;

  // Detect headers (first few lines)
  const hasHeaders = nonEmptyLines.slice(0, 3).some(line =>
    isHeading(line.trim(), '', '') ||
    line.trim().length < 60 && line.trim() === line.trim().toUpperCase()
  );

  // Detect footers (last few lines)
  const hasFooters = nonEmptyLines.slice(-3).some(line =>
    /\d+/.test(line.trim()) && line.trim().length < 20
  );

  // Analyze indentation patterns
  const indentPatterns = rawLines
    .filter(line => line.trim().length > 0)
    .map(line => line.length - line.trimStart().length)
    .filter(indent => indent > 0);

  // Analyze alignment patterns
  const alignmentPatterns = nonEmptyLines.map(line => detectAlignment(line, nonEmptyLines));

  return {
    maxLineLength,
    avgLineLength,
    hasHeaders,
    hasFooters,
    indentPatterns,
    alignmentPatterns
  };
}

function detectAlignmentAdvanced(line, rawLine, lineIndex, docStructure) {
  const trimmed = line.trim();
  const original = rawLine;

  // Check for explicit center alignment (equal spaces on both sides)
  const leftSpaces = original.length - original.trimStart().length;
  const rightSpaces = original.length - original.trimEnd().length;
  const totalSpaces = leftSpaces + rightSpaces;

  // Improved right-alignment detection: if right spaces are significantly more than left
  if (rightSpaces > leftSpaces * 1.5 && rightSpaces > 3) {
    // Common right-aligned patterns
    if (/\b\d+\.\d{2}\b/.test(trimmed) || // Currency amounts
        /\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(trimmed) || // Dates
        /\b\d{1,2}:\d{2}\b/.test(trimmed) || // Times
        /^\d+$/.test(trimmed) || // Numbers
        /Page \d+/.test(trimmed) || // Page numbers
        /Total|Amount|Date|Invoice/i.test(trimmed)) { // Common right-aligned labels
      return 'right';
    }
  }

  if (totalSpaces > 10 && Math.abs(leftSpaces - rightSpaces) < 3) {
    return 'center';
  }

  // Use document structure for better alignment detection
  if (docStructure.hasHeaders && lineIndex < 5) {
    // Headers are often centered
    if (trimmed.length < docStructure.avgLineLength * 0.8) {
      return 'center';
    }
  }

  if (docStructure.hasFooters && lineIndex > docStructure.alignmentPatterns.length - 5) {
    // Footers might be centered or right-aligned
    if (trimmed.length < 30) {
      return rightSpaces > leftSpaces ? 'right' : 'center';
    }
  }

  // Check for justified content (long lines with even word spacing)
  if (trimmed.length > 80) {
    const words = trimmed.split(/\s+/);
    if (words.length > 5) {
      // Check if line appears justified (words spread across line)
      const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
      if (avgWordLength < 8) { // Short words suggest justified text
        return 'justify';
      }
    }
  }

  // Check for centered short lines (titles, headers)
  if (trimmed.length < 60 && leftSpaces > 5 && rightSpaces > 5) {
    return 'center';
  }

  // Check for indented content that might be right-aligned
  if (leftSpaces > 20 && trimmed.length < 30) {
    return 'right';
  }

  return 'left';
}

function detectIndentationAdvanced(rawLine, docStructure) {
  // Count leading spaces
  const spaceMatch = rawLine.match(/^(\s+)/);
  if (spaceMatch) {
    const spaceCount = spaceMatch[1].length;
    // Convert spaces to twips (1/20th of a point, Word's unit)
    // Assume 4 spaces = 1 standard indent level (720 twips)
    return Math.floor(spaceCount / 4) * 360; // 360 twips per indent level
  }

  // Check for tab characters
  const tabMatch = rawLine.match(/^(\t+)/);
  if (tabMatch) {
    const tabCount = tabMatch[1].length;
    return tabCount * 720; // 720 twips per tab (standard Word tab stop)
  }

  // Use document structure to detect relative indentation
  const currentIndent = rawLine.length - rawLine.trimStart().length;
  if (docStructure.indentPatterns.length > 0) {
    const avgIndent = docStructure.indentPatterns.reduce((a, b) => a + b, 0) / docStructure.indentPatterns.length;
    if (currentIndent > avgIndent * 1.5) {
      return Math.max(currentIndent * 90, 360); // Convert to twips with minimum
    }
  }

  return 0;
}

function detectAlignment(line, allLines) {
  const trimmed = line.trim();
  const original = line;

  // Check for explicit center alignment (equal spaces on both sides)
  const leftSpaces = original.length - original.trimStart().length;
  const rightSpaces = original.length - original.trimEnd().length;
  const totalSpaces = leftSpaces + rightSpaces;

  if (totalSpaces > 10 && Math.abs(leftSpaces - rightSpaces) < 3) {
    return 'center';
  }

  // Check for right-aligned content (dates, page numbers, amounts)
  if (rightSpaces > 10 && leftSpaces < 3) {
    // Common right-aligned patterns
    if (/\b\d+\.\d{2}\b/.test(trimmed) || // Currency amounts
        /\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(trimmed) || // Dates
        /\b\d{1,2}:\d{2}\b/.test(trimmed) || // Times
        /^\d+$/.test(trimmed)) { // Numbers
      return 'right';
    }
  }

  // Check for justified content (long lines with even word spacing)
  if (trimmed.length > 80) {
    const words = trimmed.split(/\s+/);
    if (words.length > 5) {
      // Check if line appears justified (words spread across line)
      const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
      if (avgWordLength < 8) { // Short words suggest justified text
        return 'justify';
      }
    }
  }

  // Check for centered short lines (titles, headers)
  if (trimmed.length < 60 && leftSpaces > 5 && rightSpaces > 5) {
    return 'center';
  }

  return 'left';
}

function isHeading(line, nextLine, prevLine) {
  const trimmed = line.trim();

  // Common resume/CV section headings
  if (/^(EXPERIENCE|EDUCATION|SKILLS|SUMMARY|OBJECTIVE|CONTACT|PROFILE|PROJECTS|CERTIFICATIONS|ACHIEVEMENTS|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|PERSONAL INFORMATION|REFERENCES)/i.test(trimmed)) {
    return true;
  }

  // Short lines in all caps
  if (trimmed.length < 50 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    return true;
  }

  // Lines followed by separator lines (dashes, equals)
  if (nextLine && /^[-=_\s]{3,}$/.test(nextLine.trim())) {
    return true;
  }

  // Short lines followed by longer content
  if (trimmed.length < 50 && nextLine && nextLine.trim().length > trimmed.length * 2) {
    return true;
  }

  return false;
}

// Run the test
testAlignmentDetection();
# PDF to Word Layout Issues - Troubleshooting Guide

## Current Status

✅ LibreOffice is installed at: `C:\Program Files\LibreOffice\`
✅ Backend server is running
✅ Code changes have been applied to prevent image-based conversion

## Common Layout Issues and Solutions

### Issue 1: Text is converted to images instead of editable text

**Symptoms:**
- Word document contains images of the PDF pages
- Text cannot be selected or edited
- File size is very large

**Solution:**
The code fix I applied should prevent this. To verify:

1. Check backend logs during conversion
2. Look for: "PDF has selectable text, skipping screenshot to preserve layout"
3. If you see: "PDF appears to be scanned/image-based" - your PDF may actually be a scanned image

### Issue 2: Layout/alignment is incorrect

**Symptoms:**
- Text alignment is wrong (centered text appears left-aligned, etc.)
- Spacing is incorrect
- Columns or tables are misaligned

**Possible causes:**
1. **LibreOffice not being used** - Check logs for "Successfully converted using LibreOffice"
2. **Complex PDF layout** - Some PDFs have non-standard layouts that are hard to preserve
3. **Font issues** - Missing fonts can cause layout shifts

**Solutions:**

#### A. Ensure LibreOffice is being used

Run this diagnostic:
\`\`\`bash
cd d:\\pdf\\pdf-backend
node test-conversion-diagnostic.js "path\\to\\your\\pdf.pdf"
\`\`\`

Check the backend console for:
- "Found LibreOffice at: C:\\Program Files\\LibreOffice\\program\\soffice.exe"
- "Successfully converted using LibreOffice"

#### B. If LibreOffice fails, check why

Common reasons:
1. **LibreOffice timeout** - Increase timeout in code (currently 60 seconds)
2. **LibreOffice crash** - Check Windows Event Viewer
3. **File permissions** - Ensure temp directory is writable

#### C. Improve text extraction fallback

If LibreOffice isn't working, the system falls back to text extraction. This has advanced layout detection but may not be perfect for complex layouts.

### Issue 3: Missing content

**Symptoms:**
- Some text or sections are missing
- Images are missing
- Tables are incomplete

**Solutions:**

1. **Check if PDF has selectable text:**
   - Open PDF in Adobe Reader
   - Try to select text with mouse
   - If you can't select text, it's a scanned PDF (needs OCR)

2. **For scanned PDFs:**
   - The system should automatically detect this
   - It will use screenshot method
   - Consider enabling OCR in the future

### Issue 4: Formatting is lost

**Symptoms:**
- Bold/italic formatting is missing
- Font sizes are incorrect
- Colors are wrong

**This is a limitation of text extraction.** LibreOffice should preserve this better.

## Diagnostic Steps

### Step 1: Test with a simple PDF

Create a simple test PDF:
\`\`\`bash
cd d:\\pdf\\pdf-backend
node create-test-pdf.js
\`\`\`

This creates a PDF with known layout. Convert it and check if layout is preserved.

### Step 2: Check backend logs

Watch the backend console during conversion. Look for:

✅ **Good signs:**
- "Found LibreOffice at: ..."
- "LibreOffice conversion finished with code: 0"
- "Successfully converted using LibreOffice"

❌ **Bad signs:**
- "LibreOffice not found"
- "LibreOffice conversion timed out"
- "LibreOffice output file too small"
- "Falling back to text extraction"

### Step 3: Compare file sizes

- **PDF size:** X KB
- **Word size:** Y KB

If Word is much larger (3x+), it may contain images.
If Word is much smaller (0.5x), content may be missing.

### Step 4: Test the diagnostic tool

\`\`\`bash
cd d:\\pdf\\pdf-backend
node test-conversion-diagnostic.js "your-pdf-file.pdf"
\`\`\`

This will show detailed information about the conversion process.

## Advanced Fixes

### Fix 1: Force LibreOffice usage

If LibreOffice is installed but not being used, check:

1. **Path is correct:**
   \`\`\`powershell
   Test-Path "C:\\Program Files\\LibreOffice\\program\\soffice.exe"
   \`\`\`

2. **LibreOffice can run:**
   \`\`\`powershell
   & "C:\\Program Files\\LibreOffice\\program\\soffice.exe" --version
   \`\`\`

### Fix 2: Improve LibreOffice conversion quality

I've already added the `--nofirststartwizard` flag and improved filter options.

Additional options you can try (edit pdf-to-word.service.ts line 62-70):

\`\`\`typescript
const child = spawn(soffice, [
  '--headless',
  '--invisible',
  '--nodefault',
  '--nologo',
  '--norestore',
  '--nofirststartwizard',
  '--convert-to', 'docx',  // Try simpler format string
  '--outdir', outputDir,
  inputPath
], {
  stdio: 'pipe',
  windowsHide: true,
  shell: false
});
\`\`\`

### Fix 3: Enhance text extraction layout detection

The text extraction has sophisticated layout detection (lines 768-871 in pdf-to-word.service.ts).

You can tune these parameters:
- **Alignment thresholds** (line 786-788)
- **Indentation detection** (line 844-871)
- **Heading detection** (line 622-668)

## What to Tell Me

To help you better, please provide:

1. **Specific layout issue:**
   - What should the layout look like?
   - What does it look like in the Word document?
   - Screenshot of PDF vs Word side-by-side would be helpful

2. **Backend logs:**
   - What messages appear in the backend console during conversion?
   - Any errors or warnings?

3. **PDF type:**
   - Can you select text in the PDF?
   - Is it a scanned document?
   - Does it have complex layouts (tables, columns, etc.)?

4. **Diagnostic results:**
   - Run: \`node test-conversion-diagnostic.js your-file.pdf\`
   - Share the output

## Quick Test

Run this now to test the current setup:

\`\`\`bash
cd d:\\pdf\\pdf-backend
node test-conversion-diagnostic.js create-test-pdf.pdf
\`\`\`

(First create the test PDF if it doesn't exist)

This will tell us exactly what's happening during conversion.

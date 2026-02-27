# OCR Diagnostics and Setup

## Issue: OCR shows success in analytics but extracts no text

### Root Cause Analysis
The OCR service has two methods for extracting text from PDFs:
1. **Direct text extraction** using `pdf-parse` (for PDFs with embedded text)
2. **OCR via image conversion** using `pdf2pic` + `tesseract.js` (for scanned/image PDFs)

**Problem**: If `pdf-parse` extracts some text (even if corrupted or meaningless) that passes the length check (>50 chars), the service returns "success" but the text may not be the actual content.

### Dependencies Required

#### For Windows:
1. **ImageMagick** (required for pdf2pic)
   - Download from: https://imagemagick.org/script/download.php#windows
   - Choose the latest version (Q16 or Q8, x64)
   - During installation, check "Add to PATH"
   - Verify: `magick -version`

2. **Ghostscript** (often required by ImageMagick for PDF processing)
   - Download from: https://www.ghostscript.com/download/gsdnld.html
   - Choose GPL Ghostscript
   - Install and ensure it's in PATH
   - Verify: `gswin64c -version`

3. **Tesseract OCR** (usually already working)
   - Verify installation: `tesseract --version`

#### Alternative: Using Chocolatey (if available)
```powershell
# Install Chocolatey first (run as Administrator)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# Then install dependencies
choco install imagemagick
choco install ghostscript
```

### Testing OCR Components

Run the diagnostic script:
```bash
cd pdf-backend
node test-ocr.js
```

This will test:
- Tesseract OCR engine
- pdf-parse for embedded text extraction
- pdf2pic for PDF-to-image conversion

### Troubleshooting Steps

1. **If pdf-parse fails**: The PDF may be corrupted or image-based
2. **If pdf2pic fails**: Missing ImageMagick/Ghostscript
3. **If Tesseract fails**: OCR engine not working
4. **If analytics show success but no text**: The embedded text extraction found some text but it may be garbage

### Recent Fixes Applied

1. **Stricter text validation**: Now checks for meaningful content (words, minimum length checks)
2. **Better logging**: Added detailed logging to track what text is extracted
3. **Improved error handling**: More robust validation prevents empty results

### Testing with Real PDFs

1. **Text-based PDF**: Should extract text directly via pdf-parse
2. **Scanned PDF**: Requires ImageMagick + Tesseract OCR
3. **Mixed PDF**: May have some embedded text, some images

### Common Issues

- **"bad XRef entry"**: PDF corruption, try different PDF
- **"Could not execute GraphicsMagick/ImageMagick"**: Missing ImageMagick
- **Empty text despite success**: Embedded text is not meaningful content
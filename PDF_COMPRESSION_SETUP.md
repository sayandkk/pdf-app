# PDF Compression Tools Setup

For optimal PDF compression performance, install one or more of these tools:

## 1. Ghostscript (Recommended - Best Compression)

### Windows (Chocolatey):
```bash
choco install ghostscript
```

### Windows (Manual):
1. Download from: https://www.ghostscript.com/download/gsdnld.html
2. Install and ensure `gswin64c.exe` is in PATH

### Linux:
```bash
sudo apt-get install ghostscript
# or
sudo yum install ghostscript
```

### macOS:
```bash
brew install ghostscript
```

## 2. QPDF (Good Alternative)

### Windows (Manual Installation):
1. Visit: https://github.com/qpdf/qpdf/releases
2. Download: `qpdf-X.X.X-bin-msvc64.zip` (latest version, e.g., `qpdf-12.2.0-bin-msvc64.zip`)
3. Extract the zip file to a folder (e.g., `C:\qpdf\` or your project `tools\` folder)
4. Copy `qpdf.exe` to your project directory or add the folder to PATH
5. Test: `qpdf --version`

### Windows (Alternative - Single EXE):
1. Download: `qpdf-X.X.X-msvc64.exe` from GitHub releases
2. Rename to `qpdf.exe` and place in your project directory
3. Test: `.\qpdf.exe --version`

### Linux:
```bash
sudo apt-get install qpdf
```

### macOS:
```bash
brew install qpdf
```

## Compression Quality Comparison

| Tool | Compression Ratio | Speed | Dependencies |
|------|------------------|-------|--------------|
| Ghostscript | 70-95% | Fast | External |
| QPDF | 60-90% | Very Fast | External |
| pdf-lib (fallback) | 10-40% | Fast | None |

## Automatic Fallback Chain

The service automatically tries compression methods in this order:
1. **Ghostscript** (best quality)
2. **QPDF** (good alternative)
3. **pdf-lib** (basic, always works)

No external tools required - the service works with just pdf-lib for basic compression.
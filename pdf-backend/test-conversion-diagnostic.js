/**
 * Diagnostic tool to test PDF to Word conversion and identify layout issues
 * Run this to see detailed logs of what's happening during conversion
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testConversion(pdfPath) {
    console.log('🔍 PDF to Word Conversion Diagnostic Tool\n');
    console.log('='.repeat(60));

    if (!fs.existsSync(pdfPath)) {
        console.error(`❌ PDF file not found: ${pdfPath}`);
        console.log('\nUsage: node test-conversion-diagnostic.js <path-to-pdf>');
        console.log('Example: node test-conversion-diagnostic.js test.pdf');
        return;
    }

    const stats = fs.statSync(pdfPath);
    console.log(`\n📄 Input PDF: ${path.basename(pdfPath)}`);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   Path: ${pdfPath}`);

    try {
        // Read the PDF file
        const pdfBuffer = fs.readFileSync(pdfPath);

        // Create form data
        const formData = new FormData();
        formData.append('files', pdfBuffer, {
            filename: path.basename(pdfPath),
            contentType: 'application/pdf'
        });

        console.log('\n🔄 Sending to backend...');
        console.log('   Endpoint: http://localhost:3000/pdf-to-word/convert');

        const startTime = Date.now();

        // Send to backend
        const response = await fetch('http://localhost:3000/pdf-to-word/convert', {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });

        const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`\n❌ Conversion failed with status ${response.status}`);
            console.error(`   Error: ${errorText}`);
            return;
        }

        const result = await response.json();

        console.log(`\n✅ Conversion completed in ${processingTime}s`);
        console.log(`   Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);

        if (result.success && result.data && result.data.length > 0) {
            const convertedFile = result.data[0];
            const outputPath = path.join(__dirname, convertedFile.filename);

            // Decode base64 and save
            const wordBuffer = Buffer.from(convertedFile.data, 'base64');
            fs.writeFileSync(outputPath, wordBuffer);

            console.log(`\n📝 Output Word Document:`);
            console.log(`   Filename: ${convertedFile.filename}`);
            console.log(`   Size: ${(wordBuffer.length / 1024).toFixed(2)} KB`);
            console.log(`   Saved to: ${outputPath}`);

            // Analyze the Word document
            console.log(`\n🔍 Analysis:`);

            // Check if it's a valid DOCX (ZIP file)
            const isValidDocx = wordBuffer[0] === 0x50 && wordBuffer[1] === 0x4B;
            console.log(`   Valid DOCX format: ${isValidDocx ? '✅ Yes' : '❌ No'}`);

            // Check file size ratio
            const sizeRatio = (wordBuffer.length / pdfBuffer.length).toFixed(2);
            console.log(`   Size ratio (Word/PDF): ${sizeRatio}x`);

            if (sizeRatio > 2) {
                console.log(`   ⚠️  Word file is significantly larger - may contain embedded images`);
            } else if (sizeRatio < 0.5) {
                console.log(`   ⚠️  Word file is significantly smaller - may have lost content`);
            }

            console.log(`\n✅ Conversion diagnostic complete!`);
            console.log(`\n📋 Next steps:`);
            console.log(`   1. Open the Word file: ${outputPath}`);
            console.log(`   2. Check if the layout matches the original PDF`);
            console.log(`   3. Verify text is editable (not an image)`);
            console.log(`   4. Check for missing content or formatting issues`);

        } else {
            console.error(`\n❌ No converted files in response`);
            console.error(`   Response:`, JSON.stringify(result, null, 2));
        }

    } catch (error) {
        console.error(`\n❌ Error during conversion:`);
        console.error(`   ${error.message}`);
        if (error.stack) {
            console.error(`\n   Stack trace:`);
            console.error(error.stack);
        }
    }

    console.log('\n' + '='.repeat(60));
}

// Get PDF path from command line
const pdfPath = process.argv[2];

if (!pdfPath) {
    console.log('📖 Usage: node test-conversion-diagnostic.js <path-to-pdf>');
    console.log('\nExample:');
    console.log('  node test-conversion-diagnostic.js sample.pdf');
    console.log('  node test-conversion-diagnostic.js "C:\\Users\\Documents\\resume.pdf"');
    process.exit(1);
}

testConversion(pdfPath).catch(console.error);

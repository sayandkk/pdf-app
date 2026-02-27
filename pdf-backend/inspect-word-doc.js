const fs = require('fs');
const JSZip = require('jszip');

async function inspectWordDocument() {
  try {
    console.log('Inspecting generated Word document...');

    const docPath = 'test-image-conversion.docx';
    if (!fs.existsSync(docPath)) {
      console.log('Word document not found!');
      return;
    }

    // Read the .docx file (which is a ZIP file)
    const docxBuffer = fs.readFileSync(docPath);
    const zip = await JSZip.loadAsync(docxBuffer);

    console.log('\n📄 Contents of the Word document:');
    Object.keys(zip.files).forEach(filename => {
      const file = zip.files[filename];
      console.log(`- ${filename} (${file._data?.compressedSize || 0} bytes)`);
    });

    // Check if there are images in word/media/
    const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith('word/media/'));
    console.log(`\n🖼️  Found ${mediaFiles.length} media files:`);
    mediaFiles.forEach(filename => {
      const file = zip.files[filename];
      console.log(`- ${filename} (${file._data?.compressedSize || 0} bytes)`);
    });

    // Check document.xml for image references
    if (zip.files['word/document.xml']) {
      const documentXml = await zip.files['word/document.xml'].async('text');
      const imageReferences = (documentXml.match(/<w:drawing>/g) || []).length;
      const blipReferences = (documentXml.match(/<a:blip/g) || []).length;
      
      console.log(`\n📋 Document XML analysis:`);
      console.log(`- Drawing elements: ${imageReferences}`);
      console.log(`- Image (blip) references: ${blipReferences}`);
      
      if (imageReferences > 0 || blipReferences > 0) {
        console.log('✅ Images are properly embedded in the document!');
      } else {
        console.log('❌ No image references found in document XML');
      }
    }

    console.log(`\n📊 Document size: ${docxBuffer.length} bytes`);

  } catch (error) {
    console.error('Error inspecting document:', error);
  }
}

inspectWordDocument();
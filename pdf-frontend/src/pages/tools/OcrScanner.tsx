import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Download, FileIcon, Scan, Eye, Copy, FileText, Image, AlertCircle, Zap, Languages, Target, Gauge } from "lucide-react";
import { toast } from "sonner";

interface OcrResult {
  file: string;
  confidence: number;
  text: string;
  language: string;
  pages: number;
}

export const OcrScanner = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeResult, setActiveResult] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(fileArray);
    }
  };

  const handleScan = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select files to scan");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    toast("Starting OCR processing...");

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      // Update progress
      setProgress(25);

      const response = await fetch('http://localhost:3000/ocr/scan', {
        method: 'POST',
        body: formData,
      });

      setProgress(75);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setOcrResults(result.data);
        setActiveResult(0);
        setExtractedText(result.data[0]?.text || "");
        setProgress(100);
        
        // Log the results for debugging
        console.log('OCR Results:', result.data);
        console.log('First result text:', result.data[0]?.text);
        
        if (result.data[0]?.text && result.data[0].text.trim().length > 0) {
          toast.success(`Text extracted successfully! (${result.data[0].text.length} characters)`);
        } else {
          toast.warning("OCR completed but no text was extracted. The document might be image-only or corrupted.");
        }
      } else {
        throw new Error(result.message || "OCR processing failed");
      }
    } catch (error) {
      console.error('OCR error:', error);
      toast.error("Failed to process files. Please try again.");
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
    toast("Text copied to clipboard!");
  };

  const downloadText = () => {
    const blob = new Blob([extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted-text.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast("Text file downloaded!");
  };

  const currentResult = ocrResults[activeResult];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
             
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                  OCR Scanner
                </h1>
                <p className="text-lg text-gray-600">
                  Extract text from scanned documents and images with advanced optical character recognition
                </p>
              </div>
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-sm py-1">
            <Zap className="h-3 w-3 mr-1" />
            AI-Powered
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <Card className="lg:col-span-2 border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-gray-900">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Upload className="h-5 w-5 text-blue-600" />
                </div>
                Upload Documents
              </CardTitle>
              <CardDescription className="text-gray-600">
                Upload PDFs or images to extract text using advanced OCR technology
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="pdf" className="w-full">
                <TabsList className="grid w-full grid-cols-1 lg:grid-cols-2 bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
                  <TabsTrigger 
                    value="pdf" 
                    className="flex items-center gap-3 rounded-xl data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600 data-[state=active]:border data-[state=active]:border-blue-200"
                  >
                    <FileText className="h-5 w-5" />
                    PDF Files
                  </TabsTrigger>
                  <TabsTrigger 
                    value="image" 
                    className="flex items-center gap-3 rounded-xl data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600 data-[state=active]:border data-[state=active]:border-blue-200"
                  >
                    <Image className="h-5 w-5" />
                    Images
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="pdf" className="mt-6">
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer"
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                  >
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-gray-900 mb-2">Upload PDF documents</p>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Supports scanned PDFs, image-based documents, and multi-page files
                    </p>
                    <input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Choose PDF Files
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="image" className="mt-6">
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center transition-all duration-200 hover:border-cyan-300 hover:bg-cyan-50/50 cursor-pointer"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <Image className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-gray-900 mb-2">Upload Images</p>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Supports JPG, PNG, TIFF, BMP, and other common image formats
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                      id="image-upload"
                    />
                    <Button className="bg-cyan-600 hover:bg-cyan-700">
                      Choose Image Files
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {selectedFiles.length > 0 && (
                <div className="space-y-4 bg-gray-50 rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 text-lg">Selected Files ({selectedFiles.length})</h4>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedFiles([])}
                      className="border-gray-300 hover:bg-white text-gray-700"
                    >
                      Clear All
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-white">
                        <div className="p-2 bg-red-50 rounded-lg">
                          <FileIcon className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{file.name}</div>
                          <div className="text-xs text-gray-600">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </div>
                        </div>
                        <Badge className="bg-gray-100 text-gray-700">
                          {file.type.includes('pdf') ? 'PDF' : 'Image'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-sm py-3 text-lg"
                onClick={handleScan}
                disabled={isProcessing || selectedFiles.length === 0}
                size="lg"
              >
                {isProcessing ? "Processing OCR..." : "Start OCR Scan"}
              </Button>

              {isProcessing && (
                <div className="space-y-4 bg-blue-50 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">Extracting text from documents...</span>
                    <span className="text-sm text-gray-600">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2 bg-gray-200" />
                  <p className="text-sm text-gray-600 text-center">
                    Analyzing {selectedFiles.length} file(s) with advanced OCR algorithms
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* OCR Stats */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-gray-900">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                OCR Statistics
              </CardTitle>
              <CardDescription className="text-gray-600">
                Real-time processing metrics and confidence scores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentResult ? (
                <>
                  <div className="text-center bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {currentResult.confidence}%
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Confidence Score</div>
                    <p className="text-xs text-gray-500 mt-2">Text recognition accuracy</p>
                  </div>
                  <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      {currentResult.language.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Detected Language</div>
                    <p className="text-xs text-gray-500 mt-2">Auto-detected from content</p>
                  </div>
                  <div className="text-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                    <div className="text-xl font-bold text-purple-600 mb-2">
                      {extractedText.split(/\s+/).filter(word => word.length > 0).length}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Words Extracted</div>
                    <p className="text-xs text-gray-500 mt-2">Total recognized words</p>
                  </div>
                  <div className="text-center bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6">
                    <div className="text-lg font-bold text-orange-600 mb-2">
                      {currentResult.pages}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Pages Processed</div>
                    <p className="text-xs text-gray-500 mt-2">Document pages analyzed</p>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 bg-gray-50 rounded-2xl p-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="font-medium text-gray-600">Upload and scan documents to see statistics</p>
                  <p className="text-sm text-gray-500 mt-2">Real-time metrics will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {ocrResults.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* File List */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  Processed Files
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Click on any file to view its extracted text
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ocrResults.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                      activeResult === index 
                        ? 'border-blue-300 bg-blue-50 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setActiveResult(index);
                      setExtractedText(result.text);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-50 rounded-lg">
                        <FileIcon className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{result.file}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-xs ${
                            result.confidence > 90 ? 'bg-green-100 text-green-800' :
                            result.confidence > 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {result.confidence}% confidence
                          </Badge>
                          <span className="text-xs text-gray-500">{result.language}</span>
                        </div>
                      </div>
                      {activeResult === index && (
                        <div className="p-1 bg-blue-100 rounded-lg">
                          <Eye className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Extracted Text */}
            <Card className="lg:col-span-2 border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-gray-900">
                  <span className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Scan className="h-5 w-5 text-blue-600" />
                    </div>
                    Extracted Text
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={copyToClipboard} className="border-gray-300 hover:bg-white">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={downloadText} className="border-gray-300 hover:bg-white">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {currentResult?.file} • {extractedText.length} characters, {extractedText.split(/\s+/).filter(word => word.length > 0).length} words
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    value={extractedText}
                    onChange={(e) => setExtractedText(e.target.value)}
                    className="min-h-[400px] font-mono text-sm rounded-xl border-gray-300"
                    placeholder={extractedText ? "Extracted text appears here..." : "No text extracted yet. Upload a document and click 'Start OCR Scan' to extract text."}
                  />
                  {extractedText && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 rounded-xl p-3">
                      <div className="p-1 bg-blue-100 rounded-lg">
                        <Scan className="h-4 w-4 text-blue-600" />
                      </div>
                      <span>You can edit the text directly in this box and use Copy/Download buttons above.</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Features */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-gray-900">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Gauge className="h-5 w-5 text-blue-600" />
              </div>
              OCR Features & Capabilities
            </CardTitle>
            <CardDescription className="text-gray-600">
              Advanced optical character recognition with industry-leading accuracy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                <div className="text-2xl font-bold text-green-600 mb-2">99.5%</div>
                <div className="text-sm font-medium text-gray-900 mb-1">Accuracy Rate</div>
                <div className="text-xs text-gray-600">For high-quality documents and clear images</div>
              </div>
              <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                <div className="text-2xl font-bold text-blue-600 mb-2">50+</div>
                <div className="text-sm font-medium text-gray-900 mb-1">Languages</div>
                <div className="text-xs text-gray-600">Multi-language support with auto-detection</div>
              </div>
              <div className="text-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                <div className="text-2xl font-bold text-purple-600 mb-2">Fast</div>
                <div className="text-sm font-medium text-gray-900 mb-1">Processing</div>
                <div className="text-xs text-gray-600">Average 30 seconds per page with AI acceleration</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
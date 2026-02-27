import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Upload, Download, FileIcon, Zap, Settings, TrendingDown, BarChart3 } from "lucide-react";
import { API_BASE_URL } from "@/config";
import { toast } from "sonner";
import { Label } from "recharts";

// Helper to format size as MB, KB, or B
function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + " KB";
  }
  return bytes + " B";
}

export const PdfCompression = () => {
  const [compressionLevel, setCompressionLevel] = useState([70]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedFiles, setProcessedFiles] = useState<
    { name: string; size: string; compressed: string; savings: string; blob?: Blob }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleCompress = async () => {
    if (!selectedFile) {
      toast("Please select a PDF file to compress.");
      return;
    }
    setIsProcessing(true);
    toast("Starting compression...");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/pdf-compression?compressionLevel=${compressionLevel[0]}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        // Calculate sizes for stats
        const originalSize = formatSize(selectedFile.size);
        const compressedSize = formatSize(blob.size);
        const savings =
          selectedFile.size > 0
            ? Math.round(
              100 - (blob.size / selectedFile.size) * 100
            ) + "%"
            : "0%";
        setProcessedFiles([
          {
            name: selectedFile.name,
            size: originalSize,
            compressed: compressedSize,
            savings,
            blob,
          },
          ...processedFiles,
        ]);
        // Download the compressed PDF
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "compressed.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast("File compressed successfully!");
      } else {
        toast("Compression failed");
      }
    } catch (err) {
      toast("Error connecting to backend");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (file: { name: string; blob?: Blob }) => {
    if (!file.blob) return;
    const url = window.URL.createObjectURL(file.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compressed-${file.name}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // Stats
  const avgSavings =
    processedFiles.length > 0
      ? (
        processedFiles.reduce((acc, f) => acc + parseInt(f.savings), 0) /
        processedFiles.length
      ).toFixed(0) + "%"
      : "0%";
  const totalSaved =
    processedFiles.length > 0
      ? formatSize(
        processedFiles.reduce(
          (acc, f) => {
            // Parse size string to bytes
            const parse = (s: string) => {
              if (s.endsWith("MB")) return parseFloat(s) * 1024 * 1024;
              if (s.endsWith("KB")) return parseFloat(s) * 1024;
              if (s.endsWith("B")) return parseFloat(s);
              return parseFloat(s);
            };
            return acc + (parse(f.size) - parse(f.compressed));
          },
          0
        )
      )
      : "0 B";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
             
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                  PDF Compression Tool
                </h1>
                <p className="text-lg text-gray-600">
                  Reduce PDF file sizes while maintaining quality for easier sharing and storage
                </p>
              </div>
            </div>
          </div>
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-sm py-1">
            <TrendingDown className="h-3 w-3 mr-1" />
            Optimized
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
                Upload & Compress PDFs
              </CardTitle>
              <CardDescription className="text-gray-600">
                Upload your PDF files and compress them to reduce file size while preserving quality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center transition-all duration-200 hover:border-orange-300 hover:bg-orange-50/50 cursor-pointer"
                onClick={handleChooseFile}
              >
                <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl font-semibold text-gray-900 mb-2">
                  Drop your PDF file here
                </p>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  or click to browse. Support for PDF files up to 100MB.
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button className="bg-orange-600 hover:bg-orange-700">
                  {selectedFile ? selectedFile.name : "Choose File"}
                </Button>
              </div>

              {/* Compression Settings */}
              <div className="space-y-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Settings className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="font-semibold text-gray-900 text-lg">Compression Settings</span>
                </div>
                <div className="space-y-4 bg-gray-50 rounded-2xl p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-gray-900 font-medium">Compression Level</Label>
                      <span className="text-lg font-bold text-orange-600">{compressionLevel[0]}%</span>
                    </div>
                    <Slider
                      value={compressionLevel}
                      onValueChange={setCompressionLevel}
                      max={100}
                      min={30}
                      step={10}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <TrendingDown className="h-4 w-4" />
                        Smaller Size
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-4 w-4" />
                        Better Quality
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-sm py-3 text-lg"
                onClick={handleCompress}
                disabled={isProcessing || !selectedFile}
                size="lg"
              >
                {isProcessing ? "Compressing..." : "Compress PDF"}
              </Button>

              {isProcessing && (
                <div className="space-y-4 bg-blue-50 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">Processing file...</span>
                    <span className="text-sm text-gray-600">67%</span>
                  </div>
                  <Progress value={67} className="h-2 bg-gray-200" />
                  <p className="text-sm text-gray-600 text-center">
                    Optimizing images and compressing content...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-gray-900">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                Compression Stats
              </CardTitle>
              <CardDescription className="text-gray-600">
                Track your space savings and compression efficiency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-6">
                <div className="text-3xl font-bold text-green-600 mb-2">{avgSavings}</div>
                <div className="text-sm text-gray-600 font-medium">Average Savings</div>
                <p className="text-xs text-gray-500 mt-2">Across all processed files</p>
              </div>
              <div className="text-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6">
                <div className="text-2xl font-bold text-blue-600 mb-2">{totalSaved}</div>
                <div className="text-sm text-gray-600 font-medium">Total Space Saved</div>
                <p className="text-xs text-gray-500 mt-2">Cumulative storage reduction</p>
              </div>
              <div className="text-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                <div className="text-xl font-bold text-purple-600 mb-2">{processedFiles.length}</div>
                <div className="text-sm text-gray-600 font-medium">Files Processed</div>
                <p className="text-xs text-gray-500 mt-2">Successful compressions</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Processed Files */}
        {processedFiles.length > 0 && (
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-gray-900">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileIcon className="h-5 w-5 text-blue-600" />
                </div>
                Recently Compressed Files
              </CardTitle>
              <CardDescription className="text-gray-600">
                Download your compressed files or process new ones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {processedFiles.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-50 rounded-lg">
                        <FileIcon className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{file.name}</div>
                        <div className="text-sm text-gray-600">
                          <span className="line-through">{file.size}</span> → <span className="font-semibold text-green-600">{file.compressed}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        {file.savings} saved
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDownload(file)}
                        className="border-gray-300 hover:bg-white text-blue-600"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
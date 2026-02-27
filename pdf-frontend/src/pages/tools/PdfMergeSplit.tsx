import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, FileIcon, Merge, Split, GripVertical, X, Zap, Files } from "lucide-react";
import { toast } from "sonner";

export const PdfMergeSplit = () => {
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitPages, setSplitPages] = useState("1-10, 11-20, 21-30");

  const handleMergeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
      setMergeFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const handleSplitFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && e.target.files[0].type === 'application/pdf') {
      setSplitFile(e.target.files[0]);
    }
  };

  const handleMerge = async () => {
    if (mergeFiles.length < 2) {
      toast("Please select at least 2 PDF files to merge");
      return;
    }

    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      mergeFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/pdf-merge-split/merge`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Merge failed');
      }

      const result = await response.json();
      
      // Download merged file
      const blob = new Blob([Uint8Array.from(atob(result.data), c => c.charCodeAt(0))], {
        type: 'application/pdf'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename || 'merged.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast("Files merged successfully!");
      setMergeFiles([]);
    } catch (error) {
      console.error('Merge error:', error);
      toast("Merge failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSplit = async () => {
    if (!splitFile) {
      toast("Please select a PDF file to split");
      return;
    }

    if (!splitPages.trim()) {
      toast("Please specify page ranges");
      return;
    }

    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', splitFile);
      formData.append('ranges', splitPages);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/pdf-merge-split/split`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Split failed');
      }

      const result = await response.json();
      
      // Check if we got the new enhanced response format
      if (result.success && result.files) {
        // New enhanced format with detailed information
        console.log(`✅ PDF split successfully: ${result.message}`);
        console.log(`📄 Original file: ${result.originalFile}`);
        console.log(`📦 Total parts: ${result.totalParts}`);
        
        // Download split files with detailed information
        result.files.forEach((file: any) => {
          console.log(`📄 Downloading: ${file.filename} (${file.description})`);
          
          const blob = new Blob([Uint8Array.from(atob(file.data), c => c.charCodeAt(0))], {
            type: 'application/pdf'
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });

        toast(`✅ PDF split successfully into ${result.totalParts} parts!`, {
          description: `Each file is clearly labeled with its page range`,
        });
      } else {
        // Legacy format fallback
        result.forEach((file: any, index: number) => {
          const blob = new Blob([Uint8Array.from(atob(file.data), c => c.charCodeAt(0))], {
            type: 'application/pdf'
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.filename || `split-${index + 1}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });

        toast("File split successfully!");
      }
      
      setSplitFile(null);
    } catch (error) {
      console.error('Split error:', error);
      toast("Split failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (index: number) => {
    setMergeFiles(files => files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
             
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                  PDF Merge & Split
                </h1>
                <p className="text-lg text-gray-600">
                  Combine multiple PDFs or split large documents into smaller, manageable files
                </p>
              </div>
            </div>
          </div>
          <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 text-sm py-1">
            <Zap className="h-3 w-3 mr-1" />
            Flexible
          </Badge>
        </div>

        <Tabs defaultValue="merge" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 lg:grid-cols-2 bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
            <TabsTrigger 
              value="merge" 
              className="flex items-center gap-3 rounded-xl data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600 data-[state=active]:border data-[state=active]:border-blue-200"
            >
              <Merge className="h-5 w-5" />
              Merge PDFs
            </TabsTrigger>
            <TabsTrigger 
              value="split" 
              className="flex items-center gap-3 rounded-xl data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600 data-[state=active]:border data-[state=active]:border-blue-200"
            >
              <Split className="h-5 w-5" />
              Split PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="merge" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-gray-900">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Merge className="h-5 w-5 text-blue-600" />
                    </div>
                    Files to Merge
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Upload multiple PDF files and arrange them in the desired order
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer"
                    onClick={() => document.getElementById('merge-files')?.click()}
                  >
                    <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-gray-900 mb-2">
                      Add PDF files to merge
                    </p>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Select multiple PDF files. Drag and drop or click to browse.
                    </p>
                    <input
                      id="merge-files"
                      type="file"
                      multiple
                      accept=".pdf"
                      className="hidden"
                      onChange={handleMergeFileSelect}
                    />
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                      Choose Files
                    </Button>
                  </div>

                  {mergeFiles.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 text-lg">Selected Files ({mergeFiles.length})</h4>
                        <Button 
                          variant="outline" 
                          onClick={() => setMergeFiles([])}
                          className="border-gray-300 hover:bg-white text-gray-700"
                        >
                          Clear All
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {mergeFiles.map((file, index) => (
                          <div 
                            key={index} 
                            className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white hover:shadow-md transition-all duration-200"
                          >
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <GripVertical className="h-4 w-4 text-gray-600 cursor-move" />
                            </div>
                            <div className="p-2 bg-red-50 rounded-lg">
                              <FileIcon className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{file.name}</div>
                              <div className="text-sm text-gray-600">
                                {formatFileSize(file.size)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-gray-100 text-gray-700">
                                {index + 1}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFile(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button 
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-sm py-3 text-lg"
                    onClick={handleMerge}
                    disabled={isProcessing || mergeFiles.length < 2}
                    size="lg"
                  >
                    {isProcessing ? (
                      <>Merging {mergeFiles.length} Files...</>
                    ) : (
                      <>Merge {mergeFiles.length} Files</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-gray-900">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Files className="h-5 w-5 text-blue-600" />
                    </div>
                    Merge Preview
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Overview of your merged document
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      {formatFileSize(mergeFiles.reduce((sum, file) => sum + file.size, 0))}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Estimated Size</div>
                    <p className="text-xs text-gray-500 mt-2">Combined file size</p>
                  </div>
                  
                  <div className="text-center bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                    <div className="text-xl font-bold text-green-600 mb-2">
                      {mergeFiles.length}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Files Selected</div>
                    <p className="text-xs text-gray-500 mt-2">Ready for merging</p>
                  </div>

                  {mergeFiles.length >= 2 && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600 font-medium mb-2">Merge Order:</div>
                      <div className="space-y-2">
                        {mergeFiles.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Badge className="bg-gray-100 text-gray-700 text-xs">{index + 1}</Badge>
                            <span className="text-gray-600 truncate">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="split" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-gray-900">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Split className="h-5 w-5 text-blue-600" />
                    </div>
                    Split PDF File
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Upload a PDF file and specify page ranges to split into multiple documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center transition-all duration-200 hover:border-purple-300 hover:bg-purple-50/50 cursor-pointer"
                    onClick={() => document.getElementById('split-file')?.click()}
                  >
                    <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-gray-900 mb-2">
                      Upload PDF to split
                    </p>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Select a PDF file that you want to split into multiple documents
                    </p>
                    <input
                      id="split-file"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleSplitFileSelect}
                    />
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      Choose File
                    </Button>
                  </div>

                  {splitFile && (
                    <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white">
                      <div className="p-3 bg-red-50 rounded-lg">
                        <FileIcon className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{splitFile.name}</div>
                        <div className="text-sm text-gray-600">
                          {formatFileSize(splitFile.size)}
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Loaded</Badge>
                    </div>
                  )}

                  <div className="space-y-4 bg-gray-50 rounded-2xl p-6">
                    <div className="space-y-3">
                      <Label htmlFor="split-ranges" className="text-gray-900 font-medium">Split Ranges</Label>
                      <Input
                        id="split-ranges"
                        value={splitPages}
                        onChange={(e) => setSplitPages(e.target.value)}
                        placeholder="e.g., 1-10, 11-20, 21-30"
                        className="rounded-xl border-gray-300"
                      />
                      <p className="text-sm text-gray-600">
                        Specify page ranges separated by commas. Example: 1-10, 11-20, 21-30
                      </p>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-sm py-3 text-lg"
                    onClick={handleSplit}
                    disabled={isProcessing || !splitFile}
                    size="lg"
                  >
                    {isProcessing ? "Splitting PDF..." : "Split PDF"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-gray-900">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Files className="h-5 w-5 text-blue-600" />
                    </div>
                    Split Preview
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Preview of the split operation results
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                    <div className="text-2xl font-bold text-purple-600 mb-2">
                      {splitPages.split(',').length}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Output Files</div>
                    <p className="text-xs text-gray-500 mt-2">Parts to be created</p>
                  </div>

                  <div className="space-y-4">
                    <div className="text-sm font-medium text-gray-900">Split Parts:</div>
                    <div className="space-y-3">
                      {splitPages.split(',').map((range, index) => {
                        const cleanRange = range.trim();
                        const parts = cleanRange.split('-');
                        let description = '';
                        
                        if (parts.length === 1) {
                          description = `Page ${parts[0]}`;
                        } else if (parts.length === 2) {
                          const start = parseInt(parts[0]);
                          const end = parseInt(parts[1]);
                          const pageCount = end - start + 1;
                          description = `Pages ${start}-${end} (${pageCount} pages)`;
                        } else {
                          description = `Pages ${cleanRange}`;
                        }
                        
                        const filename = splitFile 
                          ? `${splitFile.name.replace('.pdf', '')}_part${index + 1}_${cleanRange.replace('-', 'to')}.pdf`
                          : `part${index + 1}_${cleanRange.replace('-', 'to')}.pdf`;
                        
                        return (
                          <div key={index} className="p-3 border border-gray-200 rounded-xl bg-white">
                            <div className="font-medium text-sm text-gray-900">{filename}</div>
                            <div className="text-gray-600 text-xs mt-1">{description}</div>
                            <Badge className="bg-blue-100 text-blue-800 mt-2 text-xs">
                              Part {index + 1}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {splitFile && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600 font-medium mb-2">Source File:</div>
                      <div className="flex items-center gap-2 text-sm">
                        <FileIcon className="h-4 w-4 text-red-500" />
                        <span className="text-gray-600 truncate">{splitFile.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatFileSize(splitFile.size)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
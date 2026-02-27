import { useState } from "react";
import { Upload, Download, FileText, Settings, Clock, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const conversionHistory = [
  {
    id: "1",
    filename: "Annual_Report_2024.pdf",
    originalSize: "2.4 MB",
    convertedSize: "1.8 MB",
    status: "completed",
    convertedAt: "2 hours ago",
    downloadUrl: "#"
  },
  {
    id: "2",
    filename: "Marketing_Proposal.pdf",
    originalSize: "1.1 MB",
    convertedSize: "890 KB",
    status: "processing",
    convertedAt: "Processing...",
    downloadUrl: "#"
  },
  {
    id: "3",
    filename: "Technical_Specs.pdf",
    originalSize: "5.2 MB",
    convertedSize: "4.1 MB",
    status: "completed",
    convertedAt: "1 day ago",
    downloadUrl: "#"
  },
  {
    id: "4",
    filename: "Invoice_March.pdf",
    originalSize: "324 KB",
    convertedSize: "298 KB",
    status: "failed",
    convertedAt: "2 days ago",
    downloadUrl: "#"
  },
];

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    completed: { color: "bg-green-100 text-green-800 hover:bg-green-100", icon: CheckCircle },
    processing: { color: "bg-blue-100 text-blue-800 hover:bg-blue-100", icon: Clock },
    failed: { color: "bg-red-100 text-red-800 hover:bg-red-100", icon: AlertCircle },
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  const Icon = config.icon;

  return (
    <Badge className={config.color}>
      <Icon className="h-3 w-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export const PdfToWord = () => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [isConverting, setIsConverting] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const startConversion = async () => {
    if (files.length === 0) return;
    
    setIsConverting(true);
    setConversionProgress(0);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      // Simulate progress
      const progressInterval = setInterval(() => {
        setConversionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/pdf-to-word/convert`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Conversion failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setConversionProgress(100);
        
        // Download converted files
        result.data.forEach((file: any, index: number) => {
          const blob = new Blob([Uint8Array.from(atob(file.data), c => c.charCodeAt(0))], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
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

        // Reset after successful conversion
        setTimeout(() => {
          setIsConverting(false);
          setConversionProgress(0);
          setFiles([]);
        }, 1000);
      } else {
        throw new Error(result.message || 'Conversion failed');
      }
    } catch (error) {
      console.error('Conversion error:', error);
      setIsConverting(false);
      setConversionProgress(0);
      alert('Conversion failed. Please try again.');
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
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
                  PDF to Word Converter
                </h1>
                <p className="text-lg text-gray-600">
                  Convert PDF documents to editable Word format with high accuracy and formatting preservation
                </p>
              </div>
            </div>
          </div>
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-sm py-1">
            <Zap className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>

        <Tabs defaultValue="convert" className="space-y-6">
          <TabsList className="grid  bg-white p-1  border border-gray-200 shadow-sm">
            <TabsTrigger 
              value="convert" 
              className=""
            >
              Convert Files
            </TabsTrigger>
            {/* <TabsTrigger 
              value="settings" 
              className="rounded-xl data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600 data-[state=active]:border data-[state=active]:border-blue-200"
            >
              Settings
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="rounded-xl data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600 data-[state=active]:border data-[state=active]:border-blue-200"
            >
              Conversion History
            </TabsTrigger> */}
          </TabsList>

          <TabsContent value="convert" className="space-y-6">
            {/* Upload Area */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Upload className="h-5 w-5 text-blue-600" />
                  </div>
                  Upload PDF Files
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Drag and drop your PDF files here or click to browse. Support for files up to 50MB each.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
                    dragActive
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-300 hover:border-blue-300 hover:bg-blue-50/50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your PDF files here
                  </p>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Support for PDF files up to 50MB each. Multiple files can be uploaded at once.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button asChild className="bg-blue-600 hover:bg-blue-700">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Browse Files
                        <input
                          id="file-upload"
                          type="file"
                          multiple
                          accept=".pdf"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                      </label>
                    </Button>
                    <span className="text-gray-500">or</span>
                    <Button variant="outline" className="border-gray-300 hover:bg-white">
                      Import from Cloud
                    </Button>
                  </div>
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 text-lg">Selected Files ({files.length})</h4>
                      <Button 
                        variant="outline" 
                        onClick={() => setFiles([])}
                        className="border-gray-300 hover:bg-white text-gray-700"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <FileText className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{file.name}</p>
                              <p className="text-sm text-gray-500">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conversion Controls */}
                {files.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    {isConverting ? (
                      <div className="space-y-4 bg-blue-50 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">Converting files...</span>
                          <span className="text-sm text-gray-600">{conversionProgress}%</span>
                        </div>
                        <Progress value={conversionProgress} className="h-2 bg-gray-200" />
                        <p className="text-sm text-gray-600 text-center">
                          Processing {files.length} file(s). This may take a few moments.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Button
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm"
                          onClick={startConversion}
                          size="lg"
                        >
                          <FileText className="mr-2 h-5 w-5" />
                          Convert to Word ({files.length} files)
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setFiles([])}
                          className="border-gray-300 hover:bg-white"
                        >
                          Clear Selection
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Settings className="h-5 w-5 text-blue-600" />
                  </div>
                  Conversion Settings
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Configure conversion options for optimal results and formatting preservation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="output-format" className="text-gray-900 font-medium">Output Format</Label>
                      <Select defaultValue="docx">
                        <SelectTrigger className="border-gray-300 rounded-xl">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="docx">Microsoft Word (.docx)</SelectItem>
                          <SelectItem value="doc">Word 97-2003 (.doc)</SelectItem>
                          <SelectItem value="rtf">Rich Text Format (.rtf)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="quality" className="text-gray-900 font-medium">Conversion Quality</Label>
                      <Select defaultValue="high">
                        <SelectTrigger className="border-gray-300 rounded-xl">
                          <SelectValue placeholder="Select quality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High (Slower, Better Quality)</SelectItem>
                          <SelectItem value="medium">Medium (Balanced)</SelectItem>
                          <SelectItem value="fast">Fast (Quick, Standard Quality)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="language" className="text-gray-900 font-medium">Document Language</Label>
                      <Select defaultValue="auto">
                        <SelectTrigger className="border-gray-300 rounded-xl">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto-detect</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
                      <div className="space-y-1">
                        <Label className="text-gray-900 font-medium">Preserve Formatting</Label>
                        <p className="text-sm text-gray-600">
                          Maintain original layout and styling
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
                      <div className="space-y-1">
                        <Label className="text-gray-900 font-medium">Extract Images</Label>
                        <p className="text-sm text-gray-600">
                          Include images in the conversion
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
                      <div className="space-y-1">
                        <Label className="text-gray-900 font-medium">OCR for Scanned PDFs</Label>
                        <p className="text-sm text-gray-600">
                          Convert scanned text to editable text
                        </p>
                      </div>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
                      <div className="space-y-1">
                        <Label className="text-gray-900 font-medium">Batch Processing</Label>
                        <p className="text-sm text-gray-600">
                          Process multiple files simultaneously
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  Conversion History
                </CardTitle>
                <CardDescription className="text-gray-600">
                  View and download your previous conversions from the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-gray-200">
                        <TableHead className="text-gray-900 font-semibold">File Name</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Original Size</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Converted Size</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Status</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Converted</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conversionHistory.map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-50 border-b border-gray-200 last:border-0">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-50 rounded-lg">
                                <FileText className="h-4 w-4 text-blue-600" />
                              </div>
                              <span className="font-medium text-gray-900">{item.filename}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {item.originalSize}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {item.convertedSize}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={item.status} />
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {item.convertedAt}
                          </TableCell>
                          <TableCell>
                            {item.status === "completed" ? (
                              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            ) : item.status === "processing" ? (
                              <span className="text-sm text-gray-600">Processing...</span>
                            ) : (
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                Retry
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
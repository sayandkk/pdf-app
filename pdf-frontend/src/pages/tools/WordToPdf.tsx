import { useState } from "react";
import { Upload, Download, FileText, Settings, Clock, CheckCircle, AlertCircle, File, Zap } from "lucide-react";
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
    filename: "Project_Proposal.docx",
    originalSize: "1.2 MB",
    convertedSize: "890 KB",
    status: "completed",
    convertedAt: "1 hour ago",
    downloadUrl: "#"
  },
  {
    id: "2",
    filename: "Meeting_Notes.docx",
    originalSize: "456 KB",
    convertedSize: "398 KB",
    status: "processing",
    convertedAt: "Processing...",
    downloadUrl: "#"
  },
  {
    id: "3",
    filename: "Financial_Report.docx",
    originalSize: "3.1 MB",
    convertedSize: "2.8 MB",
    status: "completed",
    convertedAt: "3 hours ago",
    downloadUrl: "#"
  },
  {
    id: "4",
    filename: "Training_Manual.docx",
    originalSize: "8.4 MB",
    convertedSize: "7.2 MB",
    status: "completed",
    convertedAt: "Yesterday",
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

export const WordToPdf = () => {
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

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/word-to-pdf/convert`, {
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
                  Word to PDF Converter
                </h1>
                <p className="text-lg text-gray-600">
                  Convert Word documents to professional PDF format with consistent formatting preservation
                </p>
              </div>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-sm py-1">
            <Zap className="h-3 w-3 mr-1" />
            High Quality
          </Badge>
        </div>

        <Tabs defaultValue="convert" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 lg:grid-cols-1 bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
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
              PDF Settings
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
                  Upload Word Documents
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Support for .docx, .doc, .rtf files up to 100MB each. Batch conversion available.
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
                  <File className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your Word documents here
                  </p>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Supports DOCX, DOC, RTF formats • Batch conversion available • Up to 100MB per file
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button asChild className="bg-blue-600 hover:bg-blue-700">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Browse Files
                        <input
                          id="file-upload"
                          type="file"
                          multiple
                          accept=".docx,.doc,.rtf"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                      </label>
                    </Button>
                    <span className="text-gray-500">or</span>
                    <Button variant="outline" className="border-gray-300 hover:bg-white">
                      Import from OneDrive
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
                            <div className="p-2 bg-green-50 rounded-lg">
                              <File className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{file.name}</p>
                              <p className="text-sm text-gray-500">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB • 
                                {file.name.endsWith('.docx') ? ' Word Document' : 
                                 file.name.endsWith('.doc') ? ' Word 97-2003' : ' Rich Text Format'}
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
                          <span className="font-medium text-gray-900">Converting to PDF...</span>
                          <span className="text-sm text-gray-600">{conversionProgress}%</span>
                        </div>
                        <Progress value={conversionProgress} className="h-2 bg-gray-200" />
                        <p className="text-sm text-gray-600 text-center">
                          Converting {files.length} document(s) to PDF format. Preserving formatting and layout.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Button
                          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-sm"
                          onClick={startConversion}
                          size="lg"
                        >
                          <FileText className="mr-2 h-5 w-5" />
                          Convert to PDF ({files.length} files)
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
                  PDF Output Settings
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Configure PDF properties, security options, and output quality for professional results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="pdf-version" className="text-gray-900 font-medium">PDF Version</Label>
                      <Select defaultValue="1.7">
                        <SelectTrigger className="border-gray-300 rounded-xl">
                          <SelectValue placeholder="Select PDF version" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1.4">PDF 1.4 (Acrobat 5)</SelectItem>
                          <SelectItem value="1.5">PDF 1.5 (Acrobat 6)</SelectItem>
                          <SelectItem value="1.6">PDF 1.6 (Acrobat 7)</SelectItem>
                          <SelectItem value="1.7">PDF 1.7 (Acrobat 8)</SelectItem>
                          <SelectItem value="2.0">PDF 2.0 (Latest)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="quality" className="text-gray-900 font-medium">Output Quality</Label>
                      <Select defaultValue="standard">
                        <SelectTrigger className="border-gray-300 rounded-xl">
                          <SelectValue placeholder="Select quality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="print">Print Quality (300 DPI)</SelectItem>
                          <SelectItem value="standard">Standard (150 DPI)</SelectItem>
                          <SelectItem value="web">Web Optimized (72 DPI)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="page-size" className="text-gray-900 font-medium">Page Size</Label>
                      <Select defaultValue="auto">
                        <SelectTrigger className="border-gray-300 rounded-xl">
                          <SelectValue placeholder="Select page size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto (From Document)</SelectItem>
                          <SelectItem value="a4">A4</SelectItem>
                          <SelectItem value="letter">Letter</SelectItem>
                          <SelectItem value="legal">Legal</SelectItem>
                          <SelectItem value="a3">A3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
                      <div className="space-y-1">
                        <Label className="text-gray-900 font-medium">Optimize for Web</Label>
                        <p className="text-sm text-gray-600">
                          Smaller file size for online viewing
                        </p>
                      </div>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
                      <div className="space-y-1">
                        <Label className="text-gray-900 font-medium">Preserve Hyperlinks</Label>
                        <p className="text-sm text-gray-600">
                          Keep clickable links in the PDF
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
                      <div className="space-y-1">
                        <Label className="text-gray-900 font-medium">Add Bookmarks</Label>
                        <p className="text-sm text-gray-600">
                          Create PDF bookmarks from headings
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
                      <div className="space-y-1">
                        <Label className="text-gray-900 font-medium">Password Protection</Label>
                        <p className="text-sm text-gray-600">
                          Secure PDF with password
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 text-lg">Document Metadata</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="title" className="text-gray-900 font-medium">Document Title</Label>
                      <Input id="title" placeholder="Enter document title" className="rounded-xl border-gray-300" />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="author" className="text-gray-900 font-medium">Author</Label>
                      <Input id="author" placeholder="Enter author name" className="rounded-xl border-gray-300" />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="subject" className="text-gray-900 font-medium">Subject</Label>
                      <Input id="subject" placeholder="Enter subject" className="rounded-xl border-gray-300" />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="keywords" className="text-gray-900 font-medium">Keywords</Label>
                      <Input id="keywords" placeholder="Enter keywords (comma-separated)" className="rounded-xl border-gray-300" />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Save PDF Settings
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
                  Recent Conversions
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Download your converted PDF files from the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-gray-200">
                        <TableHead className="text-gray-900 font-semibold">File Name</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Original Size</TableHead>
                        <TableHead className="text-gray-900 font-semibold">PDF Size</TableHead>
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
                              <div className="p-2 bg-green-50 rounded-lg">
                                <File className="h-4 w-4 text-green-600" />
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
                                Download PDF
                              </Button>
                            ) : item.status === "processing" ? (
                              <span className="text-sm text-gray-600">Converting...</span>
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